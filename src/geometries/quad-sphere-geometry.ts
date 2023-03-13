import { BufferGeometry, Float32BufferAttribute } from "three";
import { QuadSphere, QuadSphereOptions } from "../core/quad-sphere";
import { V3 } from "../core/v3";

export class QuadSphereGeometry extends BufferGeometry {
    readonly sphere: QuadSphere;
    constructor(options: QuadSphereOptions) {
        super();
        this.type = 'QuadSphereGeometry';
        this.sphere = new QuadSphere(options);
        this.updateAttributes();
    }
    /**
     * will find the closest, max-depth, `Quad` to the passed in `location` and call
     * the subdivide function on it
     * @param location a `V3` used to locate the closest `Quad` to subdivide
     * @returns `this`
     */
    subdivide(location: V3): this {
        const closest = this.sphere.getClosestQuad(location);
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
            const closest = this.sphere.getClosestQuad(location);
            closest?.parent?.unify();
        } else {
            this.sphere.unify();
        }
        this.updateAttributes();
        return this;
    }
    /**
     * sets all vertices, indices, normals and uv attributes for this `BufferGeometry`
     */
    updateAttributes(): void {
        this.clearGroups();
        let materialGroupStart = 0;
        let materialGroupCount = 0;
        let materialIndex = 0;
        const indices = new Array<number>();
        const vertices = new Array<number>();
        const normals = new Array<number>();
        const uvs = new Array<number>();
        const data = this.sphere.meshData;
        let index = 0;
        while (index<6) {
            const face = this.sphere.utils.faceByIndex(index);
            const faceData = data[face];
            materialGroupCount += faceData.indices.length;
            this.addGroup(materialGroupStart, materialGroupCount, materialIndex);
            materialGroupStart += materialGroupCount;
            materialIndex++;
            indices.push(...faceData.indices);
            vertices.push(...faceData.vertices);
            normals.push(...faceData.normals);
            uvs.push(...faceData.uvs);
            index++;
        };
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }
}