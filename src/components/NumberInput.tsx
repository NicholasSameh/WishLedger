"use client";

import { useEffect, useState } from "react";

interface NumberInputProps {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  placeholder?: string;
}

/**
 * The bug this fixes: a plain controlled <input type="number"> that
 * clamps on every keystroke fights the user — clearing the field to type
 * a new value sends onChange("") -> Number("") -> 0 -> clamp back up to
 * `min`, so the field snaps back before they can finish typing. This
 * component keeps a local, unclamped string while the user is actively
 * editing, and only commits (and clamps) a parsed number on blur/Enter —
 * so typing "", "5", "50" all work exactly as expected along the way.
 *
 * step is intentionally omitted — arrow-key/spinner increments of a
 * fixed size are exactly the "locked to intervals of 10" behavior this
 * was built to avoid.
 */
export function NumberInput({ value, onCommit, min, max, className, placeholder }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));

  // Keep the field in sync if the value changes from elsewhere (e.g. a
  // currency-split recompute) while the user isn't mid-edit.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const parsed = Number(draft);
    if (draft.trim() === "" || Number.isNaN(parsed)) {
      setDraft(String(value)); // revert to last valid value
      return;
    }
    const clamped = clamp(parsed, min, max);
    setDraft(String(clamped));
    onCommit(clamped);
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      placeholder={placeholder}
      onChange={(e) => {
        const next = e.target.value;
        if (next === "" || /^[0-9]+$/.test(next)) setDraft(next);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={className}
    />
  );
}

function clamp(n: number, min?: number, max?: number): number {
  let out = n;
  if (min !== undefined) out = Math.max(out, min);
  if (max !== undefined) out = Math.min(out, max);
  return out;
}
