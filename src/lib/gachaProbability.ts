/**
 * gachaProbability.ts
 * -----------------------------------------------------------------------
 * Exact (non-Monte-Carlo) probability engine for Genshin Impact / HSR
 * character banners, built with dynamic programming rather than flat
 * percentages.
 *
 * Core idea: the per-pull 5-star chance is NOT constant. It's ~0.6%
 * ("base rate") until soft pity kicks in, then rises quickly to a
 * guaranteed 100% at hard pity. We build the exact discrete probability
 * mass function (PMF) for "how many pulls until the next 5-star" by
 * multiplying survival probabilities pull-by-pull (this is just a
 * time-inhomogeneous geometric distribution — each pull is a Bernoulli
 * trial whose success probability depends on the current pity counter).
 *
 * On top of that we layer the 50/50 "guarantee" mechanic as a two-state
 * Markov chain (not-guaranteed -> guaranteed) and convolve the two
 * possible cycles to get the true CDF for landing the *rate-up* character
 * specifically (E0/C0), not just any 5-star.
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// Banner configs
// ---------------------------------------------------------------------

export interface PityConfig {
  /** Flat probability per pull below soft pity, e.g. 0.006 for 0.6%. */
  baseRate: number;
  /** First pull number (1-indexed within the pity cycle) where the rate
   * starts climbing above baseRate. */
  softPityStart: number;
  /** Pull number at which probability is forced to 100%. */
  hardPity: number;
  /** Additive increase in probability per pull once soft pity begins. */
  softPityStep: number;
}

/** Character Event Wish — exactly as specified: 0.6% base, soft pity
 *  starts at pull 74, +6%/pull, 100% at pull 90. */
export const GENSHIN_CHARACTER_CONFIG: PityConfig = {
  baseRate: 0.006,
  softPityStart: 74,
  hardPity: 90,
  softPityStep: 0.06,
};

/** Weapon Banner (Epitomized Path). HoYoverse doesn't publish the exact
 *  per-pull slope the way they conceptually do for character banners, so
 *  the step below is a heuristic that lands at 100% by hard pity — treat
 *  softPityStep as the one field worth re-tuning against current-patch
 *  community data if you need pull-exact (not just CDF-exact) accuracy. */
export const GENSHIN_WEAPON_CONFIG: PityConfig = {
  baseRate: 0.007,
  softPityStart: 63,
  hardPity: 80,
  softPityStep: (1 - 0.007) / (80 - 63),
};

/** HSR Character Warp — identical shape to Genshin's character banner. */
export const HSR_CHARACTER_CONFIG: PityConfig = { ...GENSHIN_CHARACTER_CONFIG };

/** HSR Light Cone Warp — 0.8% base, soft pity from pull 65, 75/25 (not
 *  50/50) rate-up split, handled separately via `winRate` below. */
export const HSR_LIGHTCONE_CONFIG: PityConfig = {
  baseRate: 0.008,
  softPityStart: 65,
  hardPity: 80,
  softPityStep: (1 - 0.008) / (80 - 65),
};

// ---------------------------------------------------------------------
// Step 1: per-pull 5-star rate at a given position in the pity cycle
// ---------------------------------------------------------------------

/**
 * @param pullInCycle 1-indexed pull number since the last 5-star (i.e.
 *   currentPity + 1 for the very next pull).
 */
export function fiveStarRateAtPull(pullInCycle: number, config: PityConfig): number {
  if (pullInCycle >= config.hardPity) return 1;
  if (pullInCycle < config.softPityStart) return config.baseRate;

  const stepsIntoSoftPity = pullInCycle - config.softPityStart + 1;
  const rate = config.baseRate + config.softPityStep * stepsIntoSoftPity;
  return Math.min(rate, 1);
}

// ---------------------------------------------------------------------
// Step 2: DP — PMF/CDF of "pulls until the next 5-star", from a given
// starting pity, via the standard survival-function construction:
//   P(first 5* at pull k | start pity p) = rate(p+k) * PROD_{j<k}(1 - rate(p+j))
// ---------------------------------------------------------------------

export function getFiveStarPMF(
  startingPity: number,
  maxAdditionalPulls: number,
  config: PityConfig
): number[] {
  const pmf: number[] = [];
  let survival = 1; // P(no 5-star in the additional pulls so far)

  for (let k = 1; k <= maxAdditionalPulls; k++) {
    const pullInCycle = Math.min(startingPity + k, config.hardPity);
    const rate = fiveStarRateAtPull(pullInCycle, config);
    const p = survival * rate;
    pmf.push(p);
    survival *= 1 - rate;

    if (pullInCycle >= config.hardPity) break; // guaranteed, nothing left to accumulate
  }
  return pmf;
}

