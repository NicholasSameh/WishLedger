"use client";

import { useRef } from "react";

interface SlideSwitchProps<T extends string | number> {
  /** The value currently being displayed — changing this retriggers the
   *  slide-in (via React's `key` prop forcing a fresh DOM node, which
   *  restarts the CSS animation). */
  activeKey: T;
  /** All possible values in their natural left-to-right order, used only
   *  to decide slide direction (moving to a later index slides in from
   *  the right, earlier slides in from the left). */
  order: T[];
  className?: string;
  children: React.ReactNode;
}

/**
 * Directional slide transition with no bounce — ease-in-out, no
 * overshoot, 300ms. Used for the Genshin/HSR toggle and the
 * character/weapon banner-type toggle, both of which are same-route
 * state changes that `template.tsx` (route-level transitions) can't see.
 */
export function SlideSwitch<T extends string | number>({ activeKey, order, className, children }: SlideSwitchProps<T>) {
  const prevIndexRef = useRef(order.indexOf(activeKey));
  const currentIndex = order.indexOf(activeKey);
  const direction = currentIndex >= prevIndexRef.current ? "right" : "left";
  prevIndexRef.current = currentIndex;

  const animationClass = direction === "right" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div key={String(activeKey)} className={`${animationClass} ${className ?? ""}`}>
      {children}
    </div>
  );
}
