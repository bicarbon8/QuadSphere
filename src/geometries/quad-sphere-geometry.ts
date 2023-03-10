import { BufferGeometry, Float32BufferAttribute } from "three";
import { QuadSphere, QuadSphereOptions } from "../core/quad-sphere";
import { QuadMeshData, QuadSphereFace } from "../core/quad-types";
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
        this.clearGroups();
        let materialGroupStart = 0;
        let materialGroupCount = 0;
        let materialIndex = 0;
        const indices = new Array<number>();
        const vertices = new Array<number>();
        const normals = new Array<number>();
        const uvs = new Array<number>();
        const data = this.sphere.meshData;
        // below array order is important so we match Box in Threejs
        const faces = new Array<QuadSphereFace>('right', 'left', 'top', 'bottom', 'front', 'back');
        faces.forEach((face: QuadSphereFace) => {
            const faceData = data[face];
            materialGroupCount += faceData.indices.length;
            this.addGroup(materialGroupStart, materialGroupCount, materialIndex);
            materialGroupStart += materialGroupCount;
            materialIndex++;
            indices.push(...faceData.indices);
            vertices.push(...faceData.vertices);
            normals.push(...faceData.normals);
            uvs.push(...faceData.uvs);
        });
        this.setIndex(indices);
        this.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    }
}