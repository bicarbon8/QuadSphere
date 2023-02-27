import { MeshProps, ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { Quad } from "../types/quad";
import { QuadLoggerLevel } from "../types/quad-logger";
import { QuadSphere } from "../types/quad-sphere";
import { V3 } from "../types/v3";

export type QuadMeshProps = MeshProps & {
    radius?: number;
    maxlevel?: number;
    loglevel?: QuadLoggerLevel;
};

export function QuadSphereMesh(props: QuadMeshProps) {
    const ref = useRef<THREE.Mesh>(null);
    const sphere = useMemo<QuadSphere>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphere({
            centre: V3.zero(),
            radius: props.radius ?? 1,
            maxlevel: props.maxlevel ?? 10,
            loglevel: props.loglevel ?? 'warn'
        });
    }, [props]);
    const [key, setKey] = useState<string>(sphere.key);
    const data = sphere.meshData;
    const indices = new Uint16Array(data.indices);
    const positions = new Float32Array(data.vertices);
    const normals = new Float32Array(data.normals);
    const uvs = new Float32Array(data.uvs);
    return (
        <mesh ref={ref} key={key} onClick={(e: ThreeEvent<MouseEvent>) => setKey(subdivide(e, sphere))} onContextMenu={(e) => setKey(unify(e, sphere))} {...props}>
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
                <bufferAttribute 
                    attach="attributes-normal"
                    array={normals}
                    count={normals.length / 3}
                    itemSize={3} />
                <bufferAttribute
                    attach="attributes-uv"
                    count={uvs.length / 2}
                    array={uvs}
                    itemSize={2} />
            </bufferGeometry>
            {props.children}
        </mesh>
    );
}

export function QuadMesh(props: QuadMeshProps) {
    const quad = useMemo<Quad>(() => {
        console.info('creating new Quad!', {props});
        return new Quad({
            centre: V3.zero(),
            radius: props.radius ?? 1,
            maxlevel: props.maxlevel ?? 10,
            loglevel: props.loglevel ?? 'warn'
        });
    }, [props]);
    const [key, setKey] = useState<string>(quad.key);
    const data = quad.meshData;
    const positions = new Float32Array(data.vertices);
    const normals = new Float32Array(data.normals);
    const indices = new Uint16Array(data.indices);
    const uvs = new Float32Array(data.uvs);
    return (
        <mesh key={key} onClick={(e) => setKey(subdivide(e, quad))} onContextMenu={(e) => setKey(unify(e, quad))} {...props}>
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
                <bufferAttribute 
                    attach="attributes-normal"
                    array={normals}
                    count={normals.length / 3}
                    itemSize={3} />
                <bufferAttribute
                    attach="attributes-uv"
                    count={uvs.length / 2}
                    array={uvs}
                    itemSize={2} />
            </bufferGeometry>
            {props.children}
        </mesh>
    );
}

function subdivide(event: ThreeEvent<MouseEvent>, quad: Quad | QuadSphere): string {
    const point = event.point;
    const target = event.object as Mesh;
    const offsetPoint = point.clone()
        .sub(target.position)
        .applyQuaternion(target.quaternion.invert());
    console.info('left-clicked object at', point);
    event.stopPropagation();
    const closest = quad.getClosestQuad(offsetPoint);
    closest.subdivide();
    return quad.key;
}

function unify(event: ThreeEvent<MouseEvent>, quad: Quad | QuadSphere): string {
    const point = event.point;
    const target = event.object as Mesh;
    const offsetPoint = point.clone()
        .sub(target.position)
        .applyQuaternion(target.quaternion.invert());
    console.info('right-clicked object at', point);
    event.stopPropagation();
    const closest = quad.getClosestQuad(offsetPoint);
    closest.parent?.unify();
    return quad.key;
}