import * as THREE from "three";

export type V3 = {
    x: number;
    y: number;
    z: number;
};

export module V3 {
    export const ZERO: V3 = {x: 0, y: 0, z: 0};
    export const RIGHT: V3 = {x: 1, y: 0, z: 0};
    export const UP: V3 = {x: 0, y: 1, z: 0};
    export const FORWARD: V3 = {x: 0, y: 0, z: 1};
    export function toVector3(input: V3): THREE.Vector3 {
        return new THREE.Vector3(input.x, input.y, input.z);
    }
    export function midpoint(start: V3, end: V3): THREE.Vector3 {
        return new THREE.Vector3((start.x+end.x)/2, (start.y+end.y)/2, (start.z+end.z)/2);
    }
    export function reducePrecision(input: V3, precision: number): V3 {
        const output = {x: 0, y: 0, z: 0};
        if (input) {
            output.x = Number(input.x.toFixed(precision));
            output.y = Number(input.y.toFixed(precision));
            output.z = Number(input.z.toFixed(precision));
        }
        return output;
    }
    export function fuzzyEquals(point1: V3, point2: V3, maxDiff: number = 0.1): boolean {
        const xdiff = Math.abs(point1.x - point2.x);
        if (xdiff > maxDiff) { return false; }
        const ydiff = Math.abs(point1.y - point2.y);
        if (ydiff > maxDiff) { return false; }
        const zdiff = Math.abs(point1.z - point2.z);
        if (zdiff > maxDiff) { return false; }
        return true;
    }
    export function toArray(...inputs: Array<V3>): Array<number> {
        const output = new Array<number>();
        for (let v of inputs) {
            output.push(v.x, v.y, v.z);
        }
        return output;
    }
    export function multiply(input: V3, x: number, y?: number, z?: number): V3 {
        y ??= x;
        z ??= y;
        return new THREE.Vector3(input.x, input.y, input.z).normalize().multiply(new THREE.Vector3(x, y, z));
    }
    export function length(p1: V3, p2: V3): number {
        return Math.sqrt(Math.pow(p2.x-p1.x, 2) + Math.pow(p2.y-p1.y, 2) + Math.pow(p2.z+p1.z, 2));
    }
}