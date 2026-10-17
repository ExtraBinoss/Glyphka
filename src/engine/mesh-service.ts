import type { Design } from "./model";
import type { GeometryReply, GeometryRequest } from "./mesh-types";
type Mode = GeometryRequest["mode"];
type Job = {
  request: GeometryRequest;
  meshKey: string;
  priority: boolean;
  resolve: (reply: GeometryReply | null) => void;
  promise: Promise<GeometryReply | null>;
};
let worker: Worker | null = null,
  active: Job | null = null,
  serial = 0;
const queue: Job[] = [],
  cache = new Map<string, GeometryReply>();
const MAX_BYTES = 24 * 1024 * 1024;
function bytes(reply: GeometryReply) {
  return (
    reply.meshes?.reduce(
      (n, m) =>
        n + m.positions.byteLength + m.normals.byteLength + m.uvs.byteLength,
      0,
    ) ?? 0
  );
}
export function geometryKeys(design: Design, mode: Mode, selected: number) {
  const {
    text,
    family,
    weight,
    roundness,
    width,
    slant,
    tracking,
    cutouts,
    mutation,
    seed,
    alternates,
    shapes,
  } = design;
  const key = JSON.stringify(
    mode === "shapes"
      ? [mode, shapes, weight]
      : [
          mode,
          mode === "symbol" ? selected : null,
          text,
          family,
          weight,
          roundness,
          width,
          slant,
          tracking,
          cutouts,
          mutation,
          seed,
          alternates,
        ],
  );
  return {
    key,
    meshKey: JSON.stringify([key, design.render.depth, design.render.bevel]),
  };
}
function dispatch() {
  if (active || !queue.length) return;
  if (!worker) {
    worker = new Worker(new URL("./contour.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<GeometryReply>) => {
      const job = active;
      if (!job || event.data.id !== job.request.id) return;
      active = null;
      if (!event.data.error && bytes(event.data) <= MAX_BYTES) {
        cache.set(job.meshKey, event.data);
        let total = [...cache.values()].reduce(
          (n, reply) => n + bytes(reply),
          0,
        );
        while (cache.size > 8 || total > MAX_BYTES) {
          const oldest = cache.keys().next().value!;
          total -= bytes(cache.get(oldest)!);
          cache.delete(oldest);
        }
      }
      job.resolve(event.data);
      dispatch();
    };
    worker.onerror = () => {
      active?.resolve({
        id: active.request.id,
        error: "3D geometry unavailable",
      });
      active = null;
      for (const job of queue.splice(0)) job.resolve(null);
      worker?.terminate();
      worker = null;
    };
  }
  active = queue.shift()!;
  worker.postMessage(active.request);
}
export function buildMesh(
  design: Design,
  mode: Mode,
  selected: number,
  priority = true,
): Promise<GeometryReply | null> {
  const { key, meshKey } = geometryKeys(design, mode, selected);
  const cached = cache.get(meshKey);
  if (cached) {
    cache.delete(meshKey);
    cache.set(meshKey, cached);
    return Promise.resolve(cached);
  }
  if (active?.meshKey === meshKey) return active.promise;
  const existing = queue.find((job) => job.meshKey === meshKey);
  if (existing) {
    if (priority) {
      existing.priority = true;
      queue.splice(queue.indexOf(existing), 1);
      queue.unshift(existing);
    }
    return existing.promise;
  }
  if (priority)
    for (let i = queue.length - 1; i >= 0; i--)
      if (queue[i].priority) queue.splice(i, 1)[0].resolve(null);
  let resolve!: Job["resolve"];
  const promise = new Promise<GeometryReply | null>((done) => {
    resolve = done;
  });
  const job = {
    request: { id: ++serial, key, design, mode, selected },
    meshKey,
    priority,
    resolve,
    promise,
  };
  if (priority) queue.unshift(job);
  else {
    if (queue.length >= 8) queue.pop()!.resolve(null);
    queue.push(job);
  }
  dispatch();
  return promise;
}
