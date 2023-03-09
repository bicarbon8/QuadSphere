import { MeshProps } from "@react-three/fiber";
import { ForwardedRef, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadSphereOptions } from "../core/quad-sphere";
import { QuadSphereGeometry } from "../geometries/quad-sphere-geometry";

export type QuadSphereMeshProps = MeshProps & QuadSphereOptions;

export const QuadSphereMesh = forwardRef((props: QuadSphereMeshProps, ref: ForwardedRef<Mesh>) => {
    const geometry = useMemo<QuadSphereGeometry>(() => {
        console.info('creating new QuadSphere!', {props});
        return new QuadSphereGeometry({
            ...props
        });
    }, [props.radius, props.maxlevel, props.loglevel, props.segments]);
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