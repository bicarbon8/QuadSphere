import * as THREE from "three";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadChildren, QuadMeshData, QuadNeighbors, Quadrant, QuadSide } from "./quad-types";
import { UV } from "./v2";
import { V3 } from "./v3";

export type QuadOptions = {
    parent?: Quad;
    centre?: V3;
    radius?: number;
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
    public readonly radius: number;
    public readonly level: number;
    public readonly registry: QuadRegistry;
    public readonly quadrant: Quadrant;
    public readonly maxlevel: number;
    public readonly uvStart: UV;
    public readonly uvEnd: UV;

    private readonly _children = new Map<Quadrant, Quad>();
    private readonly _vertices = new Array<number>();
    private readonly _normals = new Array<number>();
    private readonly _uvs = new Array<number>();
    private readonly _active = new Set<QuadSide>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;
    
    private _axis: V3;
    private _angle: number;
    
    constructor(options: QuadOptions) {
        this.parent = options.parent;
        this.radius = options.radius ?? 1;
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
        this._generatePoints(options.centre ?? V3.zero());
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

    get activeSides(): Array<QuadSide> {
        return Array.from(this._active.values());
    }

    get bottomleft(): V3 {
        return this.getPoint(0);
    }

    get bottommiddle(): V3 {
        return this.getPoint(1);
    }

    get bottomright(): V3 {
        return this.getPoint(2);
    }

    get middleleft(): V3 {
        return this.getPoint(3);
    }

    get centre(): V3 {
        return this.getPoint(4);
    }

    get middleright(): V3 {
        return this.getPoint(5);
    }

    get topleft(): V3 {
        return this.getPoint(6);
    }

    get topmiddle(): V3 {
        return this.getPoint(7);
    }

    get topright(): V3 {
        return this.getPoint(8);
    }

    get leftedge(): Array<V3> {
        return new Array<V3>(this.bottomleft, this.middleleft, this.topleft);
    }

    get bottomedge(): Array<V3> {
        return new Array<V3>(this.bottomleft, this.bottommiddle, this.bottomright);
    }

    get rightedge(): Array<V3> {
        return new Array<V3>(this.bottomright, this.middleright, this.topright);
    }

    get topedge(): Array<V3> {
        return new Array<V3>(this.topleft, this.topmiddle, this.topright);
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
            verts.push(...this._vertices);
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
            norms.push(...this._normals);
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
            tris.push(...this.getLeftTriangleIndices());
            tris.push(...this.getBottomTriangleIndices());
            tris.push(...this.getRightTriagnleIndices());
            tris.push(...this.getTopTriangleIndices());
        }
        return tris;
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
        return {
            indices: this.indices,
            vertices: this.vertices,
            normals: this.normals,
            uvs: this.uvs
        };
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

    getClosestQuad(point: V3, from?: Array<Quad>): Quad {
        from ??= Array.from([this]);
        // sort quads in ascending order by distance to point
        const sortedQuads = from.sort((a, b) => V3.length(a.centre, point) - V3.length(b.centre, point));
        this._logger.log('debug', 'quads sorted by distance to', point, sortedQuads.map(q => q.centre));
        let closest = sortedQuads
            .find(q => q != null);
        if (closest.hasChildren()) {
            closest = this.getClosestQuad(point, [
                closest.bottomleftChild,
                closest.bottomrightChild,
                closest.topleftChild,
                closest.toprightChild
            ]);
        }
        this._logger.log('debug', 'closest quad is', closest.fingerprint);
        return closest;
    }

    /**
     * ```
     * 6      6
     * |\     |\
     * | 4 or 3-4
     * |/     |/
     * 0      0
     * ```
     */
    getLeftTriangleIndices(): Array<number> {
        if (this.activeSides.includes('left')) {
            return [
                4, 6, 3, // centre, topleft, middleleft
                4, 3, 0  // centre, middleleft, bottomleft
            ];
        }
        return [
            4, 6, 0 // centre, topleft, bottomleft
        ];
    }

    /**
     * ```
     *   4        4
     *  / \      /|\
     * 0---2 or 0-1-2
     * ```
     */
    getBottomTriangleIndices(): Array<number> {
        if (this.activeSides.includes('bottom')) {
            return [
                4, 0, 1, // centre, bottomleft, bottommiddle
                4, 1, 2  // centre, bottommiddle, bottomright
            ];
        }
        return [
            4, 0, 2 // centre, bottomleft, bottomright
        ];
    }

    /**
     * ```
     *   8      8
     *  /|     /|
     * 4 | or 4-5
     *  \|     \|
     *   2      2
     * ```
     */
    getRightTriagnleIndices(): Array<number> {
        if (this.activeSides.includes('right')) {
            return [
                4, 2, 5, // centre, bottomright, middleright
                4, 5, 8  // centre, middleright, topright
            ];
        }
        return [
            4, 2, 8 // centre, bottomright, topright
        ];
    }

    /**
     * ```
     * 6---8 or 6-7-8
     *  \ /      \|/
     *   4        4
     * ```
     */
    getTopTriangleIndices(): Array<number> {
        if (this.activeSides.includes('top')) {
            return [
                4, 7, 6, // centre, topmiddle, topleft
                4, 8, 7  // centre, topright, topmiddle
            ];
        }
        return [
            4, 8, 6 // centre, topright, topleft
        ];
    }

    dispose(): void {
        this.registry.deregister(this);
        if (this.hasChildren()) {
            this._removeChildren();
        }
        this._vertices.splice(0, this._vertices.length);
    }

    private _generatePoints(centre: V3): void {
        for (let y = centre.y - this.radius; y <= centre.y + this.radius; y += this.radius) {
            for (let x = centre.x - this.radius; x <= centre.x + this.radius; x += this.radius) {
                const facev = this._rotatePoint({x, y, z: centre.z}, centre);
                this._vertices.push(facev.x, facev.y, facev.z);
            }
        }
    }

    private _generateNormals(): void {
        const normals = new Array<number>(
            0, 0, 1,   0, 0, 1,   0, 0, 1,
            0, 0, 1,   0, 0, 1,   0, 0, 1,
            0, 0, 1,   0, 0, 1,   0, 0, 1,
        );
        const normalPoints = V3.fromArray(normals);
        const zero = V3.zero();
        for (let i=0; i<normalPoints.length; i++) {
            const normalPoint = normalPoints[i];
            normalPoints[i] = this._rotatePoint(normalPoint, zero);
        }
        this._normals.push(...V3.toArray(...normalPoints));
    }

    private _generateUVs(): void {
        this._uvs.push(...UV.toArray(
            this.uvStart, {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvStart.v}, {u: this.uvEnd.u, v: this.uvStart.v},
            {u: this.uvStart.u, v: (this.uvStart.v+this.uvEnd.v)/2}, UV.midpoint(this.uvStart, this.uvEnd), {u: this.uvEnd.u, v: (this.uvStart.v+this.uvEnd.v)/2},
            {u: this.uvStart.u, v: this.uvEnd.v}, {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvEnd.v}, this.uvEnd
        ));
    }

    private _rotatePoint(point: V3, around?: V3): V3 {
        if (this._angle === 0) {
            return point;
        }
        around ??= point;
        const radians = this._angle * (Math.PI / 180);
        const p = new THREE.Vector3(point.x, point.y, point.z);
        const a = new THREE.Vector3(around.x, around.y, around.z);
        const axis = new THREE.Vector3(this._axis.x, this._axis.y, this._axis.z).normalize();
        
        return p.sub(a)
            .applyAxisAngle(axis, radians)
            .add(a);
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
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomleft',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: this.uvStart.u, v: this.uvStart.v},
                uvEnd: {u: (this.uvStart.u+this.uvEnd.u)/2, v: (this.uvStart.v+this.uvEnd.v)/2}
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomright, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomright',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvStart.v},
                uvEnd: {u: this.uvEnd.u, v: (this.uvStart.v+this.uvEnd.v)/2}
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topleft, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topleft',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: this.uvStart.u, v: (this.uvStart.v+this.uvEnd.v)/2},
                uvEnd: {u: (this.uvStart.u+this.uvEnd.u)/2, v: this.uvEnd.v}
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topright, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topright',
                loglevel: this._loglevel,
                maxlevel: this.maxlevel,
                angle: this._angle,
                rotationAxis: this._axis,
                uvStart: {u: (this.uvStart.u+this.uvEnd.u)/2, v: (this.uvStart.v+this.uvEnd.v)/2},
                uvEnd: {u: this.uvEnd.u, v: this.uvEnd.v}
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