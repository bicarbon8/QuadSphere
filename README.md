# QuadSphere
> @Created: 29 Oct. 2018 (Unity version)

> @Updated: 2023 (Threejs & @react-three/fiber)

>@Author: Jason Holt Smith (<bicarbon8@gmail.com>)

## Description

A QuadSphere (a sphere made up of a mesh cube whose vertices are adjusted into a spherical shape) with QuadTree-based level of detail support.

![QuadSphere](QuadSphere.png)

## Installation
`npm install quadsphere`

## Usage
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