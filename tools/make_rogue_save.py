"""make_rogue_save.py <package dir with g1/n1/cf> <out.json>: dual-dagger 로그 operator save from the package save.

Job byte -> 로그; 컴뱃 나이프 in the main weapon slot 3 and the 배틀액스 record turned into the same dagger
type (category/index are not in the item checksum) in the off-hand slot 5 (slot 2 is the shield and
crashes the load); 5 combo stages and 10 rogue skills at their caps; slots 1/3/7/9 = 번개난타 / 단검난무 /
맹독감염 / 민첩태세. Verified in game."""
import sys, base64, json, datetime; sys.path.insert(0, __import__("os").path.dirname(__file__))
import h2save as h
src, out = sys.argv[1], sys.argv[2]
gs, gtail = h.split(open(src + '/g1', 'rb').read(), h.G_KEYS)
ns, ntail = h.split(open(src + '/n1', 'rb').read(), h.N_KEYS)

def ci_parse(b):
    n, at, recs = b[0], 1, []
    for _ in range(n):
        ln = b[at]; at += 1; recs.append(bytearray(b[at:at + ln])); at += ln
    return recs, b[at:]
def ci_build(recs, rest):
    return bytes([len(recs)]) + b"".join(bytes([len(r)]) + bytes(r) for r in recs) + rest
def slot_off(r):                      # p.f (equip slot) sits after cp base: g h c(4) f(4) nl name d(4) e(4) | a b c e f
    return 11 + r[10] + 8 + 4
def name(r): return r[11:11 + r[10]].decode('euc-kr')

recs, rest = ci_parse(ns[1])
axe = next(r for r in recs if name(r) == '배틀액스')
knife = next(r for r in recs if name(r) == '컴뱃 나이프')
knife[slot_off(knife)] = 3                                     # main weapon slot (b.a():cf = slot 3)
axe[0], axe[1] = knife[0], knife[1]                            # turn the axe into the same dagger type (category/index are not in the item checksum)
nm = '쌍둥이 대거'.encode('euc-kr'); axe[10:11 + axe[10]] = bytes([len(nm)]) + nm
axe[slot_off(axe)] = 5                                         # off-hand slot (b.a():am = slot 5); slot 2 is the shield (q) and crashes with a weapon
ns[1] = ci_build(recs, rest)

head = bytearray(gs[0]); head[4] = 2                           # job: 0 버서커, 1 나이트, 2 로그
hero = bytearray(gs[1]); st = bytearray(gs[2])
hero[0] = 25
hero[1:3] = (10).to_bytes(2, 'big'); hero[3:5] = (20).to_bytes(2, 'big')
hero[5:9] = (9999).to_bytes(4, 'big'); hero[9:13] = (9999).to_bytes(4, 'big')
for i, v in enumerate((32, 50, 70, 25, 20)):                   # 힘 체력 민첩 의지 지력
    hero[17 + 2 * i:19 + 2 * i] = v.to_bytes(2, 'big')
hero[29:44] = bytes([1, 2, 3, 4, 5] + [5] * 6 + [3] * 4)       # rogue: 5 combo stages, skills k0..k9 at p5..p14 (ac.a caps)
hero[27] = 5
st[67:71] = bytes([6, 5, 4, 2])                                 # 1 번개난타, 3 단검난무, 7 맹독감염, 9 민첩태세
gs[0], gs[1], gs[2] = bytes(head), bytes(hero), bytes(st)
cf = bytearray(open(src + '/cf', 'rb').read()); cf[0] = (5 << 4) | 15; cf[1] = 0x20
ent = lambda nm, data: {"db": "wie_filesystem", "store": "files", "key": ["0056194389", nm], "data": base64.b64encode(data).decode()}
json.dump({"game": "hero-lore-2-web", "exported": datetime.datetime.now().isoformat(), "note": "운영자 세이브: 로그 LV25",
           "entries": [ent("cf", bytes(cf)), ent("g1", h.join(gs, h.G_KEYS, gtail)), ent("n1", h.join(ns, h.N_KEYS, ntail))]},
          open(out, 'w'), ensure_ascii=False)
print('->', out)
