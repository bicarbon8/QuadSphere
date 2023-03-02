export type V2 = {
    x: number;
    y: number;
};

export type UV = {
    u: number;
    v: number;
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
        const verts = new Array<UV>();
        for (let i=0; i<input.length; i+=2) {
            verts.push({u: input[i], v: input[i+1]});
        }
        return verts;
    }
}