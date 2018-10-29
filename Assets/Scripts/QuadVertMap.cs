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
using System.Collections.Concurrent;
using System.Linq;
using UnityEngine;

public class QuadVertMap
{
    private ConcurrentQueue<QuadVert> _quadVerts;

    public int Count { get { return _quadVerts.Count; } }

    public int ActiveCount
    {
        get
        {
            int count = 0;
            foreach (QuadVert qv in _quadVerts)
            {
                if (qv.Active)
                {
                    count++;
                }
            }
            return count;
        }
    }

    public Vector3[] Vertices { get { return _quadVerts.Select(q => q.Point).ToArray(); } }

    public QuadVertMap()
    {
        _quadVerts = new ConcurrentQueue<QuadVert>();
    }

    public QuadVert CreateOrGet(Vector3 v, bool activated = false, float tolerance = 0F)
    {
        QuadVert qv = null;
        if (!_quadVerts.Any(q => IsWithinTolerance(q.Point, v, tolerance)))
        {
            qv = new QuadVert
            {
                Point = v
            };
            
            _quadVerts.Enqueue(qv);
        }
        qv = _quadVerts.First(q => IsWithinTolerance(q.Point, v, tolerance));
        if (activated)
        {
            qv.Activate();
        }
        else
        {
            qv.Deactivate();
        }
        return qv;
    }

    public QuadVert this[int index]
    {
        get
        {
            if (index > -1 && index < Count)
            {
                return _quadVerts.ElementAt(index);
            }
            return null;
        }
    }

    public int GetIndex(QuadVert quadVert)
    {
        return GetIndex(quadVert.Point);
    }

    public int GetIndex(Vector3 point)
    {
        var tmp = _quadVerts.ToArray();
        QuadVert qv = tmp.FirstOrDefault(q => q.Point == point);
        if (qv != null)
        {
            return _quadVerts.ToList().IndexOf(qv);
        }
        return -1;
    }

    private bool IsWithinTolerance(Vector3 a, Vector3 b, float tolerance)
    {
        if (Math.Abs(a.x - b.x) > tolerance)
        {
            return false;
        }
        if (Math.Abs(a.y - b.y) > tolerance)
        {
            return false;
        }
        if (Math.Abs(a.z - b.z) > tolerance)
        {
            return false;
        }

        return true;
    }
}
