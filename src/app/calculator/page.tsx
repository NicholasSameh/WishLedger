"use client";

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { BannerSelector } from "@/components/BannerSelector";
import { ProbabilityChart } from "@/components/ProbabilityChart";
import { StatBlock } from "@/components/StatBlock";
import { PageHeader } from "@/components/PageHeader";
import { SlideSwitch } from "@/components/SlideSwitch";
import { NumberInput } from "@/components/NumberInput";
import {
  GENSHIN_CHARACTER_CONFIG,
  GENSHIN_WEAPON_CONFIG,
  HSR_CHARACTER_CONFIG,
  HSR_LIGHTCONE_CONFIG,
  characterBannerCDF,
  weaponBannerCDF,
  lightConeBannerCDF,
  multiCopyCDF,
  summarizeCDF,
  getMilestones,
} from "@/lib/gachaProbability";
import type { GameId } from "@/db/schema";

// Currency slot config per game — slot A is always ÷160, slot B is
// always 1:1, slot C's divisor is the one thing that differs by game.
const CURRENCY_CONFIG: Record<GameId, { key: "a" | "b" | "c"; label: string; divisor: number }[]> = {
  genshin: [
    { key: "a", label: "Primogems", divisor: 160 },
    { key: "b", label: "Intertwined Fates", divisor: 1 },
    { key: "c", label: "Masterless Starglitter", divisor: 5 },
  ],
  hsr: [
    { key: "a", label: "Stellar Jades", divisor: 160 },
    { key: "b", label: "Star Rail Special Passes", divisor: 1 },
    { key: "c", label: "Undying Starlight", divisor: 20 },
  ],
};

