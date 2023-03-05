import { RootState, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { CameraFacingText } from "./camera-facing-text";
import * as THREE from 'three';
import { QuadMesh } from './quad-mesh';
import { useRef } from 'react';
import { QuadSphereMesh } from './quad-sphere-mesh';
import { QuadGeometry } from '../geometries/quad-geometry';
import { QuadSphereGeometry } from '../geometries/quad-sphere-geometry';

const assetPath = import.meta.env.VITE_ASSET_PATH;
let elapsed = 0;
const quat = new THREE.Quaternion();

export function InCanvas() {
    const {camera} = useThree();
    camera.near = 0.0001;
    const distances = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5];
    const grid = useLoader(THREE.TextureLoader, `${assetPath}/grid.png`);
    const uvtest = useLoader(THREE.TextureLoader, `${assetPath}/uvCubeMapTexture.png`);
    const tessellation = useLoader(THREE.TextureLoader, `${assetPath}/cube.png`);
    const bump = useLoader(THREE.TextureLoader, `${assetPath}/bump.jpg`);
    const quadMesh = useRef<THREE.Mesh>(null);
    const quadSphereMesh = useRef<THREE.Mesh>(null);
    useFrame((state: RootState, delta: number) => {
        elapsed += delta;
        const el = state.clock.getElapsedTime();
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1 * el)
        if (elapsed >= 1 / 5) {
            elapsed = 0;
            if (quadSphereMesh.current) {
                const geom = quadSphereMesh.current.geometry as QuadSphereGeometry;
                const offsetPoint = camera.position.clone()
                    .sub(quadSphereMesh.current.position)
                    .applyQuaternion(quadSphereMesh.current.quaternion.invert());
                geom.sphere.unify();
                for (let i=0; i<distances.length; i++) {
                    const dist = distances[i];
                    const quads = geom.sphere.getQuadsWithinDistance(offsetPoint, dist);
                    if (quads.length > 0) {
                        // console.debug('found', quads.length, 'quads at distance', dist);
                        const closest = geom.sphere.getClosestQuad(offsetPoint, ...quads);
                        if (closest.level <= i && !closest.hasChildren()) {
                            closest.subdivide();
                            geom.updateAttributes();
                        }
                    }
                }
            }
            if (quadMesh.current) {
                const geom = quadMesh.current.geometry as QuadGeometry;
                const offsetPoint = camera.position.clone()
                    .sub(quadMesh.current.position)
                    .applyQuaternion(quadMesh.current.quaternion.invert());
                geom.quad.unify();
                for (let i=0; i<distances.length; i++) {
                    const dist = distances[i];
                    const quads = geom.quad.getQuadsWithinDistance(offsetPoint, dist);
                    if (quads.length > 0) {
                        const closest = geom.quad.getClosestQuad(offsetPoint, ...quads);
                        if (closest.level <= i && !closest.hasChildren()) {
                            closest.subdivide();
                            geom.updateAttributes();
                        }
                    }
                }
            }
        }
        if (quadSphereMesh.current) {
            quadSphereMesh.current.position.y = 0.25 * Math.sin(el);
            quadSphereMesh.current.quaternion.w = quat.w;
            quadSphereMesh.current.quaternion.x = quat.x;
            quadSphereMesh.current.quaternion.y = quat.y;
            quadSphereMesh.current.quaternion.z = quat.z;
        }
        if (quadMesh.current) {
            quadMesh.current.position.y = -0.25 * Math.sin(el);
        }
    });
    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} color={0xffff66} />
            <pointLight position={[-10, 10, -10]} color={0x6666ff} intensity={0.5} />
            <OrbitControls />
            <axesHelper args={[0.5]} />
            <CameraFacingText position={[0, 2, 0]}>
                distance based subdivision
            </CameraFacingText>
            <QuadMesh ref={quadMesh} 
                position={[-1.2, 0, 0]} 
                radius={1}>
                <meshStandardMaterial 
                    map={bump} 
                    displacementMap={bump}
                    displacementScale={0.2}
                    flatShading 
                />
            </QuadMesh>
            <QuadSphereMesh ref={quadSphereMesh}
                position={[1.2, 0, 0]} 
                radius={1}>
                <meshStandardMaterial 
                    map={tessellation}
                    displacementMap={tessellation}
                    displacementScale={0.1} 
                    flatShading
                />
            </QuadSphereMesh>
            <Stats />
        </>
    )
}