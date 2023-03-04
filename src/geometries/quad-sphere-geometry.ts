import { BufferGeometry, Float32BufferAttribute } from "three";
import { QuadSphere, QuadSphereOptions } from "../core/quad-sphere";
import { QuadMeshData } from "../core/quad-types";
import { V3 } from "../core/v3";

export class QuadSphereGeometry extends BufferGeometry {
    readonly sphere: QuadSphere;
    constructor(options: QuadSphereOptions) {
        super();
        this.type = 'QuadSphereGeometry';
        this.sphere = new QuadSphere(options);
        this._updateAttributes(this.sphere.meshData);
    }
    subdivide(location: V3): this {
        const sphere = this.sphere.getClosestQuad(location);
        sphere?.subdivide();
        this._updateAttributes(this.sphere.meshData);
        return this;
    }
    unify(location: V3): this {
        const sphere = this.sphere.getClosestQuad(location);
        sphere?.parent?.unify();
        this._updateAttributes(this.sphere.meshData);
        return this;
    }
    private _updateAttributes(data: QuadMeshData): void {
        this.setIndex(data.indices);
        this.setAttribute('position', new Float32BufferAttribute(data.vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    }
}