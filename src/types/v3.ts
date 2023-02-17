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
    export function fuzzyEquals(point1: V3, point2: V3, precision: number = 1): boolean {
        const p1 = V3.reducePrecision(point1, precision);
        const p2 = V3.reducePrecision(point2, precision);
        return (p1.x === p2.x && p1.y === p2.y && p1.z === p2.z);
    }
    export function toArray(...inputs: Array<V3>): Array<number> {
        const output = new Array<number>();
        for (let v of inputs) {
            output.push(v.x, v.y, v.z);
        }
        return output;
    }
}