import { Quad } from "./quad";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type Quadrant = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadNeighbors = Record<QuadSide, Quad>;

export type QuadChildren = Record<Quadrant, Quad>;