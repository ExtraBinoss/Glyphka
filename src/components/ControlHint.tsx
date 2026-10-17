import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ControlHint({
  children,
  label,
  enabled = true,
}: {
  children: ReactElement;
  label: string;
  enabled?: boolean;
}) {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}
