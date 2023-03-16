import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadChildren, QuadMeshData, QuadNeighbors, Quadrant, QuadSide } from "./quad-types";
import { QuadUtils } from "./quad-utils";
import { UV } from "./v2";
import { V3 } from "./v3";

export type QuadOptions = {
    parent?: Quad;
    centre?: V3;
    radius?: number;
    segments?: number;
    level?: number;
    maxlevel?: number;
    registry?: QuadRegistry;
    quadrant?: Quadrant;
    loglevel?: QuadLoggerLevel;
    /** normalised vector */
    rotationAxis?: V3;
    /** angle in degrees */
    angle?: number;
    uvStart?: UV;
    uvEnd?: UV;
    utils?: QuadUtils;
    applyCurve?: boolean;
    curveOrigin?: V3;
};

/**
 * a quadrilateral shape made up of triangles in one of the following configurations
 * based on neighboring quads and their level of subdivisions. if any neighbor is two
 * or more levels of subdivisions different from this quad it **MUST** either subdivide
 * or unify until within one level
 * 
 * no sides active
 * ```
 * 6-7-8
 * |\ /|
 * 3 4 5
 * |/ \|
 * 0-1-2
 * ```
 * one side active
 * ```
 * l        b        r        t    
 * 6-7-8    6-7-8    6-7-8    6-7-8
 * |\ /|    |\ /|    |\ /|    |\|/|
 * 3-4 5    3 4 5    3 4-5    3 4 5
 * |/ \|    |/|\|    |/ \|    |/ \|
 * 0-1-2 or 0-1-2 or 0-1-2 or 0-1-2
 * ```
 * two sides active
 * ```
 * bl       tl       br       tr       lr       tb   
 * 6-7-8    6-7-8    6-7-8    6-7-8    6-7-8    6-7-8
 * |\ /|    |\|/|    |\ /|    |\|/|    |\ /|    |\|/|
 * 3-4 5    3-4 5    3 4-5    3 4-5    3-4-5    3 4 5
 * |/|\|    |/ \|    |/|\|    |/ \|    |/ \|    |/|\|
 * 0-1-2 or 0-1-2 or 0-1-2 or 0-1-2 or 0-1-2 or 0-1-2
 * ```
 * three sides active
 * ```
 * blr      tlr      tbr      tbl  
 * 6-7-8    6-7-8    6-7-8    6-7-8
 * |\ /|    |\|/|    |\|/|    |\|/|
 * 3-4-5    3-4-5    3 4-5    3-4 5
 * |/|\|    |/ \|    |/|\|    |/|\|
 * 0-1-2 or 0-1-2 or 0-1-2 or 0-1-2
 * ```
 * all sides active
 * ```
 * 6-7-8
 * |\|/|
 * 3-4-5
 * |/|\|
 * 0-1-2
 * ```
 */
export class Quad {
    public readonly id: string;
    public readonly parent: Quad;
    public readonly centre: V3;
    public readonly radius: number;
    public readonly segments: number;
    public readonly level: number;
    public readonly registry: QuadRegistry;
    public readonly quadrant: Quadrant;
    public readonly maxlevel: number;
    public readonly uvStart: UV;
    public readonly uvEnd: UV;
    public readonly applyCurve: boolean;
    public readonly curveOrigin: V3;
    public readonly utils: QuadUtils;
    
    private readonly _children = new Map<Quadrant, Quad>();
    private readonly _vertices = new Array<number>();
    private readonly _curvedVertices = new Array<number>();
    private readonly _normals = new Array<number>();
    private readonly _curvedNormals = new Array<number>();
    private readonly _uvs = new Array<number>();
    private readonly _tris = new Array<number>();
    private readonly _active = new Set<QuadSide>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;
    
    private _axis: V3;
    private _angle: number;
    private _triangleCount: number;
    
    needsUpdate: boolean;
    
