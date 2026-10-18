// Base UI registers these on the first open. Do it before hydration so the
// document-wide style invalidation never runs in a tap or swipe handler.
export function prepareDrawerGestures() {
  if (typeof CSS === "undefined" || !("registerProperty" in CSS)) return;
  const properties = [
    ["--drawer-height", "<length>", "0px"],
    ["--drawer-frontmost-height", "<length>", "0px"],
    ["--nested-drawers", "<number>", "0"],
    ["--drawer-swipe-movement-x", "<length>", "0px"],
    ["--drawer-swipe-movement-y", "<length>", "0px"],
    ["--drawer-snap-point-offset", "<length>", "0px"],
    ["--drawer-swipe-progress", "<number>", "0"],
    ["--drawer-swipe-strength", "<number>", "1"],
  ];
  for (const [name, syntax, initialValue] of properties) {
    try {
      CSS.registerProperty({ name, syntax, initialValue, inherits: false });
    } catch {
      // Already registered by another drawer instance or a hot reload.
    }
  }
}
