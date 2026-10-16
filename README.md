# 영웅서기 2: 빙해의 검사 — 브라우저 포팅 (작업 중)

> 원작 **영웅서기 2: 빙해의 검사** (Heroes Lore: Knight of Frozen Sea, 2007)는
> **핸즈온모바일코리아**(구 엠포마코리아)가 만들고 SKT·KTF·LGT 피처폰으로 서비스된 게임입니다.
> 권리는 이후 인수한 EA에 있습니다. 이 저장소는 원작 게임의 코드와 에셋을 한 줄도 다시 그리지 않고,
> **SKT 자바판 원본을 그대로 브라우저에서 실행**하는 보존용 포팅입니다.
> 실행 코어는 dlunch의 WIPI/SKVM 에뮬레이터 [wie](https://github.com/dlunch/wie) (MIT)입니다.

## 목표

[영웅서기 1 웹판](https://github.com/LESANF/hero-lord-web)과 같은 경험으로 2편을 브라우저에서 바로 플레이.

- 원작 그대로: SKT판 `.jar`(자바 바이트코드 97개 클래스 + 에셋)를 wie 코어로 실행. 맵 111개·엔딩 텍스트 전부 내장, 네트워크 기능 없이 엔딩까지 가능(`docs/01-analysis.md`).
- 조작·화면은 1편 웹판과 동일: 떠다니는 8방향 조이스틱, 공격·스킬·아이템 원형 버튼, 키보드(WASD/Space/1·3·7·9/Q/Esc), 자동 저장, 세이브 내보내기/가져오기, 아이폰 터치 보정.
- 피처폰 키패드(2·4·6·8 이동, 5 공격, 1·3·7·9 스킬, 0 아이템, # 교체, * 지도, CLR 메뉴)는 우리 입력층이 대신 눌러 줍니다.

## 구성 (예정)

| 경로 | 역할 |
|---|---|
| `docs/` | 원본 분석, 호환성 검증 기록 |
| `tools/` | SKT 패키지 풀기(`unwrap_skt_jar.py`), 인벤토리 |
| `engine/` | wie를 고정 커밋으로 받아 wasm 코어를 빌드하는 스크립트 |
| `web/` | 페이지, 조이스틱·HUD 입력층, 세이브 도구 |

## 크레딧

- 원작: 핸즈온모바일코리아 (엠포마코리아) · 퍼블리싱 SK텔레콤 외 · 현재 권리 EA
- 에뮬레이터 코어: [wie](https://github.com/dlunch/wie) by dlunch (MIT)
- 참고: [Heroes Lore 2 Recomp](https://github.com/davidkalil10/Heroes-Lore-2-The-Knight-of-Frozen_Sea-Recomp) (해외 J2ME판 네이티브 리컴파일)
- 1편 웹판: [hero-lord-web](https://github.com/LESANF/hero-lord-web)
