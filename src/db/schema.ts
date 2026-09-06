/**
 * schema.ts
 * -----------------------------------------------------------------------
 * Dexie/IndexedDB schema. `pulls` is the primary ledger and matches the
 * field shapes of the field spec exactly (including `count` and
 * `rank_type` as strings, mirroring the raw HoYoverse API payload shape
 * so import code doesn't have to coerce types before storing). `pity` is
 * captured per-row at import time (pulls since the previous 5-star in
 * the same game+gacha_type at the moment this pull happened) so pity
 * history can be reconstructed without recomputation, though
 * `src/lib/pityCalculator.ts` can also derive it fresh from scratch.
 *
 * `profiles` and `authKeys` are supporting tables the spec doesn't
 * mandate but the app can't function without (multi-account support,
 * and somewhere to hold the ephemeral authkey during an import run).
 * -----------------------------------------------------------------------
 */

import Dexie, { type Table } from "dexie";

export type GameId = "genshin" | "hsr";

export type BannerCategory =
  | "character-event"
  | "weapon-event"
  | "standard"
  | "chronicled"
  | "beginner";

/** One row per individual pull — the append-only source of truth. */
export interface PullRecord {
  id?: number; // ++id, autoincrement PK
  game: GameId;
  uid: string;
  gacha_type: string; // raw gacha_type ("301", "302", "200", "100", "500", HSR equivalents…)
  item_id: string;
  count: string; // kept as string, mirrors the raw API field
  time: string; // ISO8601 (converted from the API's "yyyy-MM-dd HH:mm:ss")
  name: string;
  item_type: string; // "Character" | "Weapon" | "Light Cone"
  rank_type: string; // "3" | "4" | "5", kept as string per spec
  pity: number; // pulls since the previous 5★ on this game+gacha_type, as of this pull
  hoyoLogId: string; // HoYoverse's own monotonically increasing id — the true de-dupe key
  bannerCategory: BannerCategory; // gacha_type normalized to a cross-game category
}

export interface ProfileRecord {
  id?: number;
  game: GameId;
  uid: string;
  server: string;
  nickname?: string;
  createdAt: string;
  lastSyncedAt?: string;
}

export interface AuthKeyRecord {
  id?: number;
  game: GameId;
  authkey: string;
  region: string;
  extractedAt: string;
  expiresAt: string;
}

export class WishLedgerDB extends Dexie {
  pulls!: Table<PullRecord, number>;
  profiles!: Table<ProfileRecord, number>;
  authKeys!: Table<AuthKeyRecord, number>;

  constructor() {
    super("WishLedgerDB");

    this.version(1).stores({
      // Compound index [game+uid] per spec, plus gacha_type/time/rank_type
      // singly-indexed, plus a unique compound on [uid+hoyoLogId] for
      // de-duplication on repeated imports.
      pulls: "++id, [game+uid], gacha_type, time, rank_type, &[uid+hoyoLogId], [uid+game+bannerCategory]",
      profiles: "++id, &[uid+game], game",
      authKeys: "++id, game, expiresAt",
    });
  }
}

export const db = new WishLedgerDB();
