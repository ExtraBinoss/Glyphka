import { useLayoutEffect, useRef, type ReactNode } from "react";

export function ScrollShadow({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current!;
    let frame = 0;
    const update = () => {
      frame = 0;
      const overflow = element.scrollHeight - element.clientHeight;
      element.dataset.scrollTop = String(element.scrollTop > 1);
      element.dataset.scrollBottom = String(overflow - element.scrollTop > 1);
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
    update();
    schedule();
    element.addEventListener("scroll", schedule, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      element.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`scroll-shadow ${className}`}
      role="region"
      aria-label={label}
    >
      {children}
    </div>
  );
}
