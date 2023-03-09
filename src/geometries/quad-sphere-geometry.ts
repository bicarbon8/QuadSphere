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
        this.updateAttributes();
    }
    subdivide(location: V3): this {
        const sphere = this.sphere.getClosestQuad(location);
        sphere?.subdivide();
        this.updateAttributes();
        return this;
    }
    unify(location: V3): this {
        const sphere = this.sphere.getClosestQuad(location);
        sphere?.parent?.unify();
        this.updateAttributes();
        return this;
    }
    updateAttributes(): void {
        const data = this.sphere.meshData;
        this.setIndex(data.indices);
        this.setAttribute('position', new Float32BufferAttribute(data.vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    }
}