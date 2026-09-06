import type { BannerCategory, GameId } from "@/db/schema";

interface BannerSelectorProps {
  game: GameId;
  value: BannerCategory;
  onChange: (value: BannerCategory) => void;
}

const OPTIONS: Record<GameId, { value: BannerCategory; label: string }[]> = {
  genshin: [
    { value: "character-event", label: "Character Event Wish" },
    { value: "weapon-event", label: "Weapon Banner (Epitomized Path)" },
  ],
  hsr: [
    { value: "character-event", label: "Character Warp" },
    { value: "weapon-event", label: "Light Cone Warp" },
  ],
};

export function BannerSelector({ game, value, onChange }: BannerSelectorProps) {
  return (
    <div className="flex rounded-md border border-panelLine p-1 w-fit">
      {OPTIONS[game].map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`rounded-sm px-4 py-1.5 text-sm transition-colors ${
            value === opt.value ? "bg-gold text-ink font-medium" : "text-mist hover:text-parchment"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
