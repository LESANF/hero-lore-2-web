#!/bin/sh
# Build the browser bundle: pinned wie checkout + our overlay page -> build/web/
#   GAME=/path/to/hero2.zip engine/build.sh      (GAME optional: copies the game package in for local play)
# Needs: node 20+, rust + wasm32-unknown-unknown + wasm-pack in ~/.cargo/bin (see docs/00-handoff.md).
set -eu
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
COMMIT=$(cat engine/WIE_COMMIT)
export HERO_VERSION="v$(cat VERSION)+$(git rev-parse --short HEAD 2>/dev/null || echo local)"   # shown on the landing

mkdir -p build
if [ ! -d build/wie/.git ]; then
  git init -q build/wie
  git -C build/wie remote add origin https://github.com/dlunch/wie.git
fi
if [ "$(git -C build/wie rev-parse HEAD 2>/dev/null || true)" != "$COMMIT" ]; then
  git -C build/wie fetch -q --depth 1 origin "$COMMIT"
  git -C build/wie checkout -q "$COMMIT"
fi
git -C build/wie checkout -q -- wie-web/src/ts/midi.ts wie-skvm/src/classes/com/xce/lcdui/x_display.rs wie-web/src/ts/backend/wasm.ts wie-backend/src/executor.rs wie-web/src/rust/filesystem.rs wie-skvm/src/classes/net/wie/wie_audio_clip.rs   # undo our edits before re-applying
# engine/patches: XDisplay reports the real screen size (wie hardcodes 240x320), canvas size from data-w/h
git -C build/wie apply ../../engine/patches/screen-size.patch
git -C build/wie apply ../../engine/patches/skt-audio-clip.patch   # com.skt.m.AudioClip plays MMF through the SMAF player (stubs upstream)
git -C build/wie apply ../../engine/patches/fs-cache.patch          # file reads served from memory, not one IndexedDB round trip per read

# Overlay: our page, entry config, and two one-line sed patches so the bundle works under a sub-path
# (GitHub Pages serves this project at /hero-lore-2-web/, wie assumes the site root).
cp -R engine/overlay/. build/wie/wie-web/
sed -i.bak 's#"/spessasynth_processor.min.js"#new URL("spessasynth_processor.min.js", document.baseURI).href#' build/wie/wie-web/src/ts/midi.ts
sed -i.bak 's#^let audioReady:#export let audioReady:#' build/wie/wie-web/src/ts/midi.ts   # page resumes the AudioContext on the start tap
rm -f build/wie/wie-web/src/ts/midi.ts.bak

(cd build/wie && npm ci --no-audit --no-fund --silent && npx webpack --config wie-web/webpack.config.hero.ts)

rm -rf build/web && cp -R build/wie/wie-web/dist build/web
if [ -n "${GAME:-}" ]; then
  mkdir -p build/web/game
  python3 -I tools/clean_package.py "$GAME" build/web/game/hero2.zip
  python3 -I tools/patch_game.py build/web/game/hero2.zip      # our byte patches to the game classes (docs/05-game-patches.md)
fi
ls -la build/web
