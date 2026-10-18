import { useEffect, useRef, type ReactNode } from "react";

export function ScrollShadow({
  children,
  className = "",
  label,
  axis = "vertical",
}: {
  children: ReactNode;
  className?: string;
  label: string;
  axis?: "vertical" | "horizontal";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current!;
    let frame = 0;
    const update = () => {
      frame = 0;
      const horizontal = axis === "horizontal";
      const offset = horizontal ? element.scrollLeft : element.scrollTop;
      const overflow = horizontal
        ? element.scrollWidth - element.clientWidth
        : element.scrollHeight - element.clientHeight;
      element.dataset.scrollTop = String(offset > 1);
      element.dataset.scrollBottom = String(overflow - offset > 1);
      element.tabIndex = overflow > 1 ? 0 : -1;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    for (const child of element.children) resize.observe(child);
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.removedNodes)
          if (node instanceof Element) resize.unobserve(node);
        for (const node of record.addedNodes)
          if (node instanceof Element) resize.observe(node);
      }
      schedule();
    });
    mutations.observe(element, { childList: true });
    schedule();
    element.addEventListener("scroll", schedule, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      element.removeEventListener("scroll", schedule);
    };
  }, [axis]);

  return (
    <div
      ref={ref}
      className={`scroll-shadow ${className}`}
      data-axis={axis}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  );
}