    constructor(options: QuadOptions) {
        this.needsUpdate = true;
        this.parent = options.parent;
        this.centre = Object.freeze(options.centre ?? V3.zero());
        this.radius = options.radius ?? 1;
        if (options.segments && options.segments > 1) {
            const seg = Math.floor(options.segments);
            if (seg % 2 === 0) {
                // is even so make odd
                this.segments = seg + 1;
            } else {
                this.segments = seg;
            }
        } else {
            this.segments = 3;
        }
        this.level = options.level ?? 0;
        this.registry = options.registry ?? new QuadRegistry();
        this.id = this.registry.getId(this.centre, this.radius, this.level);
        this.quadrant = options.quadrant; // root is null
        this.maxlevel = options.maxlevel ?? 100;
        this._loglevel = options.loglevel ?? 'warn';
        this._logger = new QuadLogger({
            level: this._loglevel,
            preface: () => this.fingerprint
        });
        this.uvStart = options.uvStart ?? UV.zero(); // bottomleft
        this.uvEnd = options.uvEnd ?? UV.one();      // topright
        this._axis = options.rotationAxis ?? V3.zero();
        this._angle = options.angle ?? 0;
        this.utils = options.utils ?? new QuadUtils({loglevel: this._logger.level});
        this.applyCurve = options.applyCurve ?? false;
        this.curveOrigin = options.curveOrigin ?? V3.zero();
        this._triangleCount = 0;
        this._generatePoints();
        this.registry.register(this);
    }

    get fingerprint(): string {
        return [
            `${this.id}`,
            ...this.activeSides.map(s => s.charAt(0))
        ].join(':');
    }

    /**
     * generates a unique configuration key that can be used to force mesh updates
     */
    get key(): string {
        let k = this.fingerprint;
        if (this.hasChildren()) {
            k += '::' + Array.from(this._children.values())
                .map(c => c.key)
                .join('::');
        }
        return k;
    }

    /**
     * the `radius` value from this quad's top-level ancestor
     */
    get originalRadius(): number {
        return (this.parent) ? this.parent.originalRadius : this.radius;
    }

    /**
     * the maximum number of generations of quads inside (and including)
     * this one. an undivided quad would return a `depth` of `1` whereas
     * a quad with children where at least one child has their own children
     * would return a `depth` of `3`
     */
    get depth(): number {
        let d: number = 1;
        if (this.hasChildren()) {
            d += Array.from(this._children.values())
                .map(c => c.depth) // gets all child depths
                .sort((a, b) => b - a) // sorts in descending
                .find(v => v > 0); // returns first value (max)
        }
        return d;
    }

    get neighbors(): QuadNeighbors {
        return this.registry.getNeighbors(this);
    }

    get children(): QuadChildren {
        return {
            bottomleft: this.bottomleftChild,
            bottomright: this.bottomrightChild,
            topleft: this.topleftChild,
            topright: this.toprightChild
        };
    }

    get leafQuads(): Array<Quad> {
        const quads = new Array<Quad>();
        if (this.hasChildren()) {
            quads.push(
                ...this.bottomleftChild.leafQuads,
                ...this.bottomrightChild.leafQuads,
                ...this.topleftChild.leafQuads,
                ...this.toprightChild.leafQuads
            )
        } else {
            quads.push(this);
        }
        return quads;
    }

    get familyTree(): Array<Quad> {
        const quads = new Array<Quad>();
        quads.push(this);
        if (this.hasChildren()) {
            quads.push(
                ...this.bottomleftChild.familyTree,
                ...this.bottomrightChild.familyTree,
                ...this.topleftChild.familyTree,
                ...this.toprightChild.familyTree
            )
        }
        return quads;
    }

    get activeSides(): Array<QuadSide> {
        return Array.from(this._active.values());
    }

    get curvedCentre(): V3 {
        return this.getCurvedPoint(this.utils.xyToI((this.segments-1)/2, (this.segments-1)/2, this.segments));
    }

    get bottomleft(): V3 {
        return this.getPoint(0);
    }

    get bottomright(): V3 {
        return this.getPoint(this.segments-1);
    }

