import { Detailed } from "@react-three/drei";
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
    const [state, setState] = useState<QuadState>('unified');
    const quad = useMemo<QuadGeometry>(() => {
        console.info('creating new QuadGeometry!', {props});
        return new QuadGeometry({
            centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
            radius: props.radius ?? 1
        });
    }, [props]);
    // let nextChangeAt: number;
    // const changeFrequency = 5; // 5 seconds
    // useFrame(({ clock }) => {
    //     const time = clock.getElapsedTime(); // in seconds
    //     if (nextChangeAt == null) {
    //         nextChangeAt = time + changeFrequency;
    //     }
    //     if (time >= nextChangeAt) {
    //         nextChangeAt = time + changeFrequency;
    //         setState(modifyQuadGeometry(quad, state));
    //     }
    // });
    subdivide(quad, 5);
    const positions = new Float32Array(quad.vertices);
    const indices = new Uint16Array(quad.indices);
    return (
        <mesh castShadow receiveShadow>
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
            </bufferGeometry>
            <meshBasicMaterial attach="material" wireframe={true} />
        </mesh>
    );
}

function subdivide(quad: QuadGeometry, levels: number): void {
    if (levels > 0) {
        quad.subdivide();
        const childIndex = Math.floor(Math.random() * 4);
        let child: QuadGeometry;
        switch (childIndex) {
            case 0:
                console.info('bottom left child choosen...', levels);
                child = quad.bottomleftChild;
                break;
            case 1:
                console.info('bottom right child choosen...', levels);
                child = quad.bottomrightChild;
                break;
            case 2:
                console.info('top left child choosen...', levels);
                child = quad.topleftChild;
                break;
            case 3:
                console.info('top right child choosen...', levels);
                child = quad.toprightChild;
                break;
            default:
                console.warn('invalid childIndex:', childIndex);
                break;
        }
        subdivide(child, levels - 1);
    }
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