import './App.css'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { QuadMesh, QuadSphereMesh } from './components/shapes';
import { Fragment } from 'react';

function App() {
    return (
        <Fragment>
            <div className='absolute_full'>
                <Canvas>
                    <ambientLight intensity={0.4} />
                    <pointLight position={[10, 10, 10]} color={0xffffcc} />
                    <OrbitControls />
                    <axesHelper args={[0.5]} />
                    <QuadMesh position={[-1.2, 0, 0]} radius={1}>
                        <meshStandardMaterial attach="material" wireframe={true} />
                    </QuadMesh>
                    <QuadSphereMesh position={[1.2, 0, 0]} radius={1} loglevel="debug">
                        <meshStandardMaterial attach="material" wireframe={true} />
                    </QuadSphereMesh>
                    <Stats />
                </Canvas>
            </div>
        </Fragment>
    );
}

export default App
