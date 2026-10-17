import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { cpus } from "node:os";
import {
  buildDrawing,
  glyphMarks,
  serializeSvg,
  shapePath,
} from "../src/engine/geometry";
import {
  DEFAULT_DESIGN,
  FAMILIES,
  PRESETS,
  type Design,
} from "../src/engine/model";
import { randomizeDesign } from "../src/engine/randomize";
import { createPathMorph } from "../src/engine/morph";
import { buildVectorDocument } from "../src/engine/contours";
import { installVectorParser } from "../src/engine/svg-parser";
import { geometryKeys } from "../src/engine/mesh-service";
import type { GeometryReply } from "../src/engine/mesh-types";

installVectorParser();
const samples = FAMILIES.map((family, i) => ({
  ...randomizeDesign(DEFAULT_DESIGN, 160 + i),
  ...PRESETS[family],
  text: "PLINKA",
  render: DEFAULT_DESIGN.render,
}));
const rows: {
  operation: string;
  samples: number;
  medianMs: number;
  p95Ms: number;
  maxMs: number;
}[] = [];
function record(operation: string, times: number[]) {
  times.sort((a, b) => a - b);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  rows.push({
    operation,
    samples: times.length,
    medianMs: round(times[Math.floor(times.length / 2)]),
    p95Ms: round(times[Math.floor(times.length * 0.95)]),
    maxMs: round(times.at(-1)!),
  });
}
function measure(
  operation: string,
  count: number,
  run: (index: number) => unknown,
) {
  for (let i = 0; i < Math.min(count, 20); i++) run(i);
  const times: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = performance.now();
    run(i);
    times.push(performance.now() - start);
  }
  record(operation, times);
}
measure("2D drawing · 6 letters · 16 families", 1000, (i) =>
  buildDrawing(samples[i % samples.length]),
);
measure("2D drawing · 36 letters", 500, (i) =>
  buildDrawing({
    ...samples[i % samples.length],
    text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  }),
);
measure("Shape paths · 52 editable parts · warm cache", 200, (i) => {
  const shapes = samples[i % samples.length].shapes;
  return Array.from({ length: 52 }, (_, j) =>
    shapePath(shapes[j % shapes.length]),
  );
});
measure("Full random design", 1000, (i) => randomizeDesign(DEFAULT_DESIGN, i));
measure("Standalone SVG export", 300, (i) =>
  serializeSvg(samples[i % samples.length], "wordmark", "#2563eb"),
);
const paths = samples.map((d) => glyphMarks("P", d).find((m) => !m.cutout)!.d);
measure("Morph interpolator setup · normalized paths", 500, (i) =>
  createPathMorph(paths[i % paths.length], paths[(i + 1) % paths.length]),
);
const morphs = Array.from({ length: 60 }, (_, i) =>
  createPathMorph(paths[i % paths.length], paths[(i + 1) % paths.length]),
);
measure("Morph frame · 60 paths · no DOM", 600, (i) =>
  morphs.map((m) => m(((i % 58) + 1) / 60)),
);
measure("Vector booleans · 6 letters", 48, (i) =>
  buildVectorDocument(samples[i % samples.length], "wordmark", 0),
);

const worker = new Worker(
  new URL("../src/engine/contour.worker.ts", import.meta.url),
  { type: "module" },
);
let id = 0;
async function mesh(design: Design) {
  const requestId = ++id;
  const reply = new Promise<GeometryReply>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<GeometryReply>) =>
      event.data.error
        ? reject(new Error(event.data.error))
        : resolve(event.data);
    worker.onerror = reject;
  });
  worker.postMessage({
    id: requestId,
    key: geometryKeys(design, "wordmark", 0).key,
    design,
    mode: "wordmark",
    selected: 0,
  });
  await reply;
}
try {
  const cold = performance.now();
  await mesh(DEFAULT_DESIGN);
  record("Worker cold start + contours + extrusion", [
    performance.now() - cold,
  ]);
  const times: number[] = [];
  for (const design of samples) {
    const start = performance.now();
    await mesh(design);
    times.push(performance.now() - start);
  }
  record("Worker contours + extrusion · all families", times);
  const warm: number[] = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    await mesh({
      ...samples.at(-1)!,
      render: { ...DEFAULT_DESIGN.render, depth: 10 + i },
    });
    warm.push(performance.now() - start);
  }
  record("Worker extrusion · cached contours", warm);
} finally {
  worker.terminate();
}
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  dirty: !!execFileSync("git", ["status", "--porcelain"], {
    encoding: "utf8",
  }).trim(),
  cpu: cpus()[0]?.model,
  runtime: `Bun ${process.versions.bun}`,
  measuredAt: new Date().toISOString(),
  note: "Local CPU timings; no DOM, rasterization or GPU. Hardware load affects results. First worker row has one cold sample.",
  rows,
};
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/engine-performance.json",
  JSON.stringify(report, null, 2),
);
console.table(rows);
