import './App.css'
import { Canvas } from '@react-three/fiber'
import { Box, OrbitControls, Stats } from '@react-three/drei'

function App() {
  return (
    <Canvas>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <Box position={[0, 0, 0]} />
        <Stats />
    </Canvas>
  );
}

export default App
