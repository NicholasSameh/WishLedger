/**
 * gachaImport.ts
 * -----------------------------------------------------------------------
 * Three independent import channels, all converging on the same `pulls`
 * table and the same de-duplication rule (unique on [uid + hoyoLogId]):
 *
 *   1. importFromExcel   — .xlsx exports from Genshin Stargazer / paimon.moe
 *   2. importFromJson    — UIGF (Genshin) / SRGF (HSR) JSON exports
 *   3. importGachaHistory — live pagination against HoYoverse's own API
 *      using a short-lived authkey (via the /api/gacha-log proxy)
 *
 * Whichever channel is used, `pity` is computed the same way: a running
 * per-(uid, gacha_type) counter that resets to 0 the pull after a 5★.
 * -----------------------------------------------------------------------
 */

import * as XLSX from "xlsx";
import { db } from "@/db/schema";
import type { BannerCategory, GameId, PullRecord } from "@/db/schema";

const GENSHIN_GACHA_TYPE_TO_CATEGORY: Record<string, BannerCategory> = {
  "100": "beginner",
  "200": "standard",
  "301": "character-event",
  "400": "character-event",
  "302": "weapon-event",
  "500": "chronicled",
};

const HSR_GACHA_TYPE_TO_CATEGORY: Record<string, BannerCategory> = {
  "1": "standard",
  "2": "beginner",
  "11": "character-event",
  "12": "weapon-event",
  "21": "character-event",
  "22": "weapon-event",
};

function categoryFor(game: GameId, gachaType: string): BannerCategory {
  const map = game === "genshin" ? GENSHIN_GACHA_TYPE_TO_CATEGORY : HSR_GACHA_TYPE_TO_CATEGORY;
  return map[gachaType] ?? "standard";
}

// ---------------------------------------------------------------------
// Shared insert path — every channel normalizes down to this shape and
// calls insertPulls, so pity computation and de-dup only exist once.
// ---------------------------------------------------------------------

interface NormalizedPull {
  game: GameId;
  uid: string;
  gacha_type: string;
  item_id: string;
  count: string;
  time: string;
  name: string;
  item_type: string;
  rank_type: string;
  hoyoLogId: string;
}

export interface ImportResult {
  totalRows: number;
  newRows: number;
  skippedDuplicates: number;
}

