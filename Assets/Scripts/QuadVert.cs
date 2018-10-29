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

public class QuadVert
{
    private HashSet<Quad> _users = new HashSet<Quad>();

    public bool Active { get; private set; }
    public Vector3 Point { get; set; }
    public bool InUse { get { return Usages > 0; } }
    public int Usages { get { return _users.Count; } }

    public bool AddUser(Quad user)
    {
        return _users.Add(user);
    }
    public bool RemoveUser(Quad user)
    {
        return _users.Remove(user);
    }

    public void Activate()
    {
        Active = true;
    }
    public void Deactivate()
    {
        Active = false;
    }

    public Quad[] GetUsers()
    {
        return _users.ToArray();
    }

    public override string ToString()
    {
        return Point.ToString();
    }
}
