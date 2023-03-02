import { BufferGeometry, Float32BufferAttribute } from "three";
import { Quad } from "../types/quad";
import { QuadMeshData } from "../types/quad-types";

class QuadGeometry extends BufferGeometry {
    readonly quad: Quad;
    constructor(radius = 1, maxLevels = 10) {
        super();
        this.quad = new Quad({
            radius: radius,
            maxlevel: maxLevels,
            loglevel: 'debug'
        });

        this._updateAttributes(this.quad.meshData);
    }

    private _updateAttributes(data: QuadMeshData): void {
        this.setIndex( data.indices );
		this.setAttribute( 'position', new Float32BufferAttribute( data.vertices, 3 ) );
		this.setAttribute( 'normal', new Float32BufferAttribute( data.normals, 3 ) );
		this.setAttribute( 'uv', new Float32BufferAttribute( data.uvs, 2 ) );
    }
}