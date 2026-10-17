# 영웅서기 2 웹판 — 컨트롤 패드 에셋 요구사항

이미지 생성 에이전트에게 주는 문서. 이 폴더의 PNG/JPG가 톤 레퍼런스다.

## 무엇을 만드는가

2007년 피처폰 RPG(240×320 픽셀아트)를 브라우저에서 돌리는 포트다. 게임 화면 안의 그래픽은
원작 그대로 두고, **게임 화면 바깥**에 게임보이/Delta 에뮬레이터식 컨트롤 패드를 붙인다.
배치는 `layout-wireframe.png`의 **왼쪽(세로) 하나만** 쓴다. PC·가로·폴더블도 같은 세로 컬럼을
가운데 놓고 쓴다(PC는 키보드가 주 입력이라 패드는 보조).

```
┌──────────────────────┐
│      게임 화면        │  원작 그래픽, 손대지 않음 (240×~340, 1.6배 확대)
├──────────────────────┤
│ [지도]          [메뉴] │  상단 띠 (게임보이 L/R 자리)
│  ┼ 십자키   ○○ 스킬   │  왼쪽 십자키, 오른쪽 스킬 2×2 + 큰 공격 버튼
│            ○○   ◎공격 │
│      [회복] [교체]     │  하단 띠 (Select/Start 자리)
└──────────────────────┘
```

## 톤

- 레퍼런스: `hud-bar.png`(인게임 하단 바), `title-menu-box.png`(금색 메뉴 박스),
  `menu-frame-top.png`(테두리 장식), `ingame-full.jpg`(전체 화면).
