import type { Design } from "./model";
export interface GeometryRequest {
  id: number;
  key: string;
  design: Design;
  mode: "wordmark" | "symbol" | "shapes";
  selected: number;
}
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  groups: { start: number; count: number; materialIndex?: number }[];
}
export interface GeometryReply {
  id: number;
  meshes?: MeshData[];
  width?: number;
  height?: number;
  error?: string;
}
