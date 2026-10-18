import { useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { selectAtom } from "jotai/utils";
import { useTranslation } from "react-i18next";
import { LIMITS, PRESETS, type Design, type GeometryKey } from "@/engine/model";
import {
  inspectorDesignAtom,
  previewGeometryAtom,
  commitGeometryAtom,
} from "@/state/studio";
import { RangeField } from "./RangeField";

export function GeometryField({
  field,
  family,
}: {
  field: GeometryKey;
  family: Design["family"];
}) {
  const { t } = useTranslation();
  const valueAtom = useMemo(
    () => selectAtom(inspectorDesignAtom, (design) => design[field]),
    [field],
  );
  const value = useAtomValue(valueAtom);
  const preview = useSetAtom(previewGeometryAtom),
    commit = useSetAtom(commitGeometryAtom);
  return (
    <RangeField
      label={t(field)}
      value={value}
      min={LIMITS[field][0]}
      max={LIMITS[field][1]}
      initial={PRESETS[family][field] as number}
      unit={
        field === "slant"
          ? "°"
          : field === "roundness" || field === "cutouts"
            ? "%"
            : ""
      }
      onChange={(value) => preview({ [field]: value })}
      onCommit={commit}
    />
  );
}
