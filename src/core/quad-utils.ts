import { Quad } from "./quad";
import { QuadLogger, QuadLoggerLevel } from "./quad-logger";
import { QuadMeshData } from "./quad-types";
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
}