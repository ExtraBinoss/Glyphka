import type { ReactElement } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ControlHint({
  children,
  label,
}: {
  children: ReactElement;
  label: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}