export default function CalculatorPage() {
  const game = useAppStore((s) => s.game);
  const calc = useAppStore((s) => s.calculator);
  const setInput = useAppStore((s) => s.setCalculatorInput);
  const setCurrencyInput = useAppStore((s) => s.setCurrencyInput);

  const isWeaponBanner = calc.bannerCategory === "weapon-event";
  const config = isWeaponBanner
    ? game === "genshin"
      ? GENSHIN_WEAPON_CONFIG
      : HSR_LIGHTCONE_CONFIG
    : game === "genshin"
    ? GENSHIN_CHARACTER_CONFIG
    : HSR_CHARACTER_CONFIG;

  // ---- Currency split -> total pulls -----------------------------------
  const currencySlots = CURRENCY_CONFIG[game];
  const currencyDerivedPulls = useMemo(
    () => currencySlots.reduce((sum, slot) => sum + Math.floor(calc.currencyInputs[slot.key] / slot.divisor), 0),
    [currencySlots, calc.currencyInputs]
  );

  // Only push the derived total into pullBudget while in "currency" mode,
  // so switching to "manual" and typing a number doesn't get clobbered.
  // Always derive pull budget from the currency inputs
  useEffect(() => {
    setInput("pullBudget", Math.max(currencyDerivedPulls, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyDerivedPulls]);

  // ---- Probability engine -----------------------------------------------
  const { cdf, stats } = useMemo(() => {
    const singleCopyCdf = isWeaponBanner
      ? game === "hsr"
        ? lightConeBannerCDF(calc.currentPity, calc.isGuaranteed, calc.pullBudget)
        : weaponBannerCDF(calc.currentPity, calc.isGuaranteed, calc.pullBudget)
      : characterBannerCDF(calc.currentPity, calc.isGuaranteed, calc.pullBudget, config);

    const finalCdf = calc.copiesWanted > 1 ? multiCopyCDF(singleCopyCdf, calc.copiesWanted, calc.pullBudget) : singleCopyCdf;
    return { cdf: finalCdf, stats: summarizeCDF(finalCdf) };
  }, [game, isWeaponBanner, calc.currentPity, calc.isGuaranteed, calc.pullBudget, calc.copiesWanted, config]);

  const milestones = useMemo(() => getMilestones(cdf), [cdf]);

  const maxCopies = isWeaponBanner ? 5 : 7;
  const copyLabel = isWeaponBanner ? "R" : "C";

  return (
    <div className="w-full max-w-3xl">
      <PageHeader
        title="Calculator"
        subtitle="Exact probabilities from a dynamic-programming model of the soft-pity curve — not flat percentages."
      />

      <div className="mb-8">
        <BannerSelector game={game} value={calc.bannerCategory} onChange={(v) => setInput("bannerCategory", v)} />
      </div>

      <SlideSwitch activeKey={calc.bannerCategory} order={["character-event", "weapon-event"]}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6 mb-10">
          <Field label={`Current pity (0–${config.hardPity})`}>
            <NumberInput
              value={calc.currentPity}
              min={0}
              max={config.hardPity - 1}
              onCommit={(v) => setInput("currentPity", v)}
              className="w-full bg-panel border border-panelLine rounded-sm px-3 py-2 text-parchment"
            />
          </Field>

          <Field label="Guarantee status">
            <div className="flex rounded-md border border-panelLine p-1">
              {[false, true].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setInput("isGuaranteed", v)}
                  className={`flex-1 rounded-sm py-1.5 text-sm transition-colors ${
                    calc.isGuaranteed === v ? "bg-gold text-ink font-medium" : "text-mist hover:text-parchment"
                  }`}
                >
                  {v ? "Guaranteed" : "50/50"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Target">
            <select
              value={calc.copiesWanted}
              onChange={(e) => setInput("copiesWanted", Number(e.target.value))}
              className="w-full bg-panel border border-panelLine rounded-sm px-3 py-2 text-parchment"
            >
              {Array.from({ length: maxCopies }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? (isWeaponBanner ? "R1 (base)" : "C0 (base)") : `${copyLabel}${n - 1}`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </SlideSwitch>

      {/* ---- Pull budget: currency split or manual override ---- */}
      {/* ---- Pull budget ---- */}
      <div className="mb-10 border-t border-panelLine pt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-mist">Pull budget</span>
        </div>

        <div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {currencySlots.map((slot) => (
              <Field key={slot.key} label={slot.divisor === 1 ? slot.label : `${slot.label} (÷${slot.divisor})`}>
                <NumberInput
                  value={calc.currencyInputs[slot.key]}
                  min={0}
                  onCommit={(v) => setCurrencyInput(slot.key, v)}
                  className="w-full bg-panel border border-panelLine rounded-sm px-3 py-2 text-parchment"
                />
              </Field>
            ))}
          </div>
          <p className="text-sm text-mist">
            <span className="text-gold font-medium">{currencyDerivedPulls}</span> pulls total
          </p>
        </div>
      </div>

      <div className="mb-8 -mx-2 w-full">
        <ProbabilityChart cdf={cdf} medianPulls={stats.medianPulls} pullBudget={calc.pullBudget} />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <StatBlock value={String(stats.medianPulls)} label="Median pulls needed" accent="gold" />
        <StatBlock value={stats.averagePulls.toFixed(1)} label="Expected pulls" accent="amethyst" />
        <StatBlock
          value={`${Math.round(stats.probAtBudget(calc.pullBudget) * 100)}%`}
          label={`Chance within ${calc.pullBudget} pulls`}
          accent="teal"
        />
      </div>

      <div className="border-t border-panelLine pt-6">
        <p className="text-sm text-mist mb-4">Milestone odds</p>
        <div className="grid grid-cols-5 gap-3">
          {milestones.map((m) => (
            <div key={m.probability} className="text-center border-l-2 border-panelLine pl-2">
              <div className="font-display text-lg text-parchment">
                {m.reached ? m.pulls : `${m.pulls}+`}
              </div>
              <div className="text-xs text-mist mt-0.5">{Math.round(m.probability * 100)}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-mist mb-1.5">{label}</span>
      {children}
    </label>
  );
}
