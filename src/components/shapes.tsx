import { Detailed } from "@react-three/drei";
import { MeshProps, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { Quad } from "../types/quad";
import { QuadRegistry } from "../types/quad-registry";

export type QuadMeshProps = {
    position: Array<number>;
    radius: number;
};

const states = ['unified', 'leftactive', 'rightactive', 'topactive', 'bottomactive', 'subdivided'] as const;
type QuadState = typeof states[number];

export function QuadMesh(props: QuadMeshProps) {
    const [level, setLevel] = useState<number>(0);
    const registry = useMemo<QuadRegistry>(() => {
        console.info('creating new QuadRegistry!');
        return new QuadRegistry();
    }, [props]);
    const quad = useMemo<Quad>(() => {
        console.info('creating new QuadGeometry!', {props});
        return new Quad({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1,
            registry: registry
        });
    }, [props]);
    useFrame(({ clock }) => {
        const time = clock.getElapsedTime(); // in seconds
        if (level >= 5) {
            setLevel(0);
        } else {
            setLevel(level + 1);
        }
    });
    return MeshBufferGeom({quad});
}

function MeshBufferGeom(props: {quad: Quad}) {
    const meshes = new Array<MeshProps>();
    if (props.quad.hasChildren()) {
        meshes.push(...[
            props.quad.bottomleftChild,
            props.quad.bottomrightChild,
            props.quad.topleftChild,
            props.quad.toprightChild
        ].map(c => MeshBufferGeom({quad: c})));
    } else {
        const positions = new Float32Array(props.quad.vertices);
        const indices = new Uint16Array(props.quad.indices);
        meshes.push(
            <mesh key={`${props.quad.id}-${props.quad.activeSides.join('-')}`} onClick={() => subdivide(props.quad)} onContextMenu={() => unify(props.quad)} castShadow receiveShadow>
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
    }
    return (
        <>
        {...meshes}
        </>
    );
}

function subdivide(quad: Quad) {
    const neighbors = quad.neighbors;
    console.info('left-clicked on quad', quad.id, 'containing neighbors', {
        left: neighbors.left?.id,
        bottom: neighbors.bottom?.id,
        right: neighbors.right?.id,
        top: neighbors.top?.id
    });
    quad.subdivide();
}

function unify(quad: Quad) {
    console.info('right-clicked on quad', quad.id, 'with parent', quad.parent?.id);
    quad.parent?.unify();
}