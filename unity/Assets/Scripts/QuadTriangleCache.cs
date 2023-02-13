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

public class QuadTriangleCache
{
    private int[] _centreTriangleCache = null;
    private int[][] _triangleCache = new int[16][];
    private readonly int _pointsOnSide;

    public QuadTriangleCache(int pointsOnSide)
    {
        _pointsOnSide = pointsOnSide;
        // generate Centre triangles
        GenerateCentreTriangles();

        // Case 0 is where all edges are active (no edge fans)
        GenerateCase(0, true, true, true, true);

        // Case 1 is where only top edge is deactivated
        GenerateCase(1, false, true, true, true);

        // Case 2 is where only right edge is deactivated
        GenerateCase(2, true, true, true, false);

        // Case 3 is where top and right are deactivated
        GenerateCase(3, false, true, true, false);

        // Case 4 is where only bottom edge is deactivated
        GenerateCase(4, true, false, true, true);

        // Case 5 is where top and bottom are deactivated
        GenerateCase(5, false, false, true, true);

        // Case 6 is where bottom and right are deactivated
        GenerateCase(6, true, false, true, false);

        // Case 7 is where top, right and bottom are deactivated
        GenerateCase(7, false, false, true, false);

        // Case 8 is where only left edge is deactivated
        GenerateCase(8, true, true, false, true);

        // Case 9 is where top and left are deactivated
        GenerateCase(9, false, true, false, true);

        // Case 10 is where left and right are deactivated
        GenerateCase(10, true, true, false, false);

        // Case 11 is where top, left and right are deactivate
        GenerateCase(11, false, true, false, false);

        // Case 12 is where left and bottom are deactivated
        GenerateCase(12, true, false, false, true);

        // Case 13 is where top, left and bottom are deactivated
        GenerateCase(13, false, false, false, true);

        // Case 14 is where left, bottom and right are deactivated
        GenerateCase(14, true, false, false, false);

        // Case 15 is where all sides are deactivated
        GenerateCase(15, false, false, false, false);
    }

    public int[] GetTrianglesForCase(int bitMask)
    {
        return _triangleCache[bitMask];
    }

    private void GenerateCase(int caseId, bool topActive, bool bottomActive, bool leftActive, bool rightActive)
    {
        int rows = _pointsOnSide - 4;
        int cols = _pointsOnSide - 4;
        List<int> tris = new List<int>(_centreTriangleCache);

        if (rows > 0)
        {
            // bottom left
            tris.AddRange(GetTriangleFan(0, bottomActive, true, true, leftActive));

            // bottom
            for (int col = 2; col < cols; col += 2)
            {
                tris.AddRange(GetTriangleFan(col, bottomActive, true, true, true));
            }

            // bottom right
            tris.AddRange(GetTriangleFan(_pointsOnSide - 3, bottomActive, rightActive, true, true));

            // right
            for (int row = 2; row < rows; row += 2)
            {
                tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(row, _pointsOnSide - 3, _pointsOnSide), true, rightActive, true, true));
            }

