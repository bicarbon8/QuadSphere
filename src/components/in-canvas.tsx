import { RootState, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Edges, OrbitControls, Stats } from '@react-three/drei'
import { CameraFacingText } from "./camera-facing-text";
import * as THREE from 'three';
import { QuadMesh } from './quad-mesh';
import { useMemo, useRef, useState } from 'react';
import { QuadSphereMesh } from './quad-sphere-mesh';
import { QuadGeometry } from '../geometries/quad-geometry';
import { QuadSphereGeometry } from '../geometries/quad-sphere-geometry';
import { V3 } from '../core/v3';

const assetPath = import.meta.env.VITE_ASSET_PATH;

export function InCanvas() {
    const {camera} = useThree();
    camera.near = 0.0001;
    const quat = useMemo<THREE.Quaternion>(() => new THREE.Quaternion(), []);
    const [elapsed, setElapsed] = useState<number>(0);
    const grid = useLoader(THREE.TextureLoader, `${assetPath}/grid.png`);
    const uvtest = useLoader(THREE.TextureLoader, `${assetPath}/uvCubeMapTexture.png`);
    const tessellation = useLoader(THREE.TextureLoader, `${assetPath}/cube.png`);
    const bump = useLoader(THREE.TextureLoader, `${assetPath}/bump.jpg`);
    const quadMesh = useRef<THREE.Mesh>(null);
    const quadSphereMesh = useRef<THREE.Mesh>(null);
    useFrame((state: RootState, delta: number) => {
        setElapsed(state.clock.getElapsedTime());
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1 * elapsed)
        if (elapsed >= 1 / 5) {
            setElapsed(0);
            if (quadSphereMesh.current) {
                updateSphereForDistances(quadSphereMesh.current, camera.position);
            }
            if (quadMesh.current) {
                updateQuadForDistances(quadMesh.current, camera.position);
            }
        }
        if (quadSphereMesh.current) {
            // quadSphereMesh.current.position.y = 0.25 * Math.sin(el);
            // quadSphereMesh.current.quaternion.w = quat.w;
            // quadSphereMesh.current.quaternion.x = quat.x;
            // quadSphereMesh.current.quaternion.y = quat.y;
            // quadSphereMesh.current.quaternion.z = quat.z;
        }
        if (quadMesh.current) {
            // quadMesh.current.position.y = -0.25 * Math.sin(el);
        }
    });
    const [key, setKey] = useState<string>(null);
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
                // centre={{x: 0, y: 0, z: 10}} // push forward so curve works
                radius={1}
                segments={5}
                // applyCurve={true}
                onClick={(e) => setKey(subdivide(e, quadMesh.current))}
                onContextMenu={(e) => setKey(unify(e, quadMesh.current))}
            >
                <meshStandardMaterial 
                    map={bump} 
                    displacementMap={bump}
                    displacementScale={0.1}
                    flatShading
                />
                <Edges threshold={0} />
            </QuadMesh>
            {/* <QuadSphereMesh ref={quadSphereMesh}
                position={[1.2, 0, 0]} 
                radius={1}
                segments={11}
            >
                <meshStandardMaterial 
                    map={tessellation}
                    displacementMap={tessellation}
                    displacementScale={0.1} 
                    flatShading
                />
            </QuadSphereMesh> */}
            <Stats />
        </>
    )
}

function subdivide(e: ThreeEvent<MouseEvent>, quadMesh: THREE.Mesh) {
    const geom = quadMesh.geometry as QuadGeometry;
    const offsetPoint = e.point.clone()
        .sub(quadMesh.position)
        .applyQuaternion(quadMesh.quaternion.invert());
    const closest = geom.quad.getClosestQuad(offsetPoint);
    console.info('left-click', e.point, 'closest is', closest.id);
    if (!closest.hasChildren()) {
        closest.subdivide();
        geom.updateAttributes();
    }
    return geom.quad.key;
}

function unify(e: ThreeEvent<MouseEvent>, quadMesh: THREE.Mesh) {
    const geom = quadMesh.geometry as QuadGeometry;
    const offsetPoint = e.point.clone()
        .sub(quadMesh.position)
        .applyQuaternion(quadMesh.quaternion.invert());
    const closest = geom.quad.getClosestQuad(offsetPoint);
    console.info('right-click', e.point, 'closest is', closest.id);
    if (closest.parent) {
        closest.parent.unify();
        geom.updateAttributes();
    }
    return geom.quad.key;
}

const distances = [5, 4, 3, 2, 2.5, 1, 0.5];

function updateSphereForDistances(sphereMeshRef: THREE.Mesh, trigger: V3) {
    const geom = sphereMeshRef.geometry as QuadSphereGeometry;
    const offsetPoint = new THREE.Vector3(trigger.x, trigger.y, trigger.z)
        .sub(sphereMeshRef.position)
        .applyQuaternion(sphereMeshRef.quaternion.invert());
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

function updateQuadForDistances(quadMeshRef: THREE.Mesh, trigger: V3) {
    const geom = quadMeshRef.geometry as QuadGeometry;
    const offsetPoint = new THREE.Vector3(trigger.x, trigger.y, trigger.z)
        .sub(quadMeshRef.position)
        .applyQuaternion(quadMeshRef.quaternion.invert());
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