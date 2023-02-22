import { Quad } from "./quad";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadSphereFace } from "./quad-types";
import { V3 } from "./v3"

export type QuadSphereOptions = {
    centre?: V3,
    radius?: number,
    loglevel?: QuadLoggerLevel
}

export class QuadSphere {
    readonly centre: V3;
    readonly radius: number;
    readonly registry: QuadRegistry;

    private readonly _faces = new Map<QuadSphereFace, Quad>();
    private readonly _loglevel: QuadLoggerLevel;
    
    constructor(options: QuadSphereOptions) {
        this.centre = options.centre ?? {x: 0, y: 0, z: 0};
        this.radius = options.radius ?? 1;
        this.registry = new QuadRegistry();
        this._loglevel = options.loglevel ?? 'warn';
        this._createFaces();
    }

    get vertices(): Array<number> {
        const verts = new Array<number>();

        const elevated = new Array<number>;
        for (let i=0; i<verts.length; i += 3) {
            const e = this.applyCurve({x: verts[i], y: verts[i+1], z: verts[i+2]});
            elevated.push(e.x, e.y, e.z);
        }
        return elevated;
    }

    get indices(): Array<number> {
        const tris = new Array<number>();
        
        return tris;
    }

    applyCurve(point: V3): V3 {
        const elevation = 0; // TODO: use UV's to lookup elevation values
        return V3.multiply(point, this.radius + elevation);
    }

    private _createFaces(): void {
        const front = new Quad({
            centre: {x: this.centre.x, y: this.centre.y, z: this.centre.z + this.radius},

        })
    }
}