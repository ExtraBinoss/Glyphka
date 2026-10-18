type CameraPoint = { x: number; y: number; z: number };

/** Fits camera-oriented corners at 100% zoom, including their perspective depth. */
export function perspectiveFitDistance(
  corners: readonly CameraPoint[],
  verticalFov: number,
  aspect: number,
  padding = 1.12,
): number {
  const vertical = Math.tan((verticalFov * Math.PI) / 360);
  const horizontal = vertical * Math.max(0.001, aspect);
  let distance = 0.1;
  for (const point of corners) {
    distance = Math.max(
      distance,
      point.z +
        padding *
          Math.max(
            Math.abs(point.x) / horizontal,
            Math.abs(point.y) / vertical,
          ),
    );
  }
  return distance;
}
