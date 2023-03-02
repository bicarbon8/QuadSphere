import { useLoader } from '@react-three/fiber'
import { Edges, OrbitControls, Stats } from '@react-three/drei'
import { QuadMesh, QuadSphereMesh } from './shapes';
import { CameraFacingText } from "./camera-facing-text";
import * as THREE from 'three';

const assetPath = import.meta.env.VITE_ASSET_PATH;

export function InCanvas() {
    const grid = useLoader(THREE.TextureLoader, `${assetPath}/grid.png`);
    const uvtest = useLoader(THREE.TextureLoader, `${assetPath}/uvCubeMapTexture.png`);
    const tessellation = useLoader(THREE.TextureLoader, `${assetPath}/tessellation-map.png`);
    const bump = useLoader(THREE.TextureLoader, `${assetPath}/bump.jpg`);
    return (
        <>
            <ambientLight intensity={0.4} />
            <pointLight position={[10, 10, 10]} color={0xffff66} />
            <pointLight position={[-10, 10, -10]} color={0x6666ff} intensity={0.5} />
            <OrbitControls />
            <axesHelper args={[0.5]} />
            <CameraFacingText position={[0, 2, 0]}>
                left-click objects to subdivide; right-click to unify
            </CameraFacingText>
            <QuadMesh 
                position={[-1.2, 0, 0]} 
                radius={1}>
                <meshStandardMaterial 
                    map={bump} 
                    displacementMap={bump}
                    displacementScale={0.2}
                    flatShading />
                <Edges threshold={0} />
            </QuadMesh>
            <QuadSphereMesh 
                position={[1.2, 0, 0]} 
                radius={1}>
                <meshStandardMaterial 
                    map={tessellation} 
                    displacementMap={tessellation}
                    displacementScale={0.2}
                    transparent
                    opacity={0.75} />
                <Edges threshold={0} />
            </QuadSphereMesh>
        </>
    )
}