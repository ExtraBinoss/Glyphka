import { useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import { beginInspectorPeek } from "@/lib/inspector-peek";
import { beginGestureAtom, endGestureAtom } from "@/state/studio";

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  initial,
  onChange,
  onCommit,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  initial?: number;
  onChange: (v: number) => void;
  onCommit?: () => void;
  disabled?: boolean;
}) {
  const field = useRef<HTMLDivElement>(null);
  const disposePeek = useRef<(() => void) | undefined>(undefined);
  useEffect(() => () => disposePeek.current?.(), []);
  const [draft, setDraft] = useState<string | null>(null);
  const { t } = useTranslation();
  const begin = useSetAtom(beginGestureAtom),
    end = useSetAtom(endGestureAtom);
  const commit = () => {
    if (draft !== null) {
      const n = Number(draft.replace(",", "."));
      if (draft.trim() && Number.isFinite(n))
        onChange(Math.min(max, Math.max(min, Math.round(n / step) * step)));
      setDraft(null);
    }
  };
  return (
    <div
      ref={field}
      className="range-field"
      data-disabled={disabled || undefined}
    >
      <div className="range-heading">
        <label htmlFor={`value-${label}`}>{label}</label>
        <div className="range-value">
          {initial !== undefined && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="range-reset"
              aria-label={`${label} · ${t("reset")}`}
              disabled={disabled}
              onClick={() => {
                onChange(initial);
                onCommit?.();
              }}
            >
              <RotateCcw />
            </Button>
          )}
          <InputGroup className="range-input">
            <InputGroupInput
              id={`value-${label}`}
              aria-label={`${label} · ${t("value")}`}
              inputMode="decimal"
              disabled={disabled}
              value={draft ?? String(Math.round(value * 100) / 100)}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => begin()}
              onBlur={() => {
                commit();
                onCommit?.();
                end();
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setDraft(null);
                  e.currentTarget.blur();
                }
              }}
            />
            {unit && (
              <InputGroupAddon align="inline-end">
                <InputGroupText>{unit}</InputGroupText>
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-label={label}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        onPointerDownCapture={(event) => {
          begin();
          if (!disabled && field.current)
            disposePeek.current = beginInspectorPeek(
              field.current,
              event.pointerId,
            );
        }}
        onValueCommitted={() => {
          onCommit?.();
          end();
        }}
        onKeyDownCapture={() => begin()}
        onKeyUpCapture={() => {
          onCommit?.();
          end();
        }}
      />
    </div>
  );
}
