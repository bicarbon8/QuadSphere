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
 * or more levels of subdivisions different from this `Quad` it **MUST** either subdivide
 * or unify until within one level
 * 
 * no sides active
 * ```
 * 6---7---8
 * |\     /|
 * | \   / |
 * |  \ /  |
 * 3   4   5
 * |  / \  |
 * | /   \ |
 * |/     \|
 * 0---1---2
 * ```
 * one side active
 * ```
 * l            b            r            t        
 * 6---7---8    6---7---8    6---7---8    6---7---8
 * |\     /|    |\     /|    |\     /|    |\  |  /|
 * | \   / |    | \   / |    | \   / |    | \ | / |
 * |  \ /  |    |  \ /  |    |  \ /  |    |  \|/  |
 * 3---4   5    3   4   5    3   4---5    3   4   5
 * |  / \  |    |  /|\  |    |  / \  |    |  / \  |
 * | /   \ |    | / | \ |    | /   \ |    | /   \ |
 * |/     \|    |/  |  \|    |/     \|    |/     \|
 * 0---1---2 or 0---1---2 or 0---1---2 or 0---1---2
 * ```
 * two sides active
 * ```
 * bl           tl           br           tr           lr           tb       
 * 6---7---8    6---7---8    6---7---8    6---7---8    6---7---8    6---7---8
 * |\     /|    |\  |  /|    |\     /|    |\  |  /|    |\     /|    |\  |  /|
 * | \   / |    | \ | / |    | \   / |    | \ | / |    | \   / |    | \ | / |
 * |  \ /  |    |  \|/  |    |  \ /  |    |  \|/  |    |  \ /  |    |  \|/  |
 * 3---4   5    3---4   5    3   4---5    3   4---5    3---4---5    3   4   5
 * |  /|\  |    |  / \  |    |  /|\  |    |  / \  |    |  / \  |    |  /|\  |
 * | / | \ |    | /   \ |    | / | \ |    | /   \ |    | /   \ |    | / | \ |
 * |/  |  \|    |/     \|    |/  |  \|    |/     \|    |/     \|    |/  |  \|
 * 0---1---2 or 0---1---2 or 0---1---2 or 0---1---2 or 0---1---2 or 0---1---2
 * ```
 * three sides active
 * ```
 * blr          tlr          tbr          tbl      
 * 6---7---8    6---7---8    6---7---8    6---7---8
 * |\     /|    |\  |  /|    |\  |  /|    |\  |  /|
 * | \   / |    | \ | / |    | \ | / |    | \ | / |
 * |  \ /  |    |  \|/  |    |  \|/  |    |  \|/  |
 * 3---4---5    3---4---5    3   4---5    3---4   5
 * |  /|\  |    |  / \  |    |  /|\  |    |  /|\  |
 * | / | \ |    | /   \ |    | / | \ |    | / | \ |
 * |/  |  \|    |/     \|    |/  |  \|    |/  |  \|
 * 0---1---2 or 0---1---2 or 0---1---2 or 0---1---2
 * ```
 * all sides active
 * ```
 * 6---7---8
 * |\  |  /|
 * | \ | / |
 * |  \|/  |
 * 3---4---5
 * |  /|\  |
 * | / | \ |
 * |/  |  \|
 * 0---1---2
 * ```
 */
export class QuadGeometry extends THREE.BufferGeometry {
    public readonly parent: QuadGeometry;
    public readonly points = new Array<THREE.Vector3>();
    public readonly indices = new Array<number>();
    public readonly vertices = new Array<number>();
    public readonly normals = new Array<number>();
    public readonly uvs = new Array<number>();
    public readonly neighbors = new Map<QuadSide, QuadGeometry>();
    public readonly children = new Map<QuadChild, QuadGeometry>();
    public readonly radius: number;
    public readonly level: number;

    private readonly _active = new Set<QuadSide>();

    private _mesh: THREE.Mesh;

