import { QuadGeometry, QuadSide } from "./quad-geometry";
import { V3 } from "./v3";

export type QuadRegistryKeys = Record<QuadSide, string>;

export type QuadNeighbors = Record<QuadSide, QuadGeometry>;

export class QuadRegistry {
    private readonly _maxDifference: number;
    private readonly _levelQuadMap = new Map<number, Map<number, QuadGeometry>>();

    constructor(maxDifference?: number) {
        this._maxDifference = maxDifference ?? 0.001;
    }

    get depth(): number {
        let d: number = 0; // no registered quads at any level
        if (this._levelQuadMap.size > 0) {
            d += Array.from(this._levelQuadMap.keys())
                .sort((a, b) => b - a) // sorts in descending
                .find(v => v > 0); // returns first value (max)
        }
        return d;
    }

    register(quad: QuadGeometry): this {
        if (!this._levelQuadMap.has(quad.level)) {
            this._levelQuadMap.set(quad.level, new Map<number, QuadGeometry>());
        }
        this._levelQuadMap.get(quad.level).set(quad.id, quad);
        return this;
    }

    deregister(quad: QuadGeometry): this {
        if (this._levelQuadMap.has(quad.level)) {
            this._levelQuadMap.get(quad.level).delete(quad.id);
        }
        return this;
    }

    getNeighbor(side: QuadSide, quad: QuadGeometry): QuadGeometry {
        const possibleNeighbors = this.getQuadsAtLevel(quad.level)
            .filter(q => q.id !== quad.id); // don't attempt to match with ourself
        for (let possibleNeighbor of possibleNeighbors) {
            switch (side) {
                case 'left':
                    if (this._edgeMatches(quad.leftedge, possibleNeighbor.rightedge, quad.level)) {
                        return possibleNeighbor;
                    }
                    break;
                case 'bottom':
                    if (this._edgeMatches(quad.bottomedge, possibleNeighbor.topedge, quad.level)) {
                        return possibleNeighbor;
                    }
                    break;
                case 'right':
                    if (this._edgeMatches(quad.rightedge, possibleNeighbor.leftedge, quad.level)) {
                        return possibleNeighbor;
                    }
                    break;
                case 'top':
                    if (this._edgeMatches(quad.topedge, possibleNeighbor.bottomedge, quad.level)) {
                        return possibleNeighbor;
                    }
                    break;
            }
        }
        return null;
    }

    getNeighbors(quad: QuadGeometry): QuadNeighbors {
        const neighbors: QuadNeighbors = {
            left: this.getNeighbor('left', quad),
            bottom: this.getNeighbor('bottom', quad),
            right: this.getNeighbor('right', quad),
            top: this.getNeighbor('top', quad)
        };
        return neighbors;
    }

    getQuadsAtLevel(level: number = 0): Array<QuadGeometry> {
        const quads = new Array<QuadGeometry>();
        if (this._levelQuadMap.has(level)) {
            quads.push(...Array.from(this._levelQuadMap.get(level).values()));
        }
        return quads;
    }

    private _edgeMatches(edge1: Array<V3>, edge2: Array<V3>, level: number): boolean {
        const lvl = level + 1;
        if (edge1.length !== edge2.length) {
            return false;
        }
        for (let i=0; i<edge1.length; i++) {
            const v1 = edge1[i];
            const v2 = edge2[i];
            if (!V3.fuzzyEquals(v1, v2, this._maxDifference / lvl)) {
                return false;
            }
        }
        return true;
    }
}