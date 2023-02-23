import { MeshProps, ThreeEvent, useFrame, Vector3 } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Quad } from "../types/quad";
import { QuadLoggerLevel } from "../types/quad-logger";
import { QuadRegistry } from "../types/quad-registry";
import { QuadSphere } from "../types/quad-sphere";
import { V3 } from "../types/v3";

export type QuadMeshProps = MeshProps & {
    radius?: number;
    maxlevel?: number;
    loglevel?: QuadLoggerLevel;
};

export function QuadSphereMesh(props: QuadMeshProps) {
    const sphere = useMemo<QuadSphere>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphere({
            centre: processPositionInput(props.position),
            radius: props.radius ?? 1,
            maxlevel: props.maxlevel ?? 5,
            loglevel: props.loglevel ?? 'warn'
        });
    }, [props]);
    const [key, setKey] = useState<string>(sphere.key);
    const data = sphere.meshData;
    const positions = new Float32Array(data.vertices);
    const indices = new Uint16Array(data.indices);
    return (
        <mesh key={key} onClick={(e: ThreeEvent<MouseEvent>) => setKey(subdivide(e, sphere))} onContextMenu={(e) => setKey(unify(e, sphere))} castShadow receiveShadow>
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
    const registry = useMemo<QuadRegistry>(() => {
        console.info('creating new QuadRegistry!');
        return new QuadRegistry();
    }, [props]);
    const quad = useMemo<Quad>(() => {
        console.info('creating new Quad!', {props});
        return new Quad({
            centre: processPositionInput(props.position),
            radius: props.radius ?? 1,
            registry: registry,
            maxlevel: props.maxlevel ?? 5,
            loglevel: props.loglevel ?? 'warn'
        });
    }, [props]);
    const [key, setKey] = useState<string>(quad.key);
    const data = quad.meshData;
    const positions = new Float32Array(data.vertices);
    const indices = new Uint16Array(data.indices);
    return (
        <mesh key={key} onClick={(e) => setKey(subdivide(e, quad))} onContextMenu={(e) => setKey(unify(e, quad))} castShadow receiveShadow>
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

function subdivide(event: ThreeEvent<MouseEvent>, quad: Quad | QuadSphere): string {
    const point = event.point;
    console.info('left-clicked object at', point);
    event.stopPropagation();
    let closest: Quad;
    // do {
        closest = quad.getClosestQuad(point);
        closest.subdivide();
    // } while (quad.depth <= quad.maxlevel);
    return quad.key;
}

function unify(event: ThreeEvent<MouseEvent>, quad: Quad | QuadSphere): string {
    const point = event.point;
    console.info('right-clicked object at', point);
    event.stopPropagation();
    const closest = quad.getClosestQuad(point);
    closest.parent?.unify();
    return quad.key;
}

function processPositionInput(position?: Vector3): V3 {
    const pos = V3.zero();
    if (Array.isArray(position)) {
        pos.x = position?.[0] ?? 0;
        pos.y = position?.[1] ?? pos.x;
        pos.z = position?.[2] ?? pos.y;
    } else if (typeof position === "number") {
        pos.x = position;
        pos.y = position;
        pos.z = position;
    } else if (typeof position === "object") {
        const p = position as THREE.Vector3;
        pos.x = p?.x ?? 0;
        pos.y = p?.y ?? pos.x;
        pos.z = p?.z ?? pos.y;
    }
    return pos;
}