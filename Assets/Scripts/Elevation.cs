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

public class Elevation
{
    public readonly FastNoise Noise;

    #region Singleton
    private static Elevation _inst;
    public static Elevation Instance
    {
        get
        {
            if (_inst == null)
            {
                _inst = new Elevation();
            }
            return _inst;
        }
    }
    #endregion

    public Elevation(int seed = 0)
    {
        Noise = new FastNoise(seed);
    }

    public float Get(Vector3 location, float amplitude, float frequency, int octaves, FastNoise.NoiseType type)
    {
        Noise.SetNoiseType(type);
        Noise.SetFrequency(frequency);
        Noise.SetFractalOctaves(octaves);
        float elevation = Noise.GetNoise(location.x, location.y, location.z) * amplitude;
        return elevation;
    }

    public float Get(Vector2 location, Texture2D bumpMap, float maxAmplitude)
    {
        int x = Mathf.FloorToInt(location.x * bumpMap.width);
        int y = Mathf.FloorToInt(location.y * bumpMap.height);
        return bumpMap.GetPixel(x, y).grayscale * maxAmplitude;
    }
}