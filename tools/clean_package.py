#!/usr/bin/env python3
"""clean_package.py <skt-package.zip> <out.zip>

Keeps only the app files (.jar, .msd, .mod, .wmr) from an SKT package. Archived packages
also carry the previous owner's save files (n1, g1, cf, ...) which would show up as
이어하기 for every new player; those are dropped. Standard library only.
"""
import sys
import zipfile

KEEP = (".jar", ".msd", ".mod", ".wmr")


def main(src: str, dst: str) -> None:
    with zipfile.ZipFile(src) as z, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as out:
        kept = []
        for info in z.infolist():
            if info.filename.lower().endswith(KEEP) and "/" not in info.filename:
                out.writestr(info.filename, z.read(info.filename))
                kept.append(info.filename)
    print(f"{dst}: {', '.join(kept)}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
