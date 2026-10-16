#!/usr/bin/env python3
"""unwrap_skt_jar.py <skt-package.zip> <out.jar>

SKT(SK-VM) packages carry the game jar behind a 32-byte wrapper header, so zip tools
refuse it. This finds the first local-file signature and writes a plain jar, then prints
the MIDlet descriptor (.msd) and a short inventory. Standard library only.
"""
import io
import pathlib
import sys
import zipfile

MAGIC = b"PK\x03\x04"


def main(src: str, dst: str) -> None:
    pkg = zipfile.ZipFile(src)
    jar_name = next(n for n in pkg.namelist() if n.lower().endswith(".jar") and "/" not in n)
    raw = pkg.read(jar_name)
    start = raw.find(MAGIC)
    if start < 0:
        raise SystemExit(f"{jar_name}: no zip signature found")
    plain = raw[start:]
    pathlib.Path(dst).write_bytes(plain)
    for n in pkg.namelist():
        if n.lower().endswith(".msd"):
            print(pkg.read(n).decode("euc-kr", "replace").strip())
    jar = zipfile.ZipFile(io.BytesIO(plain))
    names = jar.namelist()
    classes = [n for n in names if n.endswith(".class")]
    print(f"\n{jar_name}: header {start} B stripped -> {dst} ({len(plain)} B, {len(names)} entries, {len(classes)} classes)")


if __name__ == "__main__":
    main(*sys.argv[1:3])
