import { Quad } from "./quad";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type Quadrant = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadNeighbors = Record<QuadSide, Quad>;

export type QuadChildren = Record<Quadrant, Quad>;

export type QuadSphereFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export type QuadMeshData = {
    vertices: Array<number>;
    indices: Array<number>;
}