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
}