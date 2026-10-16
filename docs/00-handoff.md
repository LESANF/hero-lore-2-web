# 00 · 작업 인수인계 (항상 최신으로 유지)

다른 세션·계정에서 "이어서 해"라고 하면 이 문서부터 읽는다. 상태 변경 시 같은 PR에서 이 문서도 고친다.

## 규칙
- 작성자 LESANF (`nagong1000@naver.com`), 모든 커밋 끝에 `Co-authored-by: claude[bot] <209825114+claude[bot]@users.noreply.github.com>` + 하네스 attribution. PR은 관심사 하나씩, 커밋은 잘게.
- 게임 파일(`*.zip`, `*.jar`)은 커밋하지 않는다. 원본은 archive.org "100+ Korean WIPI Cell Phone Games Collection"의 `영웅서기2.zip`.
- 배포: GitHub Pages(`pages.yml`, build_type=workflow). 게임 파일은 릴리스 `skt-pkg`의 `hero2.zip`(1편의 APK 릴리스와 같은 방식).

## 설계 결정
- 엔진은 [wie](https://github.com/dlunch/wie)(MIT) 코어를 그대로 wasm으로 빌드해 쓴다. 원작 jar를 수정하지 않는다.
- wie의 `WieWeb` 클래스(wasm-bindgen): `new(filename, bytes, canvas, fontData, audioPlayer, host?)`, `update()`를 매 프레임, `key_down(name)/key_up(name)`; 키 이름 `UP DOWN LEFT RIGHT OK 0~9 # * CLR`.
- 우리 입력층: 1편 웹판(hero-lord-web `web/web_shim.gd`, `web/index.html`)의 떠다니는 8방향 스틱·원형 버튼·키보드 매핑을 그대로 옮기되, 출력은 위 키 이름으로.
  - 스틱 8방향 → `UP/DOWN/LEFT/RIGHT`(대각선은 두 키 동시) 또는 `2/4/6/8`
  - 공격 `OK`(5), 스킬 `1 3 7 9`, 아이템 `0`, 교체 `#`, 지도 `*`, 메뉴 `CLR`
- 세이브: wie가 RMS/XFile을 IndexedDB에 저장. 내보내기/가져오기는 그 저장소를 덤프/복원하는 방식으로.

## 진행 상태
- [x] PR #1 분석 문서 + jar 언랩 도구 + 라이선스
- [x] PR #3 `engine/build.sh`: wie 고정 커밋(`engine/WIE_COMMIT`) + 오버레이(`engine/overlay/`) → `build/web/` (wasm 18 MB, 사운드폰트 1 MB). 로컬: `GAME=<영웅서기2.zip> sh engine/build.sh` 후 `cd build/web && python3 -m http.server 8791` → 타이틀·새 게임까지 키보드로 확인(2026-10-16)
- [x] PR #4 입력층 `engine/overlay/src/ts/input.ts`(스틱·버튼) + 세로 폰 배치. 폰 세로 에뮬로 확인
- [ ] 로딩 화면 로고·배경(1편 스타일). 원본 로고는 `img/logo.mph/.mpd` 자체 포맷이라 당장은 타이틀 캡처를 씀
- [ ] 세이브 내보내기/가져오기
- [x] PR #5 `.github/workflows/pages.yml`: 릴리스 `skt-pkg`의 `hero2.zip`(정리본)을 받아 빌드·배포. 1편과 같이 배포 기록은 1개만 남김
- [ ] 완주 소크 테스트(자동 플레이) 기록 → `docs/02-compat.md`

## 로컬 환경 (이 맥)
- Rust 1.99 + `wasm32-unknown-unknown` + wasm-pack 0.15: `~/.cargo/bin` (PATH 미수정, 쓸 때 `export PATH="$HOME/.cargo/bin:$PATH"`).
- JDK 21 `~/tools/jdk/jdk-21.0.12.1+1/Contents/Home/bin` (javap), CFR 0.152 jar는 세션 스크래치에 있음(필요하면 다시 받기).
- 검증용 wie 체크아웃과 디컴파일 결과는 세션 스크래치(`/private/tmp/claude-501/.../scratchpad/{wie,research}`)에 있고 사라질 수 있다. 리포 안의 것만 믿는다.
