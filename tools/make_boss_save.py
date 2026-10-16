"""make_boss_save.py <package dir with g1/n1/cf> <out.json>: operator save built from the original package save.

No game data lives in the repo; point it at an unpacked package (the archive build ships the previous
owner's LV19 save). Field layout notes are inline; codec in h2save.py."""
import sys, base64, json, datetime; sys.path.insert(0, __import__("os").path.dirname(__file__))
import h2save as h
src, out = sys.argv[1], sys.argv[2]
g = open(src + '/g1', 'rb').read(); n = open(src + '/n1', 'rb').read()
gs, tail = h.split(g, h.G_KEYS)
hero = bytearray(gs[1]); st = bytearray(gs[2])
# hero (b.a(byte[])): level u8, statPts s16, skillPts s16, hp i32, sp i32, exp i32, str/vit/agi/will/int s16 x5, combo u8, r u8, p[15]
hero[0] = 25
hero[1:3] = (10).to_bytes(2, 'big')       # stat points to spend
hero[3:5] = (20).to_bytes(2, 'big')       # skill points to spend
hero[5:9] = (9999).to_bytes(4, 'big')     # current HP/SP high; the game clamps to max on the next change
hero[9:13] = (9999).to_bytes(4, 'big')
for i, v in enumerate((40, 70, 28, 25, 20)):   # 힘 체력 민첩 의지 지력
    hero[17 + 2 * i:19 + 2 * i] = v.to_bytes(2, 'big')
# p: combo stages p0..3 (cap n+1), berserker skills k0..k10 at p4..p14 (cap 5 for k0..k6, then 3,3,1,3)
p = [1, 2, 3, 4] + [5] * 7 + [3, 3, 1, 3]
hero[29:44] = bytes(p)
hero[27] = 4                               # combo count = leading stages > 0 (b.q)
# skill slots u.j[4]: value v = berserker skill k = v-1
st[67:71] = bytes([6, 7, 1, 4])            # 1 폭풍강타, 3 사자후, 7 휘두르기, 9 분노태세
gs[1] = bytes(hero); gs[2] = bytes(st)
g2 = h.join(gs, h.G_KEYS, tail)
assert h.split(g2, h.G_KEYS)[0][1] == gs[1]
cf = bytearray(open(src + '/cf', 'rb').read()); cf[0] = (5 << 4) | 15; cf[1] = 0x20
ent = lambda name, data: {"db": "wie_filesystem", "store": "files", "key": ["0056194389", name], "data": base64.b64encode(data).decode()}
json.dump({"game": "hero-lore-2-web", "exported": datetime.datetime.now().isoformat(),
           "note": "운영자 세이브: 버서커 LV25, 스킬 전부 최대, 슬롯 1 폭풍강타 / 3 사자후 / 7 휘두르기 / 9 분노태세, 보스 쉐도우 앞",
           "entries": [ent("cf", bytes(cf)), ent("g1", g2), ent("n1", n)]}, open(out, 'w'), ensure_ascii=False)
print("hero", hero.hex()); print("slots", list(st[67:71])); print("->", out)
