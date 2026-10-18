import { expect, it } from "vitest";
import { DEFAULT_DESIGN } from "@/engine/model";
import { transformShape } from "./shape-gesture";

it("resizes in local axes and preserves the aspect ratio with Shift", () => {
  const shape = {
    ...DEFAULT_DESIGN.shapes[0],
    width: 100,
    height: 50,
    rotation: 90,
  };
  const resized = transformShape(
    shape,
    "resize",
    { x: 0, y: 0 },
    { x: -10, y: 20 },
    false,
    [1, 1],
  );
  expect(resized.width).toBe(140);
  expect(resized.height).toBe(70);
  const constrained = transformShape(
    shape,
    "resize",
    { x: 0, y: 0 },
    { x: -5, y: 30 },
    true,
    [1, 1],
  );
  expect(constrained.width / constrained.height).toBe(2);
  expect(shape.width).toBe(100);
});
it("bounds movement and snaps rotation to 15 degrees with Shift", () => {
  const shape = { ...DEFAULT_DESIGN.shapes[0], x: 100, y: 100, rotation: 0 };
  expect(
    transformShape(shape, "move", { x: 0, y: 0 }, { x: -1000, y: 1000 }, false),
  ).toMatchObject({ x: 0, y: 440 });
  expect(
    transformShape(
      shape,
      "rotate",
      { x: 200, y: 100 },
      { x: 200, y: 140 },
      true,
    ).rotation,
  ).toBe(15);
});
