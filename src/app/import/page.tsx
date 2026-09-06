"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { db } from "@/db/schema";
import { PageHeader } from "@/components/PageHeader";
import { ImportInstructions } from "@/components/ImportInstructions";
import {
  importGachaHistory,
  importFromExcel,
  importFromJson,
  type ImportProgress,
  type ImportResult,
} from "@/lib/gachaImport";

type Channel = "authkey" | "excel" | "json";

export default function ImportPage() {
  const game = useAppStore((s) => s.game);
  const setActiveUid = useAppStore((s) => s.setActiveUid);
  const [channel, setChannel] = useState<Channel>("authkey");

  return (
    <div className="w-full max-w-2xl">
      <PageHeader
        title="Import history"
        subtitle={`${game === "genshin" ? "Genshin Impact" : "Honkai: Star Rail"} · everything below runs on this device`}
      />

      <div className="flex rounded-md border border-panelLine p-1 w-fit mb-8">
        {(
          [
            ["authkey", "Authkey / URL"],
            ["excel", "Excel (.xlsx)"],
            ["json", "UIGF / SRGF JSON"],
          ] as [Channel, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setChannel(value)}
            className={`rounded-sm px-3 py-1.5 text-sm transition-colors ${
              channel === value ? "bg-gold text-ink font-medium" : "text-mist hover:text-parchment"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {channel === "authkey" && <AuthkeyImport game={game} onImported={setActiveUid} />}
      {channel === "excel" && <FileImport kind="excel" game={game} onImported={setActiveUid} />}
      {channel === "json" && <FileImport kind="json" game={game} onImported={setActiveUid} />}
    </div>
  );
}

// ---------------------------------------------------------------------
// Channel: authkey / URL (live API pagination)
// ---------------------------------------------------------------------

function AuthkeyImport({ game, onImported }: { game: "genshin" | "hsr"; onImported: (uid: string) => void }) {
  const [urlOrKey, setUrlOrKey] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleImport() {
    const authkey = extractAuthkey(urlOrKey);
    if (!authkey) {
      setStatus("error");
      setErrorMessage("Couldn't find an authkey in what you pasted — paste the full URL or just the key value.");
      return;
    }

    setStatus("running");
    setErrorMessage(null);

    try {
      const result = await importGachaHistory(game, authkey, "os", setProgress);
      const latest = await db.pulls.where({ game }).last();
      if (latest) onImported(latest.uid);
      setStatus("done");
      setProgress((p) => (p ? { ...p, newRecords: result.newRows, done: true } : p));
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <div>
      <ImportInstructions />

      <div className="mt-10 pt-8 border-t border-panelLine">
        <label className="block mb-2 text-sm text-mist">Paste the wish-history URL or authkey</label>
        <textarea
          value={urlOrKey}
          onChange={(e) => setUrlOrKey(e.target.value)}
          rows={3}
          placeholder="https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/getGachaLog?...authkey=..."
          className="w-full bg-panel border border-panelLine rounded-sm px-3 py-2 text-sm text-parchment font-mono"
        />

        <button
          onClick={handleImport}
          disabled={status === "running" || urlOrKey.trim().length === 0}
          className="mt-4 rounded-sm bg-gold text-ink px-4 py-2 text-sm font-medium disabled:opacity-40"
        >
          {status === "running" ? "Importing…" : "Fetch history"}
        </button>

        <ImportStatus status={status} progress={progress} errorMessage={errorMessage} />
      </div>
    </div>
  );
}

function extractAuthkey(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const key = url.searchParams.get("authkey");
    if (key) return decodeURIComponent(key);
  } catch {
    // not a URL — fall through
  }
  return trimmed.length > 20 ? trimmed : null;
}

// ---------------------------------------------------------------------
// Channel: file-based (Excel or JSON) — same UI shape, different parser
// ---------------------------------------------------------------------

function FileImport({
  kind,
  game,
  onImported,
}: {
  kind: "excel" | "json";
  game: "genshin" | "hsr";
  onImported: (uid: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uidInput, setUidInput] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("running");
    setErrorMessage(null);
    try {
      const importResult =
        kind === "excel"
          ? await importFromExcel(file, game, uidInput.trim() || "unknown")
          : await importFromJson(file, game);

      const latest = await db.pulls.where({ game }).last();
      if (latest) onImported(latest.uid);

      setResult(importResult);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Import failed.");
    }
  }

  return (
    <div>
      {kind === "excel" ? (
        <div className="space-y-4">
          <p className="text-sm text-mist leading-relaxed max-w-[60ch]">
            Import a Genshin Stargazer or paimon.moe .xlsx export. Reads the{" "}
            <span className="text-parchment">Character Event</span>, <span className="text-parchment">Weapon Event</span>,{" "}
            <span className="text-parchment">Standard</span>, <span className="text-parchment">Beginners&apos; Wish</span>, and{" "}
            <span className="text-parchment">Chronicled Wish</span> sheets automatically — sheets that aren&apos;t present
            are just skipped.
          </p>
          <p className="text-sm text-mist leading-relaxed">
            Spreadsheet exports don&apos;t carry a UID, so enter yours manually (used to key your pull history — find it
            in-game under your profile):
          </p>
          <input
            type="text"
            value={uidInput}
            onChange={(e) => setUidInput(e.target.value)}
            placeholder="Your in-game UID"
            className="w-full max-w-xs bg-panel border border-panelLine rounded-sm px-3 py-2 text-sm text-parchment"
          />
        </div>
      ) : (
        <p className="text-sm text-mist leading-relaxed max-w-[60ch]">
          Import a UIGF (Genshin) or SRGF (HSR) JSON export from any compatible tracker — the UID is read directly
          from the file.
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={kind === "excel" ? ".xlsx" : ".json"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={status === "running" || (kind === "excel" && uidInput.trim().length === 0)}
        className="mt-4 rounded-sm bg-gold text-ink px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        {status === "running" ? "Importing…" : `Choose ${kind === "excel" ? ".xlsx" : ".json"} file`}
      </button>

      {status === "done" && result && (
        <p className="mt-3 text-sm text-teal">
          Done — {result.newRows} new pulls added
          {result.skippedDuplicates > 0 ? ` (${result.skippedDuplicates} already imported, skipped)` : ""}.
        </p>
      )}
      {status === "error" && errorMessage && <p className="mt-3 text-sm text-red-400">{errorMessage}</p>}
    </div>
  );
}

function ImportStatus({
  status,
  progress,
  errorMessage,
}: {
  status: "idle" | "running" | "done" | "error";
  progress: ImportProgress | null;
  errorMessage: string | null;
}) {
  if (status === "running" && progress) {
    return (
      <p className="mt-3 text-sm text-mist">
        Fetched {progress.fetchedPages} pages · {progress.newRecords} new pulls found…
      </p>
    );
  }
  if (status === "done" && progress) {
    return <p className="mt-3 text-sm text-teal">Done — {progress.newRecords} new pulls added.</p>;
  }
  if (status === "error" && errorMessage) {
    return <p className="mt-3 text-sm text-red-400">{errorMessage}</p>;
  }
  return null;
}
