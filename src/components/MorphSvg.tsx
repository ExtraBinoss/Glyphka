import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { m, useReducedMotion } from "motion/react";
import { useAtomValue } from "jotai";
import { instantDrawingAtom } from "@/state/studio";
import { cancelMorph, morphAttributes } from "@/lib/svg-morph";

function useMorph<T extends SVGElement>(
  ref: RefObject<T | null>,
  attributes: Record<string, string | number>,
) {
  const reduced = useReducedMotion(),
    instant = useAtomValue(instantDrawingAtom);
  useLayoutEffect(() => {
    const element = ref.current!;
    morphAttributes(element, attributes, !!reduced || instant);
    return () => cancelMorph(element);
  }, [ref, attributes, reduced, instant]);
  return !!reduced || instant;
}
export function MorphPath({
  d,
  transform = "",
  strokeWidth,
  ...props
}: Omit<ComponentProps<typeof m.path>, "d" | "transform" | "strokeWidth"> & {
  d: string;
  transform?: string;
  strokeWidth?: number;
}) {
  const ref = useRef<SVGPathElement>(null),
    [initial] = useState({ d, transform, strokeWidth });
  const attributes = useMemo(
    () => ({
      d,
      transform,
      ...(strokeWidth === undefined ? {} : { "stroke-width": strokeWidth }),
    }),
    [d, transform, strokeWidth],
  );
  const instant = useMorph(ref, attributes);
  return (
    <m.path
      {...props}
      ref={ref}
      d={initial.d}
      transform={initial.transform}
      strokeWidth={initial.strokeWidth}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: instant ? 0 : 0.16 }}
    />
  );
}
export function MorphGroup({
  transform,
  ...props
}: Omit<ComponentProps<typeof m.g>, "transform"> & { transform: string }) {
  const ref = useRef<SVGGElement>(null),
    [initial] = useState(transform);
  const attributes = useMemo(() => ({ transform }), [transform]);
  useMorph(ref, attributes);
  return <m.g {...props} ref={ref} transform={initial} />;
}
export function MorphSvg({
  viewBox,
  ...props
}: Omit<ComponentProps<"svg">, "viewBox" | "ref"> & { viewBox: string }) {
  const ref = useRef<SVGSVGElement>(null),
    [initial] = useState(viewBox);
  const attributes = useMemo(() => ({ viewBox }), [viewBox]);
  useMorph(ref, attributes);
  return <svg {...props} ref={ref} viewBox={initial} />;
}
