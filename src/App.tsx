import { useState } from 'react'
import './App.css'
import { Canvas } from '@react-three/fiber'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div id="quadsphere">
      <Canvas>
          <ambientLight />
          <pointLight position={[10, 10, 10]} />
      </Canvas>
    </div>
  )
}

export default App
