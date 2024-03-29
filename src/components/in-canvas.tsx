import { RootState, ThreeEvent, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Edges, OrbitControls, Stats, useCubeTexture } from '@react-three/drei'
import { CameraFacingText } from "./camera-facing-text";
import * as THREE from 'three';
import { QuadMesh } from './quad-mesh';
import { useMemo, useRef, useState } from 'react';
import { QuadSphereMesh } from './quad-sphere-mesh';
import { QuadGeometry } from '../geometries/quad-geometry';
import { QuadSphereGeometry } from '../geometries/quad-sphere-geometry';
import { V3 } from '../core/v3';
import { useControls } from 'leva';
import { QuadSphereTextureMapping } from '../core/quad-sphere';

const assetPath = import.meta.env.VITE_ASSET_PATH;
const distanceValues = new Array<number>();
let elapsed: number = 0;

export function InCanvas() {
    const {camera} = useThree();
    camera.near = 0.0001;
    camera.far = 10000;
    const quat = useMemo<THREE.Quaternion>(() => new THREE.Quaternion(), []);
    const quatAxis = useMemo<THREE.Vector3>(() => new THREE.Vector3(0, 1, 0), []);
    const [quadKey, setQuadKey] = useState<string>(null);
    const [sphereKey, setSphereKey] = useState<string>(null);
    const grid = useLoader(THREE.TextureLoader, `${assetPath}/grid.png`);
    const uvtest = useLoader(THREE.TextureLoader, `${assetPath}/uvunwrapped.png`);
    const earth = useLoader(THREE.TextureLoader, `${assetPath}/EarthTexture.png`);
    const tessellation = useLoader(THREE.TextureLoader, `${assetPath}/cube.png`);
    const bump = useLoader(THREE.TextureLoader, `${assetPath}/bump.jpg`);
    const bumpRepeat = useLoader(THREE.TextureLoader, `${assetPath}/bump_repeat.png`);
    const quadMesh = useRef<THREE.Mesh>(null);
    const quadSphereMesh = useRef<THREE.Mesh>(null);
    const quadTriangles = useMemo<number>(() => (quadMesh.current?.geometry as QuadGeometry)?.quad?.triangleCount ?? 0, [quadKey]);
    const sphereTriangles = useMemo<number>(() => (quadSphereMesh.current?.geometry as QuadSphereGeometry)?.sphere?.triangleCount ?? 0, [sphereKey]);
    const { textureMapping, segments, distances, maxLevels, freqency, applyCurve, flatShading, showEdges, radius, displacement } = useControls({ 
        textureMapping: { value: 'split', options: ['unified', 'split'] },
        segments: { value: 5, min: 3, max: 21, step: 2 },
        distances: { min: 0, max: 100, value: [0, 5], step: 1 },
        maxLevels: { value: 5, min: 0, max: 20, step: 1},
        freqency: { value: 1 / 5, min: 0, max: 2, step: 0.001 },
        applyCurve: { value: false },
        flatShading: { value: true },
        showEdges: { value: false },
        radius: { value: 1, min: 0.1, max: 100, step: 0.1 },
        displacement: { value: 0.1, min: 0, max: 10, step: 0.01 }
    });
    const distVals = useMemo<Array<number>>(() => {
        const offset = Math.abs(distances[1] - distances[0]) / maxLevels;
        const vals = new Array<number>();
        for (let i=distances[0]; i<distances[1]; i+=offset) {
            vals.push(i);
        }
        return vals.reverse();
    }, [distances[0], distances[1], maxLevels]);
    distanceValues.splice(0, distanceValues.length, ...distVals);
    useFrame((state: RootState, delta: number) => {
        elapsed += delta;
        if (elapsed >= freqency) {
            elapsed = 0;
            if (quadSphereMesh.current) {
                setSphereKey(updateSphereForDistances(quadSphereMesh.current, state.camera.position));
            }
            if (quadMesh.current) {
                setQuadKey(updateQuadForDistances(quadMesh.current, camera.position));
            }
        }
        if (quadSphereMesh.current) {
            // quadSphereMesh.current.position.y = 0.25 * Math.sin(state.clock.getElapsedTime());
            // quat.setFromAxisAngle(quatAxis, 0.1 * state.clock.getElapsedTime());
            // quadSphereMesh.current.quaternion.w = quat.w;
            // quadSphereMesh.current.quaternion.x = quat.x;
            // quadSphereMesh.current.quaternion.y = quat.y;
            // quadSphereMesh.current.quaternion.z = quat.z;
        }
        if (quadMesh.current) {
            // quadMesh.current.position.y = -0.25 * Math.sin(state.clock.getElapsedTime());
        }
    });
    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[100, 100, 100]} color={0xffff66} />
            <pointLight position={[-100, -100, -100]} color={0x6666ff} intensity={0.5} />
            <OrbitControls />
            <axesHelper args={[0.5]} />
            <CameraFacingText position={[0, 0, 0]}>
                Quad: {quadTriangles} triangles; Sphere: {sphereTriangles} triangles
            </CameraFacingText>
            <QuadMesh ref={quadMesh} 
                position={[-(radius+(radius/5)), 0, 0]} 
                radius={radius}
                segments={segments}
                centre={{x: 0, y: 0, z: (applyCurve) ? radius : 0}} // push forward so curve works
                applyCurve={applyCurve}
                // onCreateMesh={() => console.debug('created new QuadMesh!')}
                // onClick={(e) => setQuadKey(subdivide(e, quadMesh.current))}
                // onContextMenu={(e) => setQuadKey(unify(e, quadMesh.current))}
            >
                {(textureMapping === 'split') ?
                <meshStandardMaterial 
                    map={bumpRepeat} 
                    displacementMap={bumpRepeat}
                    displacementScale={displacement}
                    flatShading={flatShading}
                /> :
                <meshStandardMaterial 
                    map={tessellation} 
                    displacementMap={tessellation}
                    displacementScale={displacement}
                    flatShading={flatShading}
                />}
                {(showEdges) ? <Edges threshold={0} /> : <></>}
            </QuadMesh>
            <QuadSphereMesh ref={quadSphereMesh}
                position={[(radius+(radius/5)), 0, 0]}
                radius={radius}
                segments={segments}
                maxlevel={maxLevels}
                // onCreateMesh={() => console.debug('created new QuadSphereMesh!')}
                textureMapping={textureMapping as QuadSphereTextureMapping}
            >
                {(textureMapping === 'split') ? <>
                <meshStandardMaterial attach="material-0" map={bumpRepeat} displacementMap={bumpRepeat} displacementScale={displacement} flatShading={flatShading} />
                <meshStandardMaterial attach="material-1" map={bumpRepeat} displacementMap={bumpRepeat} displacementScale={displacement} flatShading={flatShading} />
                <meshStandardMaterial attach="material-2" map={bumpRepeat} displacementMap={bumpRepeat} displacementScale={displacement} flatShading={flatShading} />
                <meshStandardMaterial attach="material-3" map={bumpRepeat} displacementMap={bumpRepeat} displacementScale={displacement} flatShading={flatShading} />
                <meshStandardMaterial attach="material-4" map={bumpRepeat} displacementMap={bumpRepeat} displacementScale={displacement} flatShading={flatShading} />
                <meshStandardMaterial attach="material-5" map={bumpRepeat} displacementMap={bumpRepeat} displacementScale={displacement} flatShading={flatShading} />
                </> : 
                <meshStandardMaterial 
                    map={tessellation} 
                    displacementMap={tessellation}
                    displacementScale={displacement}
                    flatShading={flatShading}
                />}
                {(showEdges) ? <Edges threshold={0} /> : <></>}
            </QuadSphereMesh>
            {/* <fog args={[0xcccccc, 0, 1]} /> */}
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

