# WishLedger

Local-first pull tracker and pity calculator for Genshin Impact and
Honkai: Star Rail. One Next.js codebase, three shells:

- **Web / PWA** — the Next.js app itself, installable from the browser.
- **Desktop (Windows/macOS/Linux)** — the same static export wrapped in
  [Tauri](https://tauri.app).
- **iOS / Android** — the same static export wrapped in
  [Capacitor](https://capacitorjs.com).

No backend, no accounts. Wish/warp history lives in IndexedDB (via
[Dexie](https://dexie.org)) on the device itself.

## Stack

| Concern | Choice | Why |
|---|---|---|
| UI framework | Next.js 14 (App Router) | one codebase → web, and a static export both Tauri and Capacitor can embed |
| State | Zustand | trivial boilerplate for the small amount of cross-page state (selected game, calculator inputs) |
| Local storage | Dexie.js over IndexedDB | structured queries and reactive `useLiveQuery` hooks, no server |
| Desktop shell | Tauri | far smaller binaries than Electron; Rust shell can call HoYoverse directly without a CORS proxy |
| Mobile shell | Capacitor | wraps a static web build as a native iOS/Android app with minimal native code |
| Probability engine | Hand-written DP (`src/lib/gachaProbability.ts`) | exact soft-pity CDFs, not Monte-Carlo or flat percentages |

## Getting started (web)

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Building for desktop (Tauri)

Requires [Rust](https://www.rust-lang.org/tools/install) installed locally.

```bash
npm install
npx tauri dev     # dev build with hot reload
npx tauri build   # produces a native installer in src-tauri/target/release/bundle
```

## Building for mobile (Capacitor)

Requires Xcode (iOS) and/or Android Studio (Android) installed locally.

```bash
npm install
BUILD_TARGET=native npm run build   # static export → ./out
npx cap sync
npx cap open ios       # or: npx cap open android
```

## Why the web build has an API route and the others don't

`src/app/api/gacha-log/route.ts` proxies HoYoverse's `getGachaLog`
endpoint. Browsers block that request cross-origin (no CORS headers,
and it expects headers a normal `fetch` won't send), so the *web* build
routes it through our own server. Tauri and Capacitor aren't sandboxed by
browser CORS the same way — a native build can call HoYoverse directly
(Tauri's `allowlist.http` in `src-tauri/tauri.conf.json` is already scoped
to the relevant HoYoverse hosts for this). If you take this further,
swap `fetchGachaPage` in `src/lib/gachaImport.ts` to call HoYoverse
directly when `window.__TAURI__` or Capacitor's native bridge is present.

## What changed in this pass

- `pulls` table replaced the old `wishes` table with the exact field
  shape requested (string `count`/`rank_type`, per-row `pity`)
- Three import channels now feed the same table: live authkey/API
  pagination, `.xlsx` (Genshin Stargazer / paimon.moe exports), and
  UIGF/SRGF JSON
- Zustand store now persists (localStorage) game selection and
  calculator/currency inputs across reloads, with a `hasHydrated` guard
  to avoid an SSR/CSR mismatch flash
- Currency-split calculator on the Calculator page, plus a milestone-odds
  row (25/50/75/90/99%)
- Fixed a real input bug: the pull-budget/pity fields used to clamp on
  every keystroke, which snapped the field back to `min` the instant you
  cleared it to type a new number — `NumberInput` now buffers a local
  string and only commits/clamps on blur
- New `/banners` route with live countdowns (values are placeholder
  config, not live HoYoverse data — see the comment at the top of that
  file) and a livestream card
- Per-game watermark (`GameWatermark`), gradient logo mark
  (`IntertwinedFateIcon`), and directional slide transitions
  (`SlideSwitch` for in-page toggles, `template.tsx` for route changes)
  replacing the earlier fade-based motion
- Content is now centered via the layout's flex wrapper instead of
  hugging the left edge

## Project layout

```
src/
  app/
    page.tsx            Dashboard (pity gauges, derived stats)
    calculator/         Probability calculator + chart
    import/              Authkey instructions + fetch flow
    history/             Raw pull ledger, filterable by rarity
    api/gacha-log/       Server-side proxy (web build only)
  components/            PityGauge, ProbabilityChart, Sidebar, etc.
  db/schema.ts            Dexie schema (profiles, wishes, pity cache, authkeys)
  lib/
    gachaProbability.ts   DP engine: soft-pity CDFs, 50/50 & guarantee
                           Markov chain, multi-copy convolution (C1–C6)
    pityCalculator.ts     Derives current pity/guarantee from the raw ledger
    gachaImport.ts         Paginates getGachaLog, de-dupes into Dexie
  store/useAppStore.ts     Zustand: selected game, active profile, calculator inputs
```

## What's implemented vs. what's next

**Implemented and internally verified** (see the DP engine's docstring
for the closed-form checks it was validated against):
- Exact soft-pity CDF for character banners (Genshin & HSR)
- 50/50 + guarantee as a two-state Markov chain
- Weapon banner (Epitomized Path) and HSR light cone (75/25) via the
  same engine with different parameters
- Multi-copy targets (C1–C6, R1–R5) via PMF convolution
- Deriving live pity/guarantee state from an arbitrary wish ledger
- Import pipeline with pagination, rate-limit backoff, and de-dup

**Not yet built:**
- Native networking swap for the Tauri/Capacitor builds (currently both
  still call the web API route unless you wire in the change above)
- Rate-up item-ID lists per banner (needed so `derivePityState` can tell
  "which 5★ was the rate-up" — currently assumes any 5★ pull on a
  character-event banner is a win unless you pass in the id set)
- App icons / splash screens for the PWA manifest and native shells
- CI for the two native builds

## A note on scope

I can't `npm install`, build, or run this project inside this sandbox
(no network access here), so nothing above has been through an actual
`next build`. Everything was written carefully and the math was
independently verified with standalone Node scripts, but treat the
first `npm install && npm run dev` as the real smoke test — expect the
normal handful of first-run TypeScript nits (Dexie's generics are
occasionally particular) rather than a fully polished, ready-to-ship
build.
