import THREE from "three";
import { V3 } from "../types/v3";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type QuadOptions = {
    parent: Quad;
    centre: V3;
    radius: number;
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
export class Quad {
    public readonly parent: Quad;
    public readonly points = new Array<THREE.Vector3>(9);
    public readonly neighbors = new Map<QuadSide, Quad>();
    public readonly children = new Array<Quad>(4);
    public readonly radius: number;
    
    private readonly _active = new Set<QuadSide>();

    private _mesh: THREE.Mesh;

    constructor(options: QuadOptions) {
        this.parent = options.parent;
        this.radius = options.radius;
        this._generatePoints(options.centre);
    }

    get mesh(): THREE.Mesh {
        return this._mesh;
    }
    
    get depth(): number {
        if (this.children.length) {
            return this.children
                .map(c => 1 + c.depth)
                .reduce((prev: number, current: number) => (prev > current) ? prev : current, 0);
        }
        return 0;
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

    activate(...sides: Array<QuadSide>): this {
        sides?.forEach(s => this._active.add(s));
        this._createMesh();
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        sides.forEach(s => this._active.delete(s));
        this._createMesh();
        return this;
    }

    /**
     * causes this `Quad` to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(): this {
        return this;
    }

    /**
     * causes this `Quad` to remove all child quads and update all neighbors so they can
     * unify their edges facing this quad
     */
    unify(): this {
        return this;
    }

    private _generatePoints(centre: V3): void {
        for (let y=this.centre.y-this.radius; y<this.centre.y+this.radius; y+=this.radius) {
            for (let x=this.centre.x-this.radius; x<this.centre.x+this.radius; x+=this.radius) {
                this.points.push(new THREE.Vector3(x, y, centre.z));
            }
        }
    }

    private _createMesh(): void {
        const geometry = new THREE.BufferGeometry();
        const positions = new Array<number>(
            ...this._getLeftTrianglePositions(),
            ...this._getBottomTrianglePositions(),
            ...this._getRightTriagnlePositions(),
            ...this._getTopTrianglePositions()
        );
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();

        const material = new THREE.MeshNormalMaterial();
        this._mesh = new THREE.Mesh(geometry, material);
    }

    /**
     * ```
     * 6        6
     * |\       |\
     * | \      | \
     * |  \     |  \
     * |   4 or 3---4
     * |  /     |  /
     * | /      | /
     * |/       |/
     * 0        0
     * ```
     */
    private _getLeftTrianglePositions(): Array<number> {
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
     *     4            4
     *    / \          /|\
     *   /   \        / | \
     *  /     \      /  |  \
     * 0-------2 or 0---1---2
     * ```
     */
    private _getBottomTrianglePositions(): Array<number> {
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
     *     8        8
     *    /|       /|
     *   / |      / |
     *  /  |     /  |
     * 4   | or 4---5
     *  \  |     \  |
     *   \ |      \ |
     *    \|       \|
     *     2        2
     * ```
     */
    private _getRightTriagnlePositions(): Array<number> {
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
     *     4            4
     * ```
     */
    private _getTopTrianglePositions(): Array<number> {
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
}