function cumulativeSum(arr: number[]): number[] {
  const out: number[] = new Array(arr.length);
  let running = 0;
  for (let i = 0; i < arr.length; i++) {
    running += arr[i];
    out[i] = running;
  }
  return out;
}

// ---------------------------------------------------------------------
// Step 3: fold in the guarantee mechanic (50/50, or 75/25 for HSR light
// cones) as a two-cycle Markov chain, and convolve to get the CDF for
// obtaining the *target* rate-up character specifically.
// ---------------------------------------------------------------------

/**
 * Returns successProb[n] = P(you own the target E0/C0 rate-up unit
 * within your next n pulls), for n = 1..maxPulls.
 *
 * Model:
 *  - If already guaranteed, the first 5-star you pull IS the target
 *    (rate-up loss carries the guarantee flag forward from a prior loss).
 *  - If not guaranteed, the first 5-star wins the rate-up with
 *    probability `winRate` (0.5 for standard 50/50, 0.75 for HSR light
 *    cones). On a loss, pity resets to 0 and the *next* 5-star is
 *    guaranteed — so we convolve pmf(startingPity) with the CDF of a
 *    fresh cycle at pity 0, guaranteed=true.
 */
export function characterBannerCDF(
  startingPity: number,
  isGuaranteed: boolean,
  maxPulls: number,
  config: PityConfig = GENSHIN_CHARACTER_CONFIG,
  winRate: number = 0.5
): number[] {
  const pmfFromStart = getFiveStarPMF(startingPity, maxPulls, config);
  const successProb = new Array(maxPulls + 1).fill(0);

  if (isGuaranteed) {
    const cdf = cumulativeSum(pmfFromStart);
    for (let n = 1; n <= maxPulls; n++) {
      successProb[n] = cdf[n - 1] ?? cdf[cdf.length - 1] ?? 0;
    }
    return successProb;
  }

  // Fresh-cycle PMF/CDF, reused for every possible "lost the 50/50" branch.
  const pmfFresh = getFiveStarPMF(0, maxPulls, config);
  const cdfFresh = cumulativeSum(pmfFresh);
  const cdfFreshAt = (remaining: number) =>
    remaining <= 0 ? 0 : cdfFresh[Math.min(remaining, cdfFresh.length) - 1] ?? cdfFresh[cdfFresh.length - 1] ?? 0;

  for (let n = 1; n <= maxPulls; n++) {
    let total = 0;
    for (let k = 1; k <= n; k++) {
      const pFirstFiveStarAtK = pmfFromStart[k - 1];
      if (!pFirstFiveStarAtK) continue;

      const remainingPulls = n - k;
      const pWinsGuaranteedCycle = cdfFreshAt(remainingPulls);

      // P(target by pull n | first 5* at k)
      //   = P(win the 50/50) * 1
      //   + P(lose the 50/50) * P(win the guaranteed cycle within remaining pulls)
      total += pFirstFiveStarAtK * (winRate + (1 - winRate) * pWinsGuaranteedCycle);
    }
    successProb[n] = total;
  }
  return successProb;
}

// ---------------------------------------------------------------------
// Convenience: single-number summary stats off a CDF
// ---------------------------------------------------------------------

export interface PullStats {
  /** Smallest n such that P(success by pull n) >= 0.5. */
  medianPulls: number;
  /** E[pulls to success], computed from the CDF (capped at maxPulls,
   *  i.e. treats "still hasn't happened" as happening exactly at maxPulls
   *  — flag this to the user if cdf[maxPulls] is meaningfully < 1). */
  averagePulls: number;
  /** P(success) at the pull budget the user actually has. */
  probAtBudget: (budget: number) => number;
}

export function summarizeCDF(cdf: number[]): PullStats {
  const maxPulls = cdf.length - 1;
  let medianPulls = maxPulls;
  for (let n = 1; n <= maxPulls; n++) {
    if (cdf[n] >= 0.5) {
      medianPulls = n;
      break;
    }
  }

  // E[N] = sum_{n=0}^{max-1} P(N > n)  (standard tail-sum expectation formula)
  let averagePulls = 0;
  for (let n = 0; n < maxPulls; n++) {
    averagePulls += 1 - cdf[n];
  }

  return {
    medianPulls,
    averagePulls,
    probAtBudget: (budget: number) => cdf[Math.min(budget, maxPulls)] ?? 0,
  };
}

