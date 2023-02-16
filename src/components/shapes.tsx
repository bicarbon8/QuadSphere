import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Mesh } from "three";
import { QuadGeometry } from "../types/quad-geometry";

export type QuadShapeProps = {
    position: Array<number>;
    radius: number;
};

const states = ['unified', 'leftactive', 'rightactive', 'topactive', 'bottomactive', 'subdivided'] as const;
type QuadState = typeof states[number];

export function QuadShape(props: QuadShapeProps) {
    const quad = new QuadGeometry({
        centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
        radius: props.radius ?? 1
    });

    const mesh = useRef<Mesh>();
    const [state, setState] = useState<QuadState>('unified');
    
    const updateQuad = () => {
        const { geometry } = mesh.current
        const { position } = geometry.attributes
        const quad = geometry as QuadGeometry;
        switch (state) {
            case 'unified':
                quad.activate('left');
                console.info('activated left');
                setState('leftactive');
                break;
            case 'leftactive':
                quad.activate('bottom');
                console.info('activated bottom');
                setState('bottomactive');
                break;
            case 'bottomactive':
                quad.activate('right');
                console.info('activated right');
                setState('rightactive');
                break;
            case 'rightactive':
                quad.activate('top');
                console.info('activated top');
                setState('topactive');
                break;
            case 'topactive':
                quad.subdivide();
                console.info('subdivided');
                setState('subdivided');
                break;
            case 'subdivided':
                quad.unify().deactivate('left', 'bottom', 'right', 'top');
                console.info('unified and deactivated all');
                setState('unified');
                break;
        }
    
        position.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    let elapsed: number = 0;
    const changeAfter = 1000;
    useFrame(({ clock }) => {
        elapsed += clock.getDelta();
        console.debug({elapsed});
        if (elapsed >= changeAfter) {
            elapsed = 0;
            updateQuad();
        }
    });
    
    return (
        <mesh ref={mesh} castShadow receiveShadow geometry={quad}>
            <meshBasicMaterial attach="material" wireframe={true} />
        </mesh>
    );
}