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
  Space: "5", Enter: "5", NumpadEnter: "5", KeyL: "5",
  KeyU: "1", KeyI: "3", KeyJ: "7", KeyK: "9", Digit1: "1", Digit3: "3", Digit7: "7", Digit9: "9",
  KeyO: "0", KeyP: "#", Semicolon: "*", KeyM: "*",
  Escape: "CLR", Backspace: "CLR",
};

declare const __APP_VERSION__: string;
const landing = document.getElementById("landing")!;
document.getElementById("ver")!.textContent = __APP_VERSION__;
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

// Dialogue box = two full-width gold border rows 34px apart in the lower third (measured 255/289 on
// 240x320). While it is up, # means 스킵, so the pad relabels that button.
function dialogueUp(): boolean {
  const w = canvas.width, h = canvas.height;
  const y0 = Math.floor(h * 0.6);
  probe.width = w; probe.height = h - y0;
  probeCtx.drawImage(canvas, 0, y0, w, h - y0, 0, 0, w, h - y0);
  const d = probeCtx.getImageData(0, 0, w, h - y0).data;
  const full: boolean[] = [];
  for (let y = 0; y < h - y0; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; if (d[p] + d[p + 1] + d[p + 2] > 300) n++; }
    full.push(n >= w * 0.8);
  }
  for (let y = 0; y + 34 < full.length; y++) if (full[y] && full[y + 34]) return true;
  return false;
}

// HUD mirror: the game draws its skill slots and the 회복 item slot in a bar at the bottom (box
// interiors measured on 240x320: y 302..314, x 61/84/105/126 for skills 1/3/7/9, 147 for the item,
// anchored to the bottom edge). Copy them onto the pad buttons every frame while the bar is present.
const SLOTS: Record<string, [number, number]> = { "1": [68, 12], "3": [90, 12], "7": [111, 12], "9": [132, 12], "0": [153, 16] };
const mirrors = Array.from(document.querySelectorAll<HTMLCanvasElement>(".mirror")).map((m) => ({ ctx: m.getContext("2d", { willReadFrequently: true })!, src: SLOTS[m.dataset.slot!] }));
function hudBarUp(): boolean {
  const h = canvas.height;
  probe.width = 2; probe.height = 1;
  probeCtx.drawImage(canvas, 60, h - 19, 1, 1, 0, 0, 1, 1);
  probeCtx.drawImage(canvas, 146, h - 19, 1, 1, 1, 0, 1, 1);
  const d = probeCtx.getImageData(0, 0, 2, 1).data;
  const gold = (i: number) => d[i] > 130 && d[i + 1] > 100 && d[i + 2] < 110;
  return gold(0) && gold(4);
}
function mirrorHud() {
  const up = hudBarUp();
  document.body.classList.toggle("hud", up);
  if (up) {
    const sy = canvas.height - 18;
    for (const m of mirrors) {
      m.ctx.drawImage(canvas, m.src[0], sy, m.src[1], 13, 0, 0, m.src[1], 13);
      const d = m.ctx.getImageData(0, 0, m.src[1], 13).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 300) lit++;   // icon pixels are bright; an empty slot only has its dark border
      m.ctx.canvas.classList.toggle("empty", lit < 4);
    }
  }
  requestAnimationFrame(mirrorHud);
}

let session: WasmSession | undefined;
let started = false;
const KEY_CLICK = (key: string, down: boolean) => { if (started) void session?.key(key, down).catch(fail); };

async function boot() {
  startButton.disabled = true;
  const t0 = performance.now();
  const [game, font] = await assets;
  fill.style.width = "85%"; detail.textContent = "엔진 시작 중";
  console.log(`boot: assets ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  setMasterVolume(0.5);
  setPcmVolume(0.5);
  // Layout (docs/04-pad-assets.md): one column, game at native 240x320 scaled to the column width,
  // the control pad below gets the rest. The pad content is a 393x304 design scaled by --ps = col/393,
  // so the column shrinks when the viewport is too short to hold game + pad + safe areas.
  // Read once: the game reads XDisplay once at boot. `?w=&h=` still overrides the emulated size.
  const cs = getComputedStyle(document.documentElement);
  const sat = parseFloat(cs.getPropertyValue("--sat")) || 0, sab = parseFloat(cs.getPropertyValue("--sab")) || 0;
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  let col = Math.min(vw, 430);
  for (let i = 0; i < 3; i++) {                     // col depends on the pad scale which depends on col
    const padH = 304 * Math.min(1.1, col / 393) + sab;
    col = Math.min(col, Math.floor((vh - sat - padH) * 240 / 320));
  }
  col = Math.max(col, 240);
  const q = new URLSearchParams(location.search);
  let w = Number(q.get("w")), h = Number(q.get("h"));
  if (!(w > 0 && h > 0)) { w = 240; h = 320; }
  const gameH = Math.round(col * 320 / 240);
  const padH = Math.max(0, vh - sat - sab - gameH);
  const ps = Math.min(1.1, col / 393, padH / 304);
  const ex = Math.min(140, Math.max(0, padH / ps - 304));          // spread the rows over extra height, up to a point
  const padTop = Math.max(0, (padH - (304 + ex) * ps) / 2);         // then centre the block in what is left
  const root = document.documentElement.style;
  root.setProperty("--col", `${col}px`); root.setProperty("--ps", String(ps));
  root.setProperty("--ex", `${ex.toFixed(1)}px`); root.setProperty("--pad-top", `${padTop.toFixed(1)}px`);
  canvas.dataset.w = String(w); canvas.dataset.h = String(h);
  canvas.style.aspectRatio = `${w} / ${h}`;
  console.log(`hero-lore-2-web ${__APP_VERSION__}: screen ${w}x${h}, column ${col}px, pad ${padH}px x${ps.toFixed(2)} ex ${ex.toFixed(0)}, viewport ${vw}x${vh}`);
  const ready = new Promise<void>((resolve) => {
    session = startWasmSession("hero2.zip", game, font, (event: SessionEvent) => {
      if (event.type === "ready") resolve();
      else if (event.type === "error") fail(event.cause ?? event.message);
      else if (event.type === "warning") console.warn(event.message);
    });
  });
  await ready;
  fill.style.width = "92%"; detail.textContent = "인트로 건너뛰는 중";
  console.log(`boot: engine ready ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  mountInput(session!, document.getElementById("pad")!, document.getElementById("dpad")!);
  // ponytail: tap OK every 250 ms until the menu shows; give up after 20 s and show whatever is there.
  // The publisher splash ignores keys for its first 30 ticks (cd.java), so ~3 s of this is the game itself.
  const until = Date.now() + 20_000;
  while (!menuUp() && Date.now() < until) {
    await session!.key("5", true); await sleep(80); await session!.key("5", false);
    await sleep(250);
  }
  fill.style.width = "100%";
  detail.textContent = "";
  console.log(`boot: menu ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  startButton.disabled = false;
}

function start() {
  started = true;
  void audioReady?.then((state) => state?.ctx.resume());   // the gesture that unlocks sound
  landing.classList.add("done");
  document.body.classList.add("ready");
  setTimeout(() => landing.remove(), 700);
  canvas.focus();
  setInterval(() => {
    const dlg = dialogueUp();
    document.body.classList.toggle("dialogue", dlg);
    document.body.classList.toggle("menu", !dlg && !document.body.classList.contains("hud"));
  }, 250);
  requestAnimationFrame(mirrorHud);
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
