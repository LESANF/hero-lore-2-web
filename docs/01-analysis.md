# 01 · SKT판 원본 분석 (2026-10-16)

대상: `영웅서기2.zip` (archive.org "100+ Korean WIPI Cell Phone Games Collection" 수록본).
도구: Python 표준 라이브러리로 패키지 열기, CFR 0.152로 디컴파일, JDK 21 `javap`, REA 6.5.0 아카이브 인벤토리(evidence `ev_338893…`), wie 웹 에뮬레이터 실행 검증.

## 패키지 구조

```
0056194389.jar   811,665 B   SKT 래퍼 헤더(32바이트 `20 00 00 00 00 00 00 00 …`) 뒤에 표준 zip
0056194389.msd   1,034 B     MIDlet 설명자 (MIDlet-Name 영웅서기2_빙해의검사, Vendor (주)핸즈온모바일코리아,
                             Jar-URL wipi.nate.com …/skvm/…, MicroEdition-Profile M_Profile-1.0)
0056194389.mod / .wmr        SKT 설치 메타
n1, g1, cf                   원 소유자의 세이브·설정 파일 (599 / 525 / 10 B)
```

jar 안 (헤더를 떼면 평범한 zip):

| 디렉터리 | 개수 | 내용 |
|---|---|---|
| `hero/` | 423 | 주인공 스프라이트 `.mph`(헤더)/`.mpd`(데이터) 쌍 |
| `enm/` | 194 | 적 스프라이트 |
| `m/` | 137 | 맵 `.m` 111개 + 부속 |
| `npc/` | 126 | NPC |
| `itm/` | 36 | 아이템 |
| `snd/` | 30 | MMF(SMAF) 음악·효과음 |
| `img/`, `b/`, `ftd/` | 46 | UI 이미지, 배경, 폰트 |
| `t/` | 20 | 텍스트 테이블 `.tdf` — `q.tdf`(퀘스트 255), `ed.tdf`(엔딩), `help.tdf`, `nt.tdf`(네트워크), `sk0~2.tdf`(스킬) |
| `rpg/` | 2 | MIDlet 진입 클래스 `rpg.RPGHero2` |
| 루트 `*.class` | 95 | 난독화된 게임 클래스 (a, aa, ab, …) |

클래스 파일 버전 45 (CLDC). 쓰는 API: `javax.microedition.lcdui.*`(Graphics 2,083회, Image 782회),
`com.skt.m.AudioClip/AudioSystem/Device`, `com.xce.io.XFile`, `com.xce.lcdui.XDisplay`,
`javax.microedition.io.Connector/StreamConnection`. wie의 `wie-skvm` 크레이트가 이 `com.skt.m.*`·`com.xce.*`를 구현합니다.

## 엔딩까지 막는 요소가 있는가

- **네트워크**: 클래스 `af` 하나가 소켓을 엽니다. 호출처는 메뉴의 `네트워크창고 / 네트워크대전 / 선물하기 / 겜존가기`(`t/com.tdf`)와 랭킹 전송뿐. 서버 주소는 `skt.mforma.co.kr/skt/444/hero2/network_down.asp`, `mplayonwap.nate.com`, `www.sk01.co.kr`. 싱글 진행을 막는 인증·DRM 없음.
- **전화번호(`m.MIN`)**: `af.a()`가 통신사 접두(011/016/017/018/019)를 붙여 네트워크 패킷에만 넣습니다. 세이브·진행과 무관.
- **추가 다운로드 팩**: `as.java:960`이 `<이름>.jar`가 있으면 거기서 리소스를 읽는 분기가 있지만, 본 jar에 맵 111개가 전부 들어 있어 2편은 추가 팩 없이 완결입니다(1편은 `m7.jar`, `m8.jar`를 받는 구조이고 아카이브에 포함됨).
- **엔딩 텍스트**: `t/ed.tdf`에 이안·클레르·레아 에필로그 대사가 들어 있음.

## 입력

`bd.java`가 `Canvas.keyPressed/keyReleased`를 받아 처리합니다. 사용 키코드(ASCII):

| 키 | 코드 | 역할 |
|---|---|---|
| 2 4 6 8 | 50 52 54 56 | 이동 |
| 5 / OK | 53 | 공격·조사·확인 |
| 1 3 7 9 | 49 51 55 57 | 스킬 슬롯 |
| 0 | 48 | 회복 아이템 |
| # | 35 | 아이템 교체 |
| * | 42 | 미니맵 |
| CLR | -7 (소프트키) | 메뉴 |

`bd.keyPressed`는 `getGameAction`도 호출하므로 방향키 게임액션(UP/DOWN/LEFT/RIGHT/FIRE)도 받습니다.
우리 조이스틱·HUD는 이 코드를 그대로 wie에 넣어 주면 됩니다 (`WieWeb.key_down(key)` / `key_up(key)`).

## 실행 검증 (wie, 헤드리스 Chrome)

- 부팅 → 타이틀(V.1.0.2) → 이어하기(동봉 세이브: 버서커 LV19, 달성도 13%) → 던전 전투 정상.
- 스킬 1·3 이펙트, 피격 파편·데미지 숫자, 포션 사용 이펙트와 개수 감소, 적 공격에 의한 HP 감소 모두 그려짐.
- 콘솔: `Font` 스텁 경고와 선택 파일 `FileNotFoundException`만 있고 치명 오류 없음.
- 1편(SKT, 엠포마 VER 1.0.2)도 같은 방법으로 타이틀·캐릭터 선택까지 확인.
- 아직 안 한 것: 처음부터 엔딩까지의 실제 완주, 사운드.
- 와이드 실험: 캔버스를 426×320으로 두고 실행해도 그려지는 영역은 x 0~239(타이틀 로고 중심도 120, 메뉴 테두리도 240에서 끝남). 레이아웃이 게임 안에 240으로 박혀 있어 wie만으로는 폭을 넓힐 수 없다.

## 권리 메모

핸즈온모바일코리아 → 2008 EA 인수(EA모바일코리아) → 2011 EA코리아 철수 → 2014-04-01 WIPI 서비스 종료 → 2015 EA 본사 합병.
공식 재출시 없음. KIPRIS 상표 자동 조회 "영웅서기" 0건(재확인 필요). 저작권은 EA에 남아 있다고 보는 것이 맞으며, 요청 시 즉시 내립니다.