    get topleft(): V3 {
        return this.getPoint(this.utils.xyToI(0, this.segments-1, this.segments));
    }

    get topright(): V3 {
        return this.getPoint(this.utils.xyToI(this.segments-1, this.segments-1, this.segments));
    }

    get leftedge(): Array<V3> {
        const edgePoints = new Array<V3>();
        for (let y=0; y<this.segments; y++) {
            edgePoints.push(this.getPoint(this.utils.xyToI(0, y, this.segments)));
        }
        return edgePoints;
    }

    get bottomedge(): Array<V3> {
        const edgePoints = new Array<V3>();
        for (let x=0; x<this.segments; x++) {
            edgePoints.push(this.getPoint(x));
        }
        return edgePoints;
    }

    get rightedge(): Array<V3> {
        const edgePoints = new Array<V3>();
        for (let y=0; y<this.segments; y++) {
            edgePoints.push(this.getPoint(this.utils.xyToI(this.segments-1, y, this.segments)));
        }
        return edgePoints;
    }

    get topedge(): Array<V3> {
        const edgePoints = new Array<V3>();
        for (let x=0; x<this.segments; x++) {
            edgePoints.push(this.getPoint(this.utils.xyToI(x, this.segments-1, this.segments)));
        }
        return edgePoints;
    }

    get bottomleftChild(): Quad {
        return this._children.get('bottomleft');
    }

    get bottomrightChild(): Quad {
        return this._children.get('bottomright');
    }

    get topleftChild(): Quad {
        return this._children.get('topleft');
    }

    get toprightChild(): Quad {
        return this._children.get('topright');
    }

    /**
     * returns all the vertices as numbers in groups of 3 representing the
     * x, y, z coordinates of each vertex ordered like the following: 
     * ```
     * 6--------7--------8
     * |        |        |
     * |        |        |
     * 3--------4--------5
     * |        |        |
     * |        |        |
     * 0--------1--------2 where 0...8 is [x, y, z, ..., x, y, z]
     * ```
     * if this quad has child quads then the vertices returned will be 
     * made up of the child quads' vertices ordered like the following:
     * ```
     * 24--25-26 33--34-35
     * 21--22-23 30--31-32
     * 18--19-20 27--28-29
     * 6---7---8 15--16-17
     * 3---4---5 12--13-14
     * 0---1---2 9---10-11 where 0...35 is [x, y, z, ..., x, y, z]
     * ```
     */
    get vertices(): Array<number> {
        const verts = new Array<number>();
        if (this.hasChildren()) {
            verts.push(...this.bottomleftChild.vertices);
            verts.push(...this.bottomrightChild.vertices);
            verts.push(...this.topleftChild.vertices);
            verts.push(...this.toprightChild.vertices);
        } else {
            if (this.applyCurve) {
                verts.push(...this._curvedVertices);
            } else {
                verts.push(...this._vertices);
            }
        }
        return verts;
    }

    /**
     * returns the normal direction for each vertex grouping as an array
     * of the x, y, z values
     */
    get normals(): Array<number> {
        const norms = new Array<number>();
        if (this.hasChildren()) {
            norms.push(...this.bottomleftChild.normals);
            norms.push(...this.bottomrightChild.normals);
            norms.push(...this.topleftChild.normals);
            norms.push(...this.toprightChild.normals);
        } else {
            if (this.applyCurve) {
                norms.push(...this._curvedNormals);
            } else {
                norms.push(...this._normals);
            }
        }
        return norms;
    }

