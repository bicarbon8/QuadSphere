import * as THREE from "three";
import { Float32BufferAttribute } from "three";
import { QuadRegistry } from "./quad-registry";
import { QuadChildren, QuadNeighbors, Quadrant, QuadSide } from "./quad-types";
import { V3 } from "./v3";

export type QuadOptions = {
    parent?: Quad;
    centre?: V3;
    radius?: number;
    level?: number;
    registry?: QuadRegistry;
    quadrant?: Quadrant;
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

    private readonly _children = new Map<Quadrant, Quad>();
    private readonly _vertices = new Array<number>();
    private readonly _normals = new Array<number>();
    private readonly _uvs = new Array<number>();
    private readonly _active = new Set<QuadSide>();

    constructor(options: QuadOptions) {
        this.parent = options.parent;
        this.radius = options.radius ?? 1;
        this.level = options.level ?? 0;
        this.registry = options.registry ?? new QuadRegistry();
        this.id = this.registry.getId();
        this.quadrant = options.quadrant; // root is null
        this._generatePoints(options.centre ?? V3.ZERO);
        this.registry.register(this);
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
        const vertices = new Array<number>();
        if (this.hasChildren()) {
            vertices.push(...this.bottomleftChild.vertices);
            vertices.push(...this.bottomrightChild.vertices);
            vertices.push(...this.topleftChild.vertices);
            vertices.push(...this.toprightChild.vertices);
        } else {
            vertices.push(...this._vertices);
        }
        const elevated = new Array<number>;
        for (let i=0; i<vertices.length; i += 3) {
            const e = this.applyCurve({x: vertices[i], y: vertices[i+1], z: vertices[i+2]});
            elevated.push(e.x, e.y, e.z);
        }
        return elevated;
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
        const indices = new Array<number>();
        if (this.hasChildren()) {
            let offset: number = 0;
            // NOTE: the order the child indices are added is critical and **MUST** match vertices order
            indices.push(...this.bottomleftChild.indices); // no offset
            offset += this.bottomleftChild.vertices.length / 3; // offset by vertices of first child
            indices.push(...this.bottomrightChild.indices.map(i => i+offset));
            offset += this.bottomrightChild.vertices.length / 3; // offset by vertices of second child
            indices.push(...this.topleftChild.indices.map(i => i+offset));
            offset += this.topleftChild.vertices.length / 3; // offset by vertices of third child
            indices.push(...this.toprightChild.indices.map(i => i+offset));
        } else {
            indices.push(...this.getLeftTriangleIndices());
            indices.push(...this.getBottomTriangleIndices());
            indices.push(...this.getRightTriagnleIndices());
            indices.push(...this.getTopTriangleIndices());
        }
        return indices;
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

    activate(...sides: Array<QuadSide>): this {
        console.debug('quad', this.id, 'activate', sides.join(', '));
        sides?.forEach(s => this._active.add(s));
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        sides.forEach(s => this._active.delete(s));
        return this;
    }

    /**
     * causes this quad to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(): this {
        if (this.hasChildren()) {
            return; // do nothing if we're already subdivided
        }
        console.debug('quad', this.id, 'level', this.level, 'subdivide');
        // create child Quads
        this._createChildren();
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side] ?? this.registry.getNeighbor(side, this.parent);
            if (neighbor) {
                if (this.level - neighbor.level > 0) {
                    neighbor.subdivide();
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
    unify(): this {
        if (!this.hasChildren()) {
            return;
        }
        console.debug('quad', this.id, 'level', this.level, 'unify');
        // remove child Quads
        this._removeChildren();
        const shouldUnify = new Set(this.registry.getQuadsAtLevel(this.level)
            .filter(q => !this.isSibling(q))
            .map(q => q.parent)
            .filter(p => p != null));
        shouldUnify.forEach(q => q.unify());
        // update neighbors
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side] ?? this.registry.getNeighbor(side, this.parent);
            if (neighbor) {
                if (!this.isSibling(neighbor)) {
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
                } else {
                    // siblings should all look the same
                    neighbor.deactivate('left', 'bottom', 'right', 'top');
                    neighbor.unify();
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

    applyCurve(point: V3): V3 {
        if (this.parent) {
            return this.parent.applyCurve(point);
        }
        const elevation = 0; // TODO: use UV's to lookup elevation values
        return V3.multiply(point, this.radius + elevation);
    }

    dispose(): void {
        this.registry.deregister(this);
        if (this.hasChildren()) {
            this._removeChildren();
        }
        this._vertices.splice(0, this._vertices.length);
    }

    private _generatePoints(centre: V3): void {
        const point = new THREE.Vector3();
        const normal = new THREE.Vector3();
        for (let y = centre.y - this.radius; y <= centre.y + this.radius; y += this.radius) {
            const v = y / 3;
            let uOffset = 0;
            for (let x = centre.x - this.radius; x <= centre.x + this.radius; x += this.radius) {
                const u = x / 3;
                point.x = x;
                point.y = y;
                point.z = centre.z;
                this._vertices.push(point.x, point.y, point.z);
                normal.copy(point).normalize();
                this._normals.push(normal.x, normal.y, normal.z);
                this._uvs.push(u + uOffset, 1 - v);
            }
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
                quadrant: 'bottomleft'
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.bottomright, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'bottomright'
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topleft, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topleft'
            }),
            new Quad({
                parent: this,
                centre: V3.midpoint(this.topright, this.centre),
                radius: this.radius / 2,
                level: this.level + 1,
                registry: this.registry,
                quadrant: 'topright'
            })
        ];
        children.forEach(c => this._children.set(c.quadrant, c));
    }

    private _removeChildren(): void {
        this._children.forEach((c: Quad, k: Quadrant) => {
            c.dispose();
            this._children.delete(k);
        });
    }
}