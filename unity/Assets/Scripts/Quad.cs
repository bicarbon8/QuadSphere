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
using UnityEngine;

public class Quad : MonoBehaviour
{
    #region Vertices Properties
    public Vector3[] Vertices; // all the verts
    public Vector2[] UVs;      // all UVs for verts

    // points, on original cube, used for location and neighbor detection
    public Vector3 CentrePoint = Vector3.zero;
    public Vector3 BottomLeft;
    public Vector3 BottomRight;
    public Vector3 TopLeft;
    public Vector3 TopRight;

    public Vector3 DistanceTestCentre;
    #endregion

    public QuadSphere Root;
    // top-most Quad
    public QuadFace Face;
    // our immediate parent node
    public Quad Parent;
    // Level 0 is top level node, Level 1 is a child of the top level node
    public int Level;
    // Size of one edge of quad in game units
    public float Size;
    // Starting number of subdivisions
    public int Subdivisions;

    // Type indicates quadrant this Quad represents: TopLeft, TopRight, BottomRight, BottomLeft
    public QuadType QuadType;
    public float Tolerance; // snapping tolerance for neighbor detection
    public float[] SubdivisionDistances;
    public QuadTriangleCache TriangleCache;

    public Material Material;
    public bool SmoothNegativeElevations;
    public float StartingNoiseFrequency;
    public float StartingNoiseAmplitude;

    public bool HasChildren { get { return _children != null && _children.Any(c => c != null); } }
    public bool Active { get; set; }

    private Quad[] _children = new Quad[4]; // max of 4: bottomLeft, bottomRight, topLeft, topRight
    private Func<Quad>[] _neighbors = new Func<Quad>[4]; // max of 4: top, bottom, left, right
    public float _subdivisionDistance;

    private MeshFilter _meshFilter;
    private MeshCollider _meshCollider;
    private MeshRenderer _meshRenderer;

    private int[] _triangles;
    private Vector3[] _vertices;
    private Vector2[] _uvs;

    public bool IsDirty; // set to true when Quad has changes and needs to be rendered

    public virtual void Initialise()
    {
        // only allow odd numbers of subdivisions as this simplifies the triangle generation
        if (Subdivisions % 2 == 0)
        {
            Subdivisions++;
        }
        if (SubdivisionDistances.Length > Level)
        {
            float minimumDistance = Mathf.Sqrt(Mathf.Pow(Size / 2, 2) + Mathf.Pow(Size / 2, 2));
            _subdivisionDistance = SubdivisionDistances[Level] + minimumDistance;
        }
        else
        {
            _subdivisionDistance = -1;
        }

        Vertices = new Vector3[(Subdivisions + 2) * (Subdivisions + 2)];
        UVs = new Vector2[(Subdivisions + 2) * (Subdivisions + 2)];

        _meshFilter = gameObject.AddComponent<MeshFilter>();
        _meshCollider = gameObject.AddComponent<MeshCollider>();
        _meshRenderer = gameObject.AddComponent<MeshRenderer>();
        _meshRenderer.material = new Material(Material);

        Tolerance = 0.01F;

        GenerateVertices();

        AddNeighbors();

        IsDirty = true;
    }

    #region Subdivision
    public IEnumerator UpdateQuad(Vector3 playerPosition)
    {
        if (Active)
        {
            if (IsWithinSubdivisionDistance(playerPosition))
            {
                Subdivide();
            }
        }
        else
        {
            if (!IsWithinSubdivisionDistance(playerPosition))
            {
                UnifyIfPossible();
            }

            // NOTE: above call to 'Unify' could have activated us so we need to recheck
            if (!Active && HasChildren)
            {
                foreach (Quad child in _children)
                {
                    if (child != null)
                    {
                        yield return child.UpdateQuad(playerPosition);
                    }
                }
            }
        }
        yield return null;
    }

