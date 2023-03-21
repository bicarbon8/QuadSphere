import { expect, describe, test } from "vitest";
import { V3 } from "../../src/core/v3";

describe.concurrent('V3', () => {
    test.each([
        {p1: V3.zero(), p2: {x: 1, y: 1, z: 1}, expected: {x: 0.5, y: 0.5, z: 0.5}},
        {p1: V3.zero(), p2: {x: -1, y: -1, z: -1}, expected: {x: -0.5, y: -0.5, z: -0.5}},
        {p1: {x: 1, y: 0, z: 0}, p2: {x: 2, y: 0, z: 0}, expected: {x: 1.5, y: 0, z: 0}}
    ])('midpoint($p1, $p2) -> $expected', ({p1, p2, expected}) => {
        expect(V3.midpoint(p1, p2)).toEqual(expected);
    })

    test.each([
        {point: {x: 1.2345, y: 1.2345, z: 1.2345}, precision: 0, expected: {x: 1, y: 1, z: 1}},
        {point: {x: 1.2345, y: 1.2345, z: 1.2345}, precision: 1, expected: {x: 1.2, y: 1.2, z: 1.2}},
        {point: {x: 1.2345, y: 1.2345, z: 1.2345}, precision: 2, expected: {x: 1.23, y: 1.23, z: 1.23}},
        {point: {x: 1.2346, y: 1.2346, z: 1.2346}, precision: 3, expected: {x: 1.235, y: 1.235, z: 1.235}},
        {point: {x: 1.2345, y: 1.2345, z: 1.2345}, precision: 3, expected: {x: 1.234, y: 1.234, z: 1.234}},
        {point: {x: 1.2345, y: 1.2345, z: 1.2345}, precision: 10, expected: {x: 1.2345, y: 1.2345, z: 1.2345}},
        {point: {x: 0.54321, y: 0.54321, z: 0.54321}, precision: 0, expected: {x: 1, y: 1, z: 1}},
        {point: {x: 0.54321, y: 0.54321, z: 0.54321}, precision: 1, expected: {x: 0.5, y: 0.5, z: 0.5}},
        {point: {x: 0.99998, y: 0.99998, z: 0.99998}, precision: 4, expected: {x: 1, y: 1, z: 1}}
    ])('reducePrecision($point, $precision) -> $expected', ({point, precision, expected}) => {
        expect(V3.reducePrecision(point, precision)).toEqual(expected);
    })

    test.each([
        {p1: V3.zero(), p2: {x: 0.1, y: 0.1, z: 0.1}, diff: 0.1, expected: true},
        {p1: V3.zero(), p2: {x: -0.1, y: -0.1, z: -0.1}, diff: 0.1, expected: true},
        {p1: V3.zero(), p2: {x: 0.1, y: 0.1, z: 0.1}, diff: 0.01, expected: false},
        {p1: V3.zero(), p2: {x: -0.1, y: -0.1, z: -0.1}, diff: 0.01, expected: false},
        {p1: {x: 1.234, y: NaN, z: -1.234}, p2: {x: 1.234, y: 0, z: -1.234, diff: 0.01}, expected: false }
    ])('fuzzyEquals($p1, $p2, $diff) -> $expected', ({p1, p2, diff, expected}) => {
        expect(V3.fuzzyEquals(p1, p2, diff)).toBe(expected);
    })

    describe('length', () => {
        test('returns values matching expectations', () => {
            const p = {x: 1, y: 0, z: 1};
            const farthest = V3.length(p, {x: 1.2, y: 0, z: -1});
            const nearest = V3.length(p, {x: 1.2, y: 0, z: 1});
            expect(farthest).greaterThan(nearest);
        })

        test('returns 0 for same point', () => {
            const p = {x: 1.2, y: 0, z: 1};
            expect(V3.length(p, p)).toEqual(0);
        })

        test('can be used with only one V3', () => {
            const p = {x: 1.2, y: 0, z: 1};
            expect(V3.length(p)).greaterThan(1).lessThan(2);
        })
    })

    describe('toArray', () => {
        test('generates array of x, y, z values in order', () => {
            const p = [
                {x: 1, y: 2, z: 3},
                {x: 4, y: 5, z: 6}
            ];
            expect(V3.toArray(...p)).toEqual([1, 2, 3, 4, 5, 6]);
        })
    })

    describe('fromArray', () => {
        test('generates array of V3 from array of numbers', () => {
            const arr = [1, 2, 3, 4, 5, 6];
            expect(V3.fromArray(arr)).toEqual([
                {x: 1, y: 2, z: 3},
                {x: 4, y: 5, z: 6}
            ]);
        })

        test('throws if array is not divisible by 3', () => {
            const arr = [1, 2];
            expect(() => V3.fromArray(arr)).toThrow();
        })
    })

    test.each([
        {p1: V3.right(), angle: 90, axis: {x: 0, y: 0, z: 1}, around: V3.zero(), expected: V3.up()},
        {p1: V3.right(), angle: 90, axis: {x: 0, y: 1, z: 0}, around: V3.zero(), expected: V3.multiply(V3.forward(), -1)},
        {p1: V3.right(), angle: 90, axis: {x: 1, y: 0, z: 0}, around: V3.zero(), expected: V3.right()},
        {p1: {x: -1, y: -1, z: 1}, angle: 90, axis: {x: 1, y: 0, z: 0}, around: V3.zero(), expected: {x: -1, y: -1, z: -1}}
    ])('rotatePoint($p1, $angle, $axis, $around) -> $expected', ({p1, angle, axis, around, expected}) => {
        expect(V3.fuzzyEquals(V3.rotatePoint(p1, angle, axis, around), expected, 0.0001)).is.true;
    })

    test.each([
        {p1: {x: -1, y: 2, z: -2}, origin: {x: 0, y: 0, z: 0}, radius: 2, expected: {x: -0.6, y: 1.3, z: -1.3}}
    ])('applyCurve($p1, $origin, $radius) -> $expected', ({p1, origin, radius, expected}) => {
        const actual = V3.applyCurve(p1, origin, radius);
        expect(V3.fuzzyEquals(actual, expected, 0.1)).is.true;
        expect(V3.length(actual, origin)).toEqual(radius);
    })
})