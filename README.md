# hero-lore-2-web

**English** | [한국어](README.ko.md)

> [!IMPORTANT]
> ## Fan-made · No ads · No revenue
> **This is an unofficial fan project.** It carries no ads and takes no money in any form.
> All rights to the game belong to its developer and current rights holder.
> **It will be taken down immediately on request or if any issue arises.**

## This game was made by Hands-On Mobile Korea

> **영웅서기 2: 빙해의 검사 (Heroes Lore: Knight of Frozen Sea, 2007) was developed by Hands-On Mobile Korea
> (formerly mforma Korea), later part of EA Mobile.** This repository is only the tooling that runs the
> shipped mobile build in a web browser. The game's graphics, sound, script, data and design were not made here.

- Live: paused while it is tested locally (it will return at https://lesanf.github.io/hero-lore-2-web/)
- Part 1 in the browser: [hero-lord-web](https://github.com/LESANF/hero-lord-web)

| Phone | Desktop |
|---|---|
| ![phone](docs/img/phone.jpg) | ![desktop](docs/img/pc.jpg) |

## What this port improves

The 2007 build was made for a 240×320 keypad phone. Running it as-is in a browser works, but it boots
slowly, plays silent, runs at 10 fps and has no way to hold a phone. These are the changes, each one small
and documented:

| | Before | After | Where |
|---|---|---|---|
| Sound | silent (the emulator's MMF clip class was a stub) | music and effects | `engine/patches/skt-audio-clip.patch` |
| 이어하기 load | 5.3 s | 0.6 s | `engine/patches/fs-cache.patch` |
| Boot to title | 4.9 s, publisher splash + PRESS ANY KEY | 2.4 s behind the landing screen, intro skipped | `tools/patch_game.py`, `hero.ts` |
| Game speed | NORMAL = 10 fps | NORMAL = 15 fps (option still picks one of four) | `docs/05-game-patches.md` |
| Screen shake | 4–5 px on every boss hit and skill | a quarter of it | `docs/05-game-patches.md` |
| Title menu | 9 items incl. dead WAP / gift / quit | 6 items; network menus show a 준비중 popup; rating badge and publisher logo gone | `docs/05-game-patches.md` |
| Controls | phone keypad 0–9 # * | game-boy style pad: d-pad, skill keys showing the in-game slot art, item / swap / back, keyboard on desktop | `engine/overlay/` |
| Screens | fixed 240×320 | fills any phone in portrait; desktop and landscape put the controls beside the game | `hero.ts` `layout()` |
| Saves | stuck in one browser | export / import as one JSON file | `saves.ts` |

Before / after clips: _coming_ (boot, speed, shake, controls).

Game-class edits are same-length byte patches applied to the package at build time (`tools/patch_game.py`;
the build fails if a pattern is not found exactly once). Engine edits are small patches on a pinned wie commit.
Nothing of the game itself is redrawn or rewritten.

## How it works

The game is a Java ME application for Korean feature phones. It runs on [wie](https://github.com/dlunch/wie)
(MIT), an open-source emulator for those phones that compiles to WebAssembly. This repository adds the page
around it.

```
game package ─▶ tools/patch_game.py ─▶ hero2.zip ─┐
wie core (Rust → wasm, pinned commit) + engine/patches/ ─▶ wasm ─┼─▶ static site
engine/overlay/ (page, pad, layout, saves) ─────────────────────┘
```

| step | file | notes |
|---|---|---|
| analysis | `docs/01-analysis.md` | what is in the package, which keys the game reads |
| package | `tools/clean_package.py`, `tools/patch_game.py` | keep the application files, apply the byte patches |
| core | `engine/build.sh`, `engine/WIE_COMMIT`, `engine/patches/` | fetch wie at one commit, patch, `wasm-pack` + webpack |
| page | `engine/overlay/src/{html,ts,css}` | `hero.ts` boots and lays out, `input.ts` is the pad, `saves.ts` export/import |
| deploy | `.github/workflows/pages.yml` | package from the `skt-pkg` release, build, publish `build/web` |

Single-threaded wasm, so no COOP/COEP headers are needed and any static host works.

## Controls

| action | pad | keys |
|---|---|---|
| move | d-pad | W A S D, arrows |
| attack / confirm | sword | Space, Enter, L |
| skill slots 1 · 3 · 7 · 9 | the four slot keys | U I / J K |
| item | potion pill | O |
| swap / skip dialogue | swap pill (shows 스킵 in dialogue) | P |
| map | map pill | ; |
| menu / back | menu pill, back button | Esc, Backspace |

Full list per screen: `docs/03-controls.md`. Key hints show on the pad only with a keyboard.

## Saves

The game saves into the browser (IndexedDB, per site). **SAVE** on the pad opens 세이브 내보내기 (one JSON
file with every stored entry) and 세이브 가져오기 (writes it back and reloads). Use it to move progress between
devices or browsers.

## Build

```
GAME=path/to/hero2.zip sh engine/build.sh      # node 20+, rust stable, wasm32 target, wasm-pack
cd build/web && python3 -m http.server 8791
```

Sound needs a secure context on phones (https or localhost). `docs/00-handoff.md` tracks status and decisions.

## Credits

- Game: Hands-On Mobile Korea / mforma Korea (rights now with EA). Taken down on request.
- Emulator core: [wie](https://github.com/dlunch/wie) by dlunch, MIT.
- Reference: [Heroes Lore 2 Recomp](https://github.com/davidkalil10/Heroes-Lore-2-The-Knight-of-Frozen_Sea-Recomp).
