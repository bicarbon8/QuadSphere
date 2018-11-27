/************************************************************************
* Copyright (c) 2018 Jason Holt Smith <bicarbon8@gmail.com>
*************************************************************************
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*************************************************************************/
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;

/// <summary>
/// a <see cref="QuadSphere"/> is made up of multiple <see cref="QuadFace"/> objects making up
/// the Top (YPosFace), Bottom (YNegFace), Front (ZPosFace), Back (ZNegFace), Right (XPosFace)
/// and Left (XNegFace). Faces on the opposite side of the Sphere from the Player are disabled
/// to save processing (simple version of Frustrum culling)
/// </summary>
public class QuadSphere : MonoBehaviour
{
    public GameObject Player;
    public float Radius;
    public int StartingSubdivisionsPerQuad;
    public float[] SubdivisionDistances;
    public Material SphereMaterial;
    public bool UseNoiseForElevation;
    public FastNoise.NoiseType NoiseType;
    public bool SmoothNegativeElevations;
    public int NoiseSeed;
    public float StartingNoiseFrequency;
    public float StartingNoiseAmplitude;

    private QuadFace[] _faces;
    private QuadTriangleCache _triangleCache;

    private void Start()
    {
        // only allow odd numbers of subdivisions as this simplifies the maths
        if (StartingSubdivisionsPerQuad % 2 == 0)
        {
            StartingSubdivisionsPerQuad++;
        }

        _faces = new QuadFace[6];
        _triangleCache = new QuadTriangleCache(StartingSubdivisionsPerQuad + 2);

        // create Front
        AddFace(QuadFaceType.ZPosFront, Radius * 2, Player, StartingSubdivisionsPerQuad, SubdivisionDistances, _triangleCache);

        // create Left
        AddFace(QuadFaceType.XNegLeft, Radius * 2, Player, StartingSubdivisionsPerQuad, SubdivisionDistances, _triangleCache);

        // create Right
        AddFace(QuadFaceType.XPosRight, Radius * 2, Player, StartingSubdivisionsPerQuad, SubdivisionDistances, _triangleCache);

        // create Top
        AddFace(QuadFaceType.YPosTop, Radius * 2, Player, StartingSubdivisionsPerQuad, SubdivisionDistances, _triangleCache);

        // create Bottom
        AddFace(QuadFaceType.YNegBottom, Radius * 2, Player, StartingSubdivisionsPerQuad, SubdivisionDistances, _triangleCache);

        // create Back
        AddFace(QuadFaceType.ZNegBack, Radius * 2, Player, StartingSubdivisionsPerQuad, SubdivisionDistances, _triangleCache);

        Render();
    }

    private void Update()
    {
        StartCoroutine(UpdateFaces(Player.transform.position));
        Render();
    }

    private bool _updating = false;
    private IEnumerator UpdateFaces(Vector3 playerPosition)
    {
        if (!_updating)
        {
            _updating = true;

            // perform subdivision if needed
            foreach (QuadFace face in _faces)
            {
                if (face != null)
                {
                    yield return face.UpdateQuad(playerPosition);
                }
            }

            _updating = false;
        }
        yield return null;
    }

    private void Render()
    {
        if (_faces != null && _faces.Any())
        {
            foreach (QuadFace face in _faces)
            {
                if (face.ShouldRender())
                {
                    face.Render();
                }
            }
        }
    }

    private void AddFace(QuadFaceType type, float size, GameObject player, int startingSubdivisions, float[] subdivisionDistances, QuadTriangleCache cache)
    {
        string faceName = type.ToString();
        var empty = new GameObject(faceName);
        empty.transform.parent = gameObject.transform;
        empty.layer = gameObject.layer;
        empty.transform.position = transform.position;
        empty.transform.rotation = transform.rotation;

        switch (type)
        {
            case QuadFaceType.YPosTop:
                empty.transform.Rotate(Vector3.left, 90);
                empty.transform.Rotate(Vector3.up, 180);
                break;
            case QuadFaceType.YNegBottom:
                empty.transform.Rotate(Vector3.right, 90);
                empty.transform.Rotate(Vector3.up, 180);
                break;
            case QuadFaceType.XNegLeft:
                empty.transform.Rotate(Vector3.up, 90);
                break;
            case QuadFaceType.XPosRight:
                empty.transform.Rotate(Vector3.down, 90);
                break;
            case QuadFaceType.ZPosFront:
                empty.transform.Rotate(Vector3.up, 180);
                break;
        }
        empty.transform.Translate(Vector3.back * (size / 2));

        QuadFace face = empty.AddComponent<QuadFace>();
        face.Root = this;
        face.FaceType = type;
        face.Size = size;
        face.Player = player;
        face.Subdivisions = startingSubdivisions;
        face.SubdivisionDistances = subdivisionDistances;
        face.TriangleCache = cache;
        face.StartingNoiseFrequency = StartingNoiseFrequency;
        face.StartingNoiseAmplitude = StartingNoiseAmplitude;
        face.SmoothNegativeElevations = SmoothNegativeElevations;
        face.Active = true;
        face.Initialise();

        _faces[(int)type] = face;
    }

    public QuadFace GetQuadFace(QuadFaceType type)
    {
        return _faces[(int)type];
    }

    public Vector3 ApplyElevation(Vector3 v, Vector2 uv)
    {
        Vector3 curvedVert = v.normalized * Radius;
        float elevation = 0F;
        if (UseNoiseForElevation)
        {
            Elevation.Instance.Noise.SetSeed(NoiseSeed);
            elevation = Elevation.Instance.Get(curvedVert, StartingNoiseAmplitude, StartingNoiseFrequency, SubdivisionDistances.Length, NoiseType);
        }
        else
        {
            if (SphereMaterial != null)
            {
                var parallaxMap = SphereMaterial.GetTexture("_ParallaxMap") as Texture2D;
                if (parallaxMap != null)
                {
                    elevation = Elevation.Instance.Get(uv, parallaxMap, StartingNoiseAmplitude);
                }
            }
        }
        if (SmoothNegativeElevations && elevation < 0)
        {
            elevation = Mathf.Abs(elevation / (SubdivisionDistances.Length / 2));
        }

        Vector3 elevatedVert = v.normalized * (Radius + elevation);
        return elevatedVert;
    }
}

public enum QuadFaceType
{
    ZPosFront = 0,
    XNegLeft = 1,
    ZNegBack = 2,
    XPosRight = 3,
    YPosTop = 4,
    YNegBottom = 5
}