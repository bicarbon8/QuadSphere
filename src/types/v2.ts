export type V2 = {
    x: number;
    y: number;
};

export type UV = {
    u: number;
    v: number;
}

export module V2 {
    export const zero = () => {return {u: 0, v: 0}};
    export const one = () => {return {u: 1, v: 1}};
    export function midpoint(p1: V2, p2: V2): V2 {
        return {x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2};
    }
    export function toArray(...inputs: Array<V2>): Array<number> {
        const output = new Array<number>();
        for (let uv of inputs) {
            output.push(uv.y, uv.y);
        }
        return output;
    }
    export function fromArray(input: Array<number>): Array<V2> {
        if (input.length % 3 !== 0) {
            throw new Error('input array must have length evenly divisible by 3');
        }
        const verts = new Array<V2>();
        for (let i=0; i<input.length; i+=2) {
            verts.push({x: input[i], y: input[i+1]});
        }
        return verts;
    }
    export function fromUvs(...uvs: Array<UV>): Array<V2> {
        const verts = new Array<V2>();
        uvs?.filter(v => v != null)
            .forEach(uv => verts.push({x: uv.u, y: uv.v}));
        return verts;
    }
}

export module UV {
    export const zero = () => {return {u: 0, v: 0}};
    export const one = () => {return {u: 1, v: 1}};
    export function midpoint(p1: UV, p2: UV): UV {
        return {u: (p1.u+p2.u)/2, v: (p1.v+p2.v)/2};
    }
    export function toArray(...inputs: Array<UV>): Array<number> {
        const output = new Array<number>();
        for (let uv of inputs) {
            output.push(uv.u, uv.v);
        }
        return output;
    }
    export function fromArray(input: Array<number>): Array<UV> {
        if (input.length % 3 !== 0) {
            throw new Error('input array must have length evenly divisible by 3');
        }
        const uvs = new Array<UV>();
        for (let i=0; i<input.length; i+=2) {
            uvs.push({u: input[i], v: input[i+1]});
        }
        return uvs;
    }
    export function fromV2s(...v2s: Array<V2>): Array<UV> {
        const uvs = new Array<UV>();
        v2s?.filter(v => v != null)
            .forEach(v2 => uvs.push({u: v2.x, v: v2.y}));
        return uvs;
    }
}