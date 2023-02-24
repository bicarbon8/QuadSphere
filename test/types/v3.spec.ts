import { expect, describe, test } from "vitest";
import { V3 } from "../../src/types/v3";

describe('V3', () => {
    describe('length', () => {
        test.concurrent('returns values matching expectations', () => {
            const p = {x: 1, y: 0, z: 1};
            const farthest = V3.length(p, {x: 1.2, y: 0, z: -1});
            const nearest = V3.length(p, {x: 1.2, y: 0, z: 1});
            expect(farthest).greaterThan(nearest);
        })

        test.concurrent('returns 0 for same point', () => {
            const p = {x: 1.2, y: 0, z: 1};
            expect(V3.length(p, p)).toEqual(0);
        })
    })

    describe('toArray', () => {
        test.concurrent('generates array of x, y, z values in order', () => {
            const p = {x: 1.2, y: 0, z: 3};
            expect(V3.toArray(p)).toEqual([1.2, 0, 3]);
        })
    })
})