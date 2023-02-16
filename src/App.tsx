import './App.css'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { QuadShape } from './components/shapes';
import { Fragment } from 'react';

function App() {
  return (
    <Fragment>
      <div className='absolute_full'>
        <Canvas>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            <OrbitControls />
            <gridHelper args={[100, 1]} />
            <axesHelper args={[5]} />
            <QuadShape position={[0, 0, 0]} radius={1} />
            <Stats />
        </Canvas>
      </div>
    </Fragment>
  );
}

export default App
