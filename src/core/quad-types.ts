import { Quad } from "./quad";

export type QuadSphereFace = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom';

export type QuadSide = Exclude<QuadSphereFace, 'front' | 'back'>;

export type Quadrant = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadNeighbors = Record<QuadSide, Quad>;

export type QuadChildren = Record<Quadrant, Quad>;

export type QuadMeshData = {
    indices: Array<number>;
    vertices: Array<number>;
    normals: Array<number>;
    uvs: Array<number>;
}

export type QuadSphereMeshData = Record<QuadSphereFace, QuadMeshData>;