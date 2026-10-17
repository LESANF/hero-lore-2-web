#!/usr/bin/env python3
"""h2save.py: 영웅서기 2 (SKT) save codec. g = 5 sections, n = 3 sections; each [len u16be][xor body + parity]."""
M = bytes([5, 71, 24, 59, 43, 16]); N = bytes([14, 26, 72, 10, 28, 98]); O = bytes([67, 12, 35, 68, 91, 43])
G_KEYS = [M, N, O, M, N]
N_KEYS = [O, M, N]

def enc(data, key):
    out, s, k = bytearray(), 0, 0
    for b in data:
        k = (k + 1) % len(key); s += key[k]; out.append(b ^ key[k])
    out.append(s & 0xFF); return bytes(out)

def dec(data, key):
    out, s, k = bytearray(), 0, 0
    for b in data[:-1]:
        k = (k + 1) % len(key); s += key[k]; out.append(b ^ key[k])
    assert (s & 0xFF) == data[-1], "parity"
    return bytes(out)

def split(raw, keys):
    secs, at = [], 0
    for key in keys:
        ln = (raw[at] << 8) | raw[at + 1]; at += 2
        secs.append(dec(raw[at:at + ln], key)); at += ln
    return secs, raw[at:]          # g has 4 trailing bytes (buffer is sized +14, writer fills +10)

def join(secs, keys, tail=b""):
    out = b""
    for s, key in zip(secs, keys):
        e = enc(s, key); out += len(e).to_bytes(2, "big") + e
    return out + tail

if __name__ == "__main__":
    import sys
    src = sys.argv[1]
    g = open(f"{src}/g1", "rb").read(); n = open(f"{src}/n1", "rb").read()
    gs, gt = split(g, G_KEYS); ns, nt = split(n, N_KEYS)
    assert join(gs, G_KEYS, gt) == g and join(ns, N_KEYS, nt) == n, "roundtrip"
    print("g tail", gt.hex(), "n tail", nt.hex())
    for i, s in enumerate(gs): print(f"g{i} {len(s):4d}: {s.hex()}")
    for i, s in enumerate(ns): print(f"n{i} {len(s):4d}: {s.hex()}")
