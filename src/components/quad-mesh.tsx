import { MeshProps } from "@react-three/fiber";
import { ForwardedRef, forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadOptions } from "../core/quad";
import { QuadGeometry } from "../geometries/quad-geometry";

export type QuadMeshProps = MeshProps & QuadOptions & {
    onCreateQuad?: () => void;
    onCreateMesh?: () => void;
};

export const QuadMesh = forwardRef((props: QuadMeshProps, ref: ForwardedRef<Mesh>) => {
    const geometry = useMemo<QuadGeometry>(() => {
        props.onCreateQuad?.();
        return new QuadGeometry({
            ...props
        });
    }, [
        props.radius,
        props.maxlevel,
        props.loglevel,
        props.segments,
        props.applyCurve,
        props.centre?.x,
        props.centre?.y,
        props.centre?.z,
        props.angle,
        props.uvStart?.u,
        props.uvStart?.v,
        props.uvEnd?.u,
        props.uvEnd?.v
    ]);
    const mesh = useRef<Mesh>(null);
    if (typeof ref === "function") {
        ref(mesh.current);
    } else {
        ref.current = mesh.current;
    }
    const [key, setKey] = useState<string>(geometry.quad.key);
    useEffect(() => {
        props.onCreateMesh?.();
        setKey(geometry.quad.key);
    }, [geometry.quad.key]);
    return (
        <mesh {...props} key={key} ref={mesh} geometry={geometry}>
            {props.children}
        </mesh>
    );
});