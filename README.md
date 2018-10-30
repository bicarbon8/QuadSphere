QuadSphere
============
@Created: 29 Oct. 2018

@Author: Jason Holt Smith (<bicarbon8@gmail.com>)

DESCRIPTION:
------------
A set of Unity Game Engine scripts that generate a QuadSphere (a sphere made up of a mesh cube whose vertices are adjusted into a spherical shape) with QuadTree-based level of detail support.

![QuadSphere](QuadSphere.png)

[Video](https://youtu.be/6PiDhqQvgW4)

INSTRUCTIONS:
------------
- Create an Empty Game Object and add the _QuadSphere_ script to it
- within the _QuadSphere_ script, add some other game object that will be used to detect distances to the Quads in the QuadSphere
- Set the _Quads per Face_ to some value greater than 0 (3 is a good starting point)
- Set the _Starting Subdivisions Per Quad_ to some odd number greater than 0 (3 is a good starting point)
- Set the _Radius_ to the desired radius for the Sphere
- in the _Subdivision Distances_ array, select a size for the number of levels of subdivision you desire (3 is a good starting point)
- starting from array index 0, add the distances to the QuadSphere that should cause it to subdivide to a higher level of detail (for a sphere of size 100, values of 10, 5, and 1 would be a good start)