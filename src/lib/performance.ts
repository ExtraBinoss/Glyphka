const enabled =
  typeof location !== "undefined" &&
  new URLSearchParams(location.search).has("profile");
export function recordPerformance(name: string, start: number) {
  if (!enabled) return;
  const key = `glyphka:${name}`;
  performance.measure(key, { start, duration: performance.now() - start });
  // An opt-in profiling session must not retain entries for an unbounded loop.
  if (performance.getEntriesByName(key).length > 2048)
    performance.clearMeasures(key);
}
export const profiling = enabled;
