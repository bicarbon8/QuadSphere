import { QuadGeometry } from "./quad-geometry";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type Quadrant = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadNeighbors = Record<QuadSide, QuadGeometry>;

export type QuadChildren = Record<Quadrant, QuadGeometry>;