    /**
     * returns the index of each vertex coordinate grouping from the `this.vertices`
     * array ordered in groups of three that form a clockwise triangle like
     * ```
     * 6-7-8
     * |\|/|
     * 3-4-5
     * |/|\|
     * 0-1-2
     * ```
     * resulting in an array like: `[0,4,1,1,4,2,2,4,5,5,4,8,8,4,7,7,4,6,6,4,3,3,4,0]`
     * 
     * NOTE: even though the vertices array actually contains 3 values per index, these
     * indices act as though the vertices array is actually made up of `THREE.Vector3`
     * objects instead of 3 separate numbers so the index isn't actually into the vertices
     * array, but into a theoretical array made up of `THREE.Vector3` formed from the 
     * vertices array and with the same ordering
     */
    get indices(): Array<number> {
        const tris = new Array<number>();
        if (this.hasChildren()) {
            let offset: number = 0;
            // NOTE: the order the child indices are added is critical and **MUST** match vertices order
            tris.push(...this.bottomleftChild.indices); // no offset
            offset += this.bottomleftChild.vertices.length / 3; // offset by vertices of first child
            tris.push(...this.bottomrightChild.indices.map(i => i+offset));
            offset += this.bottomrightChild.vertices.length / 3; // offset by vertices of second child
            tris.push(...this.topleftChild.indices.map(i => i+offset));
            offset += this.topleftChild.vertices.length / 3; // offset by vertices of third child
            tris.push(...this.toprightChild.indices.map(i => i+offset));
        } else {
            if (this.needsUpdate) {
                this._tris.splice(0, this._tris.length, 
                    ...this.utils.getCentreTriangleIndices(this.segments),
                    ...this.utils.getLeftTriangleIndices(this.segments, this.activeSides),
                    ...this.utils.getBottomTriangleIndices(this.segments, this.activeSides),
                    ...this.utils.getRightTriangleIndices(this.segments, this.activeSides),
                    ...this.utils.getTopTriangleIndices(this.segments, this.activeSides)
                );
                this.needsUpdate = false;
            }
            tris.push(...this._tris);
        }
        this._triangleCount = tris.length / 3;
        return tris;
    }

    get triangleCount(): number {
        return this._triangleCount;
    }

    get uvs(): Array<number> {
        const uvArr = new Array<number>();
        if (this.hasChildren()) {
            uvArr.push(...this.bottomleftChild.uvs);
            uvArr.push(...this.bottomrightChild.uvs);
            uvArr.push(...this.topleftChild.uvs);
            uvArr.push(...this.toprightChild.uvs);
        } else {
            uvArr.push(...this._uvs);
        }
        return uvArr;
    }

    /**
     * consolidates the `vertices` and `indices` getters into a single
     * object containing both values for convenience and to ensure no
     * mismatch between the values
     */
    get meshData(): QuadMeshData {
        return this.utils.mergeVertices({
            indices: this.indices,
            vertices: this.vertices,
            normals: this.normals,
            uvs: this.uvs
        }, 4);
    }

    /**
     * gets the x, y, and z values for the point based on the following
     * indices:
     * ```
     * 6-7-8
     * |\|/|
     * 3-4-5
     * |/|\|
     * 0-1-2
     * ```
     * @param index a value between 0 and 8 (inclusive) @default 0
     * @returns a `V3` containing the x, y, and z values 
     * for the point at the specified index
     */
    getPoint(index: number = 0): V3 {
        const i = this._getPointIndices(index);
        const x = this._vertices[i.x];
        const y = this._vertices[i.y];
        const z = this._vertices[i.z];
        return {x, y, z};
    }

    /**
     * gets the x, y, and z values for the curved point based on the following
     * indices:
     * ```
     * 6-7-8
     * |\|/|
     * 3-4-5
     * |/|\|
     * 0-1-2
     * ```
     * @param index a value between 0 and 8 (inclusive) @default 0
     * @returns a `V3` containing the x, y, and z values 
     * for the point at the specified index
     */
    getCurvedPoint(index: number = 0): V3 {
        const i = this._getPointIndices(index);
        const x = this._curvedVertices[i.x];
        const y = this._curvedVertices[i.y];
        const z = this._curvedVertices[i.z];
        return {x, y, z};
    }

    hasChildren(): boolean {
        return this._children.size === 4;
    }

    isSibling(quad: Quad): boolean {
        return quad.parent?.id === this.parent?.id;
    }

