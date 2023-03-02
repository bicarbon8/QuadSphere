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
using UnityEngine;

public static class Extensions
{
    public static Vector3 Clone(this Vector3 v)
    {
        return new Vector3(v.x, v.y, v.z);
    }

    /// <summary>
    /// returns a <see cref="Vector3"/> on the line defined by <see cref="lineStart"/> and
    /// <see cref="lineEnd"/> that is closest to the passed in <see cref="v"/>
    /// </summary>
    /// <param name="v">the location to find a point closest to</param>
    /// <param name="lineStart">the starting point of the line</param>
    /// <param name="lineEnd">the ending point of the line</param>
    /// <returns>the closest point on the line to the passed in <see cref="v"/></returns>
    public static Vector3 NearestPointOnLine(this Vector3 v, Vector3 lineStart, Vector3 lineEnd)
    {
        if (lineStart == lineEnd)
        {
            return lineStart;
        }

        var line = (lineEnd - lineStart);
        var len = line.magnitude;
        line.Normalize();

        var pnt = v - lineStart;
        var d = Vector3.Dot(pnt, line);
        d = Mathf.Clamp(d, 0f, len);
        return lineStart + line * d;
    }
}
