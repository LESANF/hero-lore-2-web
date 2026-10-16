# hero-lore-2-web

## This game was made by Hands-On Mobile Korea

> **영웅서기 2: 빙해의 검사 (Heroes Lore: Knight of Frozen Sea, 2007) was developed by Hands-On Mobile Korea
> (formerly mforma Korea), later part of EA Mobile.** This repository is only the tooling that runs the
> shipped mobile build in a web browser. Nothing of the game (graphics, sound, script, data, design) was
> created or changed here.

- Live: https://lesanf.github.io/hero-lore-2-web/ (GitHub Pages, rebuilt from `main` by Actions; only the latest deployment is ever served)
- Part 1 in the browser: [hero-lord-web](https://github.com/LESANF/hero-lord-web)

## How it works

The 2007 release is a Java ME application for Korean feature phones. It is run unmodified on
[wie](https://github.com/dlunch/wie) (MIT), an open-source emulator for those phones that compiles to
WebAssembly. This repository adds the page around it: the loading screen, a touch layer with a floating
stick and round buttons laid out like hero-lord-web, keyboard bindings, and the build/deploy pipeline.

```
game package ─▶ wie core (Rust → wasm, pinned commit) ─▶ canvas 240×320
                        + engine/overlay/ (our page, input layer, styles)   ─▶ static site
```

| step | file | notes |
|---|---|---|
| analysis | `docs/01-analysis.md` | what is in the package, which keys the game reads, what blocks nothing |
| package | `tools/clean_package.py` | keeps the four application files, drops stray user data |
| core | `engine/build.sh`, `engine/WIE_COMMIT` | shallow-fetches wie at one commit, runs `wasm-pack` + webpack |
| page | `engine/overlay/src/{html,ts,css}` | `hero.ts` loads package and font and starts the session; `input.ts` is the touch layer |
| deploy | `.github/workflows/pages.yml` | downloads the package from the `skt-pkg` release, builds, publishes `build/web` |

Single-threaded wasm, so no COOP/COEP headers are needed and any static host works. The only edit to wie
is one URL made relative so the bundle works under a sub-path.

## Controls

The game is keypad-driven. The page maps a stick and buttons onto those keys, the same arrangement as
hero-lord-web; keyboard works on desktop.

| action | touch | keys |
|---|---|---|
| move | floating stick (lower-left area) | W A S D, arrows |
| attack / confirm | 공격 | Space, Enter |
| skill slots | 스킬 1 · 3 · 7 · 9 | 1, 3, 7, 9 |
| item | 아이템 | Q |
| cycle item | 교체 | E |
| map | 지도 | M |
| menu / back | 메뉴 | Esc, Backspace |

## Saves

The game saves into the browser (IndexedDB, per site). The **세이브** pill at the top-left opens a sheet
with 세이브 내보내기 (downloads one JSON with every stored entry) and 세이브 가져오기 (writes a file
back and reloads). Use it to move progress between devices or browsers.

## Build

```
GAME=path/to/hero2.zip sh engine/build.sh      # needs node 20+, rust stable, wasm32 target, wasm-pack
cd build/web && python3 -m http.server 8791
```

`docs/00-handoff.md` tracks status and decisions so work can resume from any machine.

## Credits

- Game: Hands-On Mobile Korea / mforma Korea (rights now with EA). Taken down on request.
- Emulator core: [wie](https://github.com/dlunch/wie) by dlunch, MIT.
- Reference: [Heroes Lore 2 Recomp](https://github.com/davidkalil10/Heroes-Lore-2-The-Knight-of-Frozen_Sea-Recomp).
