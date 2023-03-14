import { Quad } from "./quad";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadMeshData, QuadSide, QuadSphereFace } from "./quad-types";
import { V3 } from "./v3";

export type QuadUtilsOptions = {
    loglevel: QuadLoggerLevel;
}

export class QuadUtils {
    private readonly _logger: QuadLogger;

    constructor(options?: QuadUtilsOptions) {
        this._logger = new QuadLogger({level: options?.loglevel ?? 'warn'});
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
    getCentreTriangleIndices(segments: number): Array<number> {
        const indices = new Array<number>();
        for (let y=1; y<segments-2; y++) {
            for (let x=1; x<segments-2; x++) {
                const a1 = this.xyToI(x, y, segments);
                const b1 = a1 + 1;
                const c1 = this.xyToI(x+1, y+1, segments);
                
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
    getLeftTriangleIndices(segments: number, activeSides: Array<QuadSide>): Array<number> {
        const indices = new Array<number>();
        const x = 1;
        for (let y=1; y<segments; y+=2) {
            const index = this.xyToI(x, y, segments);
            if (y > 1) {
                const a = index;
                const b = this.xyToI(x-1, y-1, segments);
                const c = this.xyToI(x, y-1, segments);
                indices.push(a, b, c);
            }

            if (activeSides.includes('left')) {
                const a1 = index;
                const b1 = index-1;
                const c1 = this.xyToI(x-1, y-1, segments);
                const a2 = index;
                const b2 = this.xyToI(x-1, y+1, segments);
                const c2 = b1;
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this.xyToI(x-1, y+1, segments);
                const c = this.xyToI(x-1, y-1, segments);
                indices.push(a, b, c);
            }

            if (y < segments-2) {
                const a = index;
                const b = this.xyToI(x, y+1, segments);
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
    getBottomTriangleIndices(segments: number, activeSides: Array<QuadSide>): Array<number> {
        const indices = new Array<number>();
        const y = 1;
        for (let x=1; x<segments; x+=2) {
            const index = this.xyToI(x, y, segments);
            if (x > 1) {
                const a = index;
                const b = index-1;
                const c = this.xyToI(x-1, y-1, segments);
                indices.push(a, b, c);
            }

            if (activeSides.includes('bottom')) {
                const a1 = index;
                const b1 = this.xyToI(x-1, y-1, segments);
                const c1 = this.xyToI(x, y-1, segments);
                const a2 = index;
                const b2 = c1;
                const c2 = this.xyToI(x+1, y-1, segments);
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this.xyToI(x-1, y-1, segments);
                const c = this.xyToI(x+1, y-1, segments);
                indices.push(a, b, c);
            }

            if (x < segments-2) {
                const a = index;
                const b = this.xyToI(x+1, y-1, segments);
                const c = this.xyToI(x+1, y, segments);
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
    getRightTriangleIndices(segments: number, activeSides: Array<QuadSide>): Array<number> {
        const indices = new Array<number>();
        const x = segments-2;
        for (let y=1; y<segments-1; y+=2) {
            const index = this.xyToI(x, y, segments);
            if (y > 2) {
                const a = index;
                const b = this.xyToI(x, y-1, segments);
                const c = this.xyToI(x+1, y-1, segments);
                indices.push(a, b, c);
            }

            if (activeSides.includes('right')) {
                const a1 = index;
                const b1 = this.xyToI(x+1, y-1, segments);
                const c1 = this.xyToI(x+1, y, segments);
                const a2 = index;
                const b2 = c1;
                const c2 = this.xyToI(x+1, y+1, segments);
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this.xyToI(x+1, y-1, segments);
                const c = this.xyToI(x+1, y+1, segments);
                indices.push(a, b, c);
            }

            if (y < segments-2) {
                const a = index;
                const b = this.xyToI(x+1, y+1, segments);
                const c = this.xyToI(x, y+1, segments);
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
    getTopTriangleIndices(segments: number, activeSides: Array<QuadSide>): Array<number> {
        const indices = new Array<number>();
        const y = segments-2;
        for (let x=1; x<segments; x+=2) {
            const index = this.xyToI(x, y, segments);
            if (x > 1) {
                const a = index;
                const b = this.xyToI(x-1, y+1, segments);
                const c = index-1;
                indices.push(a, b, c);
            }

            if (activeSides.includes('top')) {
                const a1 = index;
                const b1 = this.xyToI(x, y+1, segments);
                const c1 = b1-1;
                const a2 = index;
                const b2 = this.xyToI(x+1, y+1, segments);
                const c2 = b2-1;
                indices.push(a1, b1, c1, a2, b2, c2);
            } else {
                const a = index;
                const b = this.xyToI(x+1, y+1, segments);
                const c = this.xyToI(x-1, y+1, segments);
                indices.push(a, b, c);
            }

            if (x < segments-2) {
                const a = index;
                const b = index+1;
                const c = this.xyToI(x+1, y+1, segments);
                indices.push(a, b, c);
            }
        }
        return indices;
    }

    /**
	 * iterates over all vertices removing duplicates and taking note of
     * the index of each vertices we keep; also removes associated UVs and
     * normals for removed vertices. iterates over indices and updates them
     * to use remaining vertices removing any triangles that have 2 or more
     * identical indices as that means they've been collapsed as part of the 
     * merge process
	 */
	mergeVertices(data: QuadMeshData, precision: number): QuadMeshData {
        let removedVertexCount = 0;
        let removedTriangleCount = 0;
        const updatedVerts = new Array<number>();
        const updatedTris = new Array<number>();
        const updatedUvs = new Array<number>();
        const updatedNorms = new Array<number>();
		const verticesMap = new Map<string, number>(); // tracks index of each vertex in the array (index = x position)
        const makeKey = (vert: V3): string => {
            const v = V3.reducePrecision(vert, precision);
            return `${v.x}_${v.y}_${v.z}`;
        };

		for (let vi=0, ui=0; vi<data.vertices.length; vi+=3, ui+=2) {
			const x = data.vertices[vi];
            const y = data.vertices[vi+1];
            const z = data.vertices[vi+2];
            const u = data.uvs[ui];
            const v = data.uvs[ui+1];
            const nx = data.normals[vi];
            const ny = data.normals[vi+1];
            const nz = data.normals[vi+2];

            const key = makeKey({x, y, z});
			if (verticesMap.has(key)) {
				// found duplicate so don't add it
                this._logger.log('debug', 'found duplicate for', key, {x, y, z});
                removedVertexCount++;
            } else {
                const index = updatedVerts.length / 3;
                this._logger.log('debug', 'unique vertex added at index', index, key, {x, y, z});
                verticesMap.set(key, index); // add index to vertices
                updatedVerts.push(x, y, z);
                updatedUvs.push(u, v);
                updatedNorms.push(nx, ny, nz);
            }
		}

		// update the indices to point to the updated vertices
        for (let i=0; i<data.indices.length; i+=3) {
			const ia = data.indices[i]*3;
            const ib = data.indices[i+1]*3;
            const ic = data.indices[i+2]*3;
			// get vertices at indexes from original array
            const a = V3.fromArray(data.vertices.slice(ia, ia+3))[0];
            const b = V3.fromArray(data.vertices.slice(ib, ib+3))[0];
            const c = V3.fromArray(data.vertices.slice(ic, ic+3))[0];

            // lookup updated index
            const keyA = makeKey(a);
            const keyB = makeKey(b);
            const keyC = makeKey(c);
            const uia = verticesMap.get(keyA);
            const uib = verticesMap.get(keyB);
            const uic = verticesMap.get(keyC);

			// if any duplicate vertices indexes are found in a triangle
			// we shouldn't add it as it has collapsed during the merge
			if (uia !== uib && uib !== uic && uic !== uia) {
                updatedTris.push(uia, uib, uic);
            } else {
                this._logger.log('debug', 'invalid triangle created', [ia, ib, ic], 'became', [uia, uib, uic]);
                removedTriangleCount++;
            }
		}

		const updated: QuadMeshData = {
            indices: updatedTris,
            vertices: updatedVerts,
            normals: updatedNorms,
            uvs: updatedUvs
        };
        this._logger.log('info', 'removed', removedVertexCount, 'vertices and', removedTriangleCount, 'triangles');
		return updated;
	}

    removeUnusedVertices(data: QuadMeshData): QuadMeshData {
        let removedVertexCount = 0;
        const updatedVerts = new Array<number>();
        const updatedTris = new Array<number>();
        const updatedUvs = new Array<number>();
        const updatedNorms = new Array<number>();
        const referencedVertices = new Set<number>(); // key = index of referenced vertices (x value)
		const remappedIndices = new Map<number, number>(); // key = old index, value = new index

        // loop through indices creating map of used vertices indexes
        // index points to the x value of a given vertices
        for (let i=0; i<data.indices.length; i++) {
            referencedVertices.add(data.indices[i]);
        }

        // loop through vertices removing any not referenced
        for (let x=0, u=0; x<data.vertices.length; x+=3, u+=2) {
            const index = x / 3;
            if (referencedVertices.has(index)) {
                remappedIndices.set(index, updatedVerts.length / 3);
                updatedVerts.push(data.vertices[x], data.vertices[x+1], data.vertices[x+2]);
                updatedNorms.push(data.normals[x], data.normals[x+1], data.normals[x+2]);
                updatedUvs.push(data.uvs[u], data.uvs[u+1]);
            } else {
                removedVertexCount++;
            }
        }

        // loop through indices updating referenced index
        for (let i=0; i<data.indices.length; i++) {
            const oldIndex = data.indices[i];
            const newIndex = remappedIndices.get(oldIndex);
            updatedTris.push(newIndex);
        }

        const updated: QuadMeshData = {
            indices: updatedTris,
            vertices: updatedVerts,
            normals: updatedNorms,
            uvs: updatedUvs
        };
        this._logger.log('info', 'removed', removedVertexCount, 'unused vertices');
		return updated;
    }

    /**
     * recursively searches the passed in `from` array for the `Quad`
     * whose `centre` point is closest to the specified `point`
     * @param point the `V3` in local space against which to compare
     * @param from an array of `Quad` objects to recursively iterate over
     * @returns the deepest quad that is closest to the specified `point`
     */
    getClosestQuad(point: V3, ...from: Array<Quad>): Quad {
        if (from.length === 0) {
            return null;
        }
        // sort quads in ascending order by distance to point
        const sortedQuads = from.sort((a, b) => V3.length(a.centre, point) - V3.length(b.centre, point));
        this._logger.log('debug', 'quads sorted by distance to', point, sortedQuads.map(q => q.centre));
        let closest = sortedQuads
            .find(q => q != null);
        if (closest.hasChildren()) {
            closest = this.getClosestQuad(point, 
                closest.bottomleftChild,
                closest.bottomrightChild,
                closest.topleftChild,
                closest.toprightChild
            );
        }
        this._logger.log('debug', 'closest quad is', closest.fingerprint);
        return closest;
    }

    /**
     * recursively searches the passed in `from` array for any `Quad` who does not have children
     * and whose `centre` is within the specified `distance` from the specified `point`
     * @param point the `V3` in local space against which to compare
     * @param distance the distance within which the length from `point` to `quad.centre` must be
     * @param from an array of `Quad` objects to recursively interate over
     * @returns an array of the deepest quads that are within the specified `distance` from the `point`
     */
    getQuadsWithinDistance(point: V3, distance: number, ...from: Array<Quad>): Array<Quad> {
        const within = new Array<Quad>();
        from.forEach(q => {
            if (V3.length(point, q.centre) <= distance) {
                if (q.hasChildren()) {
                    within.push(...this.getQuadsWithinDistance(point, distance,
                        q.bottomleftChild,
                        q.bottomrightChild,
                        q.topleftChild,
                        q.toprightChild
                    ).filter(q => q != null));
                } else {
                    within.push(q);
                }
            }
        });
        return within;
    }

    /**
     * converts a 2 dimensional array coordinate (x, y) into a 1 dimensional index
     * @param x the horizontal coordinate of the grid (left-to-right)
     * @param y the vertical coordinate of the grid (bottom-to-top)
     * @param segments the number of horizontal and vertical coordinates
     * per row / column
     * @returns the index into a 1 dimensional array based on the coordinates
     * of the grid (2 dimensional array)
     */
    xyToI(x: number, y: number, segments: number): number {
        return (segments * y) + x;
    }

    /**
     * returns the `QuadSphereFace` values as an array ordered to match the material groups
     * used by `THREE.BoxGeometry`
     * @returns `QuadSphereFace` strings ordered in `[+x, -x, +y, -y, +z, -z]`
     */
    orderedFaces(): Array<QuadSphereFace> {
        const faces = new Array<QuadSphereFace>(
            this.faceByIndex(0),
            this.faceByIndex(1),
            this.faceByIndex(2),
            this.faceByIndex(3),
            this.faceByIndex(4),
            this.faceByIndex(5)
        );
        return faces;
    }

    /**
     * returns the `QuadSphereFace` at the specified index matching the material groups
     * used by `THREE.BoxGeometry`, specifically `+x=0, -x=1, +y=2, -y=3, +z=4, -z=5`
     * @param index a number from 0 to 5, inclusive
     * @returns the `QuadSphereFace` at the specified index
     */
    faceByIndex(index: number): QuadSphereFace {
        switch (index) {
            case 0:
                return 'right';
            case 1:
                return 'left';
            case 2:
                return 'top';
            case 3:
                return 'bottom';
            case 4:
                return 'front';
            case 5:
                return 'back';
            default:
                this._logger.log('warn', 'invalid face index provided', index);
                return 'front';
        }
    }
}