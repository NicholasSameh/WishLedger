const POWERSHELL_SCRIPT = String.raw`# Locates the most recent wish-history URL (with authkey) in the game's
# web cache. Run this while the in-game Wish History / Warp History
# screen is open (or was opened recently) so the cache is fresh.
$cachePaths = @(
  "$env:USERPROFILE\AppData\LocalLow\miHoYo\Genshin Impact\webCaches",
  "$env:USERPROFILE\AppData\LocalLow\Cognosphere\Star Rail\webCaches"
)
foreach ($base in $cachePaths) {
  $dataFile = Get-ChildItem -Path $base -Recurse -Filter "data_2" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($dataFile) {
    $content = [System.IO.File]::ReadAllText($dataFile.FullName)
    $match = [regex]::Match($content, 'https://[^\s"]*getGachaLog[^\s"]*')
    if ($match.Success) { Write-Output $match.Value; break }
  }
}`;

const ADB_COMMAND = String.raw`adb logcat -d | Select-String "getGachaLog"`;

export function ImportInstructions() {
  return (
    <div className="space-y-8">
      <Step
        title="1. Open your in-game wish/warp history"
        body="In Genshin Impact or Honkai: Star Rail, open the pull history screen for any banner. This generates a temporary URL (containing an authkey) that HoYoverse's servers use to authenticate the request — it's the same mechanism paimon.moe and every other tracker relies on, since there's no public OAuth API."
      />

      <Step title="2. Extract the URL" body="The method depends on your platform:">
        <div className="mt-4 space-y-5">
          <Platform name="PC">
            <p className="text-sm text-mist mb-2">
              Run this PowerShell script — it reads the cache file the game's embedded browser writes to
              (<code className="text-teal">webCaches/Cache/Cache_Data/data_2</code>) and pulls out the URL.
            </p>
            <CodeBlock code={POWERSHELL_SCRIPT} />
          </Platform>

          <Platform name="Android">
            <p className="text-sm text-mist mb-2 leading-relaxed">
              Opening the history screen does <span className="text-parchment">not</span> copy anything to your
              clipboard automatically — the URL only ever exists in the device's logcat buffer, so it has to be
              pulled out from a computer over USB. Enable USB debugging in Developer Options, connect the phone,
              open the wish/warp history screen in-game, then on your computer run:
            </p>
            <CodeBlock code={ADB_COMMAND} />
            <p className="text-sm text-mist mt-2 leading-relaxed">
              This dumps the current logcat buffer (<code className="text-teal">-d</code>) and filters it down to
              the line containing the request (via PowerShell's <code className="text-teal">Select-String</code>;
              on macOS/Linux use <code className="text-teal">adb logcat -d | grep getGachaLog</code> instead). Copy
              the full URL out of the matched line, authkey and all.
            </p>
          </Platform>

          <Platform name="iOS">
            <p className="text-sm text-mist">
              iOS sandboxes the game's cache, so there's no on-device file to read directly. Use a local network
              sniffer app (e.g. Stream) while opening the wish history screen, and capture the outgoing{" "}
              <code className="text-teal">getGachaLog</code> HTTPS request — the full URL, including the{" "}
              <code className="text-teal">authkey</code> parameter, is what you need.
            </p>
          </Platform>
        </div>
      </Step>

      <Step
        title="3. Paste the URL below"
        body="Paste the full URL (or just the authkey= value) into the field on this page. The key is only valid for roughly 24 hours and is used purely to fetch your own history — it's never stored anywhere but this device, and it expires on its own."
      />
    </div>
  );
}

function Step({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-lg text-parchment">{title}</h3>
      <p className="text-sm text-mist mt-1.5 max-w-[62ch] leading-relaxed">{body}</p>
      {children}
    </div>
  );
}

function Platform({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-panelLine pl-4">
      <p className="text-sm text-gold mb-1">{name}</p>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-panel border border-panelLine rounded-md p-3 text-xs text-parchment overflow-x-auto leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}
