QuadSphere
============
@Created: 29 Oct. 2018 (Unity version)

@Updated: 2023 (Threejs & @react-three/fiber)

@Author: Jason Holt Smith (<bicarbon8@gmail.com>)

DESCRIPTION:
------------
A QuadSphere (a sphere made up of a mesh cube whose vertices are adjusted into a spherical shape) with QuadTree-based level of detail support.

![QuadSphere](QuadSphere.png)

INSTRUCTIONS (Unity):
------------
- Create an Empty Game Object and add the _QuadSphere_ script to it
- within the _QuadSphere_ script, add some other game object that will be used to detect distances to the Quads in the QuadSphere
- Set the _Starting Subdivisions Per Quad_ to some odd number greater than 0 (11 is a good starting point)
- Set the _Radius_ to the desired radius for the Sphere
- in the _Subdivision Distances_ array, select a size for the number of levels of subdivision you desire (10 is a good starting point)
- starting from array index 0, add the distances to the QuadSphere that should cause it to subdivide to a higher level of detail (distances will never be less than the distance from the centre of a Quad to the corner so you can enter 1 for all values to achieve the look seen in the above image)
- if you wish to add a Material to the Sphere you can start from the existing example materials
- if the _Use Noise For Elevation_ tickbox is not selected, the Height Map (ParallaxMap) from the image will be used

------------

Thanks to: Jordan Peck, @Auburns for the [FastNoise](https://github.com/Auburns/FastNoise) library