async function insertPulls(rows: NormalizedPull[]): Promise<ImportResult> {
  // Group by (uid, gacha_type) so pity resets independently per banner,
  // and sort each group ascending by hoyoLogId (HoYoverse's own id is
  // monotonically increasing and far more reliable than parsing `time`,
  // which can collide within the same second across duplicate rows).
  const groups = new Map<string, NormalizedPull[]>();
  for (const row of rows) {
    const key = `${row.uid}::${row.gacha_type}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => compareLogIds(a.hoyoLogId, b.hoyoLogId));
  }

  let newRows = 0;
  let skippedDuplicates = 0;

  await db.transaction("rw", db.pulls, async () => {
    for (const [key, list] of groups.entries()) {
      const [uid, gachaType] = key.split("::");

      // Seed the running pity counter from whatever's already stored for
      // this uid+gacha_type, so a second/partial import continues
      // correctly instead of resetting to 0.
      const existingForBanner = await db.pulls.where({ uid, gacha_type: gachaType }).sortBy("hoyoLogId");
      let pity = existingForBanner.length > 0 ? computeTrailingPity(existingForBanner) : 0;

      for (const row of list) {
        const exists = await db.pulls.where({ uid: row.uid, hoyoLogId: row.hoyoLogId }).first();
        if (exists) {
          skippedDuplicates += 1;
          continue;
        }

        pity += 1;
        const isFiveStar = row.rank_type === "5";

        const record: PullRecord = {
          game: row.game,
          uid: row.uid,
          gacha_type: row.gacha_type,
          item_id: row.item_id,
          count: row.count,
          time: row.time,
          name: row.name,
          item_type: row.item_type,
          rank_type: row.rank_type,
          pity,
          hoyoLogId: row.hoyoLogId,
          bannerCategory: categoryFor(row.game, row.gacha_type),
        };
        await db.pulls.add(record);
        newRows += 1;

        if (isFiveStar) pity = 0;
      }
    }
  });

  return { totalRows: rows.length, newRows, skippedDuplicates };
}

function computeTrailingPity(existing: PullRecord[]): number {
  const last = existing[existing.length - 1];
  return last.rank_type === "5" ? 0 : last.pity;
}

/** HoYoverse's `id` field is a numeric string but can exceed Number's
 *  safe integer range at the margins — compare as strings by length
 *  first, then lexicographically, rather than casting to Number. */
function compareLogIds(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------------------------------------------------------------------
// Channel 1: Excel (.xlsx) import — Genshin Stargazer / paimon.moe exports
// ---------------------------------------------------------------------

const EXCEL_SHEET_NAMES = ["Character Event", "Weapon Event", "Standard", "Beginners' Wish", "Chronicled Wish"];

const SHEET_NAME_TO_GACHA_TYPE: Record<string, string> = {
  "Character Event": "301",
  "Weapon Event": "302",
  Standard: "200",
  "Beginners' Wish": "100",
  "Chronicled Wish": "500",
};

/**
 * Genshin Stargazer / paimon.moe both export one workbook with a sheet
 * per banner, columns roughly: Name | Type | Time | ⭐ | Pity. Column
 * headers vary slightly by tool version, so lookups below are
 * case-insensitive and tolerant of the "⭐"/"Rank"/"Rarity" naming split.
 */
export async function importFromExcel(file: File, game: GameId, uid: string): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const normalized: NormalizedPull[] = [];

  for (const sheetName of EXCEL_SHEET_NAMES) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

// We add 'raw: false' to force Excel dates back into text
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });    const gachaType = SHEET_NAME_TO_GACHA_TYPE[sheetName];
    rows.forEach((row, index) => {
      const name = String(pickField(row, ["Name", "Item", "Character/Weapon"]) ?? "").trim();
      if (!name) return;

      const rankRaw = String(row["⭐"] || row["Rank"] || pickField(row, ["⭐", "Rank", "Rarity", "Star"]) || "3").trim();
      const rank = rankRaw.replace(/[^0-9]/g, "") || "3";
      const time = normalizeTime(String(pickField(row, ["Time", "Date"]) ?? ""));
      const itemType = String(pickField(row, ["Type", "Item Type"]) ?? "Character");

      normalized.push({
        game,
        uid,
        gacha_type: gachaType,
        // Spreadsheet exports don't carry HoYoverse's internal item ids —
        // fall back to the item name, which is stable enough for pity
        // math (only the log id, synthesized below, needs to be unique).
        item_id: name,
        count: "1",
        time,
        name,
        item_type: itemType,
        rank_type: rank,
        // No hoyoLogId exists in a spreadsheet export. Synthesize a
        // stable one from uid+gachaType+sheet-row-order so re-importing
        // the same file doesn't create duplicates, while still sorting
        // correctly (spreadsheet rows are already chronological).
        hoyoLogId: `xlsx:${uid}:${gachaType}:${index}`,
      });
    });
  }

  if (normalized.length === 0) {
    throw new Error(
      "No recognized sheets found. Expected one or more of: " + EXCEL_SHEET_NAMES.join(", ")
    );
  }

  return insertPulls(normalized);
}

function pickField(row: Record<string, unknown>, candidates: string[]): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const match = keys.find((k) => k.trim().toLowerCase() === candidate.toLowerCase());
    if (match) return row[match];
  }
  return undefined;
}

function normalizeTime(raw: string): string {
  if (!raw) return new Date(0).toISOString();
  const parsed = new Date(raw.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

// ---------------------------------------------------------------------
// Channel 2: JSON import — UIGF (Genshin) / SRGF (HSR)
// ---------------------------------------------------------------------

interface UigfSrgfEntry {
  gacha_type?: string; // UIGF
  card_pool_type?: string; // some SRGF variants use this name
  item_id: string;
  count?: string;
  time: string;
  name: string;
  item_type: string;
  rank_type: string;
  id: string; // HoYoverse's own log id — present in both formats
  uid: string;
}

interface UigfSrgfFile {
  info?: { uid?: string };
  // UIGF v2/v3 nests per-uid records under `list`; SRGF is flatter.
  list?: UigfSrgfEntry[];
  hk4e?: { list: UigfSrgfEntry[] }[]; // UIGF v3 multi-account shape
}

export async function importFromJson(file: File, game: GameId): Promise<ImportResult> {
  const text = await file.text();
  const parsed: UigfSrgfFile = JSON.parse(text);

  const entries: UigfSrgfEntry[] = parsed.list ?? parsed.hk4e?.flatMap((account) => account.list) ?? [];

  if (entries.length === 0) {
    throw new Error("No pull records found in this file — is it a valid UIGF/SRGF export?");
  }

  const normalized: NormalizedPull[] = entries.map((entry) => ({
    game,
    uid: entry.uid ?? parsed.info?.uid ?? "unknown",
    gacha_type: entry.gacha_type ?? entry.card_pool_type ?? "301",
    item_id: entry.item_id,
    count: entry.count ?? "1",
    time: normalizeTime(entry.time),
    name: entry.name,
    item_type: entry.item_type,
    rank_type: entry.rank_type,
    hoyoLogId: entry.id,
  }));

  return insertPulls(normalized);
}

// ---------------------------------------------------------------------
// Channel 3: live API pagination via authkey (through the CORS proxy)
// ---------------------------------------------------------------------

const GENSHIN_GACHA_TYPES = ["100", "200", "301", "302", "400", "500"];
const HSR_GACHA_TYPES = ["1", "2", "11", "12", "21", "22"];

interface RawGachaEntry {
  id: string;
  uid: string;
  gacha_type: string;
  item_id: string;
  name: string;
  item_type: string;
  rank_type: string;
  time: string;
  count: string;
}

export interface ImportProgress {
  fetchedPages: number;
  newRecords: number;
  done: boolean;
}

export async function importGachaHistory(
  game: GameId,
  authkey: string,
  region: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const gachaTypes = game === "genshin" ? GENSHIN_GACHA_TYPES : HSR_GACHA_TYPES;

  let totalNew = 0;
  let totalRows = 0;
  let totalSkipped = 0;
  let fetchedPages = 0;

  for (const gachaType of gachaTypes) {
    let endId = "0";
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page = await fetchGachaPage(game, authkey, region, gachaType, endId);
      fetchedPages += 1;
      if (page.length === 0) break;

      const normalized: NormalizedPull[] = page.map((entry) => ({
        game,
        uid: entry.uid,
        gacha_type: entry.gacha_type,
        item_id: entry.item_id,
        count: entry.count,
        time: normalizeTime(entry.time),
        name: entry.name,
        item_type: entry.item_type,
        rank_type: entry.rank_type,
        hoyoLogId: entry.id,
      }));

      const result = await insertPulls(normalized);
      totalNew += result.newRows;
      totalRows += result.totalRows;
      totalSkipped += result.skippedDuplicates;
      onProgress?.({ fetchedPages, newRecords: totalNew, done: false });

      endId = page[page.length - 1].id;
      await sleep(350); // stay well under HoYoverse's rate limit
    }
  }

  onProgress?.({ fetchedPages, newRecords: totalNew, done: true });
  return { totalRows, newRows: totalNew, skippedDuplicates: totalSkipped };
}

async function fetchGachaPage(
  game: GameId,
  authkey: string,
  region: string,
  gachaType: string,
  endId: string
): Promise<RawGachaEntry[]> {
  const res = await fetch("/api/gacha-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ game, authkey, region, gachaType, endId, size: 20 }),
  });

  if (!res.ok) {
    throw new Error(`Gacha log request failed (${res.status}). Your authkey may have expired.`);
  }

  const json = await res.json();
  if (json.retcode !== 0) {
    throw new Error(json.message ?? "HoYoverse API returned an error — the authkey is likely expired.");
  }
  return json.data.list as RawGachaEntry[];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
