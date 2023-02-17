import { QuadGeometry, QuadSide } from "./quad-geometry";
import { V3 } from "./v3";

export type QuadRegistryKeys = Record<QuadSide, string>;

export type QuadNeighbors = Record<QuadSide, QuadGeometry>;

export class QuadRegistry {
    private readonly _precision: number;
    private readonly _leftEdgeMap = new Map<string, QuadGeometry>();
    private readonly _bottomEdgeMap = new Map<string, QuadGeometry>();
    private readonly _rightEdgeMap = new Map<string, QuadGeometry>();
    private readonly _topEdgeMap = new Map<string, QuadGeometry>();

    constructor(precision?: number) {
        this._precision = precision ?? 3;
    }

    register(quad: QuadGeometry): this {
        const keys = this._generateEdgeKeys(quad);
        this._leftEdgeMap.set(keys.left, quad);
        this._bottomEdgeMap.set(keys.bottom, quad);
        this._rightEdgeMap.set(keys.right, quad);
        this._topEdgeMap.set(keys.top, quad);
        return this;
    }

    deregister(quad: QuadGeometry): this {
        const keys = this._generateEdgeKeys(quad);
        this._leftEdgeMap.delete(keys.left);
        this._bottomEdgeMap.delete(keys.bottom);
        this._rightEdgeMap.delete(keys.right);
        this._topEdgeMap.delete(keys.top);
        return this;
    }

    getNeighbors(quad: QuadGeometry): QuadNeighbors {
        const neighbors: QuadNeighbors = {
            left: null,
            bottom: null,
            right: null,
            top: null
        };
        const keys = this._generateEdgeKeys(quad);
        const parentKeys = this._generateEdgeKeys(quad.parent);
        if (this._rightEdgeMap.has(keys.left)) {
            neighbors.left = this._rightEdgeMap.get(keys.left);
        } else if(this._rightEdgeMap.has(parentKeys.left)) {
            neighbors.left = this._rightEdgeMap.get(parentKeys.left);
        }
        if (this._topEdgeMap.has(keys.bottom)) {
            neighbors.bottom = this._topEdgeMap.get(keys.bottom);
        } else if(this._topEdgeMap.has(parentKeys.bottom)) {
            neighbors.bottom = this._topEdgeMap.get(parentKeys.bottom);
        }
        if (this._leftEdgeMap.has(keys.right)) {
            neighbors.right = this._leftEdgeMap.get(keys.right);
        } else if(this._leftEdgeMap.has(parentKeys.right)) {
            neighbors.right = this._leftEdgeMap.get(parentKeys.right);
        }
        if (this._bottomEdgeMap.has(keys.top)) {
            neighbors.top = this._bottomEdgeMap.get(keys.top);
        } else if(this._bottomEdgeMap.has(parentKeys.top)) {
            neighbors.top = this._bottomEdgeMap.get(parentKeys.top);
        }
        return neighbors;
    }

    private _generateEdgeKeys(quad: QuadGeometry): QuadRegistryKeys {
        if (quad) {
            const left = JSON.stringify([
                ...this._reducePrecision(quad.bottomleft), 
                ...this._reducePrecision(quad.middleleft), 
                ...this._reducePrecision(quad.topleft)
            ]);
            const bottom = JSON.stringify([
                ...this._reducePrecision(quad.bottomleft),
                ...this._reducePrecision(quad.bottommiddle),
                ...this._reducePrecision(quad.bottomright)
            ]);
            const right = JSON.stringify([
                ...this._reducePrecision(quad.bottomright),
                ...this._reducePrecision(quad.middleright),
                ...this._reducePrecision(quad.topright)
            ]);
            const top = JSON.stringify([
                ...this._reducePrecision(quad.topright),
                ...this._reducePrecision(quad.topmiddle),
                ...this._reducePrecision(quad.topright)
            ]);
            return {left, bottom, right, top};
        }
        return {left: null, bottom: null, right: null, top: null};
    }

    private _reducePrecision(input: V3): Array<number> {
        const output = new Array<number>();
        if (input) {
            output.push(
                Number(input.x.toFixed(this._precision)),
                Number(input.y.toFixed(this._precision)),
                Number(input.z.toFixed(this._precision))
            );
        }
        return output;
    }
}