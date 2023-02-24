import './App.css'
import { Canvas } from '@react-three/fiber'
import { Edges, OrbitControls, Stats } from '@react-three/drei'
import { QuadMesh, QuadSphereMesh } from './components/shapes';
import { Fragment } from 'react';
import { MyText } from "./components/my-text";

function App() {
    return (
        <Fragment>
            <div className='absolute_full'>
                <Canvas>
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} color={0xffff66} />
                    <pointLight position={[-10, 10, -10]} color={0x6666ff} intensity={0.5} />
                    <OrbitControls />
                    <axesHelper args={[0.5]} />
                    <MyText position={[0, 2, 0]}>
                        left-click objects to subdivide; right-click to unify
                    </MyText>
                    <QuadMesh position={[-1.2, 0, 0]} radius={1}>
                        <meshStandardMaterial attach="material" wireframe={true} />
                    </QuadMesh>
                    <QuadSphereMesh position={[1.2, 0, 0]} radius={1} loglevel="debug">
                        <meshStandardMaterial transparent />
                        <Edges threshold={0.001} />
                    </QuadSphereMesh>
                    <Stats />
                </Canvas>
            </div>
        </Fragment>
    );
}

export default App
