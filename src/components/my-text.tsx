import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { JSXElementConstructor, ReactElement, ReactFragment, ReactPortal, useRef } from "react";
import { Mesh } from "three";

export type textProps = {
    children: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | ReactFragment | ReactPortal,
    position: any
}

export function MyText(props: textProps) {
    const ref = useRef<Mesh>();
    const fontProps = { font: '/Inter-Bold.woff', fontSize: 0.25, letterSpacing: -0.05, lineHeight: 1, 'material-toneMapped': false };
    useFrame(({ camera }) => {
        // Make text face the camera
        ref.current.quaternion.copy(camera.quaternion)
    });
    return <Text ref={ref} {...props} {...fontProps} children={props.children} />;
}