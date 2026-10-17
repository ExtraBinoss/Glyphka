import { PMREMGenerator, WebGLRenderer } from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Offline only: generate the fixed lighting environment once, rather than
// compiling and rendering the PMREM pipeline in every visitor's browser.
const renderer = new WebGLRenderer({ antialias: false });
const pmrem = new PMREMGenerator(renderer),
  room = new RoomEnvironment();
const target = pmrem.fromScene(room, 0.04, 0.1, 100, { size: 64 });
const pixels = new Uint16Array(target.width * target.height * 4);
renderer.readRenderTargetPixels(
  target,
  0,
  0,
  target.width,
  target.height,
  pixels,
);
(window as unknown as Record<string, unknown>).__bakedEnvironment = {
  width: target.width,
  height: target.height,
  pixels: Array.from(pixels),
};
target.dispose();
room.dispose();
pmrem.dispose();
renderer.dispose();
renderer.forceContextLoss();
