import { useState } from 'react'
import './App.css'
import { Canvas } from '@react-three/fiber'
import { Box, OrbitControls, Stats } from '@react-three/drei'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div id="quadsphere">
      <Canvas>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
          <OrbitControls />
          <Box position={[0, 0, 0]} />
          <Stats />
      </Canvas>
    </div>
  )
}

export default App
