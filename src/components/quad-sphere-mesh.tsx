import { MeshProps } from "@react-three/fiber";
import { ForwardedRef, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadLoggerLevel } from "../types/quad-logger";
import { QuadSphere } from "../types/quad-sphere";
import { V3 } from "../types/v3";
import { QuadSphereGeometry } from "./quad-sphere-geometry";

export type QuadSphereMeshProps = Omit<MeshProps, 'ref'> & {
    radius?: number;
    maxlevel?: number;
    loglevel?: QuadLoggerLevel;
};

export const QuadSphereMesh = forwardRef((props: QuadSphereMeshProps, ref: ForwardedRef<Mesh>) => {
    const geometry = useMemo<QuadSphereGeometry>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphereGeometry({
            centre: V3.zero(),
            radius: props.radius ?? 1,
            maxlevel: props.maxlevel ?? 10,
            loglevel: props.loglevel ?? 'warn'
        });
    }, [props.radius, props.maxlevel, props.loglevel]);
    const mesh = useRef<Mesh>(null);
    if (typeof ref === "function") {
        ref(mesh.current);
    } else {
        ref.current = mesh.current;
    }
    const [key, setKey] = useState<string>(geometry.sphere.key);
    useEffect(() => {
        setKey(geometry.sphere.key);
    }, [geometry.sphere.key]);
    return (
        <mesh {...props} key={key} ref={mesh} geometry={geometry}>
            {props.children}
        </mesh>
    );
});