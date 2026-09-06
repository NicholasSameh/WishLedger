/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Capacitor/Tauri both want a fully static bundle to embed — the app is
  // local-first anyway (no server-rendered per-user data), so a static
  // export works for the desktop/mobile shells. The one exception is the
  // /api/gacha-log proxy route, which only exists for the web/PWA build
  // (see README: desktop/mobile builds call HoYoverse directly since they
  // aren't subject to browser CORS).
  output: process.env.BUILD_TARGET === "native" ? "export" : undefined,
  images: { unoptimized: true },
};

export default nextConfig;
