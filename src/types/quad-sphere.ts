import { Quad } from "./quad";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadMeshData, QuadSphereFace } from "./quad-types";
import { V3 } from "./v3"

export type QuadSphereOptions = {
    centre?: V3,
    radius?: number,
    loglevel?: QuadLoggerLevel,
    maxlevel?: number;
}

export class QuadSphere {
    readonly centre: V3;
    readonly radius: number;
    readonly registry: QuadRegistry;
    readonly maxlevel: number;

    private readonly _faces = new Map<QuadSphereFace, Quad>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;
    
    constructor(options: QuadSphereOptions) {
        this.centre = options.centre ?? {x: 0, y: 0, z: 0};
        this.radius = options.radius ?? 1;
        this.registry = new QuadRegistry();
        this.maxlevel = options.maxlevel ?? 100;
        this._loglevel = options.loglevel ?? 'warn';
        this._logger = new QuadLogger({
            level: this._loglevel
        });
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
        const verts = new Array<number>();
        const tris = new Array<number>();

        let offset = 0;
        this._faces.forEach((quad: Quad, face: QuadSphereFace) => {
            const data = quad.meshData;
            const updated = new Array<number>();
            for (let i=0; i<data.vertices.length; i+=3) {
                const x = data.vertices[i];
                const y = data.vertices[i+1];
                const z = data.vertices[i+2];
                const c = this.applyCurve({x, y, z});
                updated.push(c.x, c.y, c.z);
            }
            verts.push(...updated);
            tris.push(...data.indices.map(i => i+offset));
            offset += data.vertices.length / 3;
        });
        
        return {
            vertices: verts,
            indices: tris
        };
    }

    getClosestQuad(point: V3, from?: Array<Quad>): Quad {
        from ??= Array.from(this._faces.values());
        // sort quads in ascending order by distance to point
        const closestFace = from.sort((a, b) => V3.length(a.centre, point) - V3.length(b.centre, point))
            .find(q => q != null);
        const closest = closestFace.getClosestQuad(point);
        return closest;
    }

    applyCurve(point: V3): V3 {
        const elevation = 0; // TODO: use UV's to lookup elevation values
        return V3.multiply(V3.normalise(point), this.radius + elevation);
    }

    private _createFaces(): void {
        const faces = new Array<QuadSphereFace>('front', 'back', 'left', 'right', 'top', 'bottom');
        faces.forEach(f => {
            const offset = V3.zero();
            let angle = 0;
            const axis = V3.zero();
            switch (f) {
                case 'bottom':
                    offset.y=-this.radius;
                    angle=90;
                    axis.x=1;
                    break;
                case 'top':
                    offset.y=this.radius;
                    angle=-90;
                    axis.x=1;
                    break;
                case 'right':
                    offset.x=this.radius;
                    angle=90;
                    axis.y=1;
                    break;
                case 'left':
                    offset.x=-this.radius;
                    angle=-90;
                    axis.y=1;
                    break;
                case 'back':
                    offset.z=-this.radius;
                    angle=180;
                    axis.y=1;
                    break;
                case 'front':
                default:
                    offset.z=this.radius;
                    break;
            }
            this._faces.set(f, new Quad({
                centre: {x: this.centre.x+offset.x, y: this.centre.y+offset.y, z: this.centre.z+offset.z},
                loglevel: this._loglevel,
                radius: this.radius,
                registry: this.registry,
                maxlevel: this.maxlevel,
                angle: angle,
                rotationAxis: axis
            }
        ))});
    }
}