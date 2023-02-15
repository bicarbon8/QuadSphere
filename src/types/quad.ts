import * as THREE from "three";
import { V3 } from "./v3";

export type QuadSide = 'left' | 'bottom' | 'right' | 'top';

export type QuadChild = 'bottomleft' | 'bottomright' | 'topleft' | 'topright';

export type QuadOptions = {
    parent?: Quad;
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
export class Quad {
    public readonly parent: Quad;
    public readonly points = new Array<THREE.Vector3>();
    public readonly neighbors = new Map<QuadSide, Quad>();
    public readonly children = new Map<QuadChild, Quad>();
    public readonly radius: number;
    public readonly level: number;
    
    private readonly _active = new Set<QuadSide>();

    private _mesh: THREE.Mesh;

    constructor(options: QuadOptions) {
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
        return (this.hasChildren()) ? new Array<number>()
            .concat(...Array.from(this.children.values())
                .map(c => c.triangles)) : new Array<number>(
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
        return this;
    }

    deactivate(...sides: Array<QuadSide>): this {
        sides.forEach(s => this._active.delete(s));
        return this;
    }

    /**
     * causes this `Quad` to generate 4 child quads and update all neighbors so they can 
     * subdivide their edges facing this quad
     */
    subdivide(): this {
        // create child Quads
        this.children.set('bottomleft', new Quad({
            parent: this,
            centre: V3.midpoint(this.bottomleft, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this.children.set('bottomright', new Quad({
            parent: this,
            centre: V3.midpoint(this.bottomright, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this.children.set('topleft', new Quad({
            parent: this,
            centre: V3.midpoint(this.topleft, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        this.children.set('topright', new Quad({
            parent: this,
            centre: V3.midpoint(this.topright, this.centre),
            radius: this.radius / 4,
            level: this.level + 1
        }));
        // update neighbors
        this.neighbors.forEach((neighbor: Quad, side: QuadSide) => {
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
        // update neighbors
        this.neighbors.forEach((neighbor: Quad, side: QuadSide) => {
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
        for (let y=centre.y-this.radius; y<centre.y+this.radius; y+=this.radius) {
            for (let x=centre.x-this.radius; x<centre.x+this.radius; x+=this.radius) {
                this.points.push(new THREE.Vector3(x, y, centre.z));
            }
        }
    }
}