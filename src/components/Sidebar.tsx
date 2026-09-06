"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calculator, CalendarClock, UploadCloud, ScrollText } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/calculator", label: "Calculator", icon: Calculator },
  { href: "/import", label: "Import", icon: UploadCloud },
  { href: "/history", label: "History", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const game = useAppStore((s) => s.game);
  const setGame = useAppStore((s) => s.setGame);

  const activeIndex = NAV_ITEMS.findIndex(item => item.href === pathname);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0f172a] px-6 py-8 sticky top-0 h-screen z-50">
      
      {/* Header with slightly scaled logo for Genshin */}
      <div className="mb-10 flex items-center gap-3">
        <img 
          src={game === "genshin" ? "/Item_Intertwined_Fate.webp" : "/Star_Rail_Special_Pass.webp"} 
          alt="Logo"
          className={`w-10 h-10 object-contain transition-transform duration-300 ${
            game === "genshin" ? "scale-[1.15]" : "scale-100"
          }`}
        />
        <h1 className="text-2xl font-bold tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
          WishLedger
        </h1>
      </div>

      {/* Game Toggle with Sliding Pill */}
      <div className="mb-10 rounded-lg bg-slate-900 p-1 border border-slate-800 flex relative">
        <button
          onClick={() => setGame("genshin")}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors relative z-10 ${
            game === "genshin" ? "text-slate-900" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Genshin
        </button>
        <button
          onClick={() => setGame("hsr")}
          className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors relative z-10 ${
            game === "hsr" ? "text-slate-900" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          HSR
        </button>
        {/* The Animated Toggle Background */}
        <div
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-all duration-300 ease-out z-0 pointer-events-none"
          style={{
            left: game === "genshin" ? "4px" : "calc(50%)",
            backgroundColor: game === "genshin" ? "#fbbf24" : "#38bdf8",
          }}
        />
      </div>

      {/* Navigation Menu with Sliding Pill */}
      <nav className="flex flex-col gap-1 relative">
        {/* The Animated Menu Background */}
        <div
          className="absolute left-0 right-0 h-[44px] rounded-lg transition-all duration-300 ease-out z-0 pointer-events-none"
          style={{
            transform: `translateY(${activeIndex * 48}px)`, // 44px height + 4px gap
            backgroundColor: game === "genshin" ? "rgba(251, 191, 36, 0.15)" : "rgba(56, 189, 248, 0.15)",
            opacity: activeIndex === -1 ? 0 : 1,
          }}
        />

        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const activeText = game === "genshin" ? "text-amber-400" : "text-sky-400";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative z-10 flex items-center gap-3 rounded-lg px-4 h-[44px] text-sm font-medium transition-colors ${
                isActive ? activeText : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      {/* The "I am broke" Support Button */}
      <div className="mt-auto pt-8">
        <a 
          href="https://ko-fi.com/broketechboy" 
          target="_blank" 
          rel="noopener noreferrer"
          className="group block relative rounded-lg overflow-hidden border border-slate-800 hover:border-amber-400 transition-colors"
        >
          <img 
            src="/i am once again asking for your financial support.jpeg" 
            alt="Support the dev" 
            className="w-full h-auto opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent pointer-events-none" />
          <span className="absolute top-2 left-0 right-0 text-center text-[11px] font-bold text-slate-300 group-hover:text-amber-400 transition-colors uppercase tracking-wider">
            Support the Dev ☕
          </span>
        </a>
      </div>
    </aside>
  );
}