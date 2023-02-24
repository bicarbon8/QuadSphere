import { expect, test } from "vitest";
import { V3 } from "../../src/types/v3";

test.concurrent('can get correct length', () => {
    const p = {x: 1.2, y: 0, z: 1};
    const verts = [
        {x: 1.2, y: 0, z: -1},
        {x: 1.2, y: -1, z: 0},
        {x: 2.2, y: 0, z: 0},
        {x: 0.19999999999999996, y: 0, z: 0},
        {x: 1.2, y: 1, z: 0},
        {x: 1.2, y: 0, z: 1}
    ];

    const farthest = V3.length(p, verts[0]);
    const nearest = V3.length(p, verts[5]);
    expect(farthest).greaterThan(nearest);
});