    constructor(options: QuadOptions) {
        super();
        this.type = 'QuadGeometry';
        this.parent = options.parent;
        this.radius = options.radius ?? 1;
        this.level = options.level ?? 0;
        this._generatePoints(options.centre ?? V3.ZERO);
    }

    get mesh(): THREE.Mesh {
        return this._mesh;
    }

    get activeSides(): Array<QuadSide> {
        return Array.from(this._active.values());
    }

    get bottomleft(): THREE.Vector3 {
        return this.points[0];
    }

    get bottommiddle(): THREE.Vector3 {
        return this.points[1];
    }

    get bottomright(): THREE.Vector3 {
        return this.points[2];
    }

    get middleleft(): THREE.Vector3 {
        return this.points[3];
    }

    get centre(): THREE.Vector3 {
        return this.points[4];
    }

    get middleright(): THREE.Vector3 {
        return this.points[5];
    }

    get topleft(): THREE.Vector3 {
        return this.points[6];
    }

    get topmiddle(): THREE.Vector3 {
        return this.points[7];
    }

    get topright(): THREE.Vector3 {
        return this.points[8];
    }

    get triangles(): Array<number> {
        if (this.hasChildren()) {
            return new Array<number>()
                .concat(...Array.from(this.children.values())
                    .map(c => c.triangles));
        }
        return new Array<number>(
            ...this.getLeftTrianglePositions(),
            ...this.getBottomTrianglePositions(),
            ...this.getRightTriagnlePositions(),
            ...this.getTopTrianglePositions()
        );
    }

