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

/// <summary>
/// a <see cref="QuadFace"/> is a <see cref="Quad"/> Root that forms one side of a <see cref="QuadSphere"/>
/// </summary>
public class QuadFace : Quad
{
    public GameObject Player;
    public QuadFaceType FaceType;

    private Func<QuadFace>[] _neighborFaces = new Func<QuadFace>[4]; // Top, Bottom, Left, Right

    public override void Initialise()
    {
        AddNeighborFaces();

        QuadType = QuadType.Root;
        Face = this;
        Material = Root.SphereMaterial;
        Level = 0;
        CentrePoint = Vector3.zero;

        base.Initialise();
    }

    #region Neighbors
    private void AddNeighborFaces()
    {
        switch (FaceType)
        {
            case QuadFaceType.ZNegBack:
                AddNeighbor(EdgeType.Top, () => { return Root.GetQuadFace(QuadFaceType.YPosTop); });
                AddNeighbor(EdgeType.Bottom, () => { return Root.GetQuadFace(QuadFaceType.YNegBottom); });
                AddNeighbor(EdgeType.Left, () => { return Root.GetQuadFace(QuadFaceType.XNegLeft); });
                AddNeighbor(EdgeType.Right, () => { return Root.GetQuadFace(QuadFaceType.XPosRight); });
                break;
            case QuadFaceType.ZPosFront:
                AddNeighbor(EdgeType.Top, () => { return Root.GetQuadFace(QuadFaceType.YPosTop); });
                AddNeighbor(EdgeType.Bottom, () => { return Root.GetQuadFace(QuadFaceType.YNegBottom); });
                AddNeighbor(EdgeType.Left, () => { return Root.GetQuadFace(QuadFaceType.XPosRight); });
                AddNeighbor(EdgeType.Right, () => { return Root.GetQuadFace(QuadFaceType.XNegLeft); });
                break;
            case QuadFaceType.XNegLeft:
                AddNeighbor(EdgeType.Top, () => { return Root.GetQuadFace(QuadFaceType.YPosTop); });
                AddNeighbor(EdgeType.Bottom, () => { return Root.GetQuadFace(QuadFaceType.YNegBottom); });
                AddNeighbor(EdgeType.Left, () => { return Root.GetQuadFace(QuadFaceType.ZPosFront); });
                AddNeighbor(EdgeType.Right, () => { return Root.GetQuadFace(QuadFaceType.ZNegBack); });
                break;
            case QuadFaceType.XPosRight:
                AddNeighbor(EdgeType.Top, () => { return Root.GetQuadFace(QuadFaceType.YPosTop); });
                AddNeighbor(EdgeType.Bottom, () => { return Root.GetQuadFace(QuadFaceType.YNegBottom); });
                AddNeighbor(EdgeType.Left, () => { return Root.GetQuadFace(QuadFaceType.ZNegBack); });
                AddNeighbor(EdgeType.Right, () => { return Root.GetQuadFace(QuadFaceType.ZPosFront); });
                break;
            case QuadFaceType.YPosTop:
                AddNeighbor(EdgeType.Top, () => { return Root.GetQuadFace(QuadFaceType.ZNegBack); });
                AddNeighbor(EdgeType.Bottom, () => { return Root.GetQuadFace(QuadFaceType.ZPosFront); });
                AddNeighbor(EdgeType.Left, () => { return Root.GetQuadFace(QuadFaceType.XPosRight); });
                AddNeighbor(EdgeType.Right, () => { return Root.GetQuadFace(QuadFaceType.XNegLeft); });
                break;
            case QuadFaceType.YNegBottom:
                AddNeighbor(EdgeType.Top, () => { return Root.GetQuadFace(QuadFaceType.ZPosFront); });
                AddNeighbor(EdgeType.Bottom, () => { return Root.GetQuadFace(QuadFaceType.ZNegBack); });
                AddNeighbor(EdgeType.Left, () => { return Root.GetQuadFace(QuadFaceType.XPosRight); });
                AddNeighbor(EdgeType.Right, () => { return Root.GetQuadFace(QuadFaceType.XNegLeft); });
                break;
        }
    }

    private void AddNeighbor(EdgeType edge, Func<QuadFace> face)
    {
        _neighborFaces[(int)edge] = face;
    }

    public QuadFace GetNeighborFace(EdgeType edge)
    {
        return _neighborFaces[(int)edge]();
    }

    public override Quad GetNeighbor(EdgeType edgeType)
    {
        return GetNeighborFace(edgeType) as Quad;
    }
    #endregion

    #region Vertices
    public Vector2 GetUVOffset()
    {
        Vector2 offset = Vector2.zero;
        switch (FaceType)
        {
            case QuadFaceType.ZNegBack:
                offset = new Vector2(0.875F, 0.375F);
                break;
            case QuadFaceType.ZPosFront:
                offset = new Vector2(0.375F, 0.375F);
                break;
            case QuadFaceType.XNegLeft:
                offset = new Vector2(0.625F, 0.375F);
                break;
            case QuadFaceType.XPosRight:
                offset = new Vector2(0.125F, 0.375F);
                break;
            case QuadFaceType.YPosTop:
                offset = new Vector2(0.375F, 0.625F);
                break;
            case QuadFaceType.YNegBottom:
                offset = new Vector2(0.375F, 0.125F);
                break;
        }
        return offset;
    }

    public Vector3 ApplyElevation(Vector3 v, Vector2 uv)
    {
        if (Root != null)
        {
            return Root.ApplyElevation(v, uv);
        }

        v.z -= Elevation.Instance.Get(v, StartingNoiseAmplitude, StartingNoiseFrequency, SubdivisionDistances.Length, FastNoise.NoiseType.SimplexFractal);
        return v;
    }

    public Vector3 RelativePosition(Vector3 v)
    {
        if (Root != null)
        {
            return Root.transform.InverseTransformPoint(v);
        }
        return ToLocalVert(v);
    }

    public Vector3 InverseRelativePosition(Vector3 v)
    {
        if (Root != null)
        {
            return Root.transform.TransformPoint(v);
        }
        return ToWorldVert(v);
    }
    #endregion
}