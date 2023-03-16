import { Quad } from "./quad";
import { QuadNeighbors, QuadSide } from "./quad-types";
import { V3 } from "./v3";

export type QuadRegistryKeys = Record<QuadSide, string>;

export class QuadRegistry {
    private readonly _maxDifference: number;
    // key=level -> key=id -> Quad
    private readonly _levelQuadMap = new Map<number, Map<string, Quad>>();

    constructor(maxDifference?: number) {
        this._maxDifference = maxDifference ?? 0.00001;
    }

    /**
     * returns the maximum deepest, active, `Quad` tracked in this registry
     * 
     * NOTE: inactive quads are not included in the results
     */
    get depth(): number {
        let d: number = 0; // no registered quads at any level
        if (this._levelQuadMap.size > 0) {
            const activeLevels = new Array<number>();
            Array.from(this._levelQuadMap.keys()).forEach(level => {
                const map = this._levelQuadMap.get(level);
                if (map.size > 0) {
                    activeLevels.push(level);
                }
            });
            d += activeLevels
                .sort((a, b) => b - a) // sorts in descending
                .find(v => v > 0); // returns first value (max)
        }
        return d;
    }

    /**
     * registers the passed in `Quad` for reuse and to enable locating
     * neighbor quads
     * @param quad the `Quad` to add to this registry
     * @returns `this`
     */
    register(quad: Quad): this {
        if (!this._levelQuadMap.has(quad.level)) {
            this._levelQuadMap.set(quad.level, new Map<string, Quad>());
        }
        this._levelQuadMap.get(quad.level).set(quad.id, quad);
        return this;
    }

    /**
     * removes the specified `Quad` from this registry meaning it can
     * no longer be reused or located as a neighbor
     * @param quad the `Quad` to remove from this registry
     * @returns `this`
     */
    deregister(quad: Quad): this {
        if (this._levelQuadMap.has(quad.level)) {
            this._levelQuadMap.get(quad.level).delete(quad.id);
        }
        return this;
    }

    /**
     * searches for a `Quad` on the specified `QuadSide` whose edge matches
     * @param side the `QuadSide` on which to look for neighbors
     * @param quad the `Quad` whose neighbor we're searching for
     * @returns a `Quad` at the same `level` as the passed in `Quad` whose
     * edge matches
     */
    getNeighbor(side: QuadSide, quad: Quad): Quad {
        if (quad) {
            const possibleNeighbors = this.getQuadsAtLevel(quad.level)
                .filter(q => q.id !== quad.id); // don't attempt to match with ourself
            for (let possibleNeighbor of possibleNeighbors) {
                switch (side) {
                    case 'left':
                        if (this._edgeMatches(quad.leftedge, possibleNeighbor.rightedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for top of quadsphere
                        if (this._edgeMatches(quad.leftedge, possibleNeighbor.topedge.reverse(), quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for bottom of quadsphere
                        if (this._edgeMatches(quad.leftedge, possibleNeighbor.bottomedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        break;
                    case 'bottom':
                        if (this._edgeMatches(quad.bottomedge, possibleNeighbor.topedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for left of quadsphere
                        if (this._edgeMatches(quad.bottomedge, possibleNeighbor.leftedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for right of quadsphere
                        if (this._edgeMatches(quad.bottomedge, possibleNeighbor.rightedge.reverse(), quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for back of quadsphere
                        if (this._edgeMatches(quad.bottomedge, possibleNeighbor.bottomedge.reverse(), quad.level)) {
                            return possibleNeighbor;
                        }
                        break;
                    case 'right':
                        if (this._edgeMatches(quad.rightedge, possibleNeighbor.leftedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for top of quadsphere
                        if (this._edgeMatches(quad.rightedge, possibleNeighbor.topedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for bottom of quadsphere
                        if (this._edgeMatches(quad.rightedge, possibleNeighbor.bottomedge.reverse(), quad.level)) {
                            return possibleNeighbor;
                        }
                        break;
                    case 'top':
                        if (this._edgeMatches(quad.topedge, possibleNeighbor.bottomedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for left of quadsphere
                        if (this._edgeMatches(quad.topedge, possibleNeighbor.leftedge.reverse(), quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for right of quadsphere
                        if (this._edgeMatches(quad.topedge, possibleNeighbor.rightedge, quad.level)) {
                            return possibleNeighbor;
                        }
                        // special case for back of quadsphere
                        if (this._edgeMatches(quad.topedge, possibleNeighbor.topedge.reverse(), quad.level)) {
                            return possibleNeighbor;
                        }
                        break;
                }
            }
        }
        return null;
    }

    getNeighbors(quad: Quad): QuadNeighbors {
        const neighbors: QuadNeighbors = {
            left: this.getNeighbor('left', quad),
            bottom: this.getNeighbor('bottom', quad),
            right: this.getNeighbor('right', quad),
            top: this.getNeighbor('top', quad)
        };
        return neighbors;
    }

    /**
     * returns any active `Quad` objects at the specified level
     * @param level the `level` to returns `Quad` objects at @default 0
     * @returns an array of active `Quad` objects at the specified level
     */
    getQuadsAtLevel(level: number = 0): Array<Quad> {
        const quads = new Array<Quad>();
        if (this._levelQuadMap.has(level)) {
            quads.push(...Array.from(this._levelQuadMap.get(level).values()));
        }
        return quads;
    }

    /**
     * generates a unique id for a `Quad` based on what makes
     * it unique
     * @param centre the un-rounded centre of the `Quad`
     * @param radius the `radius` of the `Quad`
     * @param level the `level` of the `Quad`
     * @returns an id made up of the passed in values
     */
    getId(centre: V3, radius: number, level: number): string {
        const id = V3.reducePrecision(centre, 5);
        return `x${id.x}:y${id.y}:z${id.z}:r${radius}:l${level}`;
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