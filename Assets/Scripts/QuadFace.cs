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
/// a <see cref="QuadFace"/> is made up of multiple <see cref="Quad"/> objects all welded together
/// </summary>
public class QuadFace
{
    private float _size;
    private GameObject _player;
    private int _quadsPerRow;
    private int _startingSubdivisions;
    private float[] _subdivisionDistances;
    private QuadFaceType _type;
    private QuadSphere _parent;

    private Quad[] _quads;
    private QuadVertMap _map;

    public QuadFace(QuadSphere parent, QuadFaceType type, float size, GameObject player, int quadsPerRow, int startingSubdivisions, float[] subdivisionDistances, ref QuadVertMap map)
    {
        _parent = parent;
        _type = type;
        _size = size;
        _player = player;
        _quadsPerRow = quadsPerRow;
        _startingSubdivisions = startingSubdivisions;
        _subdivisionDistances = subdivisionDistances;
        _map = map;

        _quads = new Quad[_quadsPerRow * _quadsPerRow];
        float x = 0F;
        float y = 0F;
        float z = 0F;

        for (var row = 0; row < _quadsPerRow; row++)
        {
            for (var col = 0; col < _quadsPerRow; col++)
            {
                int index = FlatArray.GetIndexFromRowCol(row, col, _quadsPerRow);

                switch (_type)
                {
                    case QuadFaceType.ZNegBack:
                        x = (-_size / 2) + ((_size / _quadsPerRow) * col);
                        y = (-_size / 2) + ((_size / _quadsPerRow) * row);
                        z = -_size / 2;
                        break;
                    case QuadFaceType.ZPosFront:
                        x = (_size / 2) - ((_size / _quadsPerRow) * col);
                        y = (-_size / 2) + ((_size / _quadsPerRow) * row);
                        z = _size / 2;
                        break;
                    case QuadFaceType.XNegLeft:
                        x = -_size / 2;
                        y = (-_size / 2) + ((_size / _quadsPerRow) * row);
                        z = (_size / 2) - ((_size / _quadsPerRow) * col);
                        break;
                    case QuadFaceType.XPosRight:
                        x = _size / 2;
                        y = (-_size / 2) + ((_size / _quadsPerRow) * row);
                        z = -(_size / 2) + ((_size / _quadsPerRow) * col);
                        break;
                    case QuadFaceType.YPosTop:
                        x = (-_size / 2) + ((_size / _quadsPerRow) * col);
                        y = _size / 2;
                        z = -(_size / 2) + ((_size / _quadsPerRow) * row);
                        break;
                    case QuadFaceType.YNegBottom:
                        x = (-_size / 2) + ((_size / _quadsPerRow) * col);
                        y = -_size / 2;
                        z = (_size / 2) - ((_size / _quadsPerRow) * row);
                        break;
                }
                
                var q = new Quad(this, 0, null, QuadType.Root, 0, _size / _quadsPerRow, _startingSubdivisions, _subdivisionDistances, ref _map, new Vector3(x, y, z));

                _quads[index] = q;
            }
        }
    }

    public QuadFaceType GetFaceType()
    {
        return _type;
    }

    public float GetSize()
    {
        return _size;
    }

    public Quad[] GetQuads()
    {
        return _quads;
    }

    public QuadSphere GetParent()
    {
        return _parent;
    }

    public async Task<bool> UpdateAsync(Vector3 playerPosition)
    {
        var t = Task.Run<bool>(() => Update(playerPosition));
        return await t;
    }
    public bool Update(Vector3 playerPosition)
    {
        List<bool> updated = new List<bool>();
        if (_quads != null)
        {
            foreach (Quad q in _quads)
            {
                updated.Add(q.Update(playerPosition));
            }
        }

        return updated.Any(u => u == true);
    }

    public async Task<List<int>> GetTrianglesAsync()
    {
        var t = Task.Run(() => GetTriangles());
        return await t;
    }
    public List<int> GetTriangles()
    {
        List<int> triangles = new List<int>();
        foreach (Quad q in _quads)
        {
            triangles.AddRange(q.GetTriangles());
        }
        return triangles;
    }
}