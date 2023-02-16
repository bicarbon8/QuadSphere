import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadGeometry } from "../types/quad-geometry";

export type QuadShapeProps = {
    position: Array<number>;
    radius: number;
};

const states = ['unified', 'leftactive', 'rightactive', 'topactive', 'bottomactive', 'subdivided'] as const;
type QuadState = typeof states[number];

export function QuadShape(props: QuadShapeProps) {
    const meshRef = useRef<Mesh>();
    const [state, setState] = useState<QuadState>('unified');
    const quad = useMemo<QuadGeometry>(() => new QuadGeometry({
        centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
        radius: props.radius ?? 1
    }), [props]);
    let elapsed: number = 0;
    const changeAfter = 0.1; // 0.1 second
    useFrame(({ clock }) => {
        elapsed += clock.getDelta(); // in seconds
        if (elapsed >= changeAfter) {
            elapsed = 0;
            const geometry = meshRef.current.geometry as QuadGeometry;
            setState(modifyQuadGeometry(geometry, state));
        }
    });
    
    return (
        <mesh ref={meshRef} castShadow receiveShadow geometry={quad}>
            <meshBasicMaterial attach="material" wireframe={true} />
        </mesh>
    );
}

function modifyQuadGeometry(geometry: QuadGeometry, state: QuadState): QuadState {
    let outState: QuadState;
    switch (state) {
        case 'unified':
            geometry.activate('left');
            console.info('activated left');
            outState = 'leftactive';
            break;
        case 'leftactive':
            geometry.activate('bottom');
            console.info('activated bottom');
            outState = 'bottomactive';
            break;
        case 'bottomactive':
            geometry.activate('right');
            console.info('activated right');
            outState = 'rightactive';
            break;
        case 'rightactive':
            geometry.activate('top');
            console.info('activated top');
            outState = 'topactive';
            break;
        case 'topactive':
            geometry.subdivide();
            console.info('subdivided');
            outState = 'subdivided';
            break;
        case 'subdivided':
            geometry.unify().deactivate('left', 'bottom', 'right', 'top');
            console.info('unified and deactivated all');
            outState = 'unified';
            break;
    }

    const { position } = geometry.attributes;
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    return outState;
}