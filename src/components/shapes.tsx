import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Mesh } from "three";
import { QuadGeometry } from "../types/quad-geometry";

export type QuadMeshProps = {
    position: Array<number>;
    radius: number;
};

const states = ['unified', 'leftactive', 'rightactive', 'topactive', 'bottomactive', 'subdivided'] as const;
type QuadState = typeof states[number];

export function QuadMesh(props: QuadMeshProps) {
    const meshRef = useRef<Mesh>();
    const [state, setState] = useState<QuadState>('unified');
    const quad = useMemo<QuadGeometry>(() => {
        console.info('creating new QuadGeometry!', {props});
        return new QuadGeometry({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1
        });
    }, [props]);
    let nextChangeAt: number;
    const changeFrequency = 5; // 5 seconds
    useFrame(({ clock }) => {
        const time = clock.getElapsedTime(); // in seconds
        if (nextChangeAt == null) {
            nextChangeAt = time + changeFrequency;
        }
        if (time >= nextChangeAt) {
            nextChangeAt = time + changeFrequency;
            const geometry = meshRef.current.geometry as QuadGeometry;
            setState(modifyQuadGeometry(geometry, state));
        }
    });
    
    return (
        <mesh ref={meshRef} dispose={null} geometry={quad} castShadow receiveShadow>
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

    const { position, index } = geometry.attributes;
    position.needsUpdate = true;
    index.needsUpdate = true;
    geometry.computeVertexNormals();

    return outState;
}