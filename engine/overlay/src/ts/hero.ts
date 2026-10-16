// Page entry: fetch the game package and the font, start a wie session on #canvas, keyboard in.
// Everything emulator-side (WieWeb, audio, IndexedDB saves) is wie's own code under ./backend.
import { startWasmSession } from "./backend/wasm";
import type { SessionEvent } from "./backend";
import { setMasterVolume, setPcmVolume } from "./midi";

const GAME_URL = new URLSearchParams(location.search).get("pkg") ?? "game/hero2.zip";

// Keypad codes the game reads (docs/01-analysis.md). Same hand positions as hero-lord-web.
const KEY_MAP: Record<string, string> = {
  KeyW: "2", ArrowUp: "2", KeyA: "4", ArrowLeft: "4", KeyD: "6", ArrowRight: "6", KeyS: "8", ArrowDown: "8",
  Space: "5", Enter: "5", NumpadEnter: "5",
  Digit1: "1", Digit3: "3", Digit7: "7", Digit9: "9",
  KeyQ: "0", KeyE: "#", KeyM: "*",
  Escape: "CLR", Backspace: "CLR",
};

const status = document.getElementById("status")!;
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

async function main() {
  detail.textContent = "게임 파일 받는 중";
  const [game, font] = await Promise.all([
    fetchBytes(GAME_URL, (d, t) => { if (t) fill.style.width = `${Math.round((d / t) * 90)}%`; }),
    fetchBytes(new URL("../../../assets/neodgm.ttf", import.meta.url).href),
  ]);
  fill.style.width = "95%";
  detail.textContent = "시작하는 중";
  setMasterVolume(0.5);
  setPcmVolume(0.5);

  const onEvent = (event: SessionEvent) => {
    if (event.type === "ready") {
      fill.style.width = "100%";
      status.classList.add("done");
      setTimeout(() => status.remove(), 700);
    } else if (event.type === "error") fail(event.cause ?? event.message);
    else if (event.type === "warning") console.warn(event.message);
  };
  const session = startWasmSession("hero2.zip", game, font, onEvent);

  const held = new Set<string>();
  window.addEventListener("keydown", (e) => {
    const key = KEY_MAP[e.code];
    if (!key) return;
    e.preventDefault();
    if (e.repeat || held.has(key)) return;
    held.add(key);
    void session.key(key, true).catch(fail);
  });
  window.addEventListener("keyup", (e) => {
    const key = KEY_MAP[e.code];
    if (!key) return;
    e.preventDefault();
    if (held.delete(key)) void session.key(key, false).catch(fail);
  });
  window.addEventListener("blur", () => { held.clear(); void session.releaseKeys(); });
  console.log("hero-lore-2-web: session started");
}

main().catch(fail);
