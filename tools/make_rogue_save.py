"""make_rogue_save.py <package dir with g1/n1/cf/0056194389.jar> <out.json> [map]: dual-dagger 로그 operator save.

Start (third arg): `final` (default) = 신전지하 (map 62) two tiles below the stairs trigger (4,1) with
flag 119 set, so walking up plays the 율리케 scene -> 율리케 (108) -> 오딘, the final boss (109).
`ian` = 납골당 지하4층 (map 49) above the boss door (12,12) with quest var 22 = 1 and flag 42, so walking
down asks "보스룸으로 이동할까요?" and plays the 이안 intro. Trigger tiles are the map attribute layer
(ah.c, value = event id); conditions are the 31-byte event records (ae.a(byte[])). A number = that boss
room directly: 109 오딘, 108 율리케, 107 지하연구소 수호물, 106 디미트리, 105 하인츠, 104 이안, 103 당주.
Weapons also get what the bi enchant screen can add: 인장 at its max (+10 each), 특성 구 (cf.i) and
속성 결정 (am.n).

Job byte -> 로그 LV75; 5 combo stages and 10 rogue skills at their caps; slots 1/3/7/9 = 번개난타 / 급소가격 /
맹독감염 / 민첩태세. The old gear is replaced by top-tier items built from the jar's item tables (/itm/NN),
rolled at max and fully upgraded (p.d = m). Weapons use k=0 items: cf.c() scales attack by (10-k)/10 since
the hero field it compares against (b.b) is never raised. Equip slots: 0 gloves, 1 head, 2 accessory (q),
3 main weapon, 4 armor, 5 off-hand (dagger here; slot 2 crashes with a weapon), 6 boots."""
import sys, os, struct, zipfile, random, base64, json, datetime; sys.path.insert(0, os.path.dirname(__file__))
import h2save as h
src, out = sys.argv[1], sys.argv[2]
jar = zipfile.ZipFile(src + '/0056194389.jar')
gs, gtail = h.split(open(src + '/g1', 'rb').read(), h.G_KEYS)
ns, ntail = h.split(open(src + '/n1', 'rb').read(), h.N_KEYS)

def table(cat, idx):                  # /itm/NN: [u16be len][record]...; ints little-endian (f.b)
    raw, at = jar.read(f'itm/{cat:02d}'), 0
    for _ in range(idx): at += 2 + struct.unpack_from('>H', raw, at)[0]
    return raw[at + 2:at + 2 + struct.unpack_from('>H', raw, at)[0]]

def item(cat, idx, slot, trait=0, elem=0):             # save record = cp.a() + p.a() + am.a()/q.a() + cf.a(), big-endian
    t = table(cat, idx); le = lambda o: struct.unpack_from('<i', t, o)[0]
    price = le(0); o = 4 + 1 + t[4]; name = t[5:5 + t[4]]; o += 1 + t[o]
    pabc = t[o:o + 3]; opt = struct.unpack_from('10b', t, o + 4); o += 14
    rolls = [10] * 5 if cat <= 4 else [opt[2 * i + 1] for i in range(5)]   # weapons: 인장 max (bi: h*3+4); others: table max
    f = random.randint(1000, 2000000000)
    s = sum(r << (1 if i in (0, 3, 4) else 2) for i, r in enumerate(rolls)) + f // 1000 % 10
    tail = b''
    if cat in (11, 12):
        qa, qb, qA, qB = t[o + 1], t[o + 3], le(o + 8), le(o + 16)    # range maxes
        upg = 0; s = (s % 100 + (qa << 1) + (qb << 2) + qA + qB) % 100
        tail = struct.pack('>hhii', qa, qb, qA, qB)
    else:
        k, l, a, m, n, b = t[o], t[o + 1], le(o + 2), t[o + 6], t[o + 7], le(o + 9); o += 13
        n = elem or n; upg = m; s = ((s + (upg << 2)) % 100 + (n << 3) + b) % 100
        tail = struct.pack('>BBhBBBh', k, l, a, upg, m, n, b)
        if cat <= 4:
            c, j = le(o), t[o + 4]
            s = (s + ((b - c) << 1) + c + (trait << 1)) % 100
            tail += struct.pack('>hBB', c, j, trait)
    head = struct.pack('>BBii', cat, idx, 1, f) + bytes([len(name)]) + name + struct.pack('>ii', price, 0)
    return head + bytes(pabc) + struct.pack('>bb', s, slot) + bytes(rolls) + tail

