import { Detailed } from "@react-three/drei";
import { MeshProps, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadGeometry } from "../types/quad-geometry";
import { QuadRegistry } from "../types/quad-registry";

export type QuadMeshProps = {
    position: Array<number>;
    radius: number;
};

const states = ['unified', 'leftactive', 'rightactive', 'topactive', 'bottomactive', 'subdivided'] as const;
type QuadState = typeof states[number];

export function QuadMesh(props: QuadMeshProps) {
    const [level, setLevel] = useState<number>(0);
    const [offset, setOffset] = useState<number>(1);
    const registry = useMemo<QuadRegistry>(() => {
        console.info('creating new QuadRegistry!');
        return new QuadRegistry();
    }, [props]);
    const quad = useMemo<QuadGeometry>(() => {
        console.info('creating new QuadGeometry!', {props});
        return new QuadGeometry({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1,
            registry: registry
        });
    }, [props]);
    let nextChangeAt: number;
    const changeFrequency = 5; // 5 seconds
    useFrame(({ clock }) => {
        const time = clock.getElapsedTime(); // in seconds
        if (nextChangeAt == null) {
            nextChangeAt = time + changeFrequency;
        }
        if (time >= nextChangeAt) {
            nextChangeAt = time + changeFrequency;
            if (level >= 5) {
                setOffset(-1);
            }
            if (level <= 0) {
                setOffset(1);
            }
            if (offset > 0) {
                subdivide(registry, level);
            } else {
                unify(registry, level);
            }
            setLevel(level + (1 * offset));
        }
    });
    return MeshBufferGeom({quad});
}

function MeshBufferGeom(props: {quad: QuadGeometry}) {
    const meshes = new Array<MeshProps>();
    if (!props.quad.hasChildren()) {
        const positions = new Float32Array(props.quad.vertices);
        const indices = new Uint16Array(props.quad.indices);
        meshes.push(
            <mesh key={`${props.quad.id}-${props.quad.activeSides.join('-')}`} castShadow receiveShadow>
                <bufferGeometry>
                    <bufferAttribute 
                        attach="attributes-position"
                        array={positions}
                        count={positions.length / 3}
                        itemSize={3} />
                    <bufferAttribute
                        attach="index"
                        array={indices}
                        count={indices.length}
                        itemSize={1} />
                </bufferGeometry>
                <meshBasicMaterial attach="material" wireframe={true} />
            </mesh>
        );
    } else {
        meshes.push(...[
            props.quad.bottomleftChild,
            props.quad.bottomrightChild,
            props.quad.topleftChild,
            props.quad.toprightChild
        ].map(c => MeshBufferGeom({quad: c})));
    }
    return (
        <>
        {...meshes}
        </>
    );
}

function subdivide(registry: QuadRegistry, level: number = 0): void {
    const quads = registry.getQuadsAtLevel(level);
    if (quads.length) {
        const index = Math.floor(Math.random() * quads.length);
        const quad = quads[index];
        quad.subdivide();
    }
}

function unify(registry: QuadRegistry, level: number = 0): void {
    const quads = registry.getQuadsAtLevel(level);
    if (quads.length) {
        const index = Math.floor(Math.random() * quads.length);
        const quad = quads[index];
        quad.unify();
    }
}