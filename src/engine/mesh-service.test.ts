import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DEFAULT_DESIGN } from "./model";
import type { GeometryReply, GeometryRequest } from "./mesh-types";

class GeometryWorker {
  static current: GeometryWorker;
  requests: GeometryRequest[] = [];
  onmessage?: (event: { data: GeometryReply }) => void;
  constructor() {
    GeometryWorker.current = this;
  }
  postMessage(request: GeometryRequest) {
    this.requests.push(request);
  }
  complete() {
    this.onmessage?.({
      data: {
        id: this.requests.at(-1)!.id,
        meshes: [],
        width: 500,
        height: 148,
      },
    });
  }
}

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("Worker", GeometryWorker);
});
afterEach(() => vi.unstubAllGlobals());

it("drops an obsolete hover when the latest target is already queued for warmup", async () => {
  const { buildMesh } = await import("./mesh-service");
  const active = buildMesh(DEFAULT_DESIGN, "wordmark", 0);
  const obsolete = buildMesh({ ...DEFAULT_DESIGN, seed: 2 }, "wordmark", 0);
  const latest = { ...DEFAULT_DESIGN, seed: 3 };
  const warmup = buildMesh(latest, "wordmark", 0, false);
  const hover = buildMesh(latest, "wordmark", 0);
  await expect(obsolete).resolves.toBeNull();
  const worker = GeometryWorker.current;
  worker.complete();
  expect(worker.requests.map((request) => request.design.seed)).toEqual([
    DEFAULT_DESIGN.seed,
    3,
  ]);
  worker.complete();
  await expect(active).resolves.toMatchObject({ meshes: [] });
  await expect(hover).resolves.toMatchObject({ meshes: [] });
  await expect(warmup).resolves.toMatchObject({ meshes: [] });
});

it("does not compute a queued obsolete target when the pointer returns to a cached mesh", async () => {
  const { buildMesh } = await import("./mesh-service");
  const cached = buildMesh(DEFAULT_DESIGN, "wordmark", 0);
  const worker = GeometryWorker.current;
  worker.complete();
  await cached;
  const active = buildMesh({ ...DEFAULT_DESIGN, seed: 2 }, "wordmark", 0);
  const obsolete = buildMesh({ ...DEFAULT_DESIGN, seed: 3 }, "wordmark", 0);
  await expect(buildMesh(DEFAULT_DESIGN, "wordmark", 0)).resolves.toMatchObject(
    {
      meshes: [],
    },
  );
  await expect(obsolete).resolves.toBeNull();
  worker.complete();
  await active;
  expect(worker.requests.map((request) => request.design.seed)).toEqual([
    DEFAULT_DESIGN.seed,
    2,
  ]);
});
