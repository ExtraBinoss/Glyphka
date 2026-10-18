import { shapePath } from "@/engine/geometry";
import type { Shape } from "@/engine/model";
import { cancelMorph } from "./svg-morph";

export type ShapeAction = "move" | "resize" | "rotate";
export function transformShape(
  shape: Shape,
  action: ShapeAction,
  origin: { x: number; y: number },
  point: { x: number; y: number },
  constrain: boolean,
  corner?: [number, number],
): Shape {
  if (action === "rotate") {
    const from = Math.atan2(origin.y - shape.y, origin.x - shape.x);
    const to = Math.atan2(point.y - shape.y, point.x - shape.x);
    let rotation = shape.rotation + ((to - from) * 180) / Math.PI;
    if (constrain) rotation = Math.round(rotation / 15) * 15;
    return { ...shape, rotation: Math.round(((rotation + 540) % 360) - 180) };
  }
  if (action === "resize") {
    const angle = (-shape.rotation * Math.PI) / 180;
    const dx = point.x - origin.x,
      dy = point.y - origin.y;
    const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
    const [cx, cy] = corner!;
    const clamp = (value: number) => Math.max(12, Math.min(280, value));
    let width = clamp(shape.width + cx * localX * 2);
    let height = clamp(shape.height + cy * localY * 2);
    if (constrain) {
      const scale = Math.min(width / shape.width, height / shape.height);
      width = clamp(shape.width * scale);
      height = clamp(shape.height * scale);
    }
    return { ...shape, width: Math.round(width), height: Math.round(height) };
  }
  return {
    ...shape,
    x: Math.max(0, Math.min(600, Math.round(shape.x + point.x - origin.x))),
    y: Math.max(0, Math.min(440, Math.round(shape.y + point.y - origin.y))),
  };
}

export function shapeGestureTargets(svg: SVGSVGElement, id: string) {
  const paths = [
    ...svg.querySelectorAll<SVGPathElement>("[data-shape-paint]"),
  ].filter((path) => path.dataset.shapePaint === id);
  const overlay = [
    ...svg.querySelectorAll<SVGGElement>("[data-shape-id]"),
  ].find((group) => group.dataset.shapeId === id)!;
  for (const path of paths) cancelMorph(path);
  return {
    paths,
    overlay,
    hitPaths: [...overlay.querySelectorAll<SVGPathElement>(":scope > path")],
    box: overlay.querySelector<SVGRectElement>("[data-selection-box]"),
    handles: [...overlay.querySelectorAll<SVGRectElement>(".resize-handle")],
    stem: overlay.querySelector<SVGPathElement>("[data-rotation-stem]"),
    rotation: overlay.querySelector<SVGCircleElement>(".rotation-handle"),
  };
}

// No layout reads or React document updates in the pointer-move hot path.
export function drawShapeGesture(
  targets: ReturnType<typeof shapeGestureTargets>,
  shape: Shape,
  weight: number,
  resize: boolean,
) {
  const transform = `translate(${shape.x} ${shape.y}) rotate(${shape.rotation})`;
  targets.overlay.setAttribute("transform", transform);
  for (const path of targets.paths) path.setAttribute("transform", transform);
  if (!resize) return;
  const path = shapePath(shape, weight);
  for (const node of [...targets.paths, ...targets.hitPaths])
    node.setAttribute("d", path);
  const x = shape.width / 2 + 6,
    y = shape.height / 2 + 6;
  const box = targets.box;
  if (box) {
    box.setAttribute("x", String(-x));
    box.setAttribute("y", String(-y));
    box.setAttribute("width", String(x * 2));
    box.setAttribute("height", String(y * 2));
  }
  for (const handle of targets.handles) {
    const [cx, cy] = handle.dataset.handle!.split(",").map(Number);
    handle.setAttribute("x", String(cx * x - 4));
    handle.setAttribute("y", String(cy * y - 4));
  }
  targets.stem?.setAttribute("d", `M0 ${-y}v-20`);
  targets.rotation?.setAttribute("cy", String(-y - 23));
}
