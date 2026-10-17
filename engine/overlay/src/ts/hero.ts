// Page entry: fetch the game package and the font, start a wie session on #canvas, keyboard in.
// Everything emulator-side (WieWeb, audio, IndexedDB saves) is wie's own code under ./backend.
import { startWasmSession, type WasmSession } from "./backend/wasm";
import type { SessionEvent } from "./backend";
import { audioReady, setMasterVolume, setPcmVolume } from "./midi";
import { mountInput } from "./input";
import { exportSaves, importSaves } from "./saves";

const GAME_URL = new URLSearchParams(location.search).get("pkg") ?? "game/hero2.zip";

// Keypad codes the game reads (docs/01-analysis.md). Same hand positions as hero-lord-web.
const KEY_MAP: Record<string, string> = {
  KeyW: "2", ArrowUp: "2", KeyA: "4", ArrowLeft: "4", KeyD: "6", ArrowRight: "6", KeyS: "8", ArrowDown: "8",
  Space: "5", Enter: "5", NumpadEnter: "5",
  Digit1: "1", Digit3: "3", Digit7: "7", Digit9: "9",
  KeyQ: "0", KeyE: "#", KeyM: "*",
  Escape: "CLR", Backspace: "CLR",
};

const landing = document.getElementById("landing")!;
const startButton = document.getElementById("start") as HTMLButtonElement;
const fill = document.getElementById("fill") as HTMLDivElement;
const detail = document.getElementById("detail")!;
const notice = document.getElementById("notice")!;

const fail = (err: unknown) => {
  console.error(err);
  notice.textContent = err instanceof Error ? err.message : String(err);
};

async function fetchBytes(url: string, onProgress?: (done: number, total: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`${url}: ${res.status}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let done = 0;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    chunks.push(value);
    done += value.length;
    onProgress?.(done, total);
  }
  const out = new Uint8Array(done);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

// Everything happens behind the landing: download, boot, and skipping the game's own intro
// (publisher splash, PRESS ANY KEY) by tapping OK until the title menu is up. The button is then
// only the user gesture browsers want before audio may play, so the game appears instantly.
const assets = Promise.all([
  fetchBytes(GAME_URL, (d, t) => { if (t) fill.style.width = `${Math.round((d / t) * 80)}%`; }),
  fetchBytes(new URL("../../../assets/neodgm.ttf", import.meta.url).href),
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const probe = document.createElement("canvas");
const probeCtx = probe.getContext("2d", { willReadFrequently: true })!;
// The title menu is the only boot screen with the gold option box: a solid bright border run of
// 67px on two rows 14 apart, in the lower part of the screen. Position depends on the screen size
// (the game centres it), so scan for the pair instead of fixed coordinates.
function menuUp(): boolean {
  const w = canvas.width, h = canvas.height;
  const y0 = Math.floor(h * 0.55), y1 = Math.floor(h * 0.9);
  probe.width = w; probe.height = y1 - y0;
  probeCtx.drawImage(canvas, 0, y0, w, y1 - y0, 0, 0, w, y1 - y0);
  const d = probeCtx.getImageData(0, 0, w, y1 - y0).data;
  // a row counts as a border row when some 70px window holds 55+ bright pixels (the border has a few dark
  // pixels in it, so a contiguous run would be too strict; text never gets that dense)
  const solid: boolean[] = [];
  const pre = new Int32Array(w + 1);
  for (let y = 0; y < y1 - y0; y++) {
    for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; pre[x + 1] = pre[x] + (d[p] + d[p + 1] + d[p + 2] > 300 ? 1 : 0); }
    let best = 0;
    for (let x = 70; x <= w; x++) best = Math.max(best, pre[x] - pre[x - 70]);
    solid.push(best >= 55 && pre[w] <= 90);
  }
  for (let y = 0; y + 14 < solid.length; y++) if (solid[y] && solid[y + 14]) return true;
  return false;
}

let session: WasmSession | undefined;
let started = false;
const KEY_CLICK = (key: string, down: boolean) => { if (started) void session?.key(key, down).catch(fail); };

async function boot() {
  startButton.disabled = true;
  const [game, font] = await assets;
  fill.style.width = "85%";
  setMasterVolume(0.5);
  setPcmVolume(0.5);
  // Experiment: `?w=&h=` sets the emulated screen size (wie's XDisplay now reports the canvas size).
  const q = new URLSearchParams(location.search);
  if (q.get("w")) { canvas.dataset.w = q.get("w")!; canvas.dataset.h = q.get("h")!; canvas.style.aspectRatio = `${q.get("w")} / ${q.get("h")}`; document.body.classList.add("fill"); }
  const ready = new Promise<void>((resolve) => {
    session = startWasmSession("hero2.zip", game, font, (event: SessionEvent) => {
      if (event.type === "ready") resolve();
      else if (event.type === "error") fail(event.cause ?? event.message);
      else if (event.type === "warning") console.warn(event.message);
    });
  });
  await ready;
  mountInput(session!, document.getElementById("hud")!, document.getElementById("zone")!, document.getElementById("stick")!);
  // ponytail: tap OK every 400 ms until the menu shows; give up after 20 s and show whatever is there
  const until = Date.now() + 20_000;
  while (!menuUp() && Date.now() < until) {
    await session!.key("5", true); await sleep(80); await session!.key("5", false);
    await sleep(400);
  }
  fill.style.width = "100%";
  detail.textContent = "";
  startButton.disabled = false;
}

function start() {
  started = true;
  void audioReady?.then((state) => state?.ctx.resume());   // the gesture that unlocks sound
  landing.classList.add("done");
  document.body.classList.add("ready");
  setTimeout(() => landing.remove(), 700);
  canvas.focus();
}

const held = new Set<string>();
window.addEventListener("keydown", (e) => {
  const key = KEY_MAP[e.code];
  if (!key || !started) return;
  e.preventDefault();
  if (e.repeat || held.has(key)) return;
  held.add(key);
  KEY_CLICK(key, true);
});
window.addEventListener("keyup", (e) => {
  const key = KEY_MAP[e.code];
  if (!key) return;
  e.preventDefault();
  if (held.delete(key)) KEY_CLICK(key, false);
});
window.addEventListener("blur", () => { held.clear(); void session?.releaseKeys(); });

// save sheet
const sheet = document.getElementById("save-sheet")!;
const msg = document.getElementById("save-msg")!;
const file = document.getElementById("save-file") as HTMLInputElement;
document.getElementById("save-toggle")!.onclick = () => { sheet.hidden = false; void session?.releaseKeys(); };
document.getElementById("save-close")!.onclick = () => { sheet.hidden = true; };
document.getElementById("save-export")!.onclick = () => exportSaves().then(() => { msg.textContent = "파일을 내려받았습니다."; }, fail);
document.getElementById("save-import")!.onclick = () => file.click();
file.onchange = () => {
  const f = file.files?.[0];
  if (!f) return;
  importSaves(f).then((n) => {
    msg.textContent = `${n}개 항목을 가져왔습니다. 새로고침하면 적용됩니다.`;
    setTimeout(() => location.reload(), 1200);
  }, fail);
  file.value = "";
};

startButton.addEventListener("click", start, { once: true });
boot().catch(fail);
