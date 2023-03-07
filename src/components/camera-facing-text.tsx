import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { JSXElementConstructor, ReactElement, ReactFragment, ReactPortal, useRef } from "react";
import { Mesh } from "three";

export type textProps = {
    children: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | ReactFragment | ReactPortal,
    position: any
}

export function CameraFacingText(props: textProps) {
    const ref = useRef<Mesh>();
    const fontProps = { 
        fontSize: 0.25, 
        letterSpacing: -0.05, 
        lineHeight: 1, 
        'material-toneMapped': false,
        outlineWidth: '5%',
        outlineColor: 0x000000
    };
    const fullProps = {
        ...fontProps,
        ...props
    }
    useFrame(({ camera }) => {
        // Make text face the camera
        ref.current.quaternion.copy(camera.quaternion)
    });
    return <Text ref={ref} {...fullProps} children={props.children} renderOrder={999} depthOffset={-999} />;
}