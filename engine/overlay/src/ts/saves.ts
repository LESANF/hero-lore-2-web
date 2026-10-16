// Save export/import: wie keeps the game's files in IndexedDB `wie_filesystem` (store `files`,
// key [appId, path]) and its record stores in `wie_<appId>` (store of the same name, string keys).
// Export dumps every entry of those databases into one JSON file; import writes them back.
// The emulator reads the stores lazily, so import takes effect on the next page load.

type Entry = { db: string; store: string; key: string | string[]; data: string };   // data = base64

const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function openDb(name: string): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(name);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function wieDatabases(): Promise<string[]> {
  const all = await indexedDB.databases();
  return all.map((d) => d.name ?? "").filter((n) => n === "wie_filesystem" || n.startsWith("wie_"));
}

async function dumpDb(name: string): Promise<Entry[]> {
  const db = await openDb(name);
  const out: Entry[] = [];
  for (const store of Array.from(db.objectStoreNames)) {
    await new Promise<void>((res, rej) => {
      const req = db.transaction(store, "readonly").objectStore(store).openCursor();
      req.onsuccess = () => {
        const c = req.result;
        if (!c) return res();
        out.push({ db: name, store, key: c.key as string | string[], data: b64(new Uint8Array(c.value)) });
        c.continue();
      };
      req.onerror = () => rej(req.error);
    });
  }
  db.close();
  return out;
}

export async function exportSaves(): Promise<void> {
  const entries = (await Promise.all((await wieDatabases()).map(dumpDb))).flat();
  const bundle = { game: "hero-lore-2-web", exported: new Date().toISOString(), entries };
  const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `hero-lore-2-saves-${new Date().toISOString().slice(0, 10)}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importSaves(file: File): Promise<number> {
  const bundle = JSON.parse(await file.text()) as { entries?: Entry[] };
  if (!Array.isArray(bundle.entries)) throw new Error("세이브 파일 형식이 아닙니다");
  let count = 0;
  const byDb = new Map<string, Entry[]>();
  for (const e of bundle.entries) {
    if (typeof e.db !== "string" || !e.db.startsWith("wie_")) continue;   // only the emulator's own stores
    (byDb.get(e.db) ?? byDb.set(e.db, []).get(e.db)!).push(e);
  }
  for (const [name, list] of byDb) {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open(name);
      r.onupgradeneeded = () => { for (const e of list) if (!r.result.objectStoreNames.contains(e.store)) r.result.createObjectStore(e.store); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    for (const e of list) {
      if (!db.objectStoreNames.contains(e.store)) continue;
      await new Promise<void>((res, rej) => {
        const req = db.transaction(e.store, "readwrite").objectStore(e.store).put(unb64(e.data), e.key);
        req.onsuccess = () => { count++; res(); };
        req.onerror = () => rej(req.error);
      });
    }
    db.close();
  }
  return count;
}
