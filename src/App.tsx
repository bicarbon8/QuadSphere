import './App.css'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stats } from '@react-three/drei'
import { QuadShape } from './components/shapes';

function App() {
  return (
    <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <QuadShape position={[0, 0, 0]} radius={1} />
        <Stats />
    </Canvas>
  );
}

export default App