    hasChildren(): boolean {
        return this.children.size === 4;
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
     * causes this `Quad` to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(): this {
        // create child Quads
        this.children.set('bottomleft', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.bottomleft, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this.children.set('bottomright', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.bottomright, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this.children.set('topleft', new QuadGeometry({
            parent: this,
            centre: V3.midpoint(this.topleft, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this.children.set('topright', new QuadGeometry({
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
     * causes this `Quad` to remove all child quads and update all neighbors so they can
     * unify their edges facing this quad
     */
    unify(): this {
        // remove child Quads
        for (let child of this.children.keys()) {
            this.children.delete(child);
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
     * 6   7   8    6   7   8
     * |\           |\
     * | \          | \
     * |  \         |  \
     * |   4   5 or 3---4   5
     * |  /         |  /
     * | /          | /
     * |/           |/
     * 0   1   2    0   1   2
     * ```
     */
    getLeftTrianglePositions(): Array<number> {
        if (this.activeSides.includes('left')) {
            return [
                this.bottomleft.x, this.bottomleft.y, this.bottomleft.z, // bottom left
                this.middleleft.x, this.middleleft.y, this.middleleft.z, // middle left
                this.centre.x, this.centre.y, this.centre.z,             // centre

                this.centre.x, this.centre.y, this.centre.z,             // centre
                this.middleleft.x, this.middleleft.y, this.middleleft.z, // middle left
                this.topleft.x, this.topleft.y, this.topleft.z           // top left
            ];
        }
        return [
            this.bottomleft.x, this.bottomleft.y, this.bottomleft.z, // bottom left
            this.topleft.x, this.topleft.y, this.topleft.z,          // top left
            this.centre.x, this.centre.y, this.centre.z              // centre
        ];
    }

    /**
     * ```
     * 6   7   8    6   7   8
     * 
     * 
     * 
     * 3   4   5    3   4   5
     *    / \          /|\
     *   /   \        / | \
     *  /     \      /  |  \
     * 0-------2 or 0---1---2
     * ```
     */
    getBottomTrianglePositions(): Array<number> {
        if (this.activeSides.includes('top')) {
            return [
                this.bottomleft.x, this.bottomleft.y, this.bottomleft.z,   // bottom left
                this.centre.x, this.centre.y, this.centre.z,               // centre
                this.middleleft.x, this.middleleft.y, this.middleleft.z,   // middle left

                this.middleleft.x, this.middleleft.y, this.middleleft.z,   // middle left
                this.centre.x, this.centre.y, this.centre.z,               // centre
                this.bottomright.x, this.bottomright.y, this.bottomright.z // bottom right
            ];
        }
        return [
            this.bottomleft.x, this.bottomleft.y, this.bottomleft.z,   // bottom left
            this.centre.x, this.centre.y, this.centre.z,               // centre
            this.bottomright.x, this.bottomright.y, this.bottomright.z // bottom right
        ];
    }

    /**
     * ```
     * 6   7   8    6   7   8
     *        /|           /|
     *       / |          / |
     *      /  |         /  |
     * 3   4   | or 3   4---5
     *      \  |         \  |
     *       \ |          \ |
     *        \|           \|
     * 0   1   2    0   1   2
     * ```
     */
    getRightTriagnlePositions(): Array<number> {
        if (this.activeSides.includes('right')) {
            return [
                this.centre.x, this.centre.y, this.centre.z,                // centre
                this.topright.x, this.topright.y, this.topright.z,          // top right
                this.middleright.x, this.middleright.y, this.middleright.z, // middle right

                this.middleright.x, this.middleright.y, this.middleright.z, // middle right
                this.bottomright.x, this.bottomright.y, this.bottomright.z, // bottom right
                this.centre.x, this.centre.y, this.centre.z                 // centre
            ];
        }
        return [
            this.centre.x, this.centre.y, this.centre.z,                // centre
            this.topright.x, this.topright.y, this.topright.z,          // top right
            this.bottomright.x, this.bottomright.y, this.bottomright.z, // bottom right
        ];
    }

    /**
     * ```
     * 6-------8 or 6---7---8
     *  \     /      \  |  /
     *   \   /        \ | /
     *    \ /          \|/
     * 3   4   5    3   4   5
     * 
     * 
     * 
     * 0   1   2    0   1   2
     * ```
     */
    getTopTrianglePositions(): Array<number> {
        if (this.activeSides.includes('top')) {
            return [
                this.centre.x, this.centre.y, this.centre.z,             // centre
                this.topleft.x, this.topleft.y, this.topleft.z,          // top left
                this.middleleft.x, this.middleleft.y, this.middleleft.z, // middle left

                this.middleleft.x, this.middleleft.y, this.middleleft.z, // middle left
                this.topright.x, this.topright.y, this.topright.z,       // top right
                this.centre.x, this.centre.y, this.centre.z              // centre
            ];
        }
        return [
            this.centre.x, this.centre.y, this.centre.z,       // centre
            this.topleft.x, this.topleft.y, this.topleft.z,    // top left
            this.topright.x, this.topright.y, this.topright.z, // top right
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
                this.points.push(point.clone());
                this.vertices.push(point.x, point.y, point.z);
                normal.copy(point).normalize();
                this.normals.push(normal.x, normal.y, normal.z);
                this.uvs.push(u + uOffset, 1 - v);
            }
        }

        // const gridX = 2;
        // const gridY = 2;
        // const gridX1 = gridX + 1;
        // for (let iy = 0; iy < gridY; iy++) {
        //     for (let ix = 0; ix < gridX; ix++) {
        //         const a = ix + gridX1 * iy;
        //         const b = ix + gridX1 * (iy + 1);
        //         const c = (ix + 1) + gridX1 * (iy + 1);
        //         const d = (ix + 1) + gridX1 * iy;

        //         this.indices.push(a, b, d);
        //         this.indices.push(b, c, d);
        //     }
        // }
        this._updateAttributes();
    }

    private _updateAttributes(): void {
        this.vertices.splice(0, this.vertices.length, ...this.triangles);
        this.setAttribute('position', new Float32BufferAttribute(this.vertices, 3));
        this.setAttribute('normal', new Float32BufferAttribute(this.normals, 3));
        this.setAttribute('uv', new Float32BufferAttribute(this.uvs, 2));
    }
}