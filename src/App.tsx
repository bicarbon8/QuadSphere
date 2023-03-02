import './App.css'
import { Canvas } from '@react-three/fiber'
import { InCanvas } from './components/in-canvas';
import { Fragment } from 'react';

function setSize(parentId?: string): void {
    const parent = document.getElementById(parentId || 'quad-sphere');
    let rect: DOMRect;
    try {
        const main = document.querySelector('main') as HTMLElement;
        rect = main.getBoundingClientRect();
    } catch (e) {
        const body = document.querySelector('body') as HTMLElement;
        rect = body.getBoundingClientRect();
    }
    parent.style.width = `${rect.width}px`;
    parent.style.height = `${rect.height}px`;
}

function App() {
    setSize();
    return (
        <Fragment>
            <Canvas>
                <InCanvas />
            </Canvas>
        </Fragment>
    );
}

export default App
