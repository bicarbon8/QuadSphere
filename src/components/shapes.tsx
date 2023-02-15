import { Quad } from "../types/quad";

export type QuadShapeProps = {
    position: Array<number>;
    radius: number;
};

export function QuadShape(props: QuadShapeProps) {
    const quad = new Quad({
        centre: {x: props.position[0] ?? 0, y: props.position[1] ?? 0, z: props.position[2] ?? 0},
        radius: props.radius ?? 1
    });
    return (
        <mesh>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" array={quad.triangles} itemSize={3} />
            </bufferGeometry>
            <meshNormalMaterial attach="material" wireframe />
        </mesh>
    );
}