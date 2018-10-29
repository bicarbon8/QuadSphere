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

    private QuadFace[] _faces;
    private QuadVertMap _map;
    private MeshFilter _meshFilter;
    private MeshCollider _meshCollider;
    private MeshRenderer _meshRenderer;

    private void Start()
    {
        _faces = new QuadFace[6];
        _map = new QuadVertMap();
        _meshFilter = gameObject.AddComponent<MeshFilter>();
        _meshCollider = gameObject.AddComponent<MeshCollider>();
        _meshRenderer = gameObject.AddComponent<MeshRenderer>();
        _meshRenderer.material = new Material(SphereMaterial);

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
        foreach (QuadFace f in _faces)
        {
            if (f != null)
            {
                f.Update(Player.transform.position);
                triangles.AddRange(f.GetTriangles());
            }
        }

        Render(triangles);
    }

    private Task<List<int>> _updateTask;
    private void Update()
    {
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
            bool updated = false;
            List<int> triangles = new List<int>();
            if (_faces != null)
            {
                foreach (QuadFace f in _faces)
                {
                    if (f != null)
                    {
                        updated = updated || f.Update(playerPosition);
                    }
                }
                if (updated)
                {
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

    private void Render(List<int> triangles)
    {
        if (triangles != null && triangles.Any())
        {
            _meshFilter.mesh.Clear();
            _meshFilter.mesh.vertices = ApplyCurve(_map.Vertices);
            _meshFilter.mesh.triangles = triangles.ToArray();

            _meshFilter.mesh.RecalculateNormals();
            _meshFilter.mesh.RecalculateBounds();
        }
    }

    private Vector3[] ApplyCurve(Vector3[] vertices)
    {
        Vector3[] verts = new Vector3[vertices.Length];
        for (int i = 0; i < vertices.Length; i++)
        {
            var v = vertices[i];
            v = v.normalized * (Radius + GetElevation(v, Radius * 1.1F));
            verts[i] = v;
        }
        return verts;
    }

    private float GetElevation(Vector3 location, float offset)
    {
        float smooth = 0.03F;
        Vector3 offsetLocation = new Vector3(location.x + offset, location.y + offset, location.z + offset);
        float elevation = Mathf.PerlinNoise(offsetLocation.x * smooth, offsetLocation.y * smooth);
        elevation += Mathf.PerlinNoise(offsetLocation.x * smooth, offsetLocation.z * smooth);

        return elevation * 10F;
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