import {
  CubeUVReflectionMapping,
  DataTexture,
  HalfFloatType,
  LinearFilter,
  RGBAFormat,
} from "three";
let pixels: Promise<Uint16Array> | undefined;
let loaded: Uint16Array | undefined;
export function loadEnvironment() {
  pixels ??= fetch(new URL("../assets/studio-environment.bin", import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error("Environment unavailable");
      if (!response.body) throw new Error("Empty environment");
      return new Response(
        response.body.pipeThrough(new DecompressionStream("gzip")),
      ).arrayBuffer();
    })
    .then((buffer) => {
      if (buffer.byteLength !== 336 * 256 * 8)
        throw new Error("Invalid environment size");
      loaded = new Uint16Array(buffer);
      return loaded;
    })
    .catch((error: unknown) => {
      pixels = undefined;
      throw error;
    });
  return pixels;
}
export function createEnvironment() {
  if (!loaded)
    throw new Error("Environment must be preloaded before creating the scene");
  const texture = new DataTexture(loaded, 336, 256, RGBAFormat, HalfFloatType);
  texture.mapping = CubeUVReflectionMapping;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}
