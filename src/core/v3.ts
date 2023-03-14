import * as THREE from "three";
import { V2 } from "./v2";

export type V3 = V2 & {
    z: number;
};

export module V3 {
    export const zero = () => {return {x: 0, y: 0, z: 0}};
    export const zeroArray = () => {return [0, 0, 0]};
    export const right = () => {return {x: 1, y: 0, z: 0}};
    export const rightArray = () => {return [1, 0, 0]};
    export const up = () => {return {x: 0, y: 1, z: 0}};
    export const upArray = () => {return [0, 1, 0]};
    export const forward = () => {return {x: 0, y: 0, z: 1}};
    export const forwardArray = () => {return [0, 0, 1]};
    export function toVector3(input: V3 | Array<number>): THREE.Vector3 {
        if (Array.isArray(input)) {
            return new THREE.Vector3(input[0], input[1], input[2]);
        } else {
            return new THREE.Vector3(input.x, input.y, input.z);
        }
    }
    export function midpoint(p1: V3, p2: V3): V3 {
        return {x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2, z: (p1.z+p2.z)/2};
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
        if (zdiff > Math.abs(maxDiff)) { return false; }
        return true;
    }
    export function toArray(...inputs: Array<V3>): Array<number> {
        const output = new Array<number>();
        for (let v of inputs) {
            output.push(v.x, v.y, v.z);
        }
        return output;
    }
    export function fromArray(input: Array<number>): Array<V3> {
        if (input.length % 3 !== 0) {
            throw new Error('input array must have length evenly divisible by 3');
        }
        const verts = new Array<V3>();
        for (let i=0; i<input.length; i+=3) {
            verts.push({x: input[i], y: input[i+1], z: input[i+2]});
        }
        return verts;
    }
    export function divide(input: V3, x: number, y?: number, z?: number): V3 {
        y ??= x;
        z ??= y;
        return multiply(input, 1/x, 1/y, 1/z);
    }
    export function multiply(input: V3, x: number, y?: number, z?: number): V3 {
        y ??= x;
        z ??= y;
        return {x: input.x*x, y: input.y*y, z: input.z*z};
    }
    export function subtract(input: V3, x: number, y?: number, z?: number): V3 {
        y ??= x;
        z ??= y;
        return add(input, -x, -y, -z);
    }
    export function add(input: V3, x: number, y?: number, z?: number): V3 {
        y ??= x;
        z ??= y;
        return {x: input.x+x, y: input.y+y, z: input.z+z};
    }
    export function length(p1: V3, p2?: V3): number {
        if (p2) {
            return Math.sqrt(Math.pow(p2.x-p1.x, 2) + Math.pow(p2.y-p1.y, 2) + Math.pow(p2.z-p1.z, 2));
        } else {
            return Math.sqrt(p1.x*p1.x + p1.y*p1.y + p1.z*p1.z);
        }
    }
    export function normalise(point: V3): V3 {
        return divide(point, V3.length(point) || 1);
    }

    const _rotate = new THREE.Vector3();
    const _around = new THREE.Vector3();
    const _axis = new THREE.Vector3();
    /**
     * generates a rotated point either around an axis or around a location on an axis
     * without affecting the original, passed in, point
     * @param point the starting x, y, and z location
     * @param angle the amount to rotate in degrees
     * @param axis the axis of rotation around the x, y, and z axis'
     * @param around an optional point to rotate around @default `point`
     * @returns the x, y, z coordinates following rotation
     */
    export function rotatePoint(point: V3, angle: number, axis: V3, around?: V3): V3 {
        if (angle === 0) {
            return point;
        }
        const radians = angle * (Math.PI / 180);
        _rotate.x = point.x;
        _rotate.y = point.y;
        _rotate.z = point.z;
        _around.x = around?.x ?? point.x;
        _around.y = around?.y ?? point.y;
        _around.z =  around?.z ?? point.z;
        _axis.x = axis.x;
        _axis.y = axis.y;
        _axis.z = axis.z
        _axis.normalize();
        
        return _rotate.sub(_around)
            .applyAxisAngle(_axis, radians)
            .add(_around).clone();
    }

    const _curvedOffset = V3.zero();
    /**
     * applies a curvature around the `curveOrigin` for the passed in point
     * @param point the point to be adjusted for curvature
     * @param curveOrigin the point around which to curve
     * @returns the curve-adjusted point
     */
    export function applyCurve(point: V3, curveOrigin: V3): V3 {
        const offset = V3.subtract(point, curveOrigin.x, curveOrigin.y, curveOrigin.z);
        // _curvedOffset = V3.multiply(V3.normalise(offset), this.radius);
        const x2 = offset.x * offset.x;
        const y2 = offset.y * offset.y;
        const z2 = offset.z * offset.z;
        _curvedOffset.x = offset.x * Math.sqrt(1 - y2 / 2 - z2 / 2 + y2 * z2 / 3);
        _curvedOffset.y = offset.y * Math.sqrt(1 - x2 / 2 - z2 / 2 + x2 * z2 / 3);
        _curvedOffset.z = offset.z * Math.sqrt(1 - x2 / 2 - y2 / 2 + x2 * y2 / 3);
        const curved = V3.add(_curvedOffset, curveOrigin.x, curveOrigin.y, curveOrigin.z);
        return curved;
    }
}