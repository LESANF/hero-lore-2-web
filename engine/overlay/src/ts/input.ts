// Control pad: buttons with data-key, and a d-pad that reads the finger's position so the thumb can
// slide between arms. Output is keypad key names for wie (2/4/6/8, 5, 1/3/7/9, 0, #, *, CLR).
// Pointer events, so several fingers can hold keys at once.
import type { PlayerSession } from "./backend";

export function mountInput(session: PlayerSession, pad: HTMLElement, dpad: HTMLElement) {
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
    if (dir) { release(dir, pointer); arms.get(dir)!.classList.remove("on"); }
    dir = next;
    if (dir) { press(dir, pointer); arms.get(dir)!.classList.add("on"); }
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

  window.addEventListener("blur", () => { held.clear(); dir = ""; pointer = -1; for (const a of arms.values()) a.classList.remove("on"); void session.releaseKeys(); });
}
