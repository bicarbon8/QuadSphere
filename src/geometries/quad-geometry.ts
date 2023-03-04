import { BufferGeometry, Float32BufferAttribute } from "three";
import { Quad, QuadOptions } from "../core/quad";
import { QuadMeshData } from "../core/quad-types";
import { V3 } from "../core/v3";

export class QuadGeometry extends BufferGeometry {
    readonly quad: Quad;
    constructor(options: QuadOptions) {
        super();
        this.type = 'QuadGeometry';
        this.quad = new Quad(options);
        this.updateAttributes();
    }
    subdivide(location: V3): this {
        const quad = this.quad.getClosestQuad(location);
        quad?.subdivide();
        this.updateAttributes();
        return this;
    }
    unify(location: V3): this {
        const quad = this.quad.getClosestQuad(location);
        quad?.parent?.unify();
        this.updateAttributes();
        return this;
    }
    updateAttributes(): void {
        const data = this.quad.meshData;
        this.setIndex(data.indices);
        this.setAttribute('position', new Float32BufferAttribute(data.vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    }
}