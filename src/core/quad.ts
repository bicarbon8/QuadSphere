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
    public readonly id: number;
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
    public readonly curveOrigin: V3;
    
    private readonly _children = new Map<Quadrant, Quad>();
    private readonly _vertices = new Array<number>();
    private readonly _curvedVertices = new Array<number>();
    private readonly _normals = new Array<number>();
    private readonly _curvedNormals = new Array<number>();
    private readonly _uvs = new Array<number>();
    private readonly _active = new Set<QuadSide>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;
    private readonly _utils: QuadUtils;
    private readonly _applyCurve: boolean;
    
    private _axis: V3;
    private _angle: number;
    private _triangleCount: number;
    
    constructor(options: QuadOptions) {
        this.parent = options.parent;
        this.centre = Object.freeze(options.centre ?? V3.zero());
        this.radius = options.radius ?? 1;
        if (options.segments && options.segments > 1) {
            if (options.segments % 2 === 0) {
                // is even so make odd
                this.segments = options.segments + 1;
            } else {
                this.segments = options.segments;
            }
        } else {
            this.segments = 3;
        }
        this.level = options.level ?? 0;
        this.registry = options.registry ?? new QuadRegistry();
        this.id = this.registry.getId();
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
        this._utils = options.utils ?? new QuadUtils({loglevel: this._logger.level});
        this._applyCurve = options.applyCurve ?? false;
        this.curveOrigin = options.curveOrigin ?? V3.zero();
        this._triangleCount = 0;
        this._generatePoints();
        this._generateNormals();
        this._generateUVs();
        this.registry.register(this);
    }

    get fingerprint(): string {
        return [
            `${this.id}`,
            `${this.level}`,
            `${this.depth}`,
            ...this.activeSides.map(s => s.charAt(0))
        ].join(':');
    }

    /**
     * generates a unique configuration key that can be used to force mesh updates
     */
    get key(): string {
        let k = this.fingerprint;
        if (this.hasChildren()) {
            k += '-' + Array.from(this._children.values())
                .map(c => c.key)
                .join('-');
        }
        return k;
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

    get activeSides(): Array<QuadSide> {
        return Array.from(this._active.values());
    }

    get bottomleft(): V3 {
        return this.getPoint(0);
    }

    get bottomright(): V3 {
        return this.getPoint(this.segments-1);
    }

    get topleft(): V3 {
        return this.getPoint(this._utils.xyToI(0, this.segments-1, this.segments));
    }

    get topright(): V3 {
        return this.getPoint(this._utils.xyToI(this.segments-1, this.segments-1, this.segments));
    }

    get leftedge(): Array<V3> {
        const edgePoints = new Array<V3>();
        for (let y=0; y<this.segments; y++) {
            edgePoints.push(this.getPoint(this._utils.xyToI(0, y, this.segments)));
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
            edgePoints.push(this.getPoint(this._utils.xyToI(this.segments-1, y, this.segments)));
        }
        return edgePoints;
    }

    get topedge(): Array<V3> {
        const edgePoints = new Array<V3>();
        for (let x=0; x<this.segments; x++) {
            edgePoints.push(this.getPoint(this._utils.xyToI(x, this.segments-1, this.segments)));
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
            if (this._applyCurve) {
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
            if (this._applyCurve) {
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
            tris.push(...this.getCentreTriangleIndices())
            tris.push(...this.getLeftTriangleIndices());
            tris.push(...this.getBottomTriangleIndices());
            tris.push(...this.getRightTriangleIndices());
            tris.push(...this.getTopTriangleIndices());
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
        return this._utils.mergeVertices({
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
     * @returns a `THREE.Vector3` containing the x, y, and z values 
     * for the point at the specified index
     */
    getPoint(index: number = 0): V3 {
        const i = this._getPointIndices(index);
        const x = this._vertices[i.x];
        const y = this._vertices[i.y];
        const z = this._vertices[i.z];
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
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        this._logger.log('debug', 'deactivate', sides);
        sides.forEach(s => this._active.delete(s));
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
    getClosestQuad(point: V3, ...from: Array<Quad>): Quad {
        if (from.length === 0) {
            from = new Array<Quad>(this);
        }
        return this._utils.getClosestQuad(point, ...from);
    }

    /**
     * recursively searches this `Quad` for any `Quad` who does not have children
     * and whose `centre` is within the specified `distance` from the specified `point`
     * @param point the `V3` in local space against which to compare
     * @param distance the distance within which the length from `point` to `quad.centre` must be
     * @returns an array of the deepest quads that are within the specified `distance` from the `point`
     */
    getQuadsWithinDistance(point: V3, distance: number, ...from: Array<Quad>): Array<Quad> {
        if (from.length === 0) {
            from = new Array<Quad>(this);
        }
        return this._utils.getQuadsWithinDistance(point, distance, ...from);
    }

    /**
     * assuming a `Quad` like below
     * ```
     * 20--21--22--23--24
     * | \   / | \   / |
     * 15  16--17--18  19
     * | / | / | / | \ |
     * 10--11--12--13--14
     * | \ | / | / | / |
     * 5   6---7---8   9
     * | /   \ | /   \ |
     * 0---1---2---3---4
     * ```
     * would return [6, 7, 12, 12, 11, 6, 7, 8, 13, 13, 12, 7, 11, 12, 17, 17, 16, 11, 12, 13, 18, 18, 17, 12]
     */
    getCentreTriangleIndices(): Array<number> {
        const indices = new Array<number>();
        for (let y=1; y<this.segments-2; y++) {
            for (let x=1; x<this.segments-2; x++) {
                const a1 = this._utils.xyToI(x, y, this.segments);
                const b1 = a1 + 1;
                const c1 = this._utils.xyToI(x+1, y+1, this.segments);
                
                const a2 = c1;
                const b2 = a2-1;
                const c2 = a1;

                indices.push(a1, b1, c1, a2, b2, c2);
            }
        }
        return indices;
    }

    /**
     * assuming a `Quad` like below
     * ```
     * deactivated          activated
     * 20--21--22--23--24   20--21--22--23--24
     * | \   / | \   / |    | \   / | \   / |
     * 15  16--17--18  19   15--16--17--18  19
     * | / | / | / | \ |    | / | / | / | \ |
     * 10--11--12--13--14   10--11--12--13--14
     * | \ | / | / | / |    | \ | / | / | / |
     * 5   6---7---8   9    5---6---7---8   9
     * | /   \ |  /  \ |    | /   \ | /   \ |
     * 0---1---2---3---4 or 0---1---2---3---4
     * ```
     * would return: 
     * ```
     * [6, ........ 10, 0, 6, 11, 10, 16, 10, 11, 16, ........... 20, 10] (deactivated) or
     * [6, 5, 0, 6, 10, 5, 6, 11, 10, 16, 10, 11, 16, 15, 10, 16, 20, 15] (activated)
     * ```
     */
    getLeftTriangleIndices(): Array<number> {
        const indices = new Array<number>();
        const x = 1;
        for (let y=1; y<this.segments; y+=2) {
            const index = this._utils.xyToI(x, y, this.segments);
            if (y > 1) {
                const a = index;
                const b = this._utils.xyToI(x-1, y-1, this.segments);
                const c = this._utils.xyToI(x, y-1, this.segments);
                indices.push(a, b, c);
            }

            if (this.activeSides.includes('left')) {
                const a1 = index;
                const b1 = index-1;
                const c1 = this._utils.xyToI(x-1, y-1, this.segments);
                const a2 = index;
                const b2 = this._utils.xyToI(x-1, y+1, this.segments);
                const c2 = b1;
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this._utils.xyToI(x-1, y+1, this.segments);
                const c = this._utils.xyToI(x-1, y-1, this.segments);
                indices.push(a, b, c);
            }

            if (y < this.segments-2) {
                const a = index;
                const b = this._utils.xyToI(x, y+1, this.segments);
                const c = b-1;
                indices.push(a, b, c);
            }
        }
        return indices;
    }

    /**
     * assuming a `Quad` like below
     * ```
     * deactivated          activated
     * 20--21--22--23--24   20--21--22--23--24
     * | \   / | \   / |    | \   / | \   / |
     * 15  16--17--18  19   15  16--17--18  19
     * | / | / | / | \ |    | / | / | / | \ |
     * 10--11--12--13--14   10--11--12--13--14
     * | \ | / | / | / |    | \ | / | / | / |
     * 5   6---7---8   9    5   6---7---8   9
     * | /   \ | /   \ |    | / | \ | / | \ |
     * 0---1---2---3---4 or 0---1---2---3---4
     * ```
     * would return: 
     * ```
     * [6, 0, ........ 2, 6, 2, 7, 8, 7, 2, 8, 2, ........ 4] (deactivated) or
     * [6, 0, 1, 6, 1, 2, 6, 2, 7, 8, 7, 2, 8, 2, 3, 8, 3, 4] (activated)
     * ```
     */
    getBottomTriangleIndices(): Array<number> {
        const indices = new Array<number>();
        const y = 1;
        for (let x=1; x<this.segments; x+=2) {
            const index = this._utils.xyToI(x, y, this.segments);
            if (x > 1) {
                const a = index;
                const b = index-1;
                const c = this._utils.xyToI(x-1, y-1, this.segments);
                indices.push(a, b, c);
            }

            if (this.activeSides.includes('bottom')) {
                const a1 = index;
                const b1 = this._utils.xyToI(x-1, y-1, this.segments);
                const c1 = this._utils.xyToI(x, y-1, this.segments);
                const a2 = index;
                const b2 = c1;
                const c2 = this._utils.xyToI(x+1, y-1, this.segments);
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this._utils.xyToI(x-1, y-1, this.segments);
                const c = this._utils.xyToI(x+1, y-1, this.segments);
                indices.push(a, b, c);
            }

            if (x < this.segments-2) {
                const a = index;
                const b = this._utils.xyToI(x+1, y-1, this.segments);
                const c = this._utils.xyToI(x+1, y, this.segments);
                indices.push(a, b, c);
            }
        }
        return indices;
    }

    /**
     * assuming a `Quad` like below
     * ```
     * deactivated          activated
     * 20--21--22--23--24   20--21--22--23--24
     * | \   / | \   / |    | \   / | \   / |
     * 15  16--17--18  19   15  16--17--18--19
     * | / | / | / | \ |    | / | / | / | \ |
     * 10--11--12--13--14   10--11--12--13--14
     * | \ | / | / | / |    | \ | / | / | / |
     * 5   6---7---8   9    5   6---7---8---9
     * | /   \ |  /  \ |    | /   \ | /   \ |
     * 0---1---2---3---4 or 0---1---2---3---4
     * ```
     * would return: 
     * ```
     * [8, 4, ........ 14, 8, 14, 13, 18, 13, 14, 18, 14, ........... 24] (deactivated) or
     * [8, 4, 9, 8, 9, 14, 8, 14, 13, 18, 13, 14, 18, 14, 19, 18, 19, 24] (activated)
     * ```
     */
    getRightTriangleIndices(): Array<number> {
        const indices = new Array<number>();
        const x = this.segments-2;
        for (let y=1; y<this.segments-1; y+=2) {
            const index = this._utils.xyToI(x, y, this.segments);
            if (y > 2) {
                const a = index;
                const b = this._utils.xyToI(x, y-1, this.segments);
                const c = this._utils.xyToI(x+1, y-1, this.segments);
                indices.push(a, b, c);
            }

            if (this.activeSides.includes('right')) {
                const a1 = index;
                const b1 = this._utils.xyToI(x+1, y-1, this.segments);
                const c1 = this._utils.xyToI(x+1, y, this.segments);
                const a2 = index;
                const b2 = c1;
                const c2 = this._utils.xyToI(x+1, y+1, this.segments);
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this._utils.xyToI(x+1, y-1, this.segments);
                const c = this._utils.xyToI(x+1, y+1, this.segments);
                indices.push(a, b, c);
            }

            if (y < this.segments-2) {
                const a = index;
                const b = this._utils.xyToI(x+1, y+1, this.segments);
                const c = this._utils.xyToI(x, y+1, this.segments);
                indices.push(a, b, c);
            }
        }
        return indices;
    }

    /**
     * assuming a `Quad` like below
     * ```
     * deactivated          activated
     * 20--21--22--23--24   20--21--22--23--24
     * | \   / | \   / |    | \ | / | \ | / |
     * 15  16--17--18  19   15  16--17--18  19
     * | / | / | / | \ |    | / | / | / | \ |
     * 10--11--12--13--14   10--11--12--13--14
     * | \ | / | / | / |    | \ | / | / | / |
     * 5   6---7---8   9    5   6---7---8   9
     * | /   \ | /   \ |    | /   \ | /   \ |
     * 0---1---2---3---4 or 0---1---2---3---4
     * ```
     * would return: 
     * ```
     * [16, ........... 22, 20, 16, 17, 22, 18, 22, 17, 18, ........... 24, 22] (deactivated) or
     * [16, 21, 20, 16, 22, 21, 16, 17, 22, 18, 22, 17, 18, 23, 22, 18, 24, 23] (activated)
     * ```
     */
    getTopTriangleIndices(): Array<number> {
        const indices = new Array<number>();
        const y = this.segments-2;
        for (let x=1; x<this.segments; x+=2) {
            const index = this._utils.xyToI(x, y, this.segments);
            if (x > 1) {
                const a = index;
                const b = this._utils.xyToI(x-1, y+1, this.segments);
                const c = index-1;
                indices.push(a, b, c);
            }

            if (this.activeSides.includes('top')) {
                const a1 = index;
                const b1 = this._utils.xyToI(x, y+1, this.segments);
                const c1 = b1-1;
                const a2 = index;
                const b2 = this._utils.xyToI(x+1, y+1, this.segments);
                const c2 = b2-1;
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this._utils.xyToI(x+1, y+1, this.segments);
                const c = this._utils.xyToI(x-1, y+1, this.segments);
                indices.push(a, b, c);
            }

            if (x < this.segments-2) {
                const a = index;
                const b = index+1;
                const c = this._utils.xyToI(x+1, y+1, this.segments);
                indices.push(a, b, c);
            }
        }
        return indices;
    }

    dispose(): void {
        this.registry.deregister(this);
        if (this.hasChildren()) {
            this._removeChildren();
        }
        this._vertices.splice(0, this._vertices.length);
    }

    private _generatePoints(): void {
        const point = V3.zero();
        point.z = this.centre.z;
        let x = this.centre.x - this.radius;
        let y = this.centre.y - this.radius;
        const offset = (this.radius*2) / (this.segments-1);
        const fuzzFactor = offset / 4;
        for (let iy = 0; iy < this.segments; iy++) {
            point.y = y;
            for (let ix = 0; ix < this.segments; ix++) {
                point.x = x;
                
                // rotate based on `this._angle`
                const rotated = this._utils.rotatePoint(point, this._angle, this._axis, this.centre);
                this._vertices.push(...V3.toArray(rotated));
                
                if (this._applyCurve) {
                    const curved = this._utils.applyCurve(rotated, this.curveOrigin);
                    this._curvedVertices.push(...V3.toArray(curved));
                }

                x += offset;
                if (x > (this.centre.x + this.radius) + fuzzFactor) {
                    x = this.centre.x - this.radius;
                }
            }
            y += offset;
        }
    }

    private _generateNormals(): void {
        const zero = V3.zero();
        const n = {x: 0, y: 0, z: 1};
        for (let iy = 0; iy < this.segments; iy++) {
            for (let ix = 0; ix < this.segments; ix++) {
                this._normals.push(...V3.toArray(this._utils.rotatePoint(n, this._angle, this._axis, zero)));
            }
        }

        if (this._applyCurve) {
            this._curvedNormals.push(...V3.toArray(...V3.fromArray(this._curvedVertices).map(v => V3.normalise(v))));
        }
    }

    private _generateUVs(): void {
        let u = this.uvStart.u;
        let v = this.uvStart.v;
        const uOffset = (this.uvEnd.u - this.uvStart.u) / (this.segments-1);
        const fuzzFactor = uOffset / 4;
        const vOffset = (this.uvEnd.v - this.uvStart.v) / (this.segments-1);
        for (let iv = 0; iv < this.segments; iv++) {
            for (let iu = 0; iu < this.segments; iu++) {
                this._uvs.push(u, v);

                u += uOffset;
                if (u > (this.uvEnd.u + fuzzFactor)) {
                    u = this.uvStart.u;
                }
            }

            v += vOffset;
        }
    }

    private _getPointIndices(index: number = 0): V3 {
        const i = index * 3;
        return {x: i, y: i+1, z: i+2};
    }

    private _createChildren(): void {
        const children = [
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomleft, this.centre),
                segments: this.segments,
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomleft',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: this.uvStart.u, v: this.uvStart.v},
                uvEnd: {u: (this.uvStart.u+this.uvEnd.u)/2, v: (this.uvStart.v+this.uvEnd.v)/2},
                applyCurve: this._applyCurve,
                curveOrigin: this.curveOrigin
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomright, this.centre),
                segments: this.segments,
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomright',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvStart.v},
                uvEnd: {u: this.uvEnd.u, v: (this.uvStart.v+this.uvEnd.v)/2},
                applyCurve: this._applyCurve,
                curveOrigin: this.curveOrigin
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topleft, this.centre),
                segments: this.segments,
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topleft',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: this.uvStart.u, v: (this.uvStart.v+this.uvEnd.v)/2},
                uvEnd: {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvEnd.v},
                applyCurve: this._applyCurve,
                curveOrigin: this.curveOrigin
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topright, this.centre),
                segments: this.segments,
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topright',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: (this.uvStart.u+this.uvEnd.u)/2, v: (this.uvStart.v+this.uvEnd.v)/2},
                uvEnd: {u: this.uvEnd.u, v: this.uvEnd.v},
                applyCurve: this._applyCurve,
                curveOrigin: this.curveOrigin
            })
        ];
        children.forEach(c => this._children.set(c.quadrant, c));
    }

    private _removeChildren(): void {
        this._logger.log('debug', 'removing children', Array.from(this._children.values()).map(c => c.id));
        this._children.forEach((c: Quad, k: Quadrant) => {
            c.dispose();
            this._children.delete(k);
        });
    }
}