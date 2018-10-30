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
using UnityEngine;

public class Quad : IDisposable
{
    public QuadVert[] Vertices; // all the standard verts
    private QuadVert[][] _edgeVertices;
    private QuadVert[][] _centreVertices; // starts disabled

    public QuadVert BottomLeft { get { return Vertices[0]; } }
    public QuadVert BottomRight { get { return Vertices[FlatArray.GetBottomRightIndex(_subdivisions + 2)]; } }
    public QuadVert TopLeft { get { return Vertices[FlatArray.GetTopLeftIndex(_subdivisions + 2, _subdivisions + 2)]; } }
    public QuadVert TopRight { get { return Vertices[FlatArray.GetTopRightIndex(_subdivisions + 2, _subdivisions + 2)]; } }
    private QuadVert _centre;
    public QuadVert Centre
    {
        get
        {
            if (_centre == null)
            {
                _centre = Vertices[FlatArray.GetMidpointIndex(_subdivisions + 2, _subdivisions + 2)];
            }
            return _centre;
        }
    }
    public QuadVert Left { get { return Vertices[FlatArray.GetLeftMidpointIndex(_subdivisions + 2, _subdivisions + 2)]; } }
    public QuadVert Right { get { return Vertices[FlatArray.GetRightMidpointIndex(_subdivisions + 2, _subdivisions + 2)]; } }
    public QuadVert Top { get { return Vertices[FlatArray.GetTopMidpointIndex(_subdivisions + 2, _subdivisions + 2)]; } }
    public QuadVert Bottom { get { return Vertices[FlatArray.GetBottomMidpointIndex(_subdivisions + 2, _subdivisions + 2)]; } }
    private QuadVert[] _leftEdge;
    public QuadVert[] LeftEdge
    {
        get
        {
            if (_leftEdge == null)
            {
                List<QuadVert> leftEdgeVerts = new List<QuadVert>();
                int index = 0;
                while (index < Vertices.Length)
                {
                    leftEdgeVerts.Add(Vertices[index]);
                    index = FlatArray.GetIndexOnNextRow(index, _subdivisions + 2);
                }
                _leftEdge = leftEdgeVerts.ToArray();
            }
            return _leftEdge;
        }
    }
    private QuadVert[] _rightEdge;
    public QuadVert[] RightEdge
    {
        get
        {
            if (_rightEdge == null)
            {
                List<QuadVert> rightEdgeVerts = new List<QuadVert>();
                int index = FlatArray.GetBottomRightIndex(_subdivisions + 2);
                while (index < Vertices.Length)
                {
                    rightEdgeVerts.Add(Vertices[index]);
                    index = FlatArray.GetIndexOnNextRow(index, _subdivisions + 2);
                }
                _rightEdge = rightEdgeVerts.ToArray();
            }
            return _rightEdge;
        }
    }
    private QuadVert[] _topEdge;
    public QuadVert[] TopEdge
    {
        get
        {
            if (_topEdge == null)
            {
                List<QuadVert> topEdgeVerts = new List<QuadVert>();
                int index = FlatArray.GetTopLeftIndex(_subdivisions + 2, _subdivisions + 2);
                while (index < Vertices.Length)
                {
                    topEdgeVerts.Add(Vertices[index]);
                    index++;
                }
                _topEdge = topEdgeVerts.ToArray();
            }
            return _topEdge;
        }
    }
    private QuadVert[] _bottomEdge;
    public QuadVert[] BottomEdge
    {
        get
        {
            if (_bottomEdge == null)
            {
                List<QuadVert> bottomEdgeVerts = new List<QuadVert>();
                int index = 0;
                while (index < _subdivisions + 2)
                {
                    bottomEdgeVerts.Add(Vertices[index]);
                    index++;
                }
                _bottomEdge = bottomEdgeVerts.ToArray();
            }
            return _bottomEdge;
        }
    }

    // the face we belong to
    private QuadFace _face;
    // our immediate parent node
    private Quad _parent;
    // Level 0 is top level node, Level 1 is a child of the top level node
    private int _level;
    // Size of one edge of quad in game units
    private float _size;
    // Starting number of subdivisions
    private int _subdivisions;

    // Type indicates quadrant this Quad represents: TopLeft, TopRight, BottomRight, BottomLeft
    private QuadType _type;
    private Quad[] _children; // max of 4
    private float _subdivisionDist;
    private readonly Vector3 _bottomLeft;
    private int _id;

    // Are we subdivided
    public bool HasChildren { get { return _children != null && _children.Any(c => c != null); } }
    public bool Active { get { return !HasChildren; } }

    private QuadVertMap _map;
    private float[] _subdivisionDistances;
    private HashSet<Quad>[] _neighborCache;

    public Quad(QuadFace face, int id, Quad parent, QuadType type, int level, float size, int subdivisions, float[] subdivisionDistances, ref QuadVertMap map, Vector3 bottomLeft)
    {
        _face = face;
        _id = id;
        _parent = parent;
        _type = type;
        _level = level;
        _size = size;
        _subdivisions = subdivisions;
        // only allow odd numbers of subdivisions as this simplifies the maths
        if (_subdivisions % 2 == 0)
        {
            _subdivisions++;
        }
        _subdivisionDistances = subdivisionDistances;
        if (_subdivisionDistances.Length > _level)
        {
            float minimumDistance = Mathf.Sqrt(Mathf.Pow(_size / 2, 2) + Mathf.Pow(_size / 2, 2));
            _subdivisionDist = _subdivisionDistances[_level] + minimumDistance;
        }
        else
        {
            _subdivisionDist = -1;
        }

        _map = map;
        _bottomLeft = bottomLeft;

        Vertices = new QuadVert[(_subdivisions + 2) * (_subdivisions + 2)];
        _children = new Quad[4];
        _edgeVertices = new QuadVert[4][];
        for (int i = 0; i < _edgeVertices.Length; i++)
        {
            _edgeVertices[i] = new QuadVert[_subdivisions+1];
        }
        _centreVertices = new QuadVert[4][];
        for (int i = 0; i < _centreVertices.Length; i++)
        {
            _centreVertices[i] = new QuadVert[_subdivisions+1];
        }
        _neighborCache = new HashSet<Quad>[4];
        for (int i = 0; i < _neighborCache.Length; i++)
        {
            _neighborCache[i] = new HashSet<Quad>();
        }

        AddVertices();

        UpdateNeighborCache();

        ActivateEdgeFanVerts();
    }

