import { BufferGeometry, Float32BufferAttribute } from "three";
import { Quad, QuadOptions } from "../core/quad";
import { V3 } from "../core/v3";

export class QuadGeometry extends BufferGeometry {
    readonly quad: Quad;
    constructor(options: QuadOptions) {
        super();
        this.type = 'QuadGeometry';
        this.quad = new Quad(options);
        this.updateAttributes();
    }
    /**
     * will find the closest, max-depth, `Quad` to the passed in `location` and call
     * the subdivide function on it
     * @param location a `V3` used to locate the closest `Quad` to subdivide
     * @returns `this`
     */
    subdivide(location: V3): this {
        const closest = this.quad.getClosestQuad(location);
        closest?.subdivide();
        this.updateAttributes();
        return this;
    }
    /**
     * will find the closest, max-depth, `Quad` to the passed in `location` and call
     * the unify function on its parent or will unify the top-level `Quad`
     * if no `location` is passed in
     * @param location optional `V3` used to locate closest `Quad` to unify
     * @returns `this`
     */
    unify(location?: V3): this {
        if (location) {
            const closest = this.quad.getClosestQuad(location);
            closest?.parent?.unify();
        } else {
            this.quad.unify();
        }
        this.updateAttributes();
        return this;
    }
    /**
     * sets all vertices, indices, normals and uv attributes for this `BufferGeometry`
     */
    updateAttributes(): void {
        const data = this.quad.meshData;
        this.setIndex(data.indices);
        this.setAttribute('position', new Float32BufferAttribute(data.vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(data.normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(data.uvs, 2));
    }
}