"use client";
import { useAppStore } from "@/store/useAppStore";

export function GameWatermark() {
  const game = useAppStore((s) => s.game);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  if (!hasHydrated) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '50%',
        right: '0',
        // Make it massive for Genshin, keep it normal for HSR
        width: game === "genshin" ? '1100px' : '850px',
        height: game === "genshin" ? '1100px' : '850px',
        transform: game === "genshin" ? 'translate(37%, -50%)' : 'translate(30%, -50%)',
        opacity: 0.30,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        transition: 'all 0.5s ease' // Adds a smooth resize animation when switching
      }}
      aria-hidden="true"
    >
      <img 
        src={game === "genshin" ? "/Item_Intertwined_Fate.png" : "/Star_Rail_Special_Pass.png"} 
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'contain'}}
      />
    </div>
  );
}