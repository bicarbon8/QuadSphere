import { MeshProps, ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { Quad } from "../types/quad";
import { QuadRegistry } from "../types/quad-registry";
import { QuadSphere } from "../types/quad-sphere";

export type QuadMeshProps = MeshProps & {
    position?: Array<number>;
    radius?: number;
    maxlevel?: number;
};

export function QuadSphereMesh(props: QuadMeshProps) {
    const [level, setLevel] = useState<number>(0);
    const sphere = useMemo<QuadSphere>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphere({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1,
            maxlevel: props.maxlevel ?? 5,
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
        <mesh key={`${sphere.key}`} onClick={(e: ThreeEvent<MouseEvent>) => subdivide(e, sphere)} onContextMenu={(e) => unify(e, sphere)} castShadow receiveShadow>
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
            {props.children}
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
            maxlevel: props.maxlevel ?? 5,
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
    const data = quad.meshData;
    const positions = new Float32Array(data.vertices);
    const indices = new Uint16Array(data.indices);
    return (
        <mesh key={`${quad.key}`} onClick={(e) => subdivide(e, quad)} onContextMenu={(e) => unify(e, quad)} castShadow receiveShadow>
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
            {props.children}
        </mesh>
    );
}

function subdivide(event: ThreeEvent<MouseEvent>, quad: Quad | QuadSphere) {
    const point = event.point;
    console.info('left-clicked object at', point);
    event.stopPropagation();
    let closest: Quad;
    // do {
        closest = quad.getClosestQuad(point);
        closest.subdivide();
    // } while (quad.depth <= quad.maxlevel);
}

function unify(event: ThreeEvent<MouseEvent>, quad: Quad | QuadSphere) {
    const point = event.point;
    console.info('right-clicked object at', point);
    event.stopPropagation();
    const closest = quad.getClosestQuad(point);
    closest.parent?.unify();
}