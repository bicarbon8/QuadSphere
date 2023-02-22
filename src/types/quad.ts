import * as THREE from "three";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadRegistry } from "./quad-registry";
import { QuadChildren, QuadMeshData, QuadNeighbors, Quadrant, QuadSide, QuadSphereFace } from "./quad-types";
import { V3 } from "./v3";

export type QuadOptions = {
    parent?: Quad;
    centre?: V3;
    radius?: number;
    level?: number;
    registry?: QuadRegistry;
    quadrant?: Quadrant;
    loglevel?: QuadLoggerLevel;
    face?: QuadSphereFace;
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
    public readonly face: QuadSphereFace;

    private readonly _children = new Map<Quadrant, Quad>();
    private readonly _vertices = new Array<number>();
    private readonly _uvs = new Array<number>();
    private readonly _active = new Set<QuadSide>();
    private readonly _loglevel: QuadLoggerLevel;
    private readonly _logger: QuadLogger;

    constructor(options: QuadOptions) {
        this.parent = options.parent;
        this.radius = options.radius ?? 1;
        this.level = options.level ?? 0;
        this.registry = options.registry ?? new QuadRegistry();
        this.id = this.registry.getId();
        this.quadrant = options.quadrant; // root is null
        this.face = options.face ?? 'front';
        this._loglevel = options.loglevel ?? 'warn';
        this._logger = new QuadLogger({
            level: this._loglevel,
            preface: () => `[${this.id}:${this.level}:${this.depth}:${this.activeSides.map(s => s.charAt(0)).join('.')}]`
        });
        this._generatePoints(options.centre ?? V3.ZERO);
        this.registry.register(this);
    }

    /**
     * generates a unique configuration key that can be used to force mesh updates
     */
    get key(): string {
        let k = `${this.id}:${this.level}:${this.depth}:${this.activeSides.map(s => s.charAt(0)).join('.')}`;
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

    /**
     * consolidates the `vertices` and `indices` getters into a single
     * object containing both values for convenience and to ensure no
     * mismatch between the values
     */
    get meshData(): QuadMeshData {
        return {
            vertices: this.vertices,
            indices: this.indices
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
    getPoint(index: number = 0): THREE.Vector3 {
        const i = this._getPointIndices(index);
        const x = this._vertices[i.x];
        const y = this._vertices[i.y];
        const z = this._vertices[i.z];
        return new THREE.Vector3(x, y, z);
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

    /**
     * causes this quad to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(initiator?: Quad): this {
        if (this.hasChildren()) {
            return; // do nothing if we're already subdivided
        }
        this._logger.log('debug', 'subdivide; initiated by', initiator?.id);
        // create child Quads
        this._createChildren();
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side] ?? this.registry.getNeighbor(side, this.parent);
            if (neighbor) {
                if (this.level - neighbor.level > 0) {
                    neighbor.subdivide(this);
                    switch (side) {
                        case 'left':
                            this.registry.getNeighbor('left', this)?.activate('right');
                            break;
                        case 'bottom':
                            this.registry.getNeighbor('bottom', this)?.activate('top');
                            break;
                        case 'right':
                            this.registry.getNeighbor('right', this)?.activate('left');
                            break;
                        case 'top':
                            this.registry.getNeighbor('top', this)?.activate('bottom');
                            break;
                    }
                } else {
                    switch (side) {
                        case 'left':
                            neighbor.activate('right');
                            break;
                        case 'bottom':
                            neighbor.activate('top');
                            break;
                        case 'right':
                            neighbor.activate('left');
                            break;
                        case 'top':
                            neighbor.activate('bottom');
                            break;
                    }
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
        this._logger.log('debug', 'unify; initiated by', initiator?.id);
        // remove child Quads
        this._removeChildren();
        // update neighbors
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side] ?? this.registry.getNeighbor(side, this.parent);
            if (neighbor) {
                this._logger.log('debug', 'neighbor', neighbor.id, 'level', neighbor.level, 'depth', neighbor.depth);
                if (this.level === neighbor.level) {
                    if (this.depth - neighbor.depth < -1) {
                        neighbor.bottomleftChild?.unify(this);
                        neighbor.bottomrightChild?.unify(this);
                        neighbor.topleftChild?.unify(this);
                        neighbor.toprightChild?.unify(this);
                        switch (side) {
                            case 'left':
                                neighbor.bottomrightChild.deactivate('right');
                                neighbor.toprightChild.deactivate('right');
                                break;
                            case 'bottom':
                                neighbor.topleftChild.deactivate('top');
                                neighbor.toprightChild.deactivate('top');
                                break;
                            case 'right':
                                neighbor.bottomleftChild.deactivate('left');
                                neighbor.topleftChild.deactivate('left');
                                break;
                            case 'top':
                                neighbor.bottomleftChild.deactivate('bottom');
                                neighbor.bottomrightChild.deactivate('bottom');
                                break;
                        }
                    } else if (this.depth - neighbor.depth < 0) { // -1
                        this.activate(side);
                        switch (side) {
                            case 'left':
                                neighbor.bottomrightChild.deactivate('right');
                                neighbor.toprightChild.deactivate('right');
                                break;
                            case 'bottom':
                                neighbor.topleftChild.deactivate('top');
                                neighbor.toprightChild.deactivate('top');
                                break;
                            case 'right':
                                neighbor.bottomleftChild.deactivate('left');
                                neighbor.topleftChild.deactivate('left');
                                break;
                            case 'top':
                                neighbor.bottomleftChild.deactivate('bottom');
                                neighbor.bottomrightChild.deactivate('bottom');
                                break;
                        }
                    } else { // same depth
                        this.deactivate(side);
                        switch (side) {
                            case 'left':
                                neighbor.deactivate('right');
                                break;
                            case 'bottom':
                                neighbor.deactivate('top');
                                break;
                            case 'right':
                                neighbor.deactivate('left');
                                break;
                            case 'top':
                                neighbor.deactivate('bottom');
                                break;
                        }
                    }
                } else if (this.level - neighbor.level > 0) {
                    switch (side) {
                        case 'left':
                            neighbor.activate('right');
                            break;
                        case 'bottom':
                            neighbor.activate('top');
                            break;
                        case 'right':
                            neighbor.activate('left');
                            break;
                        case 'top':
                            neighbor.activate('bottom');
                            break;
                    }
                }
            }
        });
        return this;
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
            const v = y / 3;
            let uOffset = 0;
            for (let x = centre.x - this.radius; x <= centre.x + this.radius; x += this.radius) {
                const u = x / 3;
                const facev = this._updatePointForFace({x, y, z: centre.z});
                this._vertices.push(facev.x, facev.y, facev.z);
                this._uvs.push(u + uOffset, 1 - v);
            }
        }
    }

    private _updatePointForFace(point: V3): V3 {
        switch (this.face) {
            case 'bottom':
                return {x: point.x, y: -point.z, z: point.y};
            case 'top':
                return {x: point.x, y: point.z, z: -point.y};
            case 'right':
                return {x: point.z, y: point.y, z: -point.x};
            case 'left':
                return {x: -point.z, y: point.y, z: point.x};
            case 'back':
                return {x: -point.x, y: point.y, z: -point.z};
            case 'front':
            default:
                return point; // no change
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
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomleft',
                loglevel: this._loglevel
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomright, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomright',
                loglevel: this._loglevel
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topleft, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topleft',
                loglevel: this._loglevel
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topright, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topright',
                loglevel: this._loglevel
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