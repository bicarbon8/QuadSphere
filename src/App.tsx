import './App.css'
import { Canvas } from '@react-three/fiber'
import { InCanvas } from './components/in-canvas';

type Size = {
    width: number;
    height: number;
};

function getSize(parentId?: string): Size {
    let size: Size;
    try {
        const main = document.querySelector('main') as HTMLElement;
        const s = main.getBoundingClientRect();
        size = {width: s.width, height: s.height};
    } catch (e) {
        /* ignore */
    }
    if (!size) {
        const parent = document.getElementById(parentId || 'quad-sphere');
        const s = parent.getBoundingClientRect();
        size = {width: s.width, height: s.height};
    }
    return size;
}

function App() {
    const size=getSize();
    return (
        <div style={{width: size.width, height: size.height}}>
            <Canvas>
                <InCanvas />
            </Canvas>
        </div>
    );
}

export default App
