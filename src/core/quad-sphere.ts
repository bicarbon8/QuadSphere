import * as THREE from "three";
import { Quad } from "./quad";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadMeshData, QuadSphereFace } from "./quad-types";
import { QuadUtils } from "./quad-utils";
import { UV } from "./v2";
import { V3 } from "./v3"

export type QuadSphereOptions = {
    centre?: V3,
    radius?: number,
    loglevel?: QuadLoggerLevel,
    maxlevel?: number;
    utils?: QuadUtils;
}

export class QuadSphere {
    readonly centre: V3;
    readonly radius: number;
    readonly registry: QuadRegistry;
    readonly maxlevel: number;
    
    private readonly _faces = new Map<QuadSphereFace, Quad>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;
    private readonly _utils: QuadUtils;
    
    constructor(options: QuadSphereOptions) {
        this.centre = options.centre ?? {x: 0, y: 0, z: 0};
        this.radius = options.radius ?? 1;
        this.registry = new QuadRegistry();
        this.maxlevel = options.maxlevel ?? 100;
        this._loglevel = options.loglevel ?? 'warn';
        this._logger = new QuadLogger({
            level: this._loglevel
        });
        this._utils = options.utils ?? new QuadUtils({loglevel: this._logger.level});
        this._createFaces();
    }

    get key(): string {
        const keyArray = new Array<string>();
        this._faces.forEach((quad: Quad, face: QuadSphereFace) => {
            keyArray.push(`${face}:${quad.key}`);
        });
        return keyArray.join('_');
    }

    get depth(): number {
        const d = Array.from(this._faces.values())
            .map(c => c.depth) // gets all child depths
            .sort((a, b) => b - a) // sorts in descending
            .find(v => v > 0); // returns first value (max)
        return d;
    }

    get faces(): Array<Quad> {
        return Array.from(this._faces.values());
    }

    get front(): Quad {
        return this._faces.get('front');
    }

    get back(): Quad {
        return this._faces.get('back');
    }

    get left(): Quad {
        return this._faces.get('left');
    }

    get right(): Quad {
        return this._faces.get('right');
    }

    get top(): Quad {
        return this._faces.get('top');
    }

    get bottom(): Quad {
        return this._faces.get('bottom');
    }

    get meshData(): QuadMeshData {
        const tris = new Array<number>();
        const verts = new Array<number>();
        const norms = new Array<number>();
        const uvs = new Array<number>();

        let offset = 0;
        this._faces.forEach((quad: Quad, face: QuadSphereFace) => {
            const data = quad.meshData;
            tris.push(...data.indices.map(i => i+offset));
            offset += data.vertices.length / 3;
            verts.push(...data.vertices);
            norms.push(...data.normals);
            uvs.push(...data.uvs);
        });

        // merge any duplicate vertices
        const cubeData = { // this.utils.mergeVertices({
            indices: tris,
            vertices: verts,
            normals: norms,
            uvs: uvs
        } // , 4);

        // "inflate" our cube vertices into a sphere
        const sphericalVerts = V3.toArray(...V3.fromArray(cubeData.vertices).map(v => this.applyCurve(v)));
        const sphericalNorms = V3.toArray(...V3.fromArray(sphericalVerts).map(v => new THREE.Vector3(v.x, v.y, v.z).normalize()));
        
        return {
            indices: cubeData.indices,
            vertices: sphericalVerts,
            normals: sphericalNorms,
            uvs: cubeData.uvs
        };
    }

    /**
     * recursively searches this `QuadSphere` for the child `Quad` whose `centre`
     * point is closest to the specified `point`
     * @param point the `V3` in local space against which to compare
     * @returns the deepest quad that is closest to the specified `point`
     */
    getClosestQuad(point: V3): Quad {
        return this._utils.getClosestQuad(point, ...Array.from(this._faces.values()));
    }

    /**
     * recursively searches this `QuadSphere` for any `Quad` who does not have children
     * and whose `centre` is within the specified `distance` from the specified `point`
     * @param point the `V3` in local space against which to compare
     * @param distance the distance within which the length from `point` to `quad.centre` must be
     * @returns an array of the deepest quads that are within the specified `distance` from the `point`
     */
    getQuadsWithinDistance(point: V3, distance: number): Array<Quad> {
        return this._utils.getQuadsWithinDistance(point, distance, ...Array.from(this._faces.values()));
    }

    applyCurve(point: V3): V3 {
        const offset = V3.subtract(point, this.centre.x, this.centre.y, this.centre.z);
        // const curvedOffset = V3.multiply(V3.normalise(offset), this.radius);
        const curvedOffset = V3.zero();
        const x2 = offset.x * offset.x;
        const y2 = offset.y * offset.y;
        const z2 = offset.z * offset.z;
        curvedOffset.x = offset.x * Math.sqrt(1 - y2 / 2 - z2 / 2 + y2 * z2 / 3);
        curvedOffset.y = offset.y * Math.sqrt(1 - x2 / 2 - z2 / 2 + x2 * z2 / 3);
        curvedOffset.z = offset.z * Math.sqrt(1 - x2 / 2 - y2 / 2 + x2 * y2 / 3);
        const curved = V3.add(curvedOffset, this.centre.x, this.centre.y, this.centre.z);
        return curved;
    }

    private _createFaces(): void {
        const faces = new Array<QuadSphereFace>('front', 'back', 'left', 'right', 'top', 'bottom');
        faces.forEach(f => {
            const offset = V3.zero();
            let angle = 0;
            const axis = V3.zero();
            const startUv = UV.zero();
            const endUv = UV.one();
            switch (f) {
                case 'bottom': // -Y
                    offset.y=-this.radius;
                    angle=90;
                    axis.x=1;
                    startUv.u = 1/4;
                    startUv.v = 0;
                    endUv.u = 1/2;
                    endUv.v = 1/3;
                    break;
                case 'top': // +Y
                    offset.y=this.radius;
                    angle=-90;
                    axis.x=1;
                    startUv.u = 1/4;
                    startUv.v = 2/3;
                    endUv.u = 1/2;
                    endUv.v = 1;
                    break;
                case 'right': // +X
                    offset.x=this.radius;
                    angle=90;
                    axis.y=1;
                    startUv.u = 1/2;
                    startUv.v = 1/3;
                    endUv.u = 3/4;
                    endUv.v = 2/3;
                    break;
                case 'left': // -X
                    offset.x=-this.radius;
                    angle=-90;
                    axis.y=1;
                    startUv.u = 0;
                    startUv.v = 1/3;
                    endUv.u = 1/4;
                    endUv.v = 2/3;
                    break;
                case 'back': // -Z
                    offset.z=-this.radius;
                    angle=180;
                    axis.y=1;
                    startUv.u = 3/4;
                    startUv.v = 1/3;
                    endUv.u = 1;
                    endUv.v = 2/3;
                    break;
                case 'front': // +Z
                default:
                    offset.z=this.radius;
                    startUv.u = 1/4;
                    startUv.v = 1/3;
                    endUv.u = 1/2;
                    endUv.v = 2/3;
                    break;
            }
            this._faces.set(f, new Quad({
                centre: {x: this.centre.x+offset.x, y: this.centre.y+offset.y, z: this.centre.z+offset.z},
                loglevel: this._loglevel,
                radius: this.radius,
                registry: this.registry,
                maxlevel: this.maxlevel,
                angle: angle,
                rotationAxis: axis,
                utils: this._utils,
                uvStart: startUv,
                uvEnd: endUv
            }
        ))});
    }
}