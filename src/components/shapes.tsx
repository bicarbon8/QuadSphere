import { MeshProps, useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { Quad } from "../types/quad";
import { QuadRegistry } from "../types/quad-registry";
import { QuadSphere } from "../types/quad-sphere";

export type QuadMeshProps = {
    position?: Array<number>;
    radius?: number;
    wireframe?: boolean;
};

export function QuadSphereMesh(props: QuadMeshProps) {
    const [level, setLevel] = useState<number>(0);
    const sphere = useMemo<QuadSphere>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphere({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1,
            loglevel: 'debug'
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
    const data = sphere.meshData;
    const positions = new Float32Array(data.vertices);
    const indices = new Uint16Array(data.indices);
    return (
        <mesh key={`${sphere.key}`} onClick={() => null} onContextMenu={() => null} castShadow receiveShadow>
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
            <meshBasicMaterial attach="material" wireframe={props.wireframe ?? true} />
        </mesh>
    );
}

export function QuadMesh(props: QuadMeshProps) {
    const [level, setLevel] = useState<number>(0);
    const registry = useMemo<QuadRegistry>(() => {
        console.info('creating new QuadRegistry!');
        return new QuadRegistry();
    }, [props]);
    const quad = useMemo<Quad>(() => {
        console.info('creating new Quad!', {props});
        return new Quad({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1,
            registry: registry,
            loglevel: 'debug'
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
    return MeshBufferGeom({quad, wireframe: props.wireframe});
}

function MeshBufferGeom(props: {quad: Quad, wireframe: boolean}) {
    const meshes = new Array<MeshProps>();
    if (props.quad.hasChildren()) {
        meshes.push(...[
            props.quad.bottomleftChild,
            props.quad.bottomrightChild,
            props.quad.topleftChild,
            props.quad.toprightChild
        ].map(c => MeshBufferGeom({quad: c, wireframe: props.wireframe})));
    } else {
        const data = props.quad.meshData;
        const positions = new Float32Array(data.vertices);
        const indices = new Uint16Array(data.indices);
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
                <meshBasicMaterial attach="material" wireframe={props.wireframe ?? true} />
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
        left: neighbors?.left?.id,
        bottom: neighbors?.bottom?.id,
        right: neighbors?.right?.id,
        top: neighbors?.top?.id
    });
    quad.subdivide();
}

function unify(quad: Quad) {
    const parentNeighbors = quad.parent?.neighbors;
    console.info('right-clicked on quad', quad.id, 'with parent', quad.parent?.id, 'containing neighbors', {
        left: parentNeighbors?.left?.id,
        bottom: parentNeighbors?.bottom?.id,
        right: parentNeighbors?.right?.id,
        top: parentNeighbors?.top?.id
    });
    quad.parent?.unify();
}