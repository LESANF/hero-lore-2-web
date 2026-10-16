// Touch layer: a floating 4-way stick in the lower-left zone and round buttons on the right,
// the same arrangement as hero-lord-web. Output is keypad key names for wie (2/4/6/8, 5, 1/3/7/9,
// 0, #, *, CLR). Pointer events, so several fingers can hold keys at once.
import type { PlayerSession } from "./backend";

const DIRS: Array<[string, number, number]> = [["8", 0, 1], ["2", 0, -1], ["6", 1, 0], ["4", -1, 0]];

export function mountInput(session: PlayerSession, hud: HTMLElement, zone: HTMLElement, stick: HTMLElement) {
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

  // buttons
  for (const button of hud.querySelectorAll<HTMLElement>("[data-key]")) {
    const key = button.dataset.key!;
    button.addEventListener("pointerdown", (e) => { e.preventDefault(); button.setPointerCapture(e.pointerId); button.classList.add("down"); press(key, e.pointerId); });
    const up = (e: PointerEvent) => { button.classList.remove("down"); release(key, e.pointerId); };
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("lostpointercapture", up);
    button.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // floating stick: appears under the first finger that lands in the zone, 4-way with a dead zone
  const knob = stick.querySelector<HTMLElement>(".knob")!;
  let pointer = -1, ox = 0, oy = 0, dir = "";
  const RADIUS = 56, DEAD = 12;
  const setDir = (next: string) => {
    if (next === dir) return;
    if (dir) release(dir, pointer);
    dir = next;
    if (dir) press(dir, pointer);
  };
  zone.addEventListener("pointerdown", (e) => {
    if (pointer !== -1) return;
    e.preventDefault();
    pointer = e.pointerId; ox = e.clientX; oy = e.clientY;
    zone.setPointerCapture(pointer);
    stick.style.left = `${ox}px`; stick.style.top = `${oy}px`;
    stick.classList.add("show");
    knob.style.transform = "translate(-50%, -50%)";
  });
  zone.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointer) return;
    const dx = e.clientX - ox, dy = e.clientY - oy;
    const len = Math.hypot(dx, dy);
    const k = len > RADIUS ? RADIUS / len : 1;
    knob.style.transform = `translate(calc(-50% + ${dx * k}px), calc(-50% + ${dy * k}px))`;
    if (len < DEAD) { setDir(""); return; }
    let best = "", bestDot = 0;
    for (const [key, x, y] of DIRS) { const dot = (dx * x - dy * y) / len; if (dot > bestDot) { bestDot = dot; best = key; } }
    setDir(best);
  });
  const end = (e: PointerEvent) => {
    if (e.pointerId !== pointer) return;
    setDir("");
    pointer = -1;
    stick.classList.remove("show");
  };
  zone.addEventListener("pointerup", end);
  zone.addEventListener("pointercancel", end);
  zone.addEventListener("lostpointercapture", end);

  window.addEventListener("blur", () => { held.clear(); dir = ""; pointer = -1; stick.classList.remove("show"); void session.releaseKeys(); });
}
