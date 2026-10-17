import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";
import type { GradientFill } from "@/engine/model";
import { gradientVector } from "@/engine/paint";

export class PaintTexture {
  private canvas = document.createElement("canvas");
  private texture: CanvasTexture;
  private key = "";
  constructor() {
    this.canvas.width = this.canvas.height = 512;
    this.texture = new CanvasTexture(this.canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = this.texture.magFilter = LinearFilter;
    this.texture.generateMipmaps = false;
  }
  update(fill: GradientFill | null | undefined, width: number, height: number) {
    if (!fill) return null;
    const key = JSON.stringify([fill, width, height]);
    if (key !== this.key) {
      this.key = key;
      const ctx = this.canvas.getContext("2d")!;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, 512, 512);
      let gradient: CanvasGradient;
      if (fill.type === "linear") {
        ctx.scale(512 / width, 512 / height);
        const v = gradientVector(fill.angle, width, height);
        gradient = ctx.createLinearGradient(v.x1, v.y1, v.x2, v.y2);
      } else {
        ctx.scale(512, 512);
        gradient = ctx.createRadialGradient(
          0.5,
          0.5,
          0,
          0.5,
          0.5,
          Math.SQRT1_2,
        );
      }
      for (const stop of fill.stops)
        gradient.addColorStop(stop.position, stop.color);
      ctx.fillStyle = gradient;
      if (fill.type === "linear") ctx.fillRect(0, 0, width, height);
      else ctx.fillRect(0, 0, 1, 1);
      this.texture.needsUpdate = true;
    }
    return this.texture;
  }
  dispose() {
    this.texture.dispose();
  }
}
