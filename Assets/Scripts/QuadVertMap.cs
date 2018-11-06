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

public class QuadVertMap
{
    private List<QuadVert> _quadVerts;

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
    public Vector2[] UVs { get { return _quadVerts.Select(q => q.UV).ToArray(); } }

    public QuadVertMap()
    {
        _quadVerts = new List<QuadVert>();
    }

    public void Add(QuadVert quadVert)
    {
        _quadVerts.Add(quadVert);
    }

    public void Remove(QuadVert quadVert)
    {
        _quadVerts.Remove(quadVert);
    }

    public QuadVert[] Get(Vector3 v, float tolerance = 0F)
    {
        return _quadVerts.Where(q => IsWithinTolerance(q.Point, v, tolerance)).ToArray();
    }

    public void Activate(QuadVert qv, float tolerance = 0F)
    {
        Activate(qv.Point, tolerance);
    }
    public void Activate(Vector3 v, float tolerance = 0F)
    {
        QuadVert[] verts = Get(v, tolerance);
        foreach (QuadVert qv in verts)
        {
            qv.Active = true;
        }
    }

    public void Deactivate(QuadVert qv, float tolerance = 0F)
    {
        Deactivate(qv.Point, tolerance);
    }
    public void Deactivate(Vector3 v, float tolerance = 0F)
    {
        QuadVert[] verts = Get(v, tolerance);
        foreach (QuadVert qv in verts)
        {
            qv.Active = false;
        }
    }

    public bool IsActive(QuadVert qv, float tolerance = 0F)
    {
        return IsActive(qv.Point, tolerance);
    }
    public bool IsActive(Vector3 v, float tolerance = 0F)
    {
        return Get(v, tolerance).Any(qv => qv.Active);
    }

    public Quad[] GetUsers(QuadVert qv, float tolerance = 0F)
    {
        return GetUsers(qv.Point, tolerance);
    }
    public Quad[] GetUsers(Vector3 v, float tolerance = 0F)
    {
        HashSet<Quad> users = new HashSet<Quad>();
        QuadVert[] verts = Get(v, tolerance);
        foreach (QuadVert qv in verts)
        {
            if (!users.Contains(qv.User))
            {
                users.Add(qv.User);
            }
        }
        return users.ToArray();
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
        return _quadVerts.ToList().IndexOf(quadVert);
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

    public QuadVert AddMidPoint(bool activated = false, float tolerance = 0F, params QuadVert[] quadVerts)
    {
        Vector3 avgPoint = Vector3.zero;
        Vector2 avgUv = Vector2.zero;
        foreach (QuadVert qv in quadVerts)
        {
            avgPoint += qv.Point;
            avgUv += qv.UV;
        }
        avgPoint /= quadVerts.Length;
        avgUv /= quadVerts.Length;

        QuadVert quadVert = new QuadVert
        {
            Point = avgPoint,
            UV = avgUv,
            User = quadVerts.First().User,
            Active = activated
        };
        Add(quadVert);
        return quadVert;
    }
}
