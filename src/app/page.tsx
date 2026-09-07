"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";
import { useAppStore } from "@/store/useAppStore";
import { PityGauge } from "@/components/PityGauge";
import { StatBlock } from "@/components/StatBlock";
import { PageHeader } from "@/components/PageHeader";
import { derivePityState, fiftyFiftyWinRate } from "@/lib/pityCalculator";
import {
  GENSHIN_CHARACTER_CONFIG,
  GENSHIN_WEAPON_CONFIG,
  HSR_CHARACTER_CONFIG,
  HSR_LIGHTCONE_CONFIG,
} from "@/lib/gachaProbability";

export default function OverviewPage() {
  const game = useAppStore((s) => s.game);
  const activeUid = useAppStore((s) => s.activeUid);

  const pulls = useLiveQuery(
    () => (activeUid ? db.pulls.where({ uid: activeUid, game }).sortBy("hoyoLogId") as any : Promise.resolve([])),
    [activeUid, game]
  );

  if (!activeUid) return <div className="text-mist mt-10">No active profile selected.</div>;

 const charPulls = (pulls ?? []).filter((p: any) => p.bannerCategory === "character-event");
const weaponPulls = (pulls ?? []).filter((p: any) => p.bannerCategory === "weapon-event");

const charState = derivePityState(charPulls) as any;
const weaponState = derivePityState(weaponPulls) as any;
const winRate = fiftyFiftyWinRate(charState);

  const charConfig = game === "genshin" ? GENSHIN_CHARACTER_CONFIG : HSR_CHARACTER_CONFIG;
  const weaponConfig = game === "genshin" ? GENSHIN_WEAPON_CONFIG : HSR_LIGHTCONE_CONFIG;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center">
      <div className="w-full">
        <PageHeader
          title="Overview"
          subtitle={`${game === "genshin" ? "Genshin Impact" : "Honkai: Star Rail"} · UID ${activeUid}`}
        />
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-12 mb-14 place-items-center w-full">
        <PityGauge {...({
          currentPity: charState?.currentPity || 0,
          hardPity: charConfig.hardPity,
          softPityStart: charConfig.softPityStart,
          isGuaranteed: charState?.isGuaranteed || false,
          label: game === "genshin" ? "Character Event Wish" : "Character Warp"
        } as any)} />

        <PityGauge {...({
          currentPity: weaponState?.currentPity || 0,
          hardPity: weaponConfig.hardPity,
          softPityStart: weaponConfig.softPityStart,
          isGuaranteed: weaponState?.isGuaranteed || false,
          label: game === "genshin" ? "Weapon Banner" : "Light Cone Warp"
        } as any)} />
      </section>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
        <StatBlock value={winRate !== null ? `${Math.round(winRate * 100)}%` : "—"} label="50/50 win rate" accent="gold" />
        <StatBlock
          value={charState.averagePullsPerFiveStar ? charState.averagePullsPerFiveStar.toFixed(1) : "—"}
          label="Avg. pulls / 5★"
          accent="amethyst"
        />
        <StatBlock value={String(charState.fiveStarCount + weaponState.fiveStarCount)} label="Lifetime 5★" accent="teal" />
        <StatBlock value={String((pulls ?? []).length)} label="Lifetime pulls" />
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="max-w-lg mt-24 flex flex-col items-center text-center">
      <h1 className="font-display text-3xl font-medium not-italic text-parchment mb-3">No wishes recorded yet</h1>
      <p className="text-mist leading-relaxed mb-6">
        Import your wish or warp history to see your pity, 50/50 win rate, and pull averages here — or head
        straight to the calculator to work out probabilities without importing anything.
      </p>
      <div className="flex gap-3">
        <Link href="/import" className="rounded-sm bg-gold text-ink px-4 py-2 text-sm font-medium">
          Import history
        </Link>
        <Link href="/calculator" className="rounded-sm border border-panelLine px-4 py-2 text-sm text-parchment">
          Open calculator
        </Link>
      </div>
    </div>
  );
}
