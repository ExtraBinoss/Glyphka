import { useState } from "react";
import { useSetAtom } from "jotai";
import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  initial?: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
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
    <div className="range-field">
      <div className="range-heading">
        <label htmlFor={`value-${label}`}>{label}</label>
        <div className="range-value">
          {initial !== undefined && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="range-reset"
              aria-label={`${label} · reset`}
              title={`${label} · reset`}
              onClick={() => onChange(initial)}
            >
              <RotateCcw />
            </Button>
          )}
          <Input
            id={`value-${label}`}
            aria-label={`${label} · value`}
            inputMode="decimal"
            value={draft ?? String(Math.round(value * 100) / 100)}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => begin()}
            onBlur={() => {
              commit();
              end();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(null);
                e.currentTarget.blur();
              }
            }}
          />
          {unit && <span>{unit}</span>}
        </div>
      </div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        onPointerDownCapture={() => begin()}
        onValueCommitted={() => end()}
        onKeyDownCapture={() => begin()}
        onKeyUpCapture={() => end()}
      />
    </div>
  );
}
