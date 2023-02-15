import { useFrame } from "@react-three/fiber";
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
    let elapsed = 0;
    let state: QuadState = 'unified';
    const changeAfter = 1000;
    useFrame(({ clock }) => {
        /* determine if we should subdivide or not */
        elapsed += clock.getDelta();
        if (elapsed >= changeAfter) {
            elapsed = 0;
            switch (state) {
                case 'unified':
                    quad.activate('left');
                    state = 'leftactive';
                    break;
                case 'leftactive':
                    quad.activate('bottom');
                    state = 'bottomactive';
                    break;
                case 'bottomactive':
                    quad.activate('right');
                    state = 'rightactive';
                    break;
                case 'rightactive':
                    quad.activate('top');
                    state = 'topactive';
                    break;
                case 'topactive':
                    quad.subdivide();
                    state = 'subdivided';
                    break;
                case 'subdivided':
                    quad.unify().deactivate('left', 'bottom', 'right', 'top');
                    state = 'unified';
                    break;
            }
        }
    });
    return (
        <mesh castShadow receiveShadow geometry={quad}>
            <meshBasicMaterial attach="material" wireframe={true} />
        </mesh>
    );
}