import THREE from "three";
import { QuadIndices } from "./quad-indices";

export type QuadOptions = {
    parent: Quad;
    radius: number;
}

/**
 * a quadrilateral shape made up of triangles in one of the following configurations
 * based on neighboring quads and their level of subdivisions. if any neighbor is two
 * or more levels of subdivisions different from this `Quad` it **MUST** either subdivide
 * or unify until within one level
 * 
 * no sides divided
 * 6---7---8
 * |\     /|
 * | \   / |
 * |  \ /  |
 * 3   4   5
 * |  / \  |
 * | /   \ |
 * |/     \|
 * 0---1---2
 * 
 * one side divided
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
 * 
 * two sides divided
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
 * 
 * three sides divided
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
 * 
 * all sides divided
 * 6---7---8
 * |\  |  /|
 * | \ | / |
 * |  \|/  |
 * 3---4---5
 * |  /|\  |
 * | / | \ |
 * |/  |  \|
 * 0---1---2
 */
export class Quad {
    public readonly parent: Quad;
    public readonly children = new Array<Quad>(4);
    public readonly vertices = new Array<THREE.Vector3>(9);
    public readonly radius: number;

    constructor(options: QuadOptions) {
        this.parent = options.parent;
        this.radius = options.radius;
    }
    
    get hasChildren(): boolean {
        return this.children.filter(c => c != null).length > 0;
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

    _createVertices(): void {
        const geometry = new THREE.BufferGeometry();
        const points = new Array<THREE.Vector3>(9);
        points[QuadIndices.BOTTOM_LEFT] = new THREE.Vector3(-this.radius, -this.radius, 0);
        points[QuadIndices.BOTTOM_MIDDLE] = new THREE.Vector3(0, -this.radius, 0);
        points[QuadIndices.BOTTOM_RIGHT] = new THREE.Vector3(this.radius, -this.radius, 0);
        points[QuadIndices.LEFT_MIDDLE] = new THREE.Vector3(-this.radius, 0, 0);
        points[QuadIndices.CENTRE] = new THREE.Vector3(0, 0, 0);
        points[QuadIndices.RIGHT_MIDDLE] = new THREE.Vector3(this.radius, 0, 0);
        points[QuadIndices.TOP_LEFT] = new THREE.Vector3(-this.radius, this.radius, 0);
        points[QuadIndices.TOP_MIDDLE] = new THREE.Vector3(0, this.radius, 0);
        points[QuadIndices.TOP_RIGHT] = new THREE.Vector3(this.radius, this.radius, 0);
        geometry.setFromPoints(points);
        const material = new THREE.PointsMaterial({ color: 0xffff00, size: 0.25 });
        const mesh = new THREE.Mesh(geometry, material);
    }
}