    /// <summary>
    /// method returns the highest level of this Quad or any of its children
    /// </summary>
    public int GetDepth()
    {
        if (HasChildren)
        {
            int highestLevel = 0;
            foreach (Quad child in _children)
            {
                int childLevel = child.GetDepth();
                if (childLevel > highestLevel)
                {
                    highestLevel = childLevel;
                }
            }
            return highestLevel;
        }
        else
        {
            return _level;
        }
    }

    public int GetLevel()
    {
        return _level;
    }

    public Quad GetParent()
    {
        return _parent;
    }

    public QuadType GetQuadType()
    {
        return _type;
    }

    public bool Update(Vector3 playerPosition)
    {
        List<bool> updated = new List<bool>();
        UpdateNeighborCache();

        if (Active)
        {
            DeactivateEdgeFanVerts();
            ActivateEdgeFanVerts();

            if (_subdivisionDistances.Length > _level)
            {
                if (ShouldSubdivide(playerPosition))
                {
                    Subdivide();
                    updated.Add(true);
                }
            }
        }
        else
        { 
            if (ShouldUnify(playerPosition))
            {
                Unify(playerPosition);
                updated.Add(true);
            }

            foreach (Quad child in _children)
            {
                if (child != null)
                {
                    updated.Add(child.Update(playerPosition));
                }
            }
        }

        return updated.Any(u => u == true);
    }

    public bool ShouldSubdivide(Vector3 playerPosition)
    {
        if (Active && _subdivisionDistances.Length > _level)
        {
            if (IsWithinSubdivisionDistance(playerPosition))
            {
                return true;
            }
        }
        return false;
    }

    public bool ShouldUnify(Vector3 playerPosition)
    {
        if (!Active)
        {
            if (IsWithinSubdivisionDistance(playerPosition))
            {
                return false;
            }

            if (ShouldRemainSubdividedForNeighbor(playerPosition))
            {
                return false;
            }
            return true;
        }
        return false;
    }

    /// <summary>
    /// called when adding LoD to mesh
    /// </summary>
    public void Subdivide()
    {
        // on Subdivision, all edge Vertices are always enabled
        ActivateAllQuadVerts();
        CreateChildQuads();

        // update neighbors
        UpdateNeighborsForSubdivision();

        UpdateNeighborCache();
        ActivateEdgeFanVerts();
    }

    private void UpdateNeighborsForSubdivision()
    {
        var neighbors = GetAllNeighbors();
        foreach (Quad neighbor in neighbors)
        {
            if (neighbor.GetLevel() < _level)
            {
                neighbor.Subdivide();
            }
            if (neighbor.GetLevel() <= _level)
            {
                neighbor.UpdateNeighborCache();
                neighbor.ActivateEdgeFanVerts();
            }
        }
    }

    /// <summary>
    /// called when removing LoD from mesh
    /// </summary>
    public void Unify(Vector3 playerPosition)
    {
        RemoveChildren();
        DeactivateEdgeFanVerts();

        // update neighbors
        UpdateNeighborsForUnification(playerPosition);

        DeactivateEdgeFanVerts();
        ActivateEdgeFanVerts();
    }

    private void UpdateNeighborsForUnification(Vector3 playerPosition)
    {
        var neighbors = GetAllNeighbors();
        foreach (Quad neighbor in neighbors)
        {
            // can't unify neighbor if the player is causing them to subdivide
            if (neighbor.GetParent() != null && neighbor.GetLevel() > _level + 1 && !neighbor.GetParent().IsWithinSubdivisionDistance(playerPosition))
            {
                neighbor.GetParent().Unify(playerPosition);
            }
            if (neighbor.GetParent() == null && neighbor.GetLevel() > _level + 1)
            {
                neighbor.GetParent().Unify(playerPosition);
            }

            neighbor.DeactivateEdgeFanVerts();
        }
    }

    private bool IsWithinSubdivisionDistance(Vector3 playerPosition)
    {
        Vector3 adjustedCentre = GetDistanceTestLocation();
        return Vector3.Distance(adjustedCentre, playerPosition) <= _subdivisionDist;
    }

    private Vector3 GetDistanceTestLocation()
    {
        return _face.GetParent().ApplyRotation(_face.GetParent().ApplyCurve(Centre.Point))[0];
    }

