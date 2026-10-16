#!/usr/bin/env python3
"""patch_game.py <package.zip> [out.zip]

Applies our byte patches to the game classes inside the SKT jar of a package (in place unless
`out.zip` is given). Each patch is a unique byte pattern in one class, verified before replacing,
so an unexpected jar fails loudly instead of being half patched. The 32-byte SKT wrapper header is
kept as is (wie only checks its first bytes). Standard library only. See docs/05-game-patches.md.
"""
import io
import pathlib
import sys
import zipfile

HEADER = 32
PATCHES = [
    # class, find (hex), replace (hex), what
    ("cd.class", "1064a4", "1001a4", "publisher splash: auto-advance after 1 tick instead of 100 (cd.b: if a > 100 -> state 1)"),
    ("cd.class", "101ea4", "1000a4", "publisher splash: a key skips it immediately instead of after 30 ticks (cd.keyPressed)"),
    ("bg.class", "1009b7", "1006b7", "title menu: 6 items (새로하기 이어하기 환경설정 도움말 네트워크창고 네트워크대전); drops 선물하기/껨존가기 (WAP) and 게임종료"),
    ("bg.class", "b400149a001a", "b40014570000", "title menu 네트워크창고: always the message popup (getfield a; ifne -> pop; nop nop)"),
    ("bg.class", "1032b6", "1006b6", "title menu 네트워크창고: popup text = com.tdf #6 (was #50 캐릭터가 없습니다)"),
    ("bg.class", "00000073000000a1", "0000007300000073", "title menu 네트워크대전: tableswitch case 5 -> case 4 code (same popup)"),
]

# text tables (t/*.tdf): [count:u8] then per record [len:u16be][EUC-KR bytes]
TEXTS = {
    "t/com.tdf": {6: "준비중인 기능입니다;(LESANF)"},   # record 6 was 선물하기, no longer reachable
}


def patch_tdf(data: bytes, edits: dict) -> bytes:
    n = data[0]
    recs, at = [], 1
    for _ in range(n):
        ln = (data[at] << 8) | data[at + 1]
        recs.append(data[at + 2: at + 2 + ln])
        at += 2 + ln
    for idx, text in edits.items():
        old = recs[idx].decode("euc-kr", "replace")
        recs[idx] = text.encode("euc-kr")
        print(f"  tdf #{idx}: {old!r} -> {text!r}")
    out = bytes([n])
    for r in recs:
        out += bytes([len(r) >> 8, len(r) & 0xFF]) + r
    return out


def patch_class(name: str, data: bytes) -> bytes:
    for cls, find, repl, what in PATCHES:
        if cls != name:
            continue
        pat, new = bytes.fromhex(find), bytes.fromhex(repl)
        hits = [i for i in range(len(data)) if data.startswith(pat, i)]
        if len(hits) != 1:
            sys.exit(f"{cls}: expected exactly one match for {find}, found {len(hits)} ({what})")
        data = data[: hits[0]] + new + data[hits[0] + len(new):]
        print(f"  {cls} @{hits[0]}: {find} -> {repl}  # {what}")
    return data


def patch_jar(jar: bytes) -> bytes:
    head, body = jar[:HEADER], jar[HEADER:]
    assert body[:4] == b"PK\x03\x04", "no zip after the SKT header"
    src = zipfile.ZipFile(io.BytesIO(body))
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w") as dst:
        for info in src.infolist():
            data = src.read(info)
            if info.filename in {p[0] for p in PATCHES}:
                data = patch_class(info.filename, data)
            elif info.filename in TEXTS:
                data = patch_tdf(data, TEXTS[info.filename])
            dst.writestr(info, data, compress_type=info.compress_type)
    return head + out.getvalue()


def main() -> None:
    src_path = pathlib.Path(sys.argv[1])
    dst_path = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else src_path
    src = zipfile.ZipFile(src_path)
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            data = src.read(info)
            if info.filename.endswith(".jar"):
                print(f"{info.filename}:")
                data = patch_jar(data)
            dst.writestr(info, data)
    src.close()
    dst_path.write_bytes(out.getvalue())
    print(f"-> {dst_path} ({dst_path.stat().st_size} B)")


if __name__ == "__main__":
    main()
