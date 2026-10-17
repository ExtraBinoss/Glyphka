import { ExtrudeGeometry, Path, Shape, Vector2 } from "three";
import { buildVectorDocument, type VectorDocument } from "./contours";
import type { Design } from "./model";
import { installVectorParser } from "./svg-parser";
import type { GeometryReply, GeometryRequest } from "./mesh-types";

installVectorParser();
let cachedKey = "",
  cached: VectorDocument | null = null;
self.onmessage = (event: MessageEvent<GeometryRequest>) => {
  const { id, design, mode, selected, key } = event.data;
  try {
    if (key !== cachedKey || !cached) {
      cached = buildVectorDocument(design, mode, selected);
      cachedKey = key;
    }
    const result = extrude(cached, design),
      reply: GeometryReply = {
        id,
        meshes: result,
        width: cached.width,
        height: cached.height,
      };
    self.postMessage(reply, {
      transfer: result.flatMap((m) => [
        m.positions.buffer,
        m.normals.buffer,
        m.uvs.buffer,
      ]),
    });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Geometry unavailable",
    } satisfies GeometryReply);
  }
};
function extrude(doc: VectorDocument, design: Design) {
  const scale = 6 / Math.max(doc.width, doc.height),
    point = ([x, y]: [number, number]) =>
      new Vector2((x - doc.width / 2) * scale, (doc.height / 2 - y) * scale);
  const depth = design.render.depth * 0.01,
    bevel = Math.min(design.render.bevel * 0.01, depth * 0.42);
  return doc.polygons.map((p) => {
    const shape = new Shape(p.outer.map(point));
    shape.holes = p.holes.map((hole) => new Path(hole.map(point)));
    const geometry = new ExtrudeGeometry(shape, {
      depth,
      steps: 1,
      curveSegments: 1,
      bevelEnabled: bevel > 0.0001,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
    });
    geometry.translate(0, 0, -depth / 2);
    const mesh = {
      positions: geometry.getAttribute("position").array as Float32Array,
      normals: geometry.getAttribute("normal").array as Float32Array,
      uvs: geometry.getAttribute("uv").array as Float32Array,
      groups: geometry.groups,
    };
    geometry.dispose();
    return mesh;
  });
}
