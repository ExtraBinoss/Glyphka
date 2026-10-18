import type { ReactNode } from "react";
import { useCallback, useId, useState, useSyncExternalStore } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "./ui/drawer";
import { m } from "motion/react";
import { Button } from "./ui/button";
import "../styles/properties-sheet.css";

const MotionButton = m.create(Button);

function useMobile(breakpoint: number) {
  const query = `(max-width: ${breakpoint}px)`;
  const subscribe = useCallback(
    (notify: () => void) => {
      const media = matchMedia(query);
      media.addEventListener("change", notify);
      return () => media.removeEventListener("change", notify);
    },
    [query],
  );
  const snapshot = useCallback(() => matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

export function ResponsiveInspector({
  children,
  open: controlledOpen,
  onOpenChange,
  title,
  closeLabel,
  triggerLabel = title,
  breakpoint = 760,
}: {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  closeLabel: string;
  triggerLabel?: string;
  breakpoint?: number;
}) {
  const mobile = useMobile(breakpoint);
  const dialogId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );
  if (!mobile) return children;
  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      showSwipeHandle
      swipeDirection="down"
    >
      <div className="mobile-inspector-dock">
        <MotionButton
          variant="outline"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          whileTap={{ scale: 0.97 }}
          onTap={(event) => {
            if ("pointerType" in event && event.pointerType === "touch")
              setOpen(true);
          }}
          onClick={() => setOpen(true)}
          className="mobile-inspector-trigger"
          data-properties-trigger=""
          aria-label={title}
        >
          <span>
            <SlidersHorizontal aria-hidden="true" />
            {triggerLabel}
          </span>
        </MotionButton>
      </div>
      <DrawerContent
        id={dialogId}
        keepMounted
        className="properties-sheet"
        handleLabel={closeLabel}
        finalFocus={() =>
          document.querySelector<HTMLElement>("[data-properties-trigger]")
        }
      >
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        {children}
      </DrawerContent>
    </Drawer>
  );
}
