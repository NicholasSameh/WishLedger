/**
 * pityCalculator.ts
 * -----------------------------------------------------------------------
 * Derives current pity/guarantee state from the raw `pulls` ledger. Pure
 * function over an array, not an incremental updater — cheap enough to
 * recompute on every import, which avoids an entire class of bugs where
 * a cached counter drifts from the source of truth. (Each PullRecord
 * also carries its own `pity` snapshot from import time — this function
 * is what reconstructs *current* state and 50/50 history from scratch,
 * which is what dashboards and re-imports actually need.)
 * -----------------------------------------------------------------------
 */

import type { PullRecord } from "@/db/schema";

export interface DerivedPityState {
  currentPity: number;
  isGuaranteed: boolean;
  fatePoints: number; // weapon banner only; 0 or 1
  totalPulls: number;
  fiveStarCount: number;
  fourStarCount: number;
  lastFiveStarAt: string | null;
  fiftyFiftyWins: number;
  fiftyFiftyLosses: number;
  averagePullsPerFiveStar: number | null;
}

/**
 * @param pulls All pulls for a single (uid, game, bannerCategory),
 *   sorted ascending — sort by `hoyoLogId`, not insertion order.
 * @param rateUpItemIds The item ids considered "the rate-up" for 50/50
 *   bookkeeping. Pass an empty set for standard/beginner banners, or
 *   when you don't have a rate-up list yet (every 5★ is then treated as
 *   a win, which is a reasonable default until that data is wired in).
 */
export function derivePityState(pulls: PullRecord[], rateUpItemIds: Set<string> = new Set()): DerivedPityState {
  let currentPity = 0;
  let isGuaranteed = false;
  let fatePoints = 0;
  let fiveStarCount = 0;
  let fourStarCount = 0;
  let lastFiveStarAt: string | null = null;
  let fiftyFiftyWins = 0;
  let fiftyFiftyLosses = 0;
  let pullsSinceLastFiveStar = 0;
  const gaps: number[] = [];

  for (const pull of pulls) {
    currentPity += 1;
    pullsSinceLastFiveStar += 1;

    if (pull.rank_type === "4") fourStarCount += 1;

    if (pull.rank_type === "5") {
      fiveStarCount += 1;
      lastFiveStarAt = pull.time;
      gaps.push(pullsSinceLastFiveStar);
      pullsSinceLastFiveStar = 0;
      currentPity = 0;

      const isRateUp = rateUpItemIds.size === 0 ? true : rateUpItemIds.has(pull.item_id);

      if (isGuaranteed) {
        isGuaranteed = false;
        fatePoints = 0;
      } else if (isRateUp) {
        fiftyFiftyWins += 1;
      } else {
        fiftyFiftyLosses += 1;
        isGuaranteed = true;
        fatePoints = 1;
      }
    }
  }

  return {
    currentPity,
    isGuaranteed,
    fatePoints,
    totalPulls: pulls.length,
    fiveStarCount,
    fourStarCount,
    lastFiveStarAt,
    fiftyFiftyWins,
    fiftyFiftyLosses,
    averagePullsPerFiveStar: gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
  };
}

export function fiftyFiftyWinRate(state: DerivedPityState): number | null {
  const total = state.fiftyFiftyWins + state.fiftyFiftyLosses;
  return total === 0 ? null : state.fiftyFiftyWins / total;
}
