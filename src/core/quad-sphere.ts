import { Quad } from "./quad";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadSphereFace, QuadSphereMeshData } from "./quad-types";
import { QuadUtils } from "./quad-utils";
import { UV } from "./v2";
import { V3 } from "./v3"

export type QuadSphereTextureMapping = 'split' | 'unified';

export type QuadSphereOptions = {
    centre?: V3,
    radius?: number,
    segments?: number,
    loglevel?: QuadLoggerLevel,
    maxlevel?: number;
    utils?: QuadUtils;
    addSkirts?: boolean;
    textureMapping?: QuadSphereTextureMapping;
}

export class QuadSphere {
    readonly centre: V3;
    readonly radius: number;
    readonly registry: QuadRegistry;
    readonly maxlevel: number;
    readonly segments: number;
    readonly textureMapping: QuadSphereTextureMapping;
    readonly utils: QuadUtils;
    
    private readonly _faces = new Map<QuadSphereFace, Quad>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;
    
    private _triangleCount: number;
    
    constructor(options: QuadSphereOptions) {
        this.centre = options.centre ?? {x: 0, y: 0, z: 0};
        this.radius = options.radius ?? 1;
        this.segments = options.segments; // default set in Quad if unset
        this.registry = new QuadRegistry(this.radius, this.segments);
        this.maxlevel = options.maxlevel ?? 100;
        this.textureMapping = options.textureMapping ?? 'unified';
        this._loglevel = options.loglevel ?? 'warn';
        this._logger = new QuadLogger({
            level: this._loglevel
        });
        this.utils = options.utils ?? new QuadUtils({loglevel: this._logger.level});
        this._triangleCount = 0;
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

    get leafQuads(): Array<Quad> {
        const quads = new Array<Quad>();
        quads.push(
            ...this.front.leafQuads,
            ...this.back.leafQuads,
            ...this.left.leafQuads,
            ...this.right.leafQuads,
            ...this.top.leafQuads,
            ...this.bottom.leafQuads
        );
        return quads;
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

    get meshData(): QuadSphereMeshData {
        // below array order is important so we match Box in Threejs
        const sphereData = {} as QuadSphereMeshData;
        let indicesCount = 0;
        let index = 0;
        while (index<6) {
            const face = this.utils.faceByIndex(index);
            const quad = this._faces.get(face);
            const data = quad.meshData;
            indicesCount += data.indices.length;
            sphereData[face] = data;
            index++;
        }
        this._triangleCount = indicesCount / 3; // three per triangle
        return sphereData;
    }

    get triangleCount(): number {
        return this._triangleCount;
    }

    unify(): this {
        Array.from(this._faces.values()).forEach(q => {
            q.unify();
        });
        return this;
    }

    /**
     * recursively searches this `QuadSphere` for the child `Quad` whose `centre`
     * point is closest to the specified `point`
     * @param point the `V3` in local space against which to compare
     * @returns the deepest quad that is closest to the specified `point`
     */
    getClosestQuad(point: V3): Quad {
        return this.utils.getClosestQuad(point, true, this.front, this.back, this.left, this.right, this.top, this.bottom);
    }

    /**
     * recursively searches this `QuadSphere` for any `Quad` who does not have children
     * and whose `centre` is within the specified `distance` from the specified `point`
     * @param point the `V3` in local space against which to compare
     * @param distance the distance within which the length from `point` to `quad.centre` must be
     * @returns an array of the deepest quads that are within the specified `distance` from the `point`
     */
    getQuadsWithinDistance(point: V3, distance: number): Array<Quad> {
        return this.utils.getQuadsWithinDistance(point, distance, true, this.front, this.back, this.left, this.right, this.top, this.bottom);
    }

    private _createFaces(): void {
        const faces = this.utils.orderedFaces();
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
                    if (this.textureMapping === 'unified') {
                        startUv.u = 1/4;
                        startUv.v = 0;
                        endUv.u = 1/2;
                        endUv.v = 1/4;
                    }
                    break;
                case 'top': // +Y
                    offset.y=this.radius;
                    angle=-90;
                    axis.x=1;
                    if (this.textureMapping === 'unified') {
                        startUv.u = 1/4;
                        startUv.v = 1/2;
                        endUv.u = 1/2;
                        endUv.v = 3/4;
                    }
                    break;
                case 'right': // +X
                    offset.x=this.radius;
                    angle=90;
                    axis.y=1;
                    if (this.textureMapping === 'unified') {
                        startUv.u = 1/2;
                        startUv.v = 1/4;
                        endUv.u = 3/4;
                        endUv.v = 1/2;
                    }
                    break;
                case 'left': // -X
                    offset.x=-this.radius;
                    angle=-90;
                    axis.y=1;
                    if (this.textureMapping === 'unified') {
                        startUv.u = 0;
                        startUv.v = 1/4;
                        endUv.u = 1/4;
                        endUv.v = 1/2;
                    }
                    break;
                case 'back': // -Z
                    offset.z=-this.radius;
                    angle=180;
                    axis.y=1;
                    if (this.textureMapping === 'unified') {
                        startUv.u = 3/4;
                        startUv.v = 1/4;
                        endUv.u = 1;
                        endUv.v = 1/2;
                    }
                    break;
                case 'front': // +Z
                default:
                    offset.z=this.radius;
                    if (this.textureMapping === 'unified') {
                        startUv.u = 1/4;
                        startUv.v = 1/4;
                        endUv.u = 1/2;
                        endUv.v = 1/2;
                    }
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
                utils: this.utils,
                uvStart: startUv,
                uvEnd: endUv,
                applyCurve: true,
                curveOrigin: this.centre,
                segments: this.segments
            }))
        });
    }
}