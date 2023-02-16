import * as THREE from "three";
import { Float32BufferAttribute } from "three";
import { V3 } from "./v3";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type QuadChild = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadOptions = {
    parent?: QuadGeometry;
    centre?: V3;
    radius?: number;
    level?: number;
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
    public readonly neighbors = new Map<QuadSide, QuadGeometry>();
    public readonly radius: number;
    public readonly level: number;

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
        this._generatePoints(options.centre ?? V3.ZERO);
    }

    get activeSides(): Array<QuadSide> {
        return Array.from(this._active.values());
    }

    get bottomleft(): V3 {
        return this._getPointIndices(0);
    }

    get bottommiddle(): V3 {
        return this._getPointIndices(1);
    }

    get bottomright(): V3 {
        return this._getPointIndices(2);
    }

    get middleleft(): V3 {
        return this._getPointIndices(3);
    }

    get centre(): V3 {
        return this._getPointIndices(4);
    }

    get middleright(): V3 {
        return this._getPointIndices(5);
    }

    get topleft(): V3 {
        return this._getPointIndices(6);
    }

    get topmiddle(): V3 {
        return this._getPointIndices(7);
    }

    get topright(): V3 {
        return this._getPointIndices(8);
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
            vertices.splice(vertices.length, 0, ...this.bottomleftChild.vertices);
            vertices.splice(vertices.length, 0, ...this.bottomrightChild.vertices);
            vertices.splice(vertices.length, 0, ...this.topleftChild.vertices);
            vertices.splice(vertices.length, 0, ...this.toprightChild.vertices);
        } else {
            vertices.splice(vertices.length, 0, ...this._vertices);
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
            const childIndices = Array.from(this._children.values())
                    .map(c => c.indices)
                    .flat();
            indices.splice(indices.length, 0, ...childIndices);
        } else {
            indices.splice(indices.length, 0, ...this.getLeftTriangleIndices());
            indices.splice(indices.length, 0, ...this.getBottomTriangleIndices());
            indices.splice(indices.length, 0, ...this.getRightTriagnleIndices());
            indices.splice(indices.length, 0, ...this.getTopTriangleIndices());
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

    activate(...sides: Array<QuadSide>): this {
        sides?.forEach(s => this._active.add(s));
        this._updateAttributes();
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        sides.forEach(s => this._active.delete(s));
        this._updateAttributes();
        return this;
    }

    /**
     * causes this quad to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(): this {
        // create child Quads
        this._children.set('bottomleft', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.bottomleft, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this._children.set('bottomright', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.bottomright, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this._children.set('topleft', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.topleft, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this._children.set('topright', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.topright, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this._updateAttributes();
        // update neighbors
        this.neighbors.forEach((neighbor: QuadGeometry, side: QuadSide) => {
            if (neighbor) {
                switch (side) {
                    case 'bottom':
                        // activate neighbor's top
                        neighbor.activate('top');
                        break;
                    case 'left':
                        // activate neighbor's right
                        neighbor.activate('right');
                        break;
                    case 'right':
                        // activate neighbor's left
                        neighbor.activate('left');
                        break;
                    case 'top':
                        // activate neighbor's bottom
                        neighbor.activate('bottom');
                        break;
                    default:
                        console.warn(`invalid side: '${side}' found in this.neighbors`);
                        break;
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
        for (let child of this._children.keys()) {
            this._children.delete(child);
        }
        this._updateAttributes();
        // update neighbors
        this.neighbors.forEach((neighbor: QuadGeometry, side: QuadSide) => {
            if (neighbor) {
                switch (side) {
                    case 'bottom':
                        // activate neighbor's top
                        neighbor.deactivate('top');
                        break;
                    case 'left':
                        // activate neighbor's right
                        neighbor.deactivate('right');
                        break;
                    case 'right':
                        // activate neighbor's left
                        neighbor.deactivate('left');
                        break;
                    case 'top':
                        // activate neighbor's bottom
                        neighbor.deactivate('bottom');
                        break;
                    default:
                        console.warn(`invalid side: '${side}' found in this.neighbors`);
                        break;
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
        if (this.activeSides.includes('top')) {
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
        this._updateAttributes();
    }

    private _updateAttributes(): void {
        this.setAttribute('position', new Float32BufferAttribute(this.vertices, 3));
        this.setIndex(this.indices);
        // this.setAttribute('normal', new Float32BufferAttribute(this._normals, 3));
        // this.setAttribute('uv', new Float32BufferAttribute(this._uvs, 2));
    }

    private _getPointIndices(index: number = 0): V3 {
        const i = index * 3;
        return {x: i, y: i+1, z: i+2};
    }
}