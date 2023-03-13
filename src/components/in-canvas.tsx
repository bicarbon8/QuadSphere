import { RootState, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Edges, OrbitControls, useCubeTexture } from '@react-three/drei'
import { CameraFacingText } from "./camera-facing-text";
import * as THREE from 'three';
import { QuadMesh } from './quad-mesh';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QuadSphereMesh } from './quad-sphere-mesh';
import { QuadGeometry } from '../geometries/quad-geometry';
import { QuadSphereGeometry } from '../geometries/quad-sphere-geometry';
import { V3 } from '../core/v3';
import { useControls } from 'leva';

const assetPath = import.meta.env.VITE_ASSET_PATH;

export function InCanvas() {
    const {camera} = useThree();
    camera.near = 0.0001;
    const quat = useMemo<THREE.Quaternion>(() => new THREE.Quaternion(), []);
    const [quadKey, setQuadKey] = useState<string>(null);
    const [sphereKey, setSphereKey] = useState<string>(null);
    const [elapsed, setElapsed] = useState<number>(0);
    const grid = useLoader(THREE.TextureLoader, `${assetPath}/grid.png`);
    const uvtest = useLoader(THREE.TextureLoader, `${assetPath}/uvCubeMapTexture.png`);
    const tessellation = useLoader(THREE.TextureLoader, `${assetPath}/cube.png`);
    const bump = useLoader(THREE.TextureLoader, `${assetPath}/bump.jpg`);
    // bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    // bump.repeat.set(3, 3);
    const cube = useCubeTexture([
        'grid.png',
        'bump.jpg',
        'grid.png',
        'bump.jpg',
        'grid.png',
        'bump.jpg'
    ], {path: `${assetPath}/`});
    const quadMesh = useRef<THREE.Mesh>(null);
    const quadSphereMesh = useRef<THREE.Mesh>(null);
    const [quadTriangles, setQuadTriangles] = useState<number>(0);
    const [sphereTriangles, setSphereTriangles] = useState<number>(0);
    const { segments } = useControls({ segments: { value: 5, min: 3, max: 21 } });
    useFrame((state: RootState, delta: number) => {
        setElapsed(state.clock.getElapsedTime());
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.1 * elapsed)
        if (elapsed >= 1 / 5) {
            setElapsed(0);
            if (quadSphereMesh.current) {
                setSphereKey(updateSphereForDistances(quadSphereMesh.current, camera.position));
            }
            if (quadMesh.current) {
                setQuadKey(updateQuadForDistances(quadMesh.current, camera.position));
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
    useEffect(() => {
        if (quadSphereMesh.current) {
            setSphereTriangles((quadSphereMesh.current.geometry as QuadSphereGeometry)?.sphere?.triangleCount);
        }
        if (quadMesh.current) {
            setQuadTriangles((quadMesh.current.geometry as QuadGeometry)?.quad?.triangleCount);
        }
    }, [quadKey, sphereKey]);
    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} color={0xffff66} />
            <pointLight position={[-10, 10, -10]} color={0x6666ff} intensity={0.5} />
            <OrbitControls />
            <axesHelper args={[0.5]} />
            <CameraFacingText position={[0, 0, 0]}>
                Quad: {quadTriangles} triangles; Sphere: {sphereTriangles} triangles
            </CameraFacingText>
            <QuadMesh ref={quadMesh} 
                position={[-1.2, 0, 0]} 
                radius={1}
                segments={segments}
                // centre={{x: 0, y: 0, z: 1}} // push forward so curve works
                // applyCurve={true}
                // onClick={(e) => setQuadKey(subdivide(e, quadMesh.current))}
                // onContextMenu={(e) => setQuadKey(unify(e, quadMesh.current))}
            >
                <meshStandardMaterial 
                    map={bump} 
                    displacementMap={bump}
                    displacementScale={0.1}
                    flatShading
                />
                <Edges threshold={0} />
            </QuadMesh>
            <QuadSphereMesh ref={quadSphereMesh}
                position={[1.2, 0, 0]} 
                radius={1}
                segments={segments}
                textureMapping={'cube'}
            >
                <meshBasicMaterial attach="material-0" color="red" />
                <meshBasicMaterial attach="material-1" color="blue" />
                <meshBasicMaterial attach="material-2" color="green" />
                <meshBasicMaterial attach="material-3" color={0xc3208a} />
                <meshBasicMaterial attach="material-4" color={0x51e784} />
                <meshBasicMaterial attach="material-5" color={0x6077e7} />
            </QuadSphereMesh>
            {/* <Stats /> */}
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

const distances = [2, 1.5, 1, 0.75, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05];

function updateSphereForDistances(sphereMeshRef: THREE.Mesh, trigger: V3): string {
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
    return geom.sphere.key;
}

function updateQuadForDistances(quadMeshRef: THREE.Mesh, trigger: V3): string {
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
    return geom.quad.key;
}