GEAR = [(3, 29, 3, 5, 4), (3, 29, 5, 3, 5),          # 수마의 송곳니 x2 (best k=0 dagger): 투지/빛, 흡수/암흑
        (5, 27, 1), (6, 49, 4), (8, 49, 0), (9, 49, 6),  # 파괴마의 머리, 열화의 흉갑/손길/발자국
        (11, 14, 2)]                                 # 선지자의 유산
b, at, keep = ns[1], 1, []
for _ in range(b[0]):
    ln = b[at]; r = b[at + 1:at + 1 + ln]; at += 1 + ln
    if ln and r[0] > 12: keep.append(r)             # drop all old equipment, keep consumables/materials
recs = keep + [item(*g) for g in GEAR]
ns[1] = bytes([len(recs)]) + b''.join(bytes([len(r)]) + r for r in recs) + b[at:]

head = bytearray(gs[0]); head[4] = 2                 # job: 0 버서커, 1 나이트, 2 로그
hero = bytearray(gs[1]); st = bytearray(gs[2])
hero[0] = 75
hero[1:3] = (10).to_bytes(2, 'big'); hero[3:5] = (20).to_bytes(2, 'big')
hero[5:9] = (99999).to_bytes(4, 'big'); hero[9:13] = (99999).to_bytes(4, 'big')
for i, v in enumerate((70, 110, 160, 60, 50)):       # 힘 체력 민첩 의지 지력
    hero[17 + 2 * i:19 + 2 * i] = v.to_bytes(2, 'big')
hero[29:44] = bytes([1, 2, 3, 4, 5] + [5] * 6 + [3] * 4)   # 5 combo stages, skills k0..k9 at p5..p14 (ac.a caps)
hero[27] = 5
st[67:71] = bytes([6, 3, 4, 2])                      # v = k+1: 번개난타 k5, 급소가격 k2, 맹독감염 k3, 민첩태세 k1 (t/sk2.tdf order)
def flag(n): st[n // 8] |= 1 << (n % 8)                       # u.p bits
def qvar(n, v): sh = n % 4 * 2; st[32 + n // 4] = st[32 + n // 4] & ~(3 << sh) | v << sh   # u.q, 2 bits each
start = sys.argv[3] if len(sys.argv) > 3 else 'final'
if start == 'final':
    head[0:3] = bytes([62, 4, 3]); flag(119)
elif start == 'ian':
    head[0:3] = bytes([49, 12, 9]); flag(42); qvar(22, 1)
else:
    head[0:3] = bytes([int(start), 7, 12])           # boss room, mid-floor tile
gs[0], gs[1], gs[2] = bytes(head), bytes(hero), bytes(st)
cf = bytearray(open(src + '/cf', 'rb').read()); cf[0] = (5 << 4) | 15; cf[1] = 0x20
ent = lambda nm, data: {"db": "wie_filesystem", "store": "files", "key": ["0056194389", nm], "data": base64.b64encode(data).decode()}
json.dump({"game": "hero-lore-2-web", "exported": datetime.datetime.now().isoformat(), "note": "운영자 세이브: 로그 LV75 풀장비",
           "entries": [ent("cf", bytes(cf)), ent("g1", h.join(gs, h.G_KEYS, gtail)), ent("n1", h.join(ns, h.N_KEYS, ntail))]},
          open(out, 'w'), ensure_ascii=False)
print('->', out)