// ---------------------------------------------------------------------
// Named wrappers per banner type. The weapon banner's Epitomized Path
// (as of the "max 1 Fate Point for guarantee" rule) is mechanically the
// same shape as the 50/50: first 5-star weapon has a 50% chance of being
// your chosen path, and a miss guarantees the next one. HSR light cones
// use the same shape with a 75/25 split instead of 50/50. So all three
// banner types reduce to the same `pityGuaranteeCDF` core — only the
// config and winRate differ.
// ---------------------------------------------------------------------

export const pityGuaranteeCDF = characterBannerCDF;

export function weaponBannerCDF(
  startingPity: number,
  hasFatePoint: boolean,
  maxPulls: number
): number[] {
  return pityGuaranteeCDF(startingPity, hasFatePoint, maxPulls, GENSHIN_WEAPON_CONFIG, 0.5);
}

export function lightConeBannerCDF(
  startingPity: number,
  isGuaranteed: boolean,
  maxPulls: number
): number[] {
  return pityGuaranteeCDF(startingPity, isGuaranteed, maxPulls, HSR_LIGHTCONE_CONFIG, 0.75);
}

// ---------------------------------------------------------------------
// Multi-copy targets (C1–C6, S1, superimpositions, etc.)
//
// Once you own copy #1, chasing copy #2 is an independent process that
// starts fresh at pity 0, not-guaranteed — owning a character doesn't
// change future pity. So P(own N copies within X pulls) is the N-fold
// convolution of the single-copy PMF with itself. We derive the PMF from
// a CDF (via first differences) so this composes with any of the CDF
// functions above.
// ---------------------------------------------------------------------

function pmfFromCDF(cdf: number[]): number[] {
  const pmf = new Array(cdf.length).fill(0);
  for (let n = 1; n < cdf.length; n++) {
    pmf[n] = cdf[n] - cdf[n - 1];
  }
  return pmf;
}

function convolvePMF(a: number[], b: number[], maxLen: number): number[] {
  const out = new Array(Math.min(a.length + b.length - 1, maxLen + 1)).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    for (let j = 0; j < b.length && i + j < out.length; j++) {
      out[i + j] += a[i] * b[j];
    }
  }
  return out;
}

/**
 * P(own `copies` total copies within n pulls), for n = 0..maxPulls.
 * `copies` = 1 means E0/C0/S1 (identical to the single-copy CDF passed in).
 */
export function multiCopyCDF(singleCopyCDF: number[], copies: number, maxPulls: number): number[] {
  if (copies <= 1) return singleCopyCDF.slice(0, maxPulls + 1);

  const singlePMF = pmfFromCDF(singleCopyCDF);
  let combinedPMF = singlePMF;
  for (let c = 1; c < copies; c++) {
    combinedPMF = convolvePMF(combinedPMF, singlePMF, maxPulls);
  }
  return cumulativeSum(combinedPMF).slice(0, maxPulls + 1);
}

// ---------------------------------------------------------------------
// Milestone odds — "how many pulls for a 25% / 50% / 75% / 90% / 99%
// chance", the standard way these calculators summarize a whole CDF as
// a handful of numbers instead of a full curve.
// ---------------------------------------------------------------------

export interface Milestone {
  probability: number; // 0.25, 0.5, 0.75, 0.9, 0.99
  pulls: number; // smallest n such that cdf[n] >= probability
  reached: boolean; // false if the CDF never reaches this probability within its own length
}

const DEFAULT_MILESTONE_PROBS = [0.25, 0.5, 0.75, 0.9, 0.99];

export function getMilestones(cdf: number[], probabilities: number[] = DEFAULT_MILESTONE_PROBS): Milestone[] {
  return probabilities.map((target) => {
    for (let n = 0; n < cdf.length; n++) {
      if (cdf[n] >= target) {
        return { probability: target, pulls: n, reached: true };
      }
    }
    return { probability: target, pulls: cdf.length - 1, reached: false };
  });
}

// ---------------------------------------------------------------------
// Example usage — computing P(get E0/C0) for a player at pity 60,
// not guaranteed, budgeting up to 180 pulls (two hard-pity cycles):
//
//   const cdf = characterBannerCDF(60, false, 180, GENSHIN_CHARACTER_CONFIG);
//   const stats = summarizeCDF(cdf);
//   // stats.medianPulls, stats.averagePulls, stats.probAtBudget(90)
//
// Chasing C6 from scratch:
//   const c0Cdf = characterBannerCDF(0, false, 900, GENSHIN_CHARACTER_CONFIG);
//   const c6Cdf = multiCopyCDF(c0Cdf, 7, 900);
// ---------------------------------------------------------------------
