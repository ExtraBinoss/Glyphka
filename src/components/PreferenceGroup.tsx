import { m } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import s from "../styles/preferences.module.css";

type Option = {
  value: string;
  label: string;
  ariaLabel?: string;
  lang?: string;
  Icon?: LucideIcon;
};
export function PreferenceGroup({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
}) {
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  return (
    <ToggleGroup
      aria-label={label}
      value={[value]}
      onValueChange={(values) => {
        if (values[0]) onChange(values[0]);
      }}
      spacing={0}
      className={s.group}
      style={{ "--segments": options.length } as React.CSSProperties}
    >
      <m.span
        data-slot="segmented-indicator"
        aria-hidden
        className={s.indicator}
        initial={false}
        animate={{ x: `${selected * 100}%` }}
        transition={{ type: "spring", stiffness: 500, damping: 38, mass: 0.7 }}
      />
      {options.map(({ value: choice, label, ariaLabel, lang, Icon }) => (
        <ToggleGroupItem
          key={choice}
          value={choice}
          lang={lang}
          aria-label={ariaLabel ?? label}
        >
          {Icon && <Icon size={14} aria-hidden />}
          <span>{label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
