import THREE from "three";

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
}