import { MeshProps } from "@react-three/fiber";
import { ForwardedRef, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadLoggerLevel } from "../types/quad-logger";
import { QuadSphere } from "../types/quad-sphere";
import { V3 } from "../types/v3";

export type QuadSphereMeshProps = Omit<MeshProps, 'ref'> & {
    radius?: number;
    maxlevel?: number;
    loglevel?: QuadLoggerLevel;
};

export type QuadSphereMesh = {
    sphere: QuadSphere;
    mesh: Mesh;
};

export const QuadSphereMesh = forwardRef((props: QuadSphereMeshProps, ref: ForwardedRef<QuadSphereMesh>) => {
    const sphere = useMemo<QuadSphere>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphere({
            centre: V3.zero(),
            radius: props.radius ?? 1,
            maxlevel: props.maxlevel ?? 10,
            loglevel: props.loglevel ?? 'warn'
        });
    }, [props.radius, props.maxlevel, props.loglevel]);
    const meshRef = useRef<Mesh>(null);
    const quadMesh = {
        sphere: sphere, 
        mesh: meshRef.current
    };
    if (typeof ref === "function") {
        ref(quadMesh);
    } else {
        ref.current = quadMesh;
    }
    const data = sphere.meshData;
    const positions = new Float32Array(data.vertices);
    const normals = new Float32Array(data.normals);
    const indices = new Uint16Array(data.indices);
    const uvs = new Float32Array(data.uvs);
    const [key, setKey] = useState<string>(sphere.key);
    useEffect(() => {
        setKey(sphere.key);
    }, [sphere.key]);
    return (
        <mesh {...props} key={key} ref={meshRef}>
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
});