    public bool ShouldRemainSubdividedForNeighbor(Vector3 playerPosition)
    {
        if (!Active)
        {
            Quad[] neighbors = GetAllNeighbors();
            foreach (Quad neighbor in neighbors)
            {
                if (neighbor.GetLevel() > _level)
                {
                    // if we are here the neighbor MUST have a parent
                    if (neighbor.GetParent().IsWithinSubdivisionDistance(playerPosition))
                    {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private bool HasActiveEdgeVerts(EdgeType type)
    {
        return GetEdgeFanVerts(type).Any(v => v.Active);
    }

    public List<int> GetTriangles()
    {
        int pointsOnSide = _subdivisions + 2;
        List<int> tris = new List<int>();
        if (HasChildren)
        {
            for (var i = 0; i < _children.Length; i++)
            {
                var child = _children[i];
                if (child != null)
                {
                    tris.AddRange(child.GetTriangles());
                }
            }
        }
        else
        {
            int rows = _subdivisions + 1; // stop before last row of verts because last row has no triangles above it
            int cols = rows; // stop before last column of verts because last column has no triangles to the right of it
            for (int row = 0; row < rows; row++)
            {
                for (int col = 0; col < cols; col++)
                {
                    int index = FlatArray.GetIndexFromRowCol(row, col, cols+1);
                    //    |   |
                    // ---2---3---
                    //    |   |   
                    // ---0---1---
                    //    |   |
                    QuadVert zero = Vertices[index]; // bottom left vert
                    QuadVert one = Vertices[index + 1]; // bottom right vert
                    QuadVert two = Vertices[index + (_subdivisions + 2)]; // top left vert
                    QuadVert three = Vertices[index + (_subdivisions + 2) + 1]; // top right vert

                    if (col == 0) // left edge
                    {
                        if (row == 0)
                        {
                            // bottom left corner
                            tris.AddRange(GetBottomLeftTriangles(zero, one, two, three));
                        }
                        else if (row == rows - 1)
                        {
                            // row before top left corner
                            tris.AddRange(GetTopLeftTriangles(zero, one, two, three));
                        }
                        else
                        {
                            // left side
                            tris.AddRange(GetLeftEdgeTriangles(zero, one, two, three, row));
                        }
                    }
                    else if (col == cols - 1) // column before right edge
                    {
                        if (row == 0)
                        {
                            // column before bottom right corner
                            tris.AddRange(GetBottomRightTriangles(zero, one, two, three));
                        }
                        else if (row == rows - 1)
                        {
                            // column and row before top right corner
                            tris.AddRange(GetTopRightTriangles(zero, one, two, three));
                        }
                        else
                        {
                            // column before right edge
                            tris.AddRange(GetRightEdgeTriangles(zero, one, two, three, row));
                        }
                    }
                    else
                    {
                        if (row == 0)
                        {
                            // bottom edge
                            tris.AddRange(GetBottomEdgeTriangles(zero, one, two, three, col));
                        }
                        else if (row == rows - 1)
                        {
                            // row before top edge
                            tris.AddRange(GetTopEdgeTriangles(zero, one, two, three, col));
                        }
                        else
                        {
                            // everything else (should always be two triangles per quad)
                            tris.AddRange(GetTwoTriangles(zero, one, two, three));
                        }
                    }
                }
            }
        }
        return tris;
    }

    /// <summary>
    /// |   |
    /// 2---3---
    /// |   |   
    /// 0---1---
    /// </summary>
    private int[] GetBottomLeftTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);
        // if 'C' is Active draw fans
        // 2---3    2---3    2---3
        // |\ /|    |\ /|    |\ /|
        // A C |    A-C |    A-C |
        // |/|\|    |/ \|    |/|\|
        // 0-B-1 or 0-B-1 or 0-B-1
        var centres = GetCentreVerts(EdgeType.Bottom);
        if (centres != null && centres.Any())
        {
            var c = centres.First();
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Left).First();
                var b = GetEdgeFanVerts(EdgeType.Bottom).First();
                int aIndex = _map.GetIndex(a);
                int bIndex = _map.GetIndex(b);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                if (b.Active)
                {
                    tris.Add(bIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(bIndex);
                }
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(twoIndex);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                tris.Add(threeIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    ///    |   |
    /// ---2---3
    ///    |   |
    /// ---0---1
    /// </summary>
    private int[] GetBottomRightTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2---3    2---3    2---3
        // |\ /|    |\ /|    |\ /|
        // | C A    | C-A    | C-A
        // |/|\|    |/ \|    |/|\|
        // 0-B-1 or 0-B-1 or 0-B-1 
        var centres = GetCentreVerts(EdgeType.Bottom);
        if (centres != null && centres.Any())
        {
            var c = centres.Last();
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Right).First();
                var b = GetEdgeFanVerts(EdgeType.Bottom).Last();
                int aIndex = _map.GetIndex(a);
                int bIndex = _map.GetIndex(b);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                if (b.Active)
                {
                    tris.Add(bIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(bIndex);
                }
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    /// 2---3---
    /// |   |   
    /// 0---1---
    /// |   |
    /// </summary>
    private int[] GetTopLeftTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2-B-3    2-B-3    2-B-3
        // |\|/|    |\ /|    |\|/|
        // A C |    A-C |    A-C |
        // |/ \|    |/ \|    |/ \|
        // 0---1 or 0---1 or 0---1 
        var centres = GetCentreVerts(EdgeType.Top);
        if (centres != null && centres.Any())
        {
            var c = centres.First();
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Left).Last();
                var b = GetEdgeFanVerts(EdgeType.Top).First();
                int aIndex = _map.GetIndex(a);
                int bIndex = _map.GetIndex(b);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                if (b.Active)
                {
                    tris.Add(bIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(bIndex);
                }
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    /// ---2---3
    ///    |   |
    /// ---0---1
    ///    |   |
    /// </summary>
    private int[] GetTopRightTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2-B-3    2-B-3    2-B-3
        // |\|/|    |\ /|    |\|/|
        // | C A    | C-A    | C-A
        // |/ \|    |/ \|    |/ \|
        // 0---1 or 0---1 or 0---1 
        var centres = GetCentreVerts(EdgeType.Top);
        if (centres != null && centres.Any())
        {
            var c = centres.Last();
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Right).Last();
                var b = GetEdgeFanVerts(EdgeType.Top).Last();
                int aIndex = _map.GetIndex(a);
                int bIndex = _map.GetIndex(b);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                if (b.Active)
                {
                    tris.Add(bIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(bIndex);
                }
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    /// ---2---3---
    ///    |   |
    /// ---0---1---
    ///    |   |
    /// </summary>
    private int[] GetTopEdgeTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three, int index)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2-A-3    2-A-3
        // |\|/|    |  /|
        // | C |    | C |
        // |/ \|    |/  |
        // 0---1 or 0---1
        var centres = GetCentreVerts(EdgeType.Top);
        if (centres != null && centres.Length > index)
        {
            var c = centres[index];
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Top)[index];
                int aIndex = _map.GetIndex(a);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    ///    |   |
    /// ---2---3---
    ///    |   |
    /// ---0---1---
    /// </summary>
    private int[] GetBottomEdgeTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three, int index)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2---3    2---3
        // |\ /|    |  /|
        // | C |    | C |
        // |/|\|    |/  |
        // 0-A-1 or 0-A-1
        var centres = GetCentreVerts(EdgeType.Bottom);
        if (centres != null && centres.Length > index)
        {
            var c = centres[index];
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Bottom)[index];
                int aIndex = _map.GetIndex(a);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    /// |   |
    /// 2---3---
    /// |   |
    /// 0---1---
    /// |   |
    /// </summary>
    private int[] GetLeftEdgeTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three, int index)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2---3    2---3
        // |\ /|    |  /|
        // A-C |    A C |
        // |/ \|    |/  |
        // 0---1 or 0---1
        var centres = GetCentreVerts(EdgeType.Left);
        if (centres != null && centres.Length > index)
        {
            var c = centres[index];
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Left)[index];
                int aIndex = _map.GetIndex(a);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    ///    |   |
    /// ---2---3
    ///    |   |
    /// ---0---1
    ///    |   |
    /// </summary>
    private int[] GetRightEdgeTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three, int index)
    {
        List<int> tris = new List<int>();
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);

        // if 'C' is Active draw fans
        // 2---3    2---3
        // |\ /|    |  /|
        // | C-A    | C A
        // |/ \|    |/  |
        // 0---1 or 0---1
        var centres = GetCentreVerts(EdgeType.Right);
        if (centres != null && centres.Length > index)
        {
            var c = centres[index];
            if (c.Active)
            {
                var a = GetEdgeFanVerts(EdgeType.Right)[index];
                int aIndex = _map.GetIndex(a);
                int cIndex = _map.GetIndex(c);

                tris.Add(cIndex);
                tris.Add(twoIndex);
                tris.Add(threeIndex);

                tris.Add(cIndex);
                tris.Add(threeIndex);
                if (a.Active)
                {
                    tris.Add(aIndex);

                    // next triangle
                    tris.Add(cIndex);
                    tris.Add(aIndex);
                }
                tris.Add(oneIndex);

                tris.Add(cIndex);
                tris.Add(oneIndex);
                tris.Add(zeroIndex);

                tris.Add(cIndex);
                tris.Add(zeroIndex);
                tris.Add(twoIndex);
            }
            else
            {
                tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
            }
        }
        else
        {
            tris.AddRange(GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex));
        }

        return tris.ToArray();
    }

    /// <summary>
    /// draw two triangles with clockwise rotation
    /// 2 3     2-3
    ///  /|     |/
    /// 0-1 and 0 1
    /// </summary>
    private int[] GetTwoTriangles(QuadVert zero, QuadVert one, QuadVert two, QuadVert three)
    {
        int zeroIndex = _map.GetIndex(zero);
        int oneIndex = _map.GetIndex(one);
        int twoIndex = _map.GetIndex(two);
        int threeIndex = _map.GetIndex(three);
        return GetTwoTriangles(zeroIndex, oneIndex, twoIndex, threeIndex);
    }
    /// <summary>
    /// draw two triangles with clockwise rotation
    /// 2 3     2-3
    ///  /|     |/
    /// 0-1 and 0 1
    /// </summary>
    private int[] GetTwoTriangles(int zeroIndex, int oneIndex, int twoIndex, int threeIndex)
    {
        int[] tris = new int[6];

        tris[0] = zeroIndex;
        tris[1] = threeIndex;
        tris[2] = oneIndex;

        tris[3] = zeroIndex;
        tris[4] = twoIndex;
        tris[5] = threeIndex;

        return tris;
    }

    public bool ShouldDeactivateCentreVerts(EdgeType type)
    {
        if (Active)
        {
            QuadVert[] edgeFanVerts = GetEdgeFanVerts(type);
            if (edgeFanVerts != null && edgeFanVerts.Any(v => v.Active))
            {
                return false;
            }
            return true;
        }
        return false;
    }

    public bool ShouldActivateCentreVerts(EdgeType type)
    {
        if (Active && !GetCentreVerts(type).All(v => v.Active))
        {
            // if edges active, centre must be made active
            if (HasActiveEdgeVerts(type))
            {
                return true;
            }

            return false;
        }
        return false;
    }

    private bool ShouldDeactivateEdgeFanVerts(EdgeType edge)
    {
        if (Active)
        {
            QuadVert[] edgeFanVerts = GetEdgeFanVerts(edge);
            if (edgeFanVerts != null && edgeFanVerts.Any(v => v.Active))
            {
                Quad[] neighbors = GetNeighborSharingEdge(edge);
                foreach (Quad neighbor in neighbors)
                {
                    if (neighbor.GetLevel() > _level)
                    {
                        return false;
                    }
                }

                return true;
            }
        }
        return false;
    }

    private bool ShouldActivateEdgeFanVerts(EdgeType edge)
    {
        if (Active)
        {
            QuadVert[] edgeFanVerts = GetEdgeFanVerts(edge);
            QuadVert[] centreVerts = GetCentreVerts(edge);
            if (edgeFanVerts != null && (edgeFanVerts.Any(v => !v.Active) || (centreVerts.Any(v => !v.Active))))
            {
                Quad[] neighbors = GetNeighborSharingEdge(edge);
                foreach (Quad neighbor in neighbors)
                {
                    if (neighbor.GetLevel() > _level)
                    {
                        return true;
                    }
                }

                return false;
            }
        }
        return false;
    }

    private void ActivateAllQuadVerts()
    {
        for (int i = 0; i < Vertices.Length; i++)
        {
            Vertices[i].Activate();
        }
        for (int i = 0; i < _edgeVertices.Length; i++)
        {
            foreach (QuadVert qv in _edgeVertices[i])
            {
                qv.Activate();
            }
        }
        for (int i = 0; i < _centreVertices.Length; i++)
        {
            foreach (QuadVert qv in _centreVertices[i])
            {
                qv.Activate();
            }
        }
    }

    public bool ActivateEdgeFanVerts()
    {
        bool updated = false;
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            if (ShouldActivateEdgeFanVerts(edge))
            {
                QuadVert[] edgeFanVerts = GetEdgeFanVerts(edge);
                QuadVert[] centreVerts = GetCentreVerts(edge);
                if (edgeFanVerts != null && centreVerts != null)
                {
                    for (int j=0; j<edgeFanVerts.Length; j++)
                    {
                        edgeFanVerts[j].Activate();
                        centreVerts[j].Activate();
                    }
                }
                updated = true;
            }
        }
        return updated;
    }

    public bool DeactivateEdgeFanVerts()
    {
        bool updated = false;
        for (int i = 0; i < 4; i++)
        {
            EdgeType edge = (EdgeType)i;
            if (ShouldDeactivateEdgeFanVerts(edge))
            {
                QuadVert[] edgeFanVerts = GetEdgeFanVerts(edge);
                if (edgeFanVerts != null)
                {
                    for (int j=0; j<edgeFanVerts.Length; j++)
                    {
                        edgeFanVerts[j].Deactivate();
                    }
                }
                updated = true;
            }
        }

        updated = DeactivateCentreVerts() || updated;

        return updated;
    }

    public bool DeactivateCentreVerts()
    {
        bool updated = false;
        for (int i=0; i<4; i++)
        {
            EdgeType edge = (EdgeType)i;
            if (ShouldDeactivateCentreVerts(edge))
            {
                QuadVert[] centreVerts = GetCentreVerts(edge);
                if (centreVerts != null)
                {
                    for (int j=0; j<centreVerts.Length; j++)
                    {
                        // need to handle corner centres separately because they are shared between two sides
                        if (IsCornerCentre(centreVerts[j]))
                        {
                            switch ((EdgeType)i)
                            {
                                case EdgeType.Top:
                                case EdgeType.Bottom:
                                    if (j == 0)
                                    {
                                        if (ShouldDeactivateCentreVerts(EdgeType.Left))
                                        {
                                            centreVerts[j].Deactivate();
                                        }
                                    }
                                    else
                                    {
                                        if (ShouldDeactivateCentreVerts(EdgeType.Right))
                                        {
                                            centreVerts[j].Deactivate();
                                        }
                                    }
                                    break;
                                case EdgeType.Left:
                                case EdgeType.Right:
                                    if (j == 0)
                                    {
                                        if (ShouldDeactivateCentreVerts(EdgeType.Bottom))
                                        {
                                            centreVerts[j].Deactivate();
                                        }
                                    }
                                    else 
                                    {
                                        if (ShouldDeactivateCentreVerts(EdgeType.Top))
                                        {
                                            centreVerts[j].Deactivate();
                                        }
                                    }
                                    break;
                            }
                        }
                        else
                        {
                            centreVerts[j].Deactivate();
                        }
                    }
                }
                updated = true;
            }
        }
        return updated;
    }

    private bool IsCornerCentre(QuadVert qv)
    {
        int references = 0;
        for (int i=0; i<4; i++)
        {
            var centres = GetCentreVerts((EdgeType)i);
            if (centres.Contains(qv))
            {
                references++;
            }
        }
        // if more than one _centres array holds this vert then it is a corner centre
        return references > 1;
    }

    /// <summary>
    /// builds a flattened 2D array of vertices like the following:
    /// 
    /// v = Vector3 in 'Vertices' array (list)
    /// eb = Vector3 in '_edgeVertices[(int)EdgeType.Bottom]' array (list)
    /// el = Vector3 in '_edgeVertices[(int)EdgeType.Left]' array (list)
    /// er = Vector3 in '_edgeVertices[(int)EdgeType.Right]' array (list)
    /// et = Vector3 in '_edgeVertices[(int)EdgeType.Top]' array (list)
    /// cb = Vector3 in '_centreVertices[(int)EdgeType.Bottom]' array (list)
    /// 
    /// 12v-0et--13v-1et--14v-2et--15v
    /// |        |        |        |
    /// 2el 0ct  |   1ct  |   2ct  2er
    /// |   2cl  |        |   2cr  |
    /// 8v-------9v-------10v------11v
    /// |        |        |        |
    /// 1el 1cl  |        |   1cr  1er
    /// |        |        |        |
    /// 4v-------5v-------6v-------7v
    /// |   0cl  |        |   0cr  |
    /// 0el 0cb  |   1cb  |   2cb  0er     
    /// |        |        |        |
    /// 0v--0eb--1v--1eb--2v--2eb--3v
    /// 
    /// NOTE: <see cref="UpdateNeighborCache"/> must be called after this method to
    /// ensure that we properly detect the correct neighbors
    /// </summary>
    private void AddVertices()
    {
        // start from the passed in _bottomLeft Vector3 and build list of QuadVerts
        int rows = _subdivisions + 2;
        int cols = rows;
        float xOffset = 0F;
        float yOffset = 0F;
        float zOffset = 0F;

        for (int row = 0; row < rows; row++)
        {
            for (int col = 0; col < cols; col++)
            {
                int index = FlatArray.GetIndexFromRowCol(row, col, cols);

                Vector3 v = Vector3.zero;
                switch (_face.GetFaceType())
                {
                    case QuadFaceType.ZNegBack:
                        xOffset = _size / (_subdivisions + 1F); // positive
                        yOffset = _size / (_subdivisions + 1F); // positive

                        v = new Vector3((col * xOffset) + _bottomLeft.x, (row * yOffset) + _bottomLeft.y, _bottomLeft.z);
                        break;
                    case QuadFaceType.ZPosFront:
                        xOffset = -_size / (_subdivisions + 1F); // negative
                        yOffset = _size / (_subdivisions + 1F); // positive

                        v = new Vector3((col * xOffset) + _bottomLeft.x, (row * yOffset) + _bottomLeft.y, _bottomLeft.z);
                        break;
                    case QuadFaceType.XNegLeft:
                        yOffset = _size / (_subdivisions + 1F); // positive
                        zOffset = -_size / (_subdivisions + 1F); // negative

                        v = new Vector3(_bottomLeft.x, (row * yOffset) + _bottomLeft.y, (col * zOffset) + _bottomLeft.z);
                        break;
                    case QuadFaceType.XPosRight:
                        yOffset = _size / (_subdivisions + 1F); // positive
                        zOffset = _size / (_subdivisions + 1F); // positive

                        v = new Vector3(_bottomLeft.x, (row * yOffset) + _bottomLeft.y, (col * zOffset) + _bottomLeft.z);
                        break;
                    case QuadFaceType.YPosTop:
                        xOffset = _size / (_subdivisions + 1F); // positive
                        zOffset = _size / (_subdivisions + 1F); // positive

                        v = new Vector3((col * xOffset) + _bottomLeft.x, _bottomLeft.y, (row * zOffset) + _bottomLeft.z);
                        break;
                    case QuadFaceType.YNegBottom:
                        xOffset = _size / (_subdivisions + 1F); // positive
                        zOffset = -_size / (_subdivisions + 1F); // negative

                        v = new Vector3((col * xOffset) + _bottomLeft.x, _bottomLeft.y, (row * zOffset) + _bottomLeft.z);
                        break;
                }

                float tolerance = (Mathf.Abs(xOffset) / 4F);
                QuadVert qv = _map.CreateOrGet(v, true, tolerance);
                Vertices[index] = qv;

                #region Generate Edge and Centre Verts for LoD blending
                // if first row, add to bottom edge
                if (row == 0)
                {
                    // generate midpoint QuadVert on edge
                    if (col > 0 && col < cols)
                    {
                        var edgeMidpoint = (v + Vertices[index-1].Point) / 2; // avg between this point and previous
                        QuadVert midpoint = _map.CreateOrGet(edgeMidpoint, false, tolerance);
                        AddEdgeVert(EdgeType.Bottom, col-1, midpoint);
                    }
                }
                if (row == 1 && col > 0)
                {
                    // generate centre QuadVerts for bottom edges
                    var centrePoint = GenerateCentrePoint(index);
                    QuadVert centre = _map.CreateOrGet(centrePoint, false, tolerance);
                    AddCentreVert(EdgeType.Bottom, col-1, centre);
                }

                // if last row, add to top edge
                if (row == (rows - 1))
                {
                    // generate midpoint QuadVert on edge and generate QuadVert for centre
                    if (col > 0 && col < cols)
                    {
                        var edgeMidpoint = (v + Vertices[index-1].Point) / 2; // avg between this point and previous
                        QuadVert midpoint = _map.CreateOrGet(edgeMidpoint, false, tolerance);
                        AddEdgeVert(EdgeType.Top, col-1, midpoint);
                    }
                }
                if (row == (rows - 1) && col > 0)
                {
                    // generate centre QuadVerts for top edges
                    var centrePoint = GenerateCentrePoint(index);
                    QuadVert centre = _map.CreateOrGet(centrePoint, false, tolerance);
                    AddCentreVert(EdgeType.Top, col-1, centre);
                }

                // if first column, add to left edge
                if (col == 0)
                {
                    // generate midpoint QuadVert on edge and generate QuadVert for centre
                    if (row > 0 && row < rows)
                    {
                        var edgeMidpoint = (v + Vertices[FlatArray.GetIndexFromRowCol(row - 1, col, cols)].Point) / 2; // avg between this point and previous
                        QuadVert midpoint = _map.CreateOrGet(edgeMidpoint, false, tolerance);
                        AddEdgeVert(EdgeType.Left, row-1, midpoint);
                    }
                }
                if (col == 1 && row > 0)
                {
                    // generate centre QuadVerts for left edges
                    var centrePoint = GenerateCentrePoint(index);
                    QuadVert centre = _map.CreateOrGet(centrePoint, false, tolerance);
                    AddCentreVert(EdgeType.Left, row-1, centre);
                }

                // if last column, add to right edge
                if (col == (cols - 1))
                {
                    // generate midpoint QuadVert on edge and generate QuadVert for centre
                    if (row > 0 && row < rows)
                    {
                        var edgeMidpoint = (v + Vertices[FlatArray.GetIndexFromRowCol(row - 1, col, cols)].Point) / 2; // avg between this point and previous
                        QuadVert midpoint = _map.CreateOrGet(edgeMidpoint, false, tolerance);
                        AddEdgeVert(EdgeType.Right, row-1, midpoint);
                    }
                }
                if (col == (cols - 1) && row > 0)
                {
                    var centrePoint = GenerateCentrePoint(index);
                    QuadVert centre = _map.CreateOrGet(centrePoint, false, tolerance);
                    AddCentreVert(EdgeType.Right, row-1, centre);
                }
                #endregion
            }
        }

        // increment usages of QuadVerts so we know when we can deactivate
        foreach (QuadVert qv in Vertices)
        {
            qv.AddUser(this);
        }
        for (int i = 0; i < _edgeVertices.Length; i++)
        {
            foreach (QuadVert qv in _edgeVertices[i])
            {
                qv.AddUser(this);
            }
        }
        for (int i = 0; i < _centreVertices.Length; i++)
        {
            foreach (QuadVert qv in _centreVertices[i])
            {
                qv.AddUser(this);
            }
        }
    }

    /// <summary>
    /// starting from a top-right <see cref="QuadVert"/> in the <see cref="Vertices"/> array,
    /// get the previous 4 box forming verts and average them together:
    /// Ex: index = 3
    /// 
    /// 2---3
    /// |   |
    /// | C |
    /// |   |
    /// 0---1
    /// 
    /// NOTE: starting index of top-right must be used to ensure other verts already exist
    /// </summary>
    /// <param name="index"></param>
    /// <returns>the midpoint (average) of 4 points where <see cref="index"/> is the top-right</returns>
    private Vector3 GenerateCentrePoint(int index)
    {
        var centrePoint = (Vertices[index].Point + Vertices[index - 1].Point + Vertices[FlatArray.GetIndexOnPreviousRow(index, _subdivisions + 2)].Point + Vertices[FlatArray.GetIndexOnPreviousRow(index, _subdivisions + 2) - 1].Point) / 4;
        return centrePoint;
    }

    private float GetElevation(Vector3 location, float offset)
    {
        float smooth = 0.03F;
        Vector3 offsetLocation = new Vector3(location.x + offset, location.y + offset, location.z + offset);
        float elevation = Mathf.PerlinNoise(offsetLocation.x * smooth, offsetLocation.y * smooth);
        elevation += Mathf.PerlinNoise(offsetLocation.x * smooth, offsetLocation.z * smooth);

        return elevation * 10F;
    }

    private void AddEdgeVert(EdgeType type, int index, QuadVert qv)
    {
        _edgeVertices[(int)type][index] = qv;
    }

    public QuadVert[] GetEdgeFanVerts(EdgeType type)
    {
        return _edgeVertices[(int)type];
    }

    private void AddCentreVert(EdgeType type, int index, QuadVert qv)
    {
        _centreVertices[(int)type][index] = qv;
    }

    public QuadVert[] GetCentreVerts(EdgeType type)
    {
        return _centreVertices[(int)type];
    }

    private void CreateChildQuads()
    {
        float xOffset = 0F;
        float yOffset = 0F;
        float zOffset = 0F;

        switch (_face.GetFaceType())
        {
            case QuadFaceType.ZNegBack:
                xOffset = _size / 2F; // positive
                yOffset = _size / 2F; // positive

                GenerateChildren(_bottomLeft, // bottom left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y, _bottomLeft.z), // bottom right
                    new Vector3(_bottomLeft.x, _bottomLeft.y + yOffset, _bottomLeft.z), // top left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y + yOffset, _bottomLeft.z)); // top right
                break;
            case QuadFaceType.ZPosFront:
                xOffset = -_size / 2F; // negative
                yOffset = _size / 2F; // positive

                GenerateChildren(_bottomLeft, // bottom left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y, _bottomLeft.z), // bottom right
                    new Vector3(_bottomLeft.x, _bottomLeft.y + yOffset, _bottomLeft.z), // top left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y + yOffset, _bottomLeft.z)); // top right
                break;
            case QuadFaceType.XNegLeft:
                yOffset = _size / 2F; // positive
                zOffset = -_size / 2F; // negative

                GenerateChildren(_bottomLeft, // bottom left
                    new Vector3(_bottomLeft.x, _bottomLeft.y, _bottomLeft.z + zOffset), // bottom right
                    new Vector3(_bottomLeft.x, _bottomLeft.y + yOffset, _bottomLeft.z), // top left
                    new Vector3(_bottomLeft.x, _bottomLeft.y + yOffset, _bottomLeft.z + zOffset)); // top right
                break;
            case QuadFaceType.XPosRight:
                yOffset = _size / 2F; // positive
                zOffset = _size / 2F; // positive

                GenerateChildren(_bottomLeft, // bottom left
                    new Vector3(_bottomLeft.x, _bottomLeft.y, _bottomLeft.z + zOffset), // bottom right
                    new Vector3(_bottomLeft.x, _bottomLeft.y + yOffset, _bottomLeft.z), // top left
                    new Vector3(_bottomLeft.x, _bottomLeft.y + yOffset, _bottomLeft.z + zOffset)); // top right
                break;
            case QuadFaceType.YPosTop:
                xOffset = _size / 2F; // positive
                zOffset = _size / 2F; // positive

                GenerateChildren(_bottomLeft, // bottom left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y, _bottomLeft.z), // bottom right
                    new Vector3(_bottomLeft.x, _bottomLeft.y, _bottomLeft.z + zOffset), // top left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y, _bottomLeft.z + zOffset)); // top right
                break;
            case QuadFaceType.YNegBottom:
                xOffset = _size / 2F; // positive
                zOffset = -_size / 2F; // negative

                GenerateChildren(_bottomLeft, // bottom left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y, _bottomLeft.z), // bottom right
                    new Vector3(_bottomLeft.x, _bottomLeft.y, _bottomLeft.z + zOffset), // top left
                    new Vector3(_bottomLeft.x + xOffset, _bottomLeft.y + yOffset, _bottomLeft.z + zOffset)); // top right
                break;
        }
    }

    private void GenerateChildren(Vector3 bottomLeftOrigin, Vector3 bottomRightOrigin, Vector3 topLeftOrigin, Vector3 topRightOrigin)
    {
        //Add bottom left (southwest) child
        AddChild(QuadType.BottomLeft, new Quad(_face, 0, this, QuadType.BottomLeft, _level + 1, (_size / 2), _subdivisions, _subdivisionDistances, ref _map, bottomLeftOrigin));

        //Add bottom right (southeast) child
        AddChild(QuadType.BottomRight, new Quad(_face, 1, this, QuadType.BottomRight, _level + 1, (_size / 2), _subdivisions, _subdivisionDistances, ref _map, bottomRightOrigin));

        //Add top left (northwest) child
        AddChild(QuadType.TopLeft, new Quad(_face, 2, this, QuadType.TopLeft, _level + 1, (_size / 2), _subdivisions, _subdivisionDistances, ref _map, topLeftOrigin));

        //Add top right (northeast) child
        AddChild(QuadType.TopRight, new Quad(_face, 3, this, QuadType.TopRight, _level + 1, (_size / 2), _subdivisions, _subdivisionDistances, ref _map, topRightOrigin));
    }

    private void AddChild(QuadType type, Quad child)
    {
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

    public Quad[] GetChildrenOnEdge(EdgeType edgeType)
    {
        List<Quad> chilren = new List<Quad>();
        if (HasChildren)
        {
            switch (edgeType)
            {
                case EdgeType.Top:
                    chilren.Add(GetChild(QuadType.TopLeft));
                    chilren.Add(GetChild(QuadType.TopRight));
                    break;
                case EdgeType.Bottom:
                    chilren.Add(GetChild(QuadType.BottomLeft));
                    chilren.Add(GetChild(QuadType.BottomRight));
                    break;
                case EdgeType.Left:
                    chilren.Add(GetChild(QuadType.TopLeft));
                    chilren.Add(GetChild(QuadType.BottomLeft));
                    break;
                case EdgeType.Right:
                    chilren.Add(GetChild(QuadType.TopRight));
                    chilren.Add(GetChild(QuadType.BottomRight));
                    break;
            }
        }
        return chilren.ToArray(); ;
    }

    public void RemoveChildren()
    {
        for (int i=0; i<_children.Length; i++)
        {
            if (_children[i] != null)
            {
                if (_children[i].HasChildren)
                {
                    _children[i].RemoveChildren();
                }
                _children[i].Dispose();
                _children[i] = null;
            }
        }
    }

    public Quad[] GetNeighborSharingEdge(EdgeType edgeType)
    {
        return _neighborCache[(int)edgeType].ToArray();
    }

    public Quad[] GetAllNeighbors()
    {
        HashSet<Quad> neighbors = new HashSet<Quad>();
        foreach (Quad n in _neighborCache[(int)EdgeType.Top])
        {
            if (!neighbors.Contains(n))
            {
                neighbors.Add(n);
            }
        }
        foreach (Quad n in _neighborCache[(int)EdgeType.Bottom])
        {
            if (!neighbors.Contains(n))
            {
                neighbors.Add(n);
            }
        }
        foreach (Quad n in _neighborCache[(int)EdgeType.Left])
        {
            if (!neighbors.Contains(n))
            {
                neighbors.Add(n);
            }
        }
        foreach (Quad n in _neighborCache[(int)EdgeType.Right])
        {
            if (!neighbors.Contains(n))
            {
                neighbors.Add(n);
            }
        }
        return neighbors.ToArray();
    }

    /// <summary>
    /// update cache of all 'Active' neighbors that share edgeFan and non-corner edge <see cref="QuadVert"/>
    /// positions with this <see cref="Quad"/>. This excludes any decendant <see cref="Quad"/> objects
    /// </summary>
    /// <param name="edge">the edge of this <see cref="Quad"/> to inspect</param>
    private void UpdateNeighborsSharingEdge(EdgeType edge)
    {
        // get LoD edge verts
        List<QuadVert> edgeVerts = new List<QuadVert>();
        QuadVert[] edgeFanVerts = GetEdgeFanVerts(edge);
        if (edgeFanVerts != null && edgeFanVerts.Any())
        {
            edgeVerts.AddRange(edgeFanVerts);
        }
        // get standard edge verts (minus the corners since their users may not be on this edge)
        switch (edge)
        {
            case EdgeType.Top:
                edgeVerts.AddRange(TopEdge);
                edgeVerts.Remove(TopLeft);
                edgeVerts.Remove(TopRight);
                break;
            case EdgeType.Bottom:
                edgeVerts.AddRange(BottomEdge);
                edgeVerts.Remove(BottomLeft);
                edgeVerts.Remove(BottomRight);
                break;
            case EdgeType.Left:
                edgeVerts.AddRange(LeftEdge);
                edgeVerts.Remove(TopLeft);
                edgeVerts.Remove(BottomLeft);
                break;
            case EdgeType.Right:
                edgeVerts.AddRange(RightEdge);
                edgeVerts.Remove(TopRight);
                edgeVerts.Remove(BottomRight);
                break;
        }

        List<Quad> edgeNeighbors = new List<Quad>();
        var quadFamilyTree = GetDecendants(this);
        foreach (QuadVert qv in edgeVerts)
        {
            Quad[] otherActiveUsers = qv.GetUsers().Where(u => u.Active && !quadFamilyTree.Contains(u)).ToArray();

            foreach (Quad user in otherActiveUsers)
            {
                edgeNeighbors.Add(user);
            }
        }
        _neighborCache[(int)edge] = new HashSet<Quad>(edgeNeighbors.Distinct());
    }

    private Quad[] GetDecendants(Quad root)
    {
        List<Quad> filtered = new List<Quad>();

        if (root.HasChildren)
        {
            foreach (Quad child in root.GetChildren())
            {
                if (child != null)
                {
                    filtered.AddRange(GetDecendants(child));
                }
            }
        }

        filtered.Add(root);

        return filtered.ToArray();
    }

    private void UpdateNeighborCache()
    {
        UpdateNeighborsSharingEdge(EdgeType.Top);
        UpdateNeighborsSharingEdge(EdgeType.Bottom);
        UpdateNeighborsSharingEdge(EdgeType.Left);
        UpdateNeighborsSharingEdge(EdgeType.Right);
    }

    /// <summary>
    /// remove our usage of any <see cref="QuadVert"/> objects in the <see cref="QuadVertMap"/>
    /// </summary>
    public void Dispose()
    {
        // decrement usage of QuadVerts
        foreach (QuadVert qv in Vertices)
        {
            qv.RemoveUser(this);
        }
        for (int i = 0; i < _edgeVertices.Length; i++)
        {
            for (int j = 0; j < _edgeVertices[i].Length; j++)
            {
                _edgeVertices[i][j].RemoveUser(this);
            }
            _edgeVertices[i] = null;
        }
        for (int i = 0; i < _centreVertices.Length; i++)
        {
            for (int j = 0; j < _centreVertices[i].Length; j++)
            {
                _centreVertices[i][j].RemoveUser(this);
            }
            _centreVertices[i] = null;
        }
    }

    public override string ToString()
    {
        string str = string.Empty;
        if (GetParent() == null)
        {
            str = _face.GetFaceType().ToString() + ".";
        }
        else
        {
            str += GetParent().ToString() + ".";
        }
        return str + _id;
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
    Right = 3
}