- 구성: **어두운 면 + 밝은 금속 테두리**. 면은 남색~검은 돌(#0b1326, #1a1f33 계열),
  테두리는 황동·금(#c9a24a, #e8c872, 하이라이트 #fff2c0), 음영은 갈색(#5a3f1c).
- 질감: 돌·금속의 미세한 질감은 좋지만 픽셀아트일 필요는 없다. 패드는 게임 밖이라 고해상도로
  매끈하게 그려도 된다. 다만 게임 UI와 나란히 놓였을 때 한 세트로 보여야 한다.
- 패드 바닥은 버튼보다 한 톤 어두운 평면. 버튼이 바닥에서 **떠 보여야** 한다(약한 드롭 섀도).

## 시인성 (가장 중요)

- 아이콘 위주, 글자 의존 금지. 라벨 텍스트는 코드에서 얹는다.
- 아이콘은 단색(흰색 또는 밝은 금색) + 1px 어두운 외곽선. 작은 크기(실표시 26~50px)에서
  뭉개지지 않도록 디테일은 최소.
- 버튼끼리 색으로 역할이 구분되면 좋다: 공격 = 붉은 기 도는 금, 스킬 = 푸른 기, 회복 = 초록 기,
  나머지 = 중립 금. 과하지 않게, 테두리 색 정도.
- 눌림 상태는 **그리지 않아도 된다.** 코드에서 어둡게 + 2px 내려 + 그림자 제거로 처리한다.
  공격 버튼만 눌린 버전을 추가로 주면 더 좋다(선택).

## 에셋 목록

최종 배치(2026-10-17, `~/Downloads/hero2-hud-ref/HANDOFF-FINAL.md`): 십자키 140 (8,96), 스킬 63×48 (156/231, 112/172), 공격 84 (304,124), 회복·교체 알약, SAVE 90×24 가운데. 누르는 동안 금빛(`.key.down`).
십자키 수정(2026-10-17, `HANDOFF-DPAD.md`, 정답 `layout-target-440x880.png`): 세로 화면에서 십자키 210(레이아웃은 184 유지, 아이템 알약 모서리에 끼움), 팔 굵은 `dpad.png`, 공격 아래 뒤로가기 `btn-back.png` 64(키 CLR = 메뉴와 같음). 패드 배율은 폭 525 디자인 px를 넘지 않음(`PAD_W`).

투명 PNG, 정사각(또는 명시된 비율) 캔버스, 실제 표시 크기의 2배. 파일명 그대로.

| 파일 | 크기(px) | 내용 |
|---|---|---|
| `dpad.png` | 300×300 | 십자키 한 덩어리. 네 팔에 ▲▼◀▶ 음각. 가운데는 비움 |
| `btn-attack.png` | 180×180 | 원형, 검 아이콘. 제일 큰 버튼 |
| `btn-attack-pressed.png` | 180×180 | (선택) 눌린 상태 |
| `btn-back.png` | 180×180 | 뒤로가기(CLR), 공격 버튼 아래 |
| `hudbox/hudbox-empty-{1,3,7,9}.png` | 21×16 | 빈 스킬 칸 (게임 HUD 칸 그대로, 3배로 표시). 등록된 칸은 게임 HUD 칸(x 60/82/104/126, y h−19)을 테두리째 복사 |
| `pill-item-on.png` | 192×80 | 회복 아이템이 등록됐을 때의 알약 바탕. 위에 물약+개수(x 156, y h−17, 13×12)를 2배로 얹음 |
| `pill.png` | 160×64 | 알약형 틀. 회복·교체·지도·메뉴 4곳 공용 |
| `ico-potion.png` | 48×48 | 회복: 물약 병 |
| `ico-swap.png` | 48×48 | 교체: 양방향 화살표 (대화 중엔 "스킵"으로도 쓰임) |
| `ico-map.png` | 48×48 | 지도: 나침반 또는 접힌 지도 |
| `ico-menu.png` | 48×48 | 메뉴: 두루마리 또는 가로줄 3개 |
| `pad-bg.png` | 800×640 | 패드 바닥. 좌우로 늘려도 티 안 나는 평면 질감 (또는 `pad-tile.png` 256×256 타일) |
| `pad-divider.png` | 800×40 | (선택) 게임 화면과 패드 사이 장식 띠 |

완성형 4장(`pill-potion.png` 등 160×64)으로 줘도 된다.

## 작업 순서

1. 먼저 **스타일 시트 1장**: 위 요소를 한 화면에 모아 그린 것. 톤 확정용.
2. 확정 후 요소별로 생성. 크기는 대략이어도 된다(코드에서 맞춤). 배경은 투명 또는 단색 마젠타.

## 영어 프롬프트 힌트

공통 접두: `game controller button asset for a dark fantasy pixel-art RPG, dark navy stone face with
polished brass/gold ornamental border, subtle drop shadow, high contrast white icon with thin dark
outline, flat front view, centered, transparent background, no text, no watermark`

- dpad: `… cross-shaped directional pad as one piece, four arms with engraved arrows, empty center`
- attack: `… large round button, white sword icon, warm red-gold border`
- skill: `… round button, blank rune disc / magic circle motif, cool blue-gold border`
- potion: `… small icon only, glass potion bottle, green liquid`
- swap: `… small icon only, two curved arrows forming a cycle`
- map: `… small icon only, compass rose`
- menu: `… small icon only, rolled parchment scroll`
- pad-bg: `… seamless flat panel texture, dark stone with faint engraved border pattern, no buttons`

## 키보드 (참고, 코드 쪽)

W A S D 이동 · U I / J K 스킬 1 3 / 7 9 · Space·Enter·L 공격/확인 · O 회복(0) · P 교체/스킵(#) ·
; 지도(*) · Esc·Backspace 메뉴(CLR). 패드 버튼 위에 키 힌트를 작게 표시하되 터치 기기에선 숨긴다.

## 랜딩 (2026-10-17, `~/Downloads/hero2-pad-assets/landing/HANDOFF-LANDING.md`)

`assets/logo.png`(1200×655, FAN-MADE WEB PORT 포함), `assets/landing/btn-start@2x.png`·`btn-start-loading@2x.png`(글자까지 그림, 버튼이 disabled면 LOADING),
`bar-frame.png`(9-slice: slice 6 30, 화면 3px 15px), `bar-fill.png`(32×12로 가로 반복). 눈 효과·dev 크레딧 줄 없음, 버전은 우하단.
