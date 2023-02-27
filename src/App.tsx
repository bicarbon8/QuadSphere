import './App.css'
import { Canvas } from '@react-three/fiber'
import { Fragment } from 'react';
import { InCanvas } from './components/in-canvas';

function App() {
    return (
        <Fragment>
            <div className='absolute_full'>
                <Canvas>
                    <InCanvas />
                </Canvas>
            </div>
        </Fragment>
    );
}

export default App
