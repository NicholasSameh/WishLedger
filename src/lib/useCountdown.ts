"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isPast: boolean;
}

/** Live-updating countdown to a target Date, ticking once per second. */
export function useCountdown(target: Date): CountdownParts {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalMs = target.getTime() - now;
  const isPast = totalMs <= 0;
  const clamped = Math.max(totalMs, 0);

  return {
    days: Math.floor(clamped / 86_400_000),
    hours: Math.floor((clamped % 86_400_000) / 3_600_000),
    minutes: Math.floor((clamped % 3_600_000) / 60_000),
    seconds: Math.floor((clamped % 60_000) / 1000),
    totalMs,
    isPast,
  };
}
