# QuadSphere
> @Created: 29 Oct. 2018 (Unity version)

> @Updated: 2023 (Threejs & @react-three/fiber)

>@Author: Jason Holt Smith (<bicarbon8@gmail.com>)

## Description

A QuadSphere (a sphere made up of a mesh cube whose vertices are adjusted into a spherical shape) with QuadTree-based level of detail support.

![QuadSphere](QuadSphere.png)

## Installation
`npm install quadsphere`

## QuadSphereMesh
a `@react-three/fiber` compatible `THREE.Mesh` that can be used directly from the `Canvas` to render a `QuadSphere`
### Properties
all `@react-three/fiber` `MeshProps` are supported in addition to the following:
- `radius` one half the number of units width of the rendered `QuadSphere` (without factoring in any displacement material offsets)
- `segments` the number of divisions plus edges in each direction of each `Quad` of the `QuadSphere` (i.e. a value of `3` means one division and two edges when all sides activated). values must be odd numbers starting from 3 or greater
- `maxlevel` the maximum depth minus 1, starting from 0 meaning no subdivision allowed, that each `Quad` in the `QuadSphere` can be. a value of 2 means that the top-level `Quad` can be subdivided as can it's child quads, but no further subdivision is allowed
- `textureMapping` a value of either `unified` _(default)_ or `split` which indicates the type of UVs to generate for the `QuadSphere`. if `unified` then an unwrapped cube texture should be used [example](./public/assets/EarthTexture.png), but if `split` then six separate materials should be supplied each mapping to a face of the `QuadSphere` in the following order: [`positive-x`, `negative-x`, `positive-y`, `negative-y`, `positive-z`, `negative-z`]
- `onCreateMesh` a function that will be called every time a new `THREE.Mesh` is created (each subdivision or unification results in the need to generate a new mesh otherwise the view will not update)
- `onCreateSphere` a function that will be called every time a new `QuadSphereGeometry` is created (changing any of the above `props` values results in a new `QuadSphereGeometry` being created and the prior being disposed of)
### Usage
```typescript
import { Canvas, useLoader } from '@react-three/fiber';
import { QuadSphereMesh } from 'quadsphere';

function App() {
    const texture = useLoader(THREE.TextureLoader, `./assets/texture.png`);
    const bump = useLoader(THREE.TextureLoader, `./assets/bump.jpg`);
    return (
        <Canvas>
            <QuadSphereMesh
                position={[1.2, 0, 0]} {/* x, y, z position */}
                radius={1}             {/* radius of sphere */}
                segments={5}           {/* number of edges & divisions in each Quad */}
            >
                <meshStandardMaterial 
                    map={texture} 
                    displacementMap={bump}
                    displacementScale={0.2} />
            </QuadSphereMesh>
        </Canvas>
    );
}
```
### Updating the Sphere based on distance to camera
#### [DEMO](https://bicarbon8.github.io/quad)
```typescript
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { QuadSphereMesh, V3, QuadSphereGeometry } from 'quadsphere';
import * as THREE from 'three';

function distanceCheck(sphereMeshRef: THREE.Mesh, worldLocation: V3) {
    const distanceValues = new Array<number>(5, 4, 3, 2, 1, 0);
    const geom = sphereMeshRef.geometry as QuadSphereGeometry;
    // convert camera location to location relative to QuadSphere
    const localLocation = new THREE.Vector3(worldLocation.x, worldLocation.y, worldLocation.z)
        .sub(sphereMeshRef.position)
        .applyQuaternion(sphereMeshRef.quaternion.invert());
    let updated = false;
    for (let i=0; i<distanceValues.length; i++) {
        const dist = distanceValues[i];
        const levelQuads = geom.sphere.registry.getQuadsAtLevel(i);
        if (levelQuads.length > 0) {
            const inRange = levelQuads.filter(q => geom.sphere.utils.isWithinDistance(q, dist, localLocation));
            if (inRange.length > 0) {
                const closest = geom.sphere.utils.getClosestQuad(localLocation, false, ...inRange);
                closest.subdivide();
                levelQuads.filter(q => q.id !== closest.id).forEach(q => q.unify());
            } else {
                levelQuads.forEach(q => q.unify());
            }
            updated = true;
        }
    }
    if (updated) {
        geom.updateAttributes();
    }
}

function App() {
    const texture = useLoader(THREE.TextureLoader, `./assets/texture.png`);
    const bump = useLoader(THREE.TextureLoader, `./assets/bump.jpg`);
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state: RootState, delta: number) => {
        // check distance from camera to QuadSphere and subdivide when within range
        distanceCheck(ref.current, state.camera.position);
    });
    return (
        <Canvas>
            <QuadSphereMesh
                ref={ref}              {/* provides access to QuadSphereGeometry and QuadSphere */}
                position={[1.2, 0, 0]} {/* x, y, z position */}
                radius={1}             {/* radius of sphere */}
                segments={5}           {/* number of edges + divisions in each Quad */}
            >
                <meshStandardMaterial 
                    map={texture} 
                    displacementMap={bump}
                    displacementScale={0.2}
                />
            </QuadSphereMesh>
        </Canvas>
    );
}
```
### Using a different material for each face of the QuadSphere
by default the `QuadSphere` uses a `unified` texture mapping that assumes all faces are contained in a single unwrapped cube texture that
like the following [example](./public/assets/EarthTexture.png), but you can also assign each face individually by specifying a `textureMapping` of
`split`
```typescript
import { Canvas, useLoader } from '@react-three/fiber';
import { QuadSphereMesh } from 'quadsphere';

function App() {
    return (
        <Canvas>
            <QuadSphereMesh
                position={[1.2, 0, 0]} {/* x, y, z position */}
                radius={1}             {/* radius of sphere */}
                segments={5}           {/* number of edges & divisions in each Quad */}
                textureMapping="split" {/* indicates that texture groups should be used */}
            >
                <meshBasicMaterial attach="material-0" color="red" /* px */ />
                <meshBasicMaterial attach="material-1" color="blue" /* nx */ />
                <meshBasicMaterial attach="material-2" color="green" /* py */ />
                <meshBasicMaterial attach="material-3" color="purple" /* ny */ />
                <meshBasicMaterial attach="material-4" color="white" /* pz */ />
                <meshBasicMaterial attach="material-5" color="black" /* nz */ />
            </QuadSphereMesh>
        </Canvas>
    );
}
```
## QuadMesh
a `@react-three/fiber` compatible `THREE.Mesh` that can be used directly from the `Canvas` to render one face of the `QuadSphere`
### Properties
all `QuadSphereMesh` properties are supported in addition to the following:
- `applyCurve` if `true` then the rendered `Quad` will be curved based on the distance of the `centre` property from the `curveOrigin`. 
- `centre` a `V3` made up of an `x`, `y`, and `z` number as an offset from the `curveOrigin`. Note that the `THREE.Mesh` `position` property is used for position and the `centre` is only used if you need to use `applyCurve` so you can offset from the origin to ensure the curve is applied to round the mesh instead of creating a flattened circle
- `curveOrigin` the location to move out from by `radius` amount when applying the curve
- `uvStart` a `V2` containing a `u` and `v` number representing the starting offset for uvs in this `QuadMesh` (defaults to `{u: 0, v: 0}`)
- `uvEnd` a `V2` containing a `u` and `v` number representing the ending offset for uvs in this `QuadMesh` (defaults to `{u: 1, v: 1}`)
## QuadSphereGeometry
a `THREE.js` compatible `BufferGeometry` that can be passed to a `THREE.Mesh`. all properties available to a `QuadSphereMesh` and that aren't part of the `@react-three/fiber` `MeshProps` is available as a contructor argument
### Properties
- `subdivide` takes in a `V3` specifying a local-space translated `V3` and will find the closest `Quad` or child `Quad` and call the `subdivide` function on it
- `unify` takes in a `V3` specifying a local-space translated `V3` and will find the closest `Quad` or child `Quad` and call the `unify` function on it's parent
- `updateAttributes` automatically called after calling `subdivide` or `unify`, this enables you to force an update of the vertices, normals, uvs and indices of the `BufferGeometry`
## QuadGeometry
a `THREE.js` compatible `BufferGeometry` that can be passed to a `THREE.Mesh`. all properties available to a `QuadMesh` and that aren't part of the `@react-three/fiber` `MeshProps` is available as a contructor argument
### Properties
same as `QuadSphereGeometry`
## QuadSphere
an implementation of a CubeSphere that uses Quad-Tree subdivision algorithm to increase the mesh complexity near a specific area with minimal increase to the overall mesh complexity as you move away from the specified location. Having this object separated from the specific rendering technology, namely `THREE.js` allows it to be used with other renderers if so desired
## Quad
a single face used in the `QuadSphere`. this can be used to further reduce the complexity of a scene by removing other, unseen faces of the sphere when up close or can be used in a flattened mode as a Terrain implementation that supports the same level of detail adjustments as the `QuadSphere`