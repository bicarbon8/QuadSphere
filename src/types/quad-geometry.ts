import * as THREE from "three";
import { Float32BufferAttribute } from "three";
import { QuadNeighbors, QuadRegistry } from "./quad-registry";
import { V3 } from "./v3";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type QuadChild = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadOptions = {
    parent?: QuadGeometry;
    centre?: V3;
    radius?: number;
    level?: number;
    registry?: QuadRegistry;
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
export class QuadGeometry extends THREE.BufferGeometry {
    public readonly parent: QuadGeometry;
    public readonly radius: number;
    public readonly level: number;
    public readonly registry: QuadRegistry;

    private readonly _neighbors = new Map<QuadSide, QuadGeometry>();
    private readonly _children = new Map<QuadChild, QuadGeometry>();
    private readonly _vertices = new Array<number>();
    private readonly _normals = new Array<number>();
    private readonly _uvs = new Array<number>();
    private readonly _active = new Set<QuadSide>();

    constructor(options: QuadOptions) {
        super();
        this.type = 'QuadGeometry';
        this.parent = options.parent;
        this.radius = options.radius ?? 1;
        this.level = options.level ?? 0;
        this.registry = options.registry ?? new QuadRegistry();
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
        // return this.registry.getNeighbors(this);
        return {
            left: this.leftNeighbor,
            bottom: this.bottomNeighbor,
            right: this.rightNeighbor,
            top: this.topNeighbor
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

    get bottomleftChild(): QuadGeometry {
        return this._children.get('bottomleft');
    }

    get bottomrightChild(): QuadGeometry {
        return this._children.get('bottomright');
    }

    get topleftChild(): QuadGeometry {
        return this._children.get('topleft');
    }

    get toprightChild(): QuadGeometry {
        return this._children.get('topright');
    }

    get leftNeighbor(): QuadGeometry {
        return this._neighbors.get('left');
    }

    get bottomNeighbor(): QuadGeometry {
        return this._neighbors.get('bottom');
    }

    get rightNeighbor(): QuadGeometry {
        return this._neighbors.get('right');
    }

    get topNeighbor(): QuadGeometry {
        return this._neighbors.get('top');
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
        return vertices;
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

    setNeighbor(side: QuadSide, neighbor?: QuadGeometry): this {
        if (neighbor) {
            this._neighbors.set(side, neighbor);
        } else {
            this._neighbors.delete(side);
        }
        return this;
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

    activate(...sides: Array<QuadSide>): this {
        sides?.forEach(s => this._active.add(s));
        this.updateAttributes();
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        sides.forEach(s => this._active.delete(s));
        this.updateAttributes();
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
        // create child Quads
        const bottomleft = new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.bottomleft, this.centre),
            radius: this.radius / 2,
            level: this.level + 1,
            registry: this.registry
        });
        const bottomright = new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.bottomright, this.centre),
            radius: this.radius / 2,
            level: this.level + 1,
            registry: this.registry
        });
        const topleft = new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.topleft, this.centre),
            radius: this.radius / 2,
            level: this.level + 1,
            registry: this.registry
        });
        const topright = new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.topright, this.centre),
            radius: this.radius / 2,
            level: this.level + 1,
            registry: this.registry
        });
        bottomleft.setNeighbor('left', this.parent?.leftNeighbor)
            .setNeighbor('bottom', this.parent?.bottomNeighbor)
            .setNeighbor('right', bottomright)
            .setNeighbor('top', topleft);
        bottomright.setNeighbor('left', bottomleft)
            .setNeighbor('bottom', this.parent?.bottomNeighbor)
            .setNeighbor('right', this.parent?.rightNeighbor)
            .setNeighbor('top', topright);
        topleft.setNeighbor('left', this.parent?.leftNeighbor)
            .setNeighbor('bottom', bottomleft)
            .setNeighbor('right', topright)
            .setNeighbor('top', this.parent?.topNeighbor);
        topright.setNeighbor('left', topleft)
            .setNeighbor('bottom', bottomright)
            .setNeighbor('right', this.parent?.rightNeighbor)
            .setNeighbor('top', this.parent?.topNeighbor);
        this._children.set('bottomleft', bottomleft);
        this._children.set('bottomright', bottomright);
        this._children.set('topleft', topleft);
        this._children.set('topright', topright);
        this.updateAttributes();
        // update our neighbors
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side];
            if (neighbor) {
                const levelDifference = this.level - neighbor.level;
                if (levelDifference < 1) {
                    switch (side) {
                        case 'bottom':
                            // activate neighbor's top
                            console.debug({id: this.id}, 'activating top of bottom neighbor', neighbor.id);
                            neighbor.activate('top');
                            break;
                        case 'left':
                            // activate neighbor's right
                            console.debug({id: this.id}, 'activating right of left neighbor', neighbor.id);
                            neighbor.activate('right');
                            break;
                        case 'right':
                            // activate neighbor's left
                            console.debug({id: this.id}, 'activating left of bottom right neighbor', neighbor.id);
                            neighbor.activate('left');
                            break;
                        case 'top':
                            // activate neighbor's bottom
                            console.debug({id: this.id}, 'activating bottom of top neighbor', neighbor.id);
                            neighbor.activate('bottom');
                            break;
                        default:
                            console.warn(`invalid side: '${side}' found in this.neighbors`);
                            break;
                    }
                } else {
                    console.debug({id: this.id}, 'subdividing', side ,'neighbor', neighbor.id);
                    neighbor.subdivide();
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
        // remove child Quads
        this._children.forEach((c: QuadGeometry, k: QuadChild) => {
            c.dispose();
            this._children.delete(k);
        });
        this.updateAttributes();
        // update neighbors
        const neighbors = this.neighbors;
        const sides = Object.getOwnPropertyNames(neighbors) as Array<QuadSide>;
        sides.forEach(side => {
            const neighbor = neighbors[side];
            if (neighbor) {
                const levelDifference = neighbor.level - this.level;
                if (levelDifference === 0) {
                    switch (side) {
                        case 'bottom':
                            // deactivate neighbor's top
                            neighbor.deactivate('top');
                            break;
                        case 'left':
                            // deactivate neighbor's right
                            neighbor.deactivate('right');
                            break;
                        case 'right':
                            // deactivate neighbor's left
                            neighbor.deactivate('left');
                            break;
                        case 'top':
                            // deactivate neighbor's bottom
                            neighbor.deactivate('bottom');
                            break;
                        default:
                            console.warn(`invalid side: '${side}' found in this.neighbors`);
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
                0, 3, 4, // bottomleft, middleleft, centre
                4, 3, 6  // centre, middleleft, topleft
            ];
        }
        return [
            0, 6, 4 // bottomleft, topleft, centre
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
                0, 4, 1, // bottomleft, centre, bottommiddle
                1, 4, 2  // bottommiddle, centre, bottomright
            ];
        }
        return [
            0, 4, 2 // bottomleft, centre, bottomright
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
                4, 5, 2, // centre, middleright, bottomright
                4, 8, 5  // centre, topright, middleright
            ];
        }
        return [
            2, 4, 8 // bottomright, centre, topright
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
                4, 6, 7, // centre, topleft, topmiddle
                4, 7, 8  // centre, topmiddle, topright
            ];
        }
        return [
            4, 6, 8 // centre, topleft, topright
        ];
    }

    override dispose(): void {
        this.registry.deregister(this);
        if (this.hasChildren()) {
            this._children.forEach((c: QuadGeometry, k: QuadChild) => {
                c.dispose();
                this._children.delete(k);
            });
        }
        this._vertices.splice(0, this._vertices.length);
        super.dispose();
    }

    private _generatePoints(centre: V3): void {
        const point = new THREE.Vector3();
        const normal = new THREE.Vector3();
        for (let z = centre.z - this.radius; z <= centre.z + this.radius; z += this.radius) {
            const v = z / 3;
            let uOffset = 0;
            for (let x = centre.x - this.radius; x <= centre.x + this.radius; x += this.radius) {
                const u = x / 3;
                point.x = x;
                point.y = centre.y;
                point.z = z;
                this._vertices.push(point.x, point.y, point.z);
                normal.copy(point).normalize();
                this._normals.push(normal.x, normal.y, normal.z);
                this._uvs.push(u + uOffset, 1 - v);
            }
        }
        this.updateAttributes();
    }

    updateAttributes(): void {
        this.setAttribute('position', new Float32BufferAttribute(this.vertices, 3));
        this.setIndex(this.indices);
        this.parent?.updateAttributes();
        // this.setAttribute('normal', new Float32BufferAttribute(this._normals, 3));
        // this.setAttribute('uv', new Float32BufferAttribute(this._uvs, 2));
    }

    private _getPointIndices(index: number = 0): V3 {
        const i = index * 3;
        return {x: i, y: i+1, z: i+2};
    }
}