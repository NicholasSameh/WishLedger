import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for HoYoverse's getGachaLog endpoint.
 *
 * Why a proxy at all: the endpoint is designed to be called from inside
 * the game's own webview, and browsers block the request cross-origin
 * from a normal site (no CORS headers, and it 400s without the referer
 * that in-game webviews send). Routing it through our own server sidesteps
 * both. The authkey itself is short-lived and never stored server-side —
 * this route is stateless, it just forwards the request.
 *
 * Desktop (Tauri) / mobile (Capacitor) builds skip this route entirely
 * and call HoYoverse directly from Rust/native networking, which isn't
 * subject to browser CORS in the first place.
 */

const ENDPOINTS: Record<string, Record<string, string>> = {
  genshin: {
    os: "https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog",
    cn: "https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog",
  },
  hsr: {
    os: "https://public-operation-hkrpg-sg.hoyoverse.com/common/gacha_record/api/getGachaLog",
    cn: "https://public-operation-hkrpg.mihoyo.com/common/gacha_record/api/getGachaLog",
  },
};

export async function POST(req: NextRequest) {
  const { game, authkey, region, gachaType, endId, size } = await req.json();

  if (!game || !authkey || !gachaType) {
    return NextResponse.json({ retcode: -1, message: "Missing required fields." }, { status: 400 });
  }

  const shard = String(region ?? "").startsWith("cn") ? "cn" : "os";
  const baseUrl = ENDPOINTS[game]?.[shard];
  if (!baseUrl) {
    return NextResponse.json({ retcode: -1, message: `Unsupported game: ${game}` }, { status: 400 });
  }

  const params = new URLSearchParams({
    authkey_ver: "1",
    lang: "en",
    gacha_type: String(gachaType),
    page: "1",
    size: String(size ?? 20),
    end_id: String(endId ?? "0"),
    authkey,
  });

  try {
    const upstream = await fetch(`${baseUrl}?${params.toString()}`, {
      // HoYoverse's endpoint is picky about looking like the in-game
      // webview; a generic UA is enough in practice for the public
      // gacha-log endpoint (it doesn't require game-client signing).
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    const data = await upstream.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { retcode: -1, message: err instanceof Error ? err.message : "Upstream request failed." },
      { status: 502 }
    );
  }
}
