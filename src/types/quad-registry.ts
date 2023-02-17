import { QuadGeometry, QuadSide } from "./quad-geometry";
import { V3 } from "./v3";

export type QuadRegistryKeys = Record<QuadSide, string>;

export type QuadNeighbors = Record<QuadSide, QuadGeometry>;

export class QuadRegistry {
    private readonly _precision: number;
    private readonly _levelQuadMap = new Map<number, Set<QuadGeometry>>();
    private readonly _leftEdgeMap = new Map<string, QuadGeometry>();
    private readonly _bottomEdgeMap = new Map<string, QuadGeometry>();
    private readonly _rightEdgeMap = new Map<string, QuadGeometry>();
    private readonly _topEdgeMap = new Map<string, QuadGeometry>();

    constructor(precision?: number) {
        this._precision = precision ?? 3;
    }

    register(quad: QuadGeometry): this {
        if (!this._levelQuadMap.has(quad.level)) {
            this._levelQuadMap.set(quad.level, new Set<QuadGeometry>());
        }
        this._levelQuadMap.get(quad.level).add(quad);
        return this;
    }

    deregister(quad: QuadGeometry): this {
        if (this._levelQuadMap.has(quad.level)) {
            this._levelQuadMap.get(quad.level).delete(quad);
        }
        return this;
    }

    getNeighbors(quad: QuadGeometry): QuadNeighbors {
        const neighbors: QuadNeighbors = {
            left: null,
            bottom: null,
            right: null,
            top: null
        };
        const possibleNeighbors = Array.from(this._levelQuadMap.get(quad.level));
        for (let i=0; i<possibleNeighbors.length; i++) {
            let possibleNeighbor = possibleNeighbors[i];
            // TODO: handle case in QuadSphere where one neighbor can match multiple edges
            if (neighbors.left == null && this._edgeMatches(quad.leftedge, possibleNeighbor.rightedge)) {
                neighbors.left = possibleNeighbor;
                continue;
            }
            if (neighbors.bottom == null && this._edgeMatches(quad.bottomedge, possibleNeighbor.topedge)) {
                neighbors.bottom = possibleNeighbor;
                continue;
            }
            if (neighbors.right == null && this._edgeMatches(quad.rightedge, possibleNeighbor.leftedge)) {
                neighbors.right = possibleNeighbor;
                continue;
            }
            if (neighbors.top == null && this._edgeMatches(quad.topedge, possibleNeighbor.bottomedge)) {
                neighbors.top = possibleNeighbor;
                continue;
            }
            if (neighbors.left && neighbors.bottom && neighbors.right && neighbors.top) {
                break;
            }
        }
        if (neighbors.left == null || neighbors.bottom == null || neighbors.right == null || neighbors.top == null) {
            if (quad.parent) {
                console.debug('no neighbor found for one or more side at level', quad.level, 'checking parent quad...');
                const parentNeighbors = quad.parent.neighbors;
                if (neighbors.left == null) {
                    neighbors.left = parentNeighbors.left;
                }
                if (neighbors.bottom == null) {
                    neighbors.bottom = parentNeighbors.bottom;
                }
                if (neighbors.right == null) {
                    neighbors.right = parentNeighbors.right;
                }
                if (neighbors.top == null) {
                    neighbors.right = parentNeighbors.right;
                }
            }
        }
        return neighbors;
    }

    private _edgeMatches(edge1: Array<V3>, edge2: Array<V3>): boolean {
        if (edge1.length !== edge2.length) {
            return false;
        }
        for (let i=0; i<edge1.length; i++) {
            const v1 = edge1[i];
            const v2 = edge2[i];
            if (!V3.fuzzyEquals(v1, v2, 3)) {
                return false;
            }
        }
        return true;
    }
}