function updateSphereForDistances(sphereMeshRef: THREE.Mesh, trigger: V3): string {
    const geom = sphereMeshRef.geometry as QuadSphereGeometry;
    const offsetPoint = new THREE.Vector3(trigger.x, trigger.y, trigger.z)
        .sub(sphereMeshRef.position)
        .applyQuaternion(sphereMeshRef.quaternion.invert());
    let updated = false;
    for (let i=0; i<distanceValues.length; i++) {
        const dist = distanceValues[i];
        const levelQuads = geom.sphere.registry.getQuadsAtLevel(i);
        if (levelQuads.length > 0) {
            const inRange = levelQuads.filter(q => geom.sphere.utils.isWithinDistance(q, dist, offsetPoint));
            if (inRange.length > 0) {
                const closest = geom.sphere.utils.getClosestQuad(offsetPoint, false, ...inRange);
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
    return geom.sphere.key;
}

function updateQuadForDistances(quadMeshRef: THREE.Mesh, trigger: V3): string {
    const geom = quadMeshRef.geometry as QuadGeometry;
    const offsetPoint = new THREE.Vector3(trigger.x, trigger.y, trigger.z)
        .sub(quadMeshRef.position)
        .applyQuaternion(quadMeshRef.quaternion.invert());
    let updated = false;
    for (let i=0; i<distanceValues.length; i++) {
        const dist = distanceValues[i];
        const levelQuads = geom.quad.registry.getQuadsAtLevel(i);
        if (levelQuads.length > 0) {
            const inRange = levelQuads.filter(q => geom.quad.utils.isWithinDistance(q, dist, offsetPoint));
            if (inRange.length > 0) {
                const closest = geom.quad.utils.getClosestQuad(offsetPoint, false, ...inRange);
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
    return geom.quad.key;
}