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
using UnityEngine;

public static class FlatArray
{
    public static int GetIndexFromRowCol(int currentRow, int currentColumn, int totalColumns)
    {
        return (totalColumns * currentRow) + currentColumn;
    }

    public static int GetIndexOnNextRow(int currentIndex, int columnSize)
    {
        return currentIndex + columnSize;
    }

    public static int GetIndexOnPreviousRow(int currentIndex, int columnSize)
    {
        return currentIndex - columnSize;
    }

    public static int GetMidpointIndex(int rowSize, int columnSize)
    {
        return Mathf.FloorToInt(((rowSize * columnSize) - 1) / 2);
    }

    public static int GetLeftMidpointIndex(int rowSize, int columnSize)
    {
        return GetMidpointIndex(rowSize, columnSize) - (Mathf.FloorToInt(columnSize / 2));
    }

    public static int GetRightMidpointIndex(int rowSize, int columnSize)
    {
        return GetMidpointIndex(rowSize, columnSize) + (Mathf.FloorToInt(columnSize / 2));
    }

    public static int GetTopMidpointIndex(int rowSize, int columnSize)
    {
        return GetMidpointIndex(rowSize, columnSize) + ((Mathf.FloorToInt(rowSize / 2) * columnSize));
    }

    public static int GetBottomMidpointIndex(int rowSize, int columnSize)
    {
        return GetMidpointIndex(rowSize, columnSize) - ((Mathf.FloorToInt(rowSize / 2) * columnSize));
    }

    public static int GetRowFromIndex(int index, int totalColumns)
    {
        return Mathf.FloorToInt(index / totalColumns);
    }

    public static int GetColumnFromIndex(int index, int totalColumns)
    {
        return index % totalColumns;
    }
}