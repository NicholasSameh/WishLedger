import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "@/app/globals.css";
import { Sidebar } from "@/components/Sidebar";
import { GameWatermark } from "@/components/GameWatermark";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal"], // normal only — no italic weights loaded, since no
  // heading in the app should ever render italic per the typography spec.
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "WishLedger", 
  description: "Pull tracker and probability calculator for Genshin Impact and Honkai: Star Rail.",
  icons: {
    icon: "/icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#100E27",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <GameWatermark />
        <div className="relative z-10 flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 w-full flex flex-col items-center justify-start px-6 py-8 md:px-10 md:py-10 overflow-x-hidden">
            <div className="w-full max-w-5xl mx-auto">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
