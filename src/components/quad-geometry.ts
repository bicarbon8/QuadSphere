import { BufferGeometry, Float32BufferAttribute } from "three";
import { Quad, QuadOptions } from "../types/quad";
import { QuadMeshData } from "../types/quad-types";
import { V3 } from "../types/v3";

export class QuadGeometry extends BufferGeometry {
    readonly quad: Quad;
    constructor(options: QuadOptions) {
        super();
        this.type = 'QuadGeometry';
        this.quad = new Quad(options);
        this._updateAttributes(this.quad.meshData);
    }
    subdivide(location: V3): this {
        const quad = this.quad.getClosestQuad(location);
        quad?.subdivide();
        this._updateAttributes(this.quad.meshData);
        return this;
    }
    unify(location: V3): this {
        const quad = this.quad.getClosestQuad(location);
        quad?.parent?.unify();
        this._updateAttributes(this.quad.meshData);
        return this;
    }
    private _updateAttributes(data: QuadMeshData): void {
        this.setIndex(data.indices);
        this.setAttribute('position', new Float32BufferAttribute(data.vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    }
}