    isAncestorOf(quad: Quad): boolean {
        if (quad) {
            let parent = quad.parent;
            while (parent != null) {
                if (parent.id === this.id) {
                    return true;
                }
                parent = parent.parent;
            }
        }
        return false;
    }

    activate(...sides: Array<QuadSide>): this {
        this._logger.log('debug', 'activate', sides);
        sides?.forEach(s => this._active.add(s));
        this.needsUpdate = true;
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        this._logger.log('debug', 'deactivate', sides);
        sides.forEach(s => this._active.delete(s));
        this.needsUpdate = true;
        return this;
    }

    updateSides(): this {
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side];
            if (neighbor) {
                if (neighbor.hasChildren()) {
                    this.activate(side);
                } else {
                    this.deactivate(side);
                }
            } else {
                this.deactivate(side);
            }
        });
        return this;
    }

    /**
     * causes this quad to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(initiator?: Quad): this {
        if (this.hasChildren() || this.level >= this.maxlevel) {
            return; // do nothing if we're already subdivided or at max level
        }
        this._logger.log('debug', 'subdivide; initiated by', initiator?.fingerprint);
        if (!initiator) {
            const shouldUnify = this.registry.getQuadsAtLevel(this.level)
                .filter(q => q.id !== this.id);
            shouldUnify.forEach(q => q.unify(this));
        }
        // create child Quads
        this._createChildren();
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side] ?? this.registry.getNeighbor(side, this.parent);
            if (neighbor) {
                if (this.level - neighbor.level > 0) {
                    neighbor.subdivide(this);
                    this.registry.getNeighbor(side, this)?.updateSides();
                } else {
                    neighbor.updateSides();
                }
            }
        });
        return this;
    }

    /**
     * causes this quad to remove all child quads and update all neighbors so they can
     * unify their edges facing this quad
     */
    unify(initiator?: Quad): this {
        if (!this.hasChildren()) {
            return;
        }
        this._logger.log('debug', 'unify; initiated by', initiator?.fingerprint);
        // remove child Quads
        this._removeChildren();
        // update neighbors
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side] ?? this.registry.getNeighbor(side, this.parent);
            if (neighbor) {
                this._logger.log('debug', 'neighbor', neighbor.fingerprint);
                if (this.level === neighbor.level) {
                    if (this.depth - neighbor.depth < -1) {
                        neighbor.bottomleftChild?.unify(this)?.updateSides();
                        neighbor.bottomrightChild?.unify(this)?.updateSides();
                        neighbor.topleftChild?.unify(this)?.updateSides();
                        neighbor.toprightChild?.unify(this)?.updateSides();
                    } else if (this.depth - neighbor.depth < 0) { // -1
                        this.activate(side);
                        neighbor.bottomleftChild?.updateSides();
                        neighbor.bottomrightChild?.updateSides();
                        neighbor.topleftChild?.updateSides();
                        neighbor.toprightChild?.updateSides();
                    }
                }
                neighbor.updateSides();
            }
        });
        return this.updateSides();
    }

    /**
     * recursively searches this `Quad` for the child whose `centre`
     * point is closest to the specified `point`
     * @param point the `V3` in local space against which to compare
     * @returns the deepest quad that is closest to the specified `point`
     */
    getClosestQuad(point: V3): Quad {
        return this.utils.getClosestQuad(point, true, this);
    }

    /**
     * recursively searches this `Quad` for any `Quad` who does not have children
     * and whose `centre` is within the specified `distance` from the specified `point`
     * @param point the `V3` in local space against which to compare
     * @param distance the distance within which the length from `point` to `quad.centre` must be
     * @returns an array of the deepest quads that are within the specified `distance` from the `point`
     */
    getQuadsWithinDistance(point: V3, distance: number): Array<Quad> {
        return this.utils.getQuadsWithinDistance(point, distance, true, this);
    }

    dispose(): void {
        this.registry.deregister(this);
        if (this.hasChildren()) {
            this._removeChildren();
        }
        this._vertices.splice(0, this._vertices.length);
    }

    private _generatePoints(): void {
        const zero = V3.zero();
        const n = V3.forward();
        const point = V3.zero();
        point.z = this.centre.z;
        let x = this.centre.x - this.radius;
        let y = this.centre.y - this.radius;
        const offset = (this.radius*2) / (this.segments-1);
        const fuzzFactor = offset / 4;
        let u = this.uvStart.u;
        let v = this.uvStart.v;
        const uOffset = (this.uvEnd.u - this.uvStart.u) / (this.segments-1);
        const vOffset = (this.uvEnd.v - this.uvStart.v) / (this.segments-1);
        for (let iy = 0; iy < this.segments; iy++) {
            point.y = y;
            for (let ix = 0; ix < this.segments; ix++) {
                point.x = x;
                
                // rotate based on `this._angle`
                const rotated = V3.rotatePoint(point, this._angle, this._axis, this.centre);
                this._vertices.push(...V3.toArray(rotated));
                // add normal
                this._normals.push(...V3.toArray(V3.rotatePoint(n, this._angle, this._axis, zero)));
                // add uv
                this._uvs.push(u, v);
                
                if (this.applyCurve) {
                    // add curved vertices
                    const curved = V3.applyCurve(rotated, this.curveOrigin, this.originalRadius);
                    this._curvedVertices.push(...V3.toArray(curved));
                    // add curved normal
                    this._curvedNormals.push(...V3.toArray(V3.normalise(curved)));
                }

                x += offset;
                u += uOffset;
                if (x > (this.centre.x + this.radius) + fuzzFactor) {
                    x = this.centre.x - this.radius;
                    u = this.uvStart.u;
                }
            }
            y += offset;
            v += vOffset;
        }
    }

    private _getPointIndices(index: number = 0): V3 {
        const i = index * 3;
        return {x: i, y: i+1, z: i+2};
    }

    private _createChildren(): void {
        const childRadius = this.radius / 2;
        const childLevel = this.level + 1;
        const children = [
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomleft, this.centre),
                segments: this.segments,
                radius: childRadius,
                level: childLevel,
                registry: this.registry,
                quadrant: 'bottomleft',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: this.uvStart.u, v: this.uvStart.v},
                uvEnd: {u: (this.uvStart.u+this.uvEnd.u)/2, v: (this.uvStart.v+this.uvEnd.v)/2},
                applyCurve: this.applyCurve,
                curveOrigin: this.curveOrigin,
                utils: this.utils
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomright, this.centre),
                segments: this.segments,
                radius: childRadius,
                level: childLevel,
                registry: this.registry,
                quadrant: 'bottomright',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvStart.v},
                uvEnd: {u: this.uvEnd.u, v: (this.uvStart.v+this.uvEnd.v)/2},
                applyCurve: this.applyCurve,
                curveOrigin: this.curveOrigin,
                utils: this.utils
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topleft, this.centre),
                segments: this.segments,
                radius: childRadius,
                level: childLevel,
                registry: this.registry,
                quadrant: 'topleft',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: this.uvStart.u, v: (this.uvStart.v+this.uvEnd.v)/2},
                uvEnd: {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvEnd.v},
                applyCurve: this.applyCurve,
                curveOrigin: this.curveOrigin,
                utils: this.utils
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topright, this.centre),
                segments: this.segments,
                radius: childRadius,
                level: childLevel,
                registry: this.registry,
                quadrant: 'topright',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: (this.uvStart.u+this.uvEnd.u)/2, v: (this.uvStart.v+this.uvEnd.v)/2},
                uvEnd: {u: this.uvEnd.u, v: this.uvEnd.v},
                applyCurve: this.applyCurve,
                curveOrigin: this.curveOrigin,
                utils: this.utils
            })
        ];
        children.forEach(c => {
            this._children.set(c.quadrant, c);
        });
    }

    private _removeChildren(): void {
        this._logger.log('debug', 'removing children', Array.from(this._children.values()).map(c => c.id));
        this._children.forEach((c: Quad, k: Quadrant) => {
            c.dispose();
            this._children.delete(k);
        });
    }
}