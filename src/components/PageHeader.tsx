"use client";

import { useAppStore } from "@/store/useAppStore";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

/**
 * Every page's <h1> should render through this so the "no italics, serif
 * family, glowing per-game accent" rule (amber for Genshin, cyan for HSR)
 * lives in exactly one place instead of being repeated per page.
 */
export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const game = useAppStore((s) => s.game);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  // Before hydration, fall back to a neutral color rather than guessing
  // — avoids a server/client mismatch flash on first paint.
  const accent = !hasHydrated ? "#F3EFFC" : game === "genshin" ? "#F59E0B" : "#38BDF8";

  return (
    <header className="mb-8">
      <h1
        className="font-display text-3xl font-medium not-italic"
        style={{ color: accent, textShadow: `0 0 18px ${accent}55` }}
      >
        {title}
      </h1>
      {subtitle && <p className="text-mist mt-1.5">{subtitle}</p>}
    </header>
  );
}
