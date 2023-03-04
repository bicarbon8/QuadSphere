import { MeshProps } from "@react-three/fiber";
import { ForwardedRef, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadOptions } from "../core/quad";
import { V3 } from "../core/v3";
import { QuadGeometry } from "../geometries/quad-geometry";

export type QuadMeshProps = MeshProps & QuadOptions;

export const QuadMesh = forwardRef((props: QuadMeshProps, ref: ForwardedRef<Mesh>) => {
    const geometry = useMemo<QuadGeometry>(() => {
        console.info('creating new Quad!', {props});
        return new QuadGeometry({
            ...props,
            centre: V3.zero()
        });
    }, [props.radius, props.maxlevel, props.loglevel]);
    const mesh = useRef<Mesh>(null);
    if (typeof ref === "function") {
        ref(mesh.current);
    } else {
        ref.current = mesh.current;
    }
    const [key, setKey] = useState<string>(geometry.quad.key);
    useEffect(() => {
        setKey(geometry.quad.key);
    }, [geometry.quad.key]);
    return (
        <mesh {...props} key={key} ref={mesh} geometry={geometry}>
            {props.children}
        </mesh>
    );
});