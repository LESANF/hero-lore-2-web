// Control pad: buttons with data-key, and a d-pad that reads the finger's position so the thumb can
// slide between arms. Output is keypad key names for wie (2/4/6/8, 5, 1/3/7/9, 0, #, *, CLR).
// Pointer events, so several fingers can hold keys at once.
import type { PlayerSession } from "./backend";

// Direction arbiter shared by the d-pad and the keyboard. The game defers a key release that arrives
// in the same frame as a press (bd.keyReleased: f/m flags) to the next frame, where it stops the hero.
// So a 6 -> 8 switch sent as "up 6, down 8" in one frame moves down for a frame and then stops: the
// press looks swallowed. Here only one direction is ever held in the game; on a switch the old one is
// released first and the new one pressed one game frame later (frame = 1000/fps, 50-70 ms by speed).
const DIR_GAP = 90;
const DIRS = new Set(["2", "4", "6", "8"]);
export function createDirections(session: PlayerSession) {
  const held: string[] = [];                         // sources currently holding a direction, newest last
  let active = "", timer = 0;
  const apply = () => {
    const want = held[held.length - 1] ?? "";
    if (want === active) return;
    clearTimeout(timer);
    if (active) void session.key(active, false);
    const prev = active;
    active = want;
    if (!want) return;
    if (!prev) { void session.key(want, true); return; }
    timer = window.setTimeout(() => { if (active === want) void session.key(want, true); }, DIR_GAP);
  };
  return {
    isDir: (key: string) => DIRS.has(key),
    down(key: string) { const i = held.indexOf(key); if (i >= 0) held.splice(i, 1); held.push(key); apply(); },
    up(key: string) { const i = held.indexOf(key); if (i >= 0) { held.splice(i, 1); apply(); } },
    clear() { held.length = 0; apply(); },
  };
}
export type Directions = ReturnType<typeof createDirections>;

export function mountInput(session: PlayerSession, pad: HTMLElement, dpad: HTMLElement, dirs: Directions) {
  const held = new Map<string, Set<number>>();            // key -> pointer ids holding it
  const press = (key: string, id: number) => {
    let ids = held.get(key);
    if (!ids) { ids = new Set(); held.set(key, ids); void session.key(key, true); }
    ids.add(id);
  };
  const release = (key: string, id: number) => {
    const ids = held.get(key);
    if (!ids || !ids.delete(id)) return;
    if (ids.size === 0) { held.delete(key); void session.key(key, false); }
  };

  for (const button of pad.querySelectorAll<HTMLElement>("[data-key]")) {
    const key = button.dataset.key!;
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); button.setPointerCapture(e.pointerId); button.classList.add("down"); press(key, e.pointerId); });
    const up = (e: PointerEvent) => { button.classList.remove("down"); release(key, e.pointerId); };
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // d-pad: 4-way from the angle to the centre, small dead zone in the hub
  const arms = new Map<string, HTMLElement>();
  for (const arm of dpad.querySelectorAll<HTMLElement>(".arm")) arms.set(arm.dataset.dir!, arm);
  let pointer = -1, dir = "";
  const setDir = (next: string) => {
    if (next === dir) return;
    if (dir) { dirs.up(dir); arms.get(dir)!.classList.remove("on"); }
    dir = next;
    if (dir) { dirs.down(dir); arms.get(dir)!.classList.add("on"); }
  };
  const dirAt = (e: PointerEvent) => {
    const r = dpad.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < 14) return "";
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "6" : "4") : (dy > 0 ? "8" : "2");
  };
  dpad.addEventListener("pointerdown", (e) => {
    if (pointer !== -1) return;
    e.preventDefault();
    pointer = e.pointerId;
    dpad.setPointerCapture(pointer);
    setDir(dirAt(e));
  });
  dpad.addEventListener("pointermove", (e) => { if (e.pointerId === pointer) setDir(dirAt(e)); });
  const end = (e: PointerEvent) => { if (e.pointerId !== pointer) return; setDir(""); pointer = -1; };
  dpad.addEventListener("pointerup", end);
  dpad.addEventListener("pointercancel", end);
  dpad.addEventListener("lostpointercapture", end);
  dpad.addEventListener("contextmenu", (e) => e.preventDefault());

  window.addEventListener("blur", () => { held.clear(); dir = ""; pointer = -1; dirs.clear(); for (const a of arms.values()) a.classList.remove("on"); void session.releaseKeys(); });
}
