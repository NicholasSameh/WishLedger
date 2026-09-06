import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------
// ink       — page background. A deep night-sky indigo, not pure black:
//             this is a "wishing on stars" app, the void should feel warm.
// panel     — raised surface (sidebar, gauge backdrop). One step lighter.
// panelLine — hairline dividers, drawn sparingly and only where content
//             is genuinely sequential or tabular.
// mist      — muted/secondary text.
// parchment — primary text. Warm off-white, not stark #fff.
// gold      — 5-star rarity. The single "hero" accent, reserved for
//             5-star items, the pity gauge fill, and primary actions.
// amethyst  — 4-star rarity / secondary data series (e.g. the second
//             line on probability charts).
// teal      — 3-star rarity, tertiary/low-emphasis data.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#100E27",
        panel: "#1B1836",
        panelLine: "#2E2A54",
        mist: "#948FBE",
        parchment: "#F3EFFC",
        gold: "#E3B44C",
        goldMuted: "#7A6636",
        amethyst: "#9C82E8",
        teal: "#5FB8B0",
        // Per-game accent used ONLY for active-page header glow — kept
        // separate from the rarity colors above (gold/amethyst/teal),
        // which mean something specific (5★/4★/3★) and shouldn't be
        // reassigned to a per-game meaning.
        genshinAccent: "#F59E0B",
        hsrAccent: "#38BDF8",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "16px",
      },
      keyframes: {
        // Deliberately ease-in-out with no overshoot — "no bouncy
        // animations" per spec, so nothing here rubber-bands past 0/100%.
        "slide-in-right": {
          "0%": { transform: "translateX(28px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-28px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up-in": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-in-right": "slide-in-right 300ms ease-in-out",
        "slide-in-left": "slide-in-left 300ms ease-in-out",
        "slide-up-in": "slide-up-in 280ms ease-in-out",
      },
    },
  },
  plugins: [],
};

export default config;
