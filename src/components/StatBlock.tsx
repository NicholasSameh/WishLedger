interface StatBlockProps {
  value: string;
  label: string;
  accent?: "gold" | "amethyst" | "teal" | "parchment";
}

const ACCENT_CLASS: Record<NonNullable<StatBlockProps["accent"]>, string> = {
  gold: "text-gold",
  amethyst: "text-amethyst",
  teal: "text-teal",
  parchment: "text-parchment",
};

export function StatBlock({ value, label, accent = "parchment" }: StatBlockProps) {
  return (
    <div className="border-l-2 border-panelLine pl-4">
      <div className={`font-display text-3xl ${ACCENT_CLASS[accent]}`}>{value}</div>
      <div className="text-sm text-mist mt-1">{label}</div>
    </div>
  );
}
