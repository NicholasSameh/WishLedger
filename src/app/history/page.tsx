"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/schema";
import { useAppStore } from "@/store/useAppStore";
import { PageHeader } from "@/components/PageHeader";

const RARITY_COLOR: Record<string, string> = {
  "5": "text-gold",
  "4": "text-amethyst",
  "3": "text-mist",
};

export default function HistoryPage() {
  const game = useAppStore((s) => s.game);
  const activeUid = useAppStore((s) => s.activeUid);
  const [minRarity, setMinRarity] = useState<"3" | "4" | "5">("3");

  const pulls = useLiveQuery(
    () => (activeUid ? db.pulls.where({ uid: activeUid, game }).reverse().sortBy("hoyoLogId") : Promise.resolve([])),
    [activeUid, game]
  );

  const filtered = (pulls ?? []).filter((p) => Number(p.rank_type) >= Number(minRarity));

  return (
    <div className="w-full max-w-3xl">
      <div className="flex items-end justify-between mb-8">
        <PageHeader title="History" subtitle={`${filtered.length} pulls shown`} />
        <div className="flex rounded-md border border-panelLine p-1 h-fit">
          {(["3", "4", "5"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setMinRarity(r)}
              className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
                minRarity === r ? "bg-gold text-ink font-medium" : "text-mist hover:text-parchment"
              }`}
            >
              {r}★+
            </button>
          ))}
        </div>
      </div>

      {!activeUid ? (
        <p className="text-mist">Import your history first — see the Import tab.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-panelLine text-left text-mist">
              <th className="py-2 font-normal">Item</th>
              <th className="py-2 font-normal">Banner</th>
              <th className="py-2 font-normal">Pity</th>
              <th className="py-2 font-normal">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-panelLine/60">
                <td className={`py-2 ${RARITY_COLOR[p.rank_type]}`}>{p.name}</td>
                <td className="py-2 text-mist capitalize">{p.bannerCategory.replace("-", " ")}</td>
                <td className="py-2 text-mist">{p.pity}</td>
                <td className="py-2 text-mist">{new Date(p.time).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
