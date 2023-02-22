import './App.css'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { QuadMesh, QuadSphereMesh } from './components/shapes';
import { Fragment, useState } from 'react';

function App() {
  return (
    <Fragment>
      <div className='absolute_full'>
        <Canvas>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <OrbitControls />
            <axesHelper args={[0.5]} />
            <QuadMesh position={[-3, 0, 0]} radius={1} />
            <QuadSphereMesh position={[0, 0, 0]} radius={1} />
            <Stats />
        </Canvas>
      </div>
    </Fragment>
  );
}

export default App
