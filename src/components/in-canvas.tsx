import { RootState, ThreeEvent, useFrame, useLoader } from '@react-three/fiber'
import { Edges, OrbitControls } from '@react-three/drei'
import { CameraFacingText } from "./camera-facing-text";
import * as THREE from 'three';
import { QuadMesh } from './quad-mesh';
import { useRef, useState } from 'react';
import { Mesh } from 'three';
import { QuadSphereMesh } from './quad-sphere-mesh';
import { QuadGeometry } from '../geometries/quad-geometry';
import { QuadSphereGeometry } from '../geometries/quad-sphere-geometry';

const assetPath = import.meta.env.VITE_ASSET_PATH;

export function InCanvas() {
    const grid = useLoader(THREE.TextureLoader, `${assetPath}/grid.png`);
    const uvtest = useLoader(THREE.TextureLoader, `${assetPath}/uvCubeMapTexture.png`);
    const tessellation = useLoader(THREE.TextureLoader, `${assetPath}/tessellation-map.png`);
    const bump = useLoader(THREE.TextureLoader, `${assetPath}/bump.jpg`);
    const quadMesh = useRef<Mesh>(null);
    const quadSphereMesh = useRef<Mesh>(null);
    const [elapsed, setElapsed] = useState<number>(0);
    useFrame((state: RootState, delta: number) => {
        setElapsed(elapsed + delta);
        if (quadSphereMesh.current) {
            quadSphereMesh.current.position.y = 0.25 * Math.sin(elapsed);
        }
        if (quadMesh.current) {
            quadMesh.current.position.y = 0.25 * -Math.sin(elapsed);
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
                left-click objects to subdivide; right-click to unify
            </CameraFacingText>
            <QuadMesh ref={quadMesh} 
                onClick={(e: ThreeEvent<MouseEvent>) => subdivide(e, quadMesh.current)} 
                onContextMenu={(e) => unify(e, quadMesh.current)}
                position={[-1.2, 0, 0]} 
                radius={1}>
                <meshStandardMaterial 
                    map={bump} 
                    displacementMap={bump}
                    displacementScale={0.2}
                    flatShading />
                <Edges threshold={0} />
            </QuadMesh>
            <QuadSphereMesh ref={quadSphereMesh}
                onClick={(e: ThreeEvent<MouseEvent>) => subdivide(e, quadSphereMesh.current)} 
                onContextMenu={(e) => unify(e, quadSphereMesh.current)}
                position={[1.2, 0, 0]} 
                radius={1}>
                <meshStandardMaterial 
                    map={tessellation} 
                    displacementMap={tessellation}
                    displacementScale={0.2}
                    transparent
                    opacity={0.75} />
                <Edges threshold={0} />
            </QuadSphereMesh>
        </>
    )
}

function subdivide(event: ThreeEvent<MouseEvent>, mesh: Mesh) {
    const point = event.point;
    const target = event.object as Mesh;
    const offsetPoint = point.clone()
        .sub(target.position)
        .applyQuaternion(target.quaternion.invert());
    console.info('left-clicked object at', point);
    const geom = (mesh.geometry.type === 'QuadGeometry') ? mesh.geometry as QuadGeometry : mesh.geometry as QuadSphereGeometry;
    geom.subdivide(offsetPoint);
}

function unify(event: ThreeEvent<MouseEvent>, mesh: Mesh) {
    const point = event.point;
    const target = event.object as Mesh;
    const offsetPoint = point.clone()
        .sub(target.position)
        .applyQuaternion(target.quaternion.invert());
    console.info('right-clicked object at', point);
    const geom = (mesh.geometry.type === 'QuadGeometry') ? mesh.geometry as QuadGeometry : mesh.geometry as QuadSphereGeometry;
    geom.unify(offsetPoint);
}