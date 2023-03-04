import { RootState, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
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
    const {camera} = useThree();
    camera.near = 0.0001;
    const distances = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0.5];
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
                    opacity={0.5} />
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