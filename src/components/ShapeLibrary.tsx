import { useMemo, useState } from "react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Dice5 } from "lucide-react";
import { SHAPE_KINDS, type Shape } from "@/engine/model";
import { generateShapeCandidates } from "@/engine/generate";
import { shapePath } from "@/engine/geometry";
import { Button } from "./ui/button";
import { PopoverTitle } from "./ui/popover";
import { ControlHint } from "./ControlHint";
import { PreferenceGroup } from "./PreferenceGroup";
import { ScrollShadow } from "./ScrollShadow";

export function ShapeLibrary({
  seed: initialSeed,
  weight,
  onAdd,
}: {
  seed: number;
  weight: number;
  onAdd: (shape: Shape) => void;
}) {
  const { t } = useTranslation();
  const [seed, setSeed] = useState(initialSeed);
  const [tab, setTab] = useState("generated");
  const [roll, setRoll] = useState(0);
  const candidates = useMemo(() => generateShapeCandidates(seed), [seed]);
  const basics = useMemo(
    () =>
      SHAPE_KINDS.map((kind): Shape => ({
        id: kind,
        kind,
        x: 300,
        y: 220,
        width: kind === "capsule" ? 140 : 100,
        height: kind === "capsule" ? 38 : 100,
        rotation: 0,
        cutout: false,
      })),
    [],
  );
  const refresh = () => {
    setTab("generated");
    setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);
    setRoll((value) => value + 1);
  };
  return (
    <>
      <div className="shape-library-heading">
        <PopoverTitle>{t("addShape")}</PopoverTitle>
        <ControlHint label={t("newVariants")}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("newVariants")}
            onClick={refresh}
          >
            <m.span
              animate={{ rotate: roll * 180 }}
              transition={{ duration: 0.25 }}
            >
              <Dice5 />
            </m.span>
          </Button>
        </ControlHint>
      </div>
      <div className="shape-library-tabs">
        <PreferenceGroup
          label={t("shapes")}
          value={tab}
          onChange={setTab}
          options={[
            { value: "generated", label: t("procedural") },
            { value: "basic", label: t("basicShapes") },
          ]}
        />
      </div>
      <ScrollShadow className="shape-grid" label={t("shapes")}>
        {(tab === "generated" ? candidates : basics).map((shape, index) => (
          <Button
            key={shape.id}
            variant="ghost"
            data-shape-candidate={shape.id}
            aria-label={`${t(shape.kind)}${tab === "generated" ? ` · ${index + 1}` : ""}`}
            onClick={() => onAdd(shape)}
          >
            <svg
              viewBox={
                tab === "generated" ? "-145 -145 290 290" : "-90 -90 180 180"
              }
              aria-hidden="true"
            >
              <path
                d={shapePath(shape, weight)}
                fill="currentColor"
                fillRule="evenodd"
              />
            </svg>
            <span>{t(shape.kind)}</span>
          </Button>
        ))}
      </ScrollShadow>
      <Button
        variant="secondary"
        className="generate-shape"
        onClick={() => {
          onAdd(candidates[0]);
          refresh();
        }}
      >
        <Dice5 />
        {t("addGenerated")}
      </Button>
    </>
  );
}
