import './App.css'
import { Canvas } from '@react-three/fiber'
import { Fragment } from 'react';
import { InCanvas } from './components/in-canvas';

function App() {
    return (
        <Fragment>
            <Canvas>
                <InCanvas />
            </Canvas>
        </Fragment>
    );
}

export default App
