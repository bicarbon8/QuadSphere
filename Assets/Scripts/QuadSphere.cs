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
    public int QuadsPerFace;
    public int StartingSubdivisionsPerQuad;
    public float[] SubdivisionDistances;
    public Material SphereMaterial;
    public bool UsePerlinNoise;
    public bool SmoothNegativeElevations;
    public float StartingNoiseOffset;
    public float StartingNoiseFrequency;
    public float StartingNoiseAmplitude;

    private QuadFace[] _faces;
    private QuadVertMap _map;
    private MeshFilter _meshFilter;
    private MeshCollider _meshCollider;
    private MeshRenderer _meshRenderer;

    private Vector3 _position;
    private Quaternion _rotation;
    private Vector3 _scale;

    private void Start()
    {
        _meshFilter = gameObject.AddComponent<MeshFilter>();
        _meshCollider = gameObject.AddComponent<MeshCollider>();
        _meshRenderer = gameObject.AddComponent<MeshRenderer>();
        _meshRenderer.material = new Material(SphereMaterial);
    }

    public Vector3 GetScale()
    {
        return _scale;
    }

    public float GetRadius()
    {
        return Radius;
    }

    private Task<List<int>> _updateTask;
    private void Update()
    {
        _position = transform.position;
        _rotation = transform.rotation;
        _scale = transform.localScale;

        if (_updateTask == null)
        {
            // TODO: only send if player position or quadsphere position changed
            _updateTask = UpdateAndGetTrianglesAsync(Player.transform.position);
        }

        if (_updateTask.IsCompleted)
        {
            Render(_updateTask.Result);
            _updateTask = null;
        }
    }

    private async Task<List<int>> UpdateAndGetTrianglesAsync(Vector3 playerPosition)
    {
        var t = Task.Run<List<int>>(() =>
        {
            _map = new QuadVertMap();
            _faces = new QuadFace[6];
            // create Front
            var front = new QuadFace(this, QuadFaceType.ZPosFront, Radius * 2, Player, QuadsPerFace, StartingSubdivisionsPerQuad, SubdivisionDistances, ref _map);
            AddFace(front);

            // create Left
            var left = new QuadFace(this, QuadFaceType.XNegLeft, Radius * 2, Player, QuadsPerFace, StartingSubdivisionsPerQuad, SubdivisionDistances, ref _map);
            AddFace(left);

            // create Right
            var right = new QuadFace(this, QuadFaceType.XPosRight, Radius * 2, Player, QuadsPerFace, StartingSubdivisionsPerQuad, SubdivisionDistances, ref _map);
            AddFace(right);

            // create Top
            var top = new QuadFace(this, QuadFaceType.YPosTop, Radius * 2, Player, QuadsPerFace, StartingSubdivisionsPerQuad, SubdivisionDistances, ref _map);
            AddFace(top);

            // create Bottom
            var bottom = new QuadFace(this, QuadFaceType.YNegBottom, Radius * 2, Player, QuadsPerFace, StartingSubdivisionsPerQuad, SubdivisionDistances, ref _map);
            AddFace(bottom);

            // create Back
            var back = new QuadFace(this, QuadFaceType.ZNegBack, Radius * 2, Player, QuadsPerFace, StartingSubdivisionsPerQuad, SubdivisionDistances, ref _map);
            AddFace(back);

            List<int> triangles = new List<int>();
            if (_faces != null)
            {
                // Get Quad closest to player
                float minimumFaceDistance = Vector3.Distance(playerPosition, _position);
                QuadFace closestFace = null;
                foreach (QuadFace face in _faces)
                {
                    float tmpDistance = face.GetDistanceToPlayer(playerPosition);
                    if (tmpDistance < minimumFaceDistance)
                    {
                        minimumFaceDistance = tmpDistance;
                        closestFace = face;
                    }
                }

                if (closestFace != null)
                {
                    Quad[] quads = closestFace.GetQuads();
                    SubdivideQuadsUntilNotInSubdivisionDistance(quads, playerPosition);

                    foreach (QuadFace f in _faces)
                    {
                        if (f != null)
                        {
                            triangles.AddRange(f.GetTriangles());
                        }
                    }
                }
            }
            return triangles;
        });
        return await t;
    }

    private void SubdivideQuadsUntilNotInSubdivisionDistance(Quad[] quads, Vector3 playerPosition)
    {
        // get closest quad to player
        float minimumQuadDistance = Vector3.Distance(playerPosition, _position);
        Quad closestQuad = null;
        foreach (Quad q in quads)
        {
            float tmpDistance = q.GetDistanceToPlayer(playerPosition);
            if (tmpDistance < minimumQuadDistance)
            {
                minimumQuadDistance = tmpDistance;
                closestQuad = q;
            }
        }

        if (closestQuad != null)
        {
            // determine if Quad is in subdivision range
            if (closestQuad.IsWithinSubdivisionDistance(playerPosition))
            {
                // if it is subdivide Quad
                closestQuad.Subdivide();

                // repeat
                SubdivideQuadsUntilNotInSubdivisionDistance(closestQuad.GetChildren(), playerPosition);
            }
        }
    }

    private void Render(List<int> triangles)
    {
        if (triangles != null && triangles.Any())
        {
            _meshFilter.mesh.Clear();
            _meshFilter.mesh.vertices = ApplyCurve(_map.Vertices);
            _meshFilter.mesh.uv = _map.UVs;
            _meshFilter.mesh.triangles = triangles.ToArray();

            _meshFilter.mesh.RecalculateNormals();
            _meshFilter.mesh.RecalculateBounds();

            _meshCollider.sharedMesh = _meshFilter.mesh;
        }
    }

    public Vector3[] ApplyCurve(params Vector3[] vertices)
    {
        Vector3[] verts = new Vector3[vertices.Length];
        for (int i = 0; i < vertices.Length; i++)
        {
            var v = vertices[i];
            float elevation = 0F;
            if (UsePerlinNoise)
            {
                elevation = GetElevation(v);
            }
            v = v.normalized * (Radius + elevation);
            verts[i] = v;
        }
        return verts;
    }

    private float GetElevation(Vector3 location)
    {
        return ApplyFractionalBrownianNoise(location);
    }

    private float GetPerlinNoiseValue(Vector3 location, float smoothing, float offset)
    {
        Vector3 offsetLocation = new Vector3(location.x + offset, location.y + offset, location.z + offset);
        float elevation = 2 * (Mathf.PerlinNoise((offsetLocation.x + offsetLocation.z) * smoothing, (offsetLocation.y + offsetLocation.z) * smoothing) - 0.5F);
        return elevation;
    }

    private float ApplyFractionalBrownianNoise(Vector3 location)
    {
        float elevation = 0F;
        float frequency = StartingNoiseFrequency;
        float amplitude = StartingNoiseAmplitude;
        float lacunarity = 2F;
        float gain = 0.65F;
        for (int i = 0; i < SubdivisionDistances.Length; ++i)
        {
            elevation += GetPerlinNoiseValue(location, frequency, Radius * 2.1F) * amplitude;
            frequency *= lacunarity;
            amplitude *= gain;
        }

        if (SmoothNegativeElevations && elevation < 0F)
        {
            elevation = Mathf.Abs(elevation / (SubdivisionDistances.Length / 2));
        }
        return elevation;
    }

    public Vector3[] ApplyPosition(params Vector3[] vertices)
    {
        Vector3[] verts = new Vector3[vertices.Length];
        for (int i = 0; i < vertices.Length; i++)
        {
            verts[i] = vertices[i] + _position;
        }
        return verts;
    }

    public Vector3[] ApplyRotation(params Vector3[] vertices)
    {
        Vector3[] verts = new Vector3[vertices.Length];
        for (int i = 0; i < vertices.Length; i++)
        {
            var pivot = _position;
            var angles = _rotation;
            var dir = vertices[i] - pivot; // get point direction relative to pivot
            dir = angles * dir; // rotate it
            verts[i] = dir + pivot; // calculate rotated point
        }
        return verts;
    }

    public Vector3[] ApplyScale(params Vector3[] vertices)
    {
        Vector3[] verts = new Vector3[vertices.Length];
        for (int i = 0; i < vertices.Length; i++)
        {
            verts[i] = new Vector3(vertices[i].x * _scale.x, vertices[i].y * _scale.y, vertices[i].z * _scale.z);
        }
        return verts;
    }

    private void AddFace(QuadFace face)
    {
        _faces[(int)face.GetFaceType()] = face;
    }

    private QuadFace GetFace(QuadFaceType type)
    {
        return _faces[(int)type];
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