    /// <summary>
    /// called when adding LoD to mesh
    /// </summary>
    public void Subdivide()
    {
        CreateChildQuads();

        // update neighbors
        UpdateNeighborsFollowingSubdivision();

        Active = false;
        IsDirty = true;
    }

    private void UpdateNeighborsFollowingSubdivision()
    {
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            var neighbor = GetNeighbor(edge);
            if (neighbor == null)
            {
                // need to subdivide parent's neighbor
                var parentsNeighbor = GetParentsNeighbor(edge);
                parentsNeighbor?.Subdivide();
            }
            else
            {
                neighbor.IsDirty = true;
            }
        }
    }

    public void UnifyIfPossible()
    {
        if (CanUnify())
        {
            IsDirty = true;
            Active = true; // Children will be purged on call to Render

            UpdateNeighborsFollowingUnification();
        }
    }

    private bool CanUnify()
    {
        if (_children != null && _children.Any(c => c != null && c.Active))
        {
            for (int i = 0; i < 4; i++)
            {
                EdgeType edge = (EdgeType)i;
                Quad neighbor = GetNeighbor(edge);
                if (neighbor != null)
                {
                    if (!neighbor.Active && neighbor.HasChildren)
                    {
                        EdgeType neighborEdge = neighbor.GetEdgeSharedWith(this);
                        var children = neighbor.GetChildrenSharingEdge(neighborEdge);
                        if (children.Any(c => c != null && !c.Active && c.HasChildren))
                        {
                            return false; // unable to Unify due to neighbor subdivision
                        }
                    }
                }
            }
        }
        return true;
    }

    private void UpdateNeighborsFollowingUnification()
    {
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            var neighbor = GetNeighbor(edge);
            if (neighbor != null)
            {
                neighbor.IsDirty = true;
            }
        }
    }

    public float GetDistanceToPlayer(Vector3 playerPosition)
    {
        Vector3 adjustedCentre = ToWorldVert(DistanceTestCentre);
        return Vector3.Distance(playerPosition, adjustedCentre);
    }

    public bool IsWithinSubdivisionDistance(Vector3 playerPosition)
    {
        return GetDistanceToPlayer(playerPosition) <= _subdivisionDistance;
    }
    #endregion

    #region Rendering
    public bool ShouldRender()
    {
        bool render = false;
        if (!Active && HasChildren)
        {
            foreach (Quad child in _children)
            {
                if (child != null && child.ShouldRender())
                {
                    return true;
                }
            }
        }
        else
        {
            return IsDirty;
        }
        return render;
    }

    public int[] GetTriangles()
    {
        int bitMask = 0;
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            switch (edge)
            {
                case EdgeType.Top:
                    if (ShouldDeactivateEdge(edge))
                    {
                        bitMask += 1;
                    }
                    break;
                case EdgeType.Bottom:
                    if (ShouldDeactivateEdge(edge))
                    {
                        bitMask += 4;
                    }
                    break;
                case EdgeType.Left:
                    if (ShouldDeactivateEdge(edge))
                    {
                        bitMask += 8;
                    }
                    break;
                case EdgeType.Right:
                    if (ShouldDeactivateEdge(edge))
                    {
                        bitMask += 2;
                    }
                    break;
            }
        }

        return TriangleCache.GetTrianglesForCase(bitMask);
    }

    public void Render()
    {
        if (Active)
        {
            Clear();
            _meshFilter.mesh.vertices = Vertices;
            _meshFilter.mesh.uv = UVs;
            _meshFilter.mesh.triangles = GetTriangles();

            _meshFilter.mesh.RecalculateNormals();
            _meshFilter.mesh.RecalculateBounds();

            _meshCollider.sharedMesh = _meshFilter.mesh;

            if (HasChildren)
            {
                RemoveChildren();
            }
        }
        else
        {
            if (HasChildren)
            {
                foreach (Quad child in _children)
                {
                    if (child != null)
                    {
                        child.Render();
                    }
                }
            }
            Clear();
        }
        IsDirty = false;
    }

    private void Clear()
    {
        _meshFilter.mesh.Clear();
    }

    private bool ShouldDeactivateEdge(EdgeType edge)
    {
        Quad neighbor = GetNeighbor(edge);
        if (neighbor == null) // null means no neighbors at same level
        {
            return true;
        }

        return false;
    }
    #endregion

    #region Vertices
    /// <summary>
    /// builds a flattened 2D array of vertices like the following:
    /// 
    /// 15--16--17--18--19
    /// |   |   |   |   |
    /// 10--11--12--13--14
    /// |   |   |   |   |
    /// 5---6---7---8---9
    /// |   |   |   |   |
    /// 0---1---2---3---4
    /// 
    /// NOTE: <see cref="AddNeighbors"/> must be called after this method to
    /// ensure that we properly detect the correct neighbors
    /// </summary>
    private void GenerateVertices()
    {
        // start from the passed in _bottomLeft Vector3 and build list of QuadVerts
        int rows = Subdivisions + 2;
        int cols = rows;
        float colVertOffset = 0F;
        float rowVertOffset = 0F;
        colVertOffset = Size / (Subdivisions + 1F);
        rowVertOffset = Size / (Subdivisions + 1F);
        float uvScalar = 1 / (4 * Face.Size);

        float xBottomLeftOffset = -Size / 2F;
        float yBottomLeftOffset = -Size / 2F;
        float zBottomLeftOffset = 0F;
        Vector3 bottomLeftCorner = new Vector3(xBottomLeftOffset, yBottomLeftOffset, zBottomLeftOffset);

        for (int row = 0; row < rows; row++)
        {
            for (int col = 0; col < cols; col++)
            {
                int index = FlatArray.GetIndexFromRowCol(row, col, cols);

                Vector3 v = new Vector3((col * colVertOffset) + bottomLeftCorner.x, (row * rowVertOffset) + bottomLeftCorner.y, bottomLeftCorner.z);

                if (index == 0)
                {
                    BottomLeft = v.Clone();
                }
                if (index == FlatArray.GetBottomRightIndex(cols))
                {
                    BottomRight = v.Clone();
                }
                if (index == FlatArray.GetTopLeftIndex(rows, cols))
                {
                    TopLeft = v.Clone();
                }
                if (index == FlatArray.GetTopRightIndex(rows, cols))
                {
                    TopRight = v.Clone();
                }

                Vector3 scaledUV = Face.ToLocalVert(ToWorldVert(v)) * uvScalar;
                var uvOffset = Face.GetUVOffset();
                Vector2 uv = new Vector2(uvOffset.x + scaledUV.x, uvOffset.y + scaledUV.y);

                // set elevation
                v = GetInverseOffsetFromRoot(Face.ApplyElevation(GetOffsetFromRoot(v), uv));
                
                Vertices[index] = v;
                UVs[index] = uv;
            }
        }

        DistanceTestCentre = GetInverseOffsetFromRoot(Face.ApplyElevation(GetOffsetFromRoot(CentrePoint), Face.GetUVOffset()));
    }

    public Vector3 ToWorldVert(Vector3 vert)
    {
        return transform.TransformPoint(vert);
    }

    public Vector3 ToLocalVert(Vector3 vert)
    {
        return transform.InverseTransformPoint(vert);
    }

    /// <summary>
    /// returns x, y, z distance from Face.gameObject.transform.position
    /// </summary>
    /// <param name="v"></param>
    /// <returns></returns>
    public Vector3 GetOffsetFromFace(Vector3 v)
    {
        Vector3 offset = Face.RelativePosition(ToWorldVert(v));
        return offset;
    }

    public Vector3 GetInverseOffsetFromFace(Vector3 v)
    {
        Vector3 local = ToLocalVert(Face.InverseRelativePosition(v));
        return local;
    }

    public Vector3 GetOffsetFromRoot(Vector3 v)
    {
        if (Root != null)
        {
            Vector3 offset = Root.gameObject.transform.InverseTransformPoint(ToWorldVert(v));
            return offset;
        }
        return GetOffsetFromFace(v);
    }

    public Vector3 GetInverseOffsetFromRoot(Vector3 v)
    {
        if (Root != null)
        {
            Vector3 local = ToLocalVert(Root.gameObject.transform.TransformPoint(v));
            return local;
        }
        return GetInverseOffsetFromFace(v);
    }
    #endregion 

    #region Children
    private void CreateChildQuads()
    {
        if (SubdivisionDistances.Length > Level && !HasChildren)
        {
            float offset = Size / 4;
            GenerateChildren(
                CentrePoint + new Vector3(-offset, -offset, 0), // bottom left
                CentrePoint + new Vector3(offset, -offset, 0), // bottom right
                CentrePoint + new Vector3(-offset, offset, 0), // top left
                CentrePoint + new Vector3(offset, offset, 0)); // top right
        }
    }

    private void GenerateChildren(Vector3 bottomLeftMidpoint, Vector3 bottomRightMidpoint, Vector3 topLeftMidpoint, Vector3 topRightMidpoint)
    {
        //Add bottom left (southwest) child
        AddChild(QuadType.BottomLeft, Level + 1, (Size / 2), bottomLeftMidpoint);

        //Add bottom right (southeast) child
        AddChild(QuadType.BottomRight, Level + 1, (Size / 2), bottomRightMidpoint);

        //Add top left (northwest) child
        AddChild(QuadType.TopLeft, Level + 1, (Size / 2), topLeftMidpoint);

        //Add top right (northeast) child
        AddChild(QuadType.TopRight, Level + 1, (Size / 2), topRightMidpoint);
    }

    private void AddChild(QuadType type, int level, float size, Vector3 centrePoint)
    {
        string childName = type.ToString();
        var empty = new GameObject(childName);
        empty.transform.parent = gameObject.transform;
        empty.transform.rotation = gameObject.transform.rotation;
        empty.transform.localPosition = centrePoint;

        // TODO: offset position of empty to centre of new Quad

        empty.layer = gameObject.layer;

        Quad child = empty.AddComponent<Quad>();
        child.QuadType = type;
        child.Root = Root;
        child.Face = Face;
        child.Parent = this;
        child.Level = level;
        child.Size = size;
        child.Subdivisions = Subdivisions;
        child.SubdivisionDistances = SubdivisionDistances;
        child.TriangleCache = TriangleCache;
        child.Material = Material;
        child.StartingNoiseFrequency = StartingNoiseFrequency;
        child.StartingNoiseAmplitude = StartingNoiseAmplitude;
        child.SmoothNegativeElevations = SmoothNegativeElevations;
        child.Active = true;
        child.Initialise();

        _children[(int)type] = child;
    }

    public Quad GetChild(QuadType type)
    {
        return _children[(int)type];
    }

    public Quad[] GetChildren()
    {
        return _children;
    }

    public Quad[] GetChildrenSharingEdge(EdgeType edge)
    {
        switch (edge)
        {
            case EdgeType.Top:
                return new Quad[] { GetChild(QuadType.TopLeft), GetChild(QuadType.TopRight) };
            case EdgeType.Bottom:
                return new Quad[] { GetChild(QuadType.BottomLeft), GetChild(QuadType.BottomRight) };
            case EdgeType.Left:
                return new Quad[] { GetChild(QuadType.BottomLeft), GetChild(QuadType.TopLeft) };
            case EdgeType.Right:
                return new Quad[] { GetChild(QuadType.BottomRight), GetChild(QuadType.TopRight) };
        }
        return new Quad[0];
    }

    public void RemoveChildren()
    {
        for (int i = 0; i < _children.Length; i++)
        {
            if (_children[i] != null)
            {
                _children[i].Active = false;
                if (_children[i].HasChildren)
                {
                    _children[i].RemoveChildren();
                }
                _children[i].Clear(); // remove mesh
                DestroyImmediate(_children[i].gameObject);
                _children[i] = null;
            }
        }
    }

    public Quad[] GetDecendants(Quad root)
    {
        List<Quad> descendants = new List<Quad>();

        if (root.HasChildren)
        {
            foreach (Quad child in root.GetChildren())
            {
                if (child != null)
                {
                    descendants.AddRange(GetDecendants(child));
                }
            }
        }

        descendants.Add(root);

        return descendants.ToArray();
    }
    #endregion

    #region Neighbors
    /// <summary>
    /// Get neighbor, of same level, along specified edge if any exists
    /// </summary>
    /// <param name="edgeType"></param>
    /// <returns>null if no <see cref="Quad"/> exists on the specified side at the same level
    /// otherwise the neighboring <see cref="Quad"/></returns>
    public virtual Quad GetNeighbor(EdgeType edgeType)
    {
        return _neighbors[(int)edgeType]();
    }

    public EdgeType GetEdgeSharedWith(Quad neighbor)
    {
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            Quad found = GetNeighbor(edge);
            if (neighbor == found)
            {
                return edge;
            }
        }
        return EdgeType.None;
    }

    public bool HasSharedEdge(EdgeType edge, Quad quad)
    {
        var topLeft = quad.ToWorldVert(quad.TopLeft);
        var topRight = quad.ToWorldVert(quad.TopRight);
        var bottomLeft = quad.ToWorldVert(quad.BottomLeft);
        var bottomRight = quad.ToWorldVert(quad.BottomRight);
        // shared Top edge
        if (IsLineWithinEdge(edge, topLeft, topRight, Tolerance))
        {
            return true;
        }
        // shared Bottom edge
        if (IsLineWithinEdge(edge, bottomLeft, bottomRight, Tolerance))
        {
            return true;
        }
        // shared Left edge
        if (IsLineWithinEdge(edge, bottomLeft, topLeft, Tolerance))
        {
            return true;
        }
        // shared Right edge
        if (IsLineWithinEdge(edge, bottomRight, topRight, Tolerance))
        {
            return true;
        }

        return false;
    }

    public bool HasAnySharedEdge(Quad quad)
    {
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            if (HasSharedEdge(edge, quad))
            {
                return true;
            }
        }
        return false;
    }

    public float GetDistanceToEdge(EdgeType edge, Vector3 worldPoint)
    {
        Vector3 a = Vector3.zero;
        Vector3 b = Vector3.zero;
        switch (edge)
        {
            case EdgeType.Top:
                a = ToWorldVert(TopLeft);
                b = ToWorldVert(TopRight);
                break;
            case EdgeType.Bottom:
                a = ToWorldVert(BottomLeft);
                b = ToWorldVert(BottomRight);
                break;
            case EdgeType.Left:
                a = ToWorldVert(BottomLeft);
                b = ToWorldVert(TopLeft);
                break;
            case EdgeType.Right:
                a = ToWorldVert(BottomRight);
                b = ToWorldVert(TopRight);
                break;
        }

        float dist = Vector3.Distance(worldPoint.NearestPointOnLine(a, b), worldPoint);
        return dist;
    }

    public bool IsPointWithinEdge(EdgeType edge, Vector3 worldPoint, float tolerance)
    {
        return GetDistanceToEdge(edge, worldPoint) < tolerance;
    }

    public bool IsLineWithinEdge(EdgeType edge, Vector3 worldPointA, Vector3 worldPointB, float tolerance)
    {
        return IsPointWithinEdge(edge, worldPointA, tolerance) && IsPointWithinEdge(edge, worldPointB, tolerance);
    }

    public Quad GetParentsNeighbor(EdgeType edge)
    {
        if (Parent != null)
        {
            return Parent.GetNeighbor(edge);
        }
        return null;
    }

    private void AddNeighbor(EdgeType edge, Func<Quad> neighbor)
    {
        _neighbors[(int)edge] = neighbor;
    }

    /// <summary>
    /// add a function for each edge of this <see cref="Quad"/> to lookup the neighbors.
    /// for <see cref="Quad"/> objects with siblings, these will be known, but for non-sibling
    /// neighbors, these must be found through detection of others sharing the same edge
    /// </summary>
    private void AddNeighbors()
    {
        switch (QuadType)
        {
            case QuadType.BottomLeft:
                // add siblings
                AddNeighbor(EdgeType.Top, () => { return Parent.GetChild(QuadType.TopLeft); });
                AddNeighbor(EdgeType.Right, () => { return Parent.GetChild(QuadType.BottomRight); });

                // add non-siblings
                AddNeighbor(EdgeType.Bottom, () =>
                {
                    return GetParentsNeighbor(EdgeType.Bottom)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                AddNeighbor(EdgeType.Left, () =>
                {
                    return GetParentsNeighbor(EdgeType.Left)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                break;
            case QuadType.BottomRight:
                // add siblings
                AddNeighbor(EdgeType.Top, () => { return Parent.GetChild(QuadType.TopRight); });
                AddNeighbor(EdgeType.Left, () => { return Parent.GetChild(QuadType.BottomLeft); });

                // add non-siblings
                AddNeighbor(EdgeType.Bottom, () =>
                {
                    return GetParentsNeighbor(EdgeType.Bottom)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                AddNeighbor(EdgeType.Right, () =>
                {
                    return GetParentsNeighbor(EdgeType.Right)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                break;
            case QuadType.TopLeft:
                // add siblings
                AddNeighbor(EdgeType.Bottom, () => { return Parent.GetChild(QuadType.BottomLeft); });
                AddNeighbor(EdgeType.Right, () => { return Parent.GetChild(QuadType.TopRight); });

                // add non-siblings
                AddNeighbor(EdgeType.Top, () =>
                {
                    var pn = GetParentsNeighbor(EdgeType.Top);
                    if (pn != null)
                    {
                        var pnc = pn.GetChildren();
                        if (pnc != null && pnc.Any(c => c != null))
                        {
                            var pncs = pnc.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                            return pncs;
                        }
                    }
                    return null;
                });
                AddNeighbor(EdgeType.Left, () =>
                {
                    return GetParentsNeighbor(EdgeType.Left)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                break;
            case QuadType.TopRight:
                // add siblings
                AddNeighbor(EdgeType.Bottom, () => { return Parent.GetChild(QuadType.BottomRight); });
                AddNeighbor(EdgeType.Left, () => { return Parent.GetChild(QuadType.TopLeft); });

                // add non-siblings
                AddNeighbor(EdgeType.Top, () =>
                {
                    return GetParentsNeighbor(EdgeType.Top)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                AddNeighbor(EdgeType.Right, () =>
                {
                    return GetParentsNeighbor(EdgeType.Right)?.GetChildren()?.FirstOrDefault(c => c != null && HasAnySharedEdge(c));
                });
                break;
        }
    }
    #endregion

    public override string ToString()
    {
        string str = string.Empty;
        if (Parent == null)
        {
            str = Face.FaceType.ToString() + ".";
        }
        else
        {
            str += Parent.ToString() + ".";
        }
        return str + QuadType.ToString();
    }
}

public enum QuadType
{
    Root = -1, // no neighbors
    BottomLeft = 0,
    BottomRight = 1,
    TopRight = 2,
    TopLeft = 3
}

public enum EdgeType
{
    Top = 0,
    Bottom = 1,
    Left = 2,
    Right = 3,
    None = 4
}