            // top right
            tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(_pointsOnSide - 3, _pointsOnSide - 3, _pointsOnSide), true, rightActive, topActive, true));

            // top
            for (int col = 2; col < cols; col += 2)
            {
                tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(_pointsOnSide - 3, col, _pointsOnSide), true, true, topActive, true));
            }

            // top left
            tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(_pointsOnSide - 3, 0, _pointsOnSide), true, true, topActive, leftActive));

            // left
            for (int row = 2; row < rows; row += 2)
            {
                tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(row, 0, _pointsOnSide), true, true, true, leftActive));
            }
        }
        else if (rows == 0)
        {
            // bottom left
            tris.AddRange(GetTriangleFan(0, bottomActive, true, true, leftActive));

            // bottom right
            tris.AddRange(GetTriangleFan(_pointsOnSide - 3, bottomActive, rightActive, true, true));

            // top right
            tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(_pointsOnSide - 3, _pointsOnSide - 3, _pointsOnSide), true, rightActive, topActive, true));

            // top left
            tris.AddRange(GetTriangleFan(FlatArray.GetIndexFromRowCol(_pointsOnSide - 3, 0, _pointsOnSide), true, true, topActive, leftActive));
        }
        else
        {
            tris.AddRange(GetTriangleFan(0, bottomActive, rightActive, topActive, leftActive));
        }

        _triangleCache[caseId] = tris.ToArray();
    }

    /// <summary>
    /// draw a fan of triangles like the following, leaving edges empty
    ///   | | |
    /// ---------
    ///   |\|/|
    /// ---------
    ///   |/|\|
    /// ---------
    ///   | | |
    /// </summary>
    private void GenerateCentreTriangles()
    {
        if (_centreTriangleCache == null)
        {
            List<int> tris = new List<int>();
            int rows = _pointsOnSide - 4; // stop before last 2 rows of verts
            int cols = rows; // stop before last 2 columns of verts
            // skip the edge triangles as they are special case and just generate the centre triangle fans
            for (int row = 2; row < rows; row+=2)
            {
                for (int col = 2; col < cols; col+=2)
                {
                    tris.AddRange(GetTriangleFan(
                        FlatArray.GetIndexFromRowCol(row, col, _pointsOnSide),
                        true, true, true, true));
                }
            }
            _centreTriangleCache = tris.ToArray();
        }
    }

    /// <summary>
    /// draw a fan of triangles like the following
    /// all active          |left inactive         |left & bottom inactive|  all inactive        
    /// 10--11--12  13  14  |  10--11--12  13  14  |  10--11--12  13  14  |  10--11--12  13  14
    /// |\  |  /|           |  |\  |  /|           |  |\  |  /|           |  |\     /|         
    /// | \ | / |           |  | \ | / |           |  | \ | / |           |  | \   / |         
    /// |  \|/  |           |  |  \|/  |           |  |  \|/  |           |  |  \ /  |         
    /// 5---6---7   8   9   |  5   6---7   8   9   |  5   6---7   8   9   |  5   6   7   8   9 
    /// |  /|\  |           |  |  /|\  |           |  |  / \  |           |  |  / \  |         
    /// | / | \ |           |  | / | \ |           |  | /   \ |           |  | /   \ |         
    /// |/  |  \|           |  |/  |  \|           |  |/     \|           |  |/     \|         
    /// 0---1---2   3   4   |  0---1---2   3   4   |  0---1---2   3   4   |  0---1---2   3   4 
    /// </summary>
    /// <param name="bottomLeftIndex">the bottom left point in the fan</param>
    /// <returns></returns>
    private int[] GetTriangleFan(int bottomLeftIndex, bool bottomActive, bool rightActive, bool topActive, bool leftActive)
    {
        List<int> tris = new List<int>();

        int centreIndex = FlatArray.GetIndexOnNextRow(bottomLeftIndex, _pointsOnSide) + 1;
        int bottomRightIndex = bottomLeftIndex + 2;
        int topLeftIndex = FlatArray.GetIndexOnNextRow(FlatArray.GetIndexOnNextRow(bottomLeftIndex, _pointsOnSide), _pointsOnSide);
        int topRightIndex = topLeftIndex + 2;

        // bottom fans
        tris.Add(bottomLeftIndex);
        tris.Add(centreIndex);
        if (bottomActive)
        {
            tris.Add(bottomLeftIndex + 1);

            tris.Add(bottomLeftIndex + 1);
            tris.Add(centreIndex);
        }
        tris.Add(bottomLeftIndex + 2);

        // right fans
        tris.Add(bottomRightIndex);
        tris.Add(centreIndex);
        if (rightActive)
        {
            tris.Add(FlatArray.GetIndexOnNextRow(bottomRightIndex, _pointsOnSide));

            tris.Add(FlatArray.GetIndexOnNextRow(bottomRightIndex, _pointsOnSide));
            tris.Add(centreIndex);
        }
        tris.Add(topRightIndex);

        // top fans
        tris.Add(topRightIndex);
        tris.Add(centreIndex);
        if (topActive)
        {
            tris.Add(topRightIndex - 1);

            tris.Add(topRightIndex - 1);
            tris.Add(centreIndex);
        }
        tris.Add(topLeftIndex);

        // left fans
        tris.Add(topLeftIndex);
        tris.Add(centreIndex);
        if (leftActive)
        {
            tris.Add(FlatArray.GetIndexOnPreviousRow(topLeftIndex, _pointsOnSide));

            tris.Add(FlatArray.GetIndexOnPreviousRow(topLeftIndex, _pointsOnSide));
            tris.Add(centreIndex);
        }
        tris.Add(bottomLeftIndex);

        return tris.ToArray();
    }
}