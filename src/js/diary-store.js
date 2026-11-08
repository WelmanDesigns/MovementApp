// Training Diary — persistence + pure date/heatmap helpers.
//
// Separate IndexedDB database ("movementDiary") so the Gameplan DB version is
// never touched. Entries are cached in memory after init() so screens can
// render synchronously; photos stay in their own store and load on demand.
// Falls back to localStorage (entries only, no photos) without IndexedDB.
//
// Entry shape (one per local calendar date):
//   { date: 'YYYY-MM-DD', drills: [{ id, name, desc, mins?, photoId? }],
//     rolls: [{ id, partner, outcome: 'sub'|'subbed'|'none'|null, technique, notes }],
//     createdAt, updatedAt }

const DiaryStore = {
  _db: null,
  _useLocalStorage: false,
  _LS_KEY: 'diaryEntries',
  _entries: {},

  init() {
    return new Promise((resolve) => {
      const fallback = () => {
        this._db = null;
        this._useLocalStorage = true;
        this._entries = this._lsRead();
        resolve();
      };

      if (typeof indexedDB === 'undefined' || !indexedDB) { fallback(); return; }

      let request;
      try {
        request = indexedDB.open('movementDiary', 1);
      } catch (e) { fallback(); return; }

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('entries')) db.createObjectStore('entries', { keyPath: 'date' });
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      };

      request.onsuccess = (e) => {
        this._db = e.target.result;
        const tx = this._db.transaction('entries', 'readonly');
        const all = tx.objectStore('entries').getAll();
        all.onsuccess = () => {
          this._entries = {};
          for (const entry of all.result) this._entries[entry.date] = entry;
          resolve();
        };
        all.onerror = fallback;
      };

      request.onerror = fallback;
    });
  },

  photosEnabled() {
    return !!this._db;
  },

  // ── Entries (sync reads from the in-memory cache) ─────────────

  get(date) {
    return this._entries[date] || null;
  },

  // Newest first
  getAll() {
    return Object.values(this._entries).sort((a, b) => b.date.localeCompare(a.date));
  },

  count() {
    return Object.keys(this._entries).length;
  },

  create(date) {
    const now = new Date().toISOString();
    const entry = { date, drills: [], rolls: [], createdAt: now, updatedAt: now };
    return this.save(entry).then(() => entry);
  },

  save(entry) {
    entry.updatedAt = new Date().toISOString();
    this._entries[entry.date] = entry;
    if (this._useLocalStorage) {
      this._lsWrite();
      return Promise.resolve(entry);
    }
    return this._req('entries', 'readwrite', s => s.put(entry)).then(() => entry);
  },

  delete(date) {
    const entry = this._entries[date];
    delete this._entries[date];
    const photoIds = entry ? entry.drills.map(d => d.photoId).filter(Boolean) : [];
    if (this._useLocalStorage) {
      this._lsWrite();
      return Promise.resolve();
    }
    return Promise.all([
      this._req('entries', 'readwrite', s => s.delete(date)),
      ...photoIds.map(id => this.deletePhoto(id))
    ]).then(() => {});
  },

  // Save `entry` (under its own date) and drop the record at oldDate,
  // keeping photos — they moved with the drills.
  move(oldDate, entry) {
    if (oldDate !== entry.date) delete this._entries[oldDate];
    const removeOld = (this._useLocalStorage || oldDate === entry.date)
      ? Promise.resolve()
      : this._req('entries', 'readwrite', s => s.delete(oldDate));
    return Promise.all([removeOld, this.save(entry)]).then(() => entry);
  },

  // ── Photos ────────────────────────────────────────────────────

  savePhoto(blob) {
    if (!this._db) return Promise.reject(new Error('Photos need IndexedDB'));
    const id = this.newId();
    return this._req('photos', 'readwrite', s => s.put({ id, blob })).then(() => id);
  },

  getPhoto(id) {
    if (!this._db) return Promise.resolve(null);
    return this._req('photos', 'readonly', s => s.get(id)).then(r => (r ? r.blob : null));
  },

  // Store a photo under a known id (backup restore keeps entry references valid)
  putPhoto(id, blob) {
    if (!this._db) return Promise.resolve();
    return this._req('photos', 'readwrite', s => s.put({ id, blob })).then(() => id);
  },

  // Remove all entries and photos (used by full backup restore)
  clearAll() {
    this._entries = {};
    if (this._useLocalStorage) {
      this._lsWrite();
      return Promise.resolve();
    }
    return Promise.all([
      this._req('entries', 'readwrite', s => s.clear()),
      this._req('photos', 'readwrite', s => s.clear())
    ]).then(() => {});
  },

  deletePhoto(id) {
    if (!this._db || !id) return Promise.resolve();
    return this._req('photos', 'readwrite', s => s.delete(id)).then(() => {});
  },

  // ── Pure helpers (dates are local 'YYYY-MM-DD' keys) ──────────

  newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  todayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d);
  },

  addDays(key, n) {
    const d = this.parseKey(key);
    d.setDate(d.getDate() + n);
    return this.todayKey(d);
  },

  // Monday of the week containing key
  weekStart(key) {
    const dow = (this.parseKey(key).getDay() + 6) % 7; // Mon=0 … Sun=6
    return this.addDays(key, -dow);
  },

  // Heatmap shade: 0 = no class, 1 = attended (0–2 items), 2 = 3–5, 3 = 6+
  level(entry) {
    if (!entry) return 0;
    const n = (entry.drills ? entry.drills.length : 0) + (entry.rolls ? entry.rolls.length : 0);
    if (n <= 2) return 1;
    if (n <= 5) return 2;
    return 3;
  },

  // `weeks` columns of 7 date keys (Mon→Sun), the last column holding endKey
  heatmapWeeks(endKey, weeks) {
    const first = this.addDays(this.weekStart(endKey), -7 * (weeks - 1));
    const cols = [];
    for (let w = 0; w < weeks; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) col.push(this.addDays(first, w * 7 + d));
      cols.push(col);
    }
    return cols;
  },

  // Entries with startKey <= date <= endKey
  countBetween(startKey, endKey) {
    return Object.keys(this._entries).filter(k => k >= startKey && k <= endKey).length;
  },

  // ── Review stats ──────────────────────────────────────────────

  // First date key of a review range ('30' | '90' | '365' days, or 'all' → null)
  rangeStart(range, todayKey) {
    const days = parseInt(range, 10);
    return days > 0 ? this.addDays(todayKey, -(days - 1)) : null;
  },

  // Minutes logged on a drill (0 when blank / invalid)
  minutes(drill) {
    const n = Number(drill && drill.mins);
    return n > 0 && isFinite(n) ? n : 0;
  },

  // Aggregate entries with startKey <= date <= endKey (null = open-ended).
  // Names are grouped case- and whitespace-insensitively; the first spelling
  // seen is the label. drillTime splits drill time by position — by minutes
  // when any drill in range has a time, otherwise by share of drills.
  stats(startKey, endKey) {
    const entries = Object.values(this._entries).filter(e =>
      (!startKey || e.date >= startKey) && (!endKey || e.date <= endKey));
    const positions = new Map(), hits = new Map(), tapped = new Map();
    const add = (map, raw, mins) => {
      const name = String(raw || '').trim().replace(/\s+/g, ' ');
      if (!name) return;
      const key = name.toLowerCase();
      if (!map.has(key)) map.set(key, { name, count: 0, minutes: 0 });
      const row = map.get(key);
      row.count++;
      row.minutes += mins || 0;
    };
    const s = { classes: entries.length, drills: 0, rolls: 0, subsHit: 0, subsTapped: 0,
      noSub: 0, minutes: 0, timedDrills: 0 };

    for (const e of entries) {
      for (const d of e.drills || []) {
        if (!String(d.name || '').trim()) continue;
        const m = this.minutes(d);
        s.drills++;
        if (m) { s.timedDrills++; s.minutes += m; }
        add(positions, d.name, m);
      }
      for (const r of e.rolls || []) {
        s.rolls++;
        if (r.outcome === 'sub') { s.subsHit++; add(hits, r.technique); }
        else if (r.outcome === 'subbed') { s.subsTapped++; add(tapped, r.technique); }
        else if (r.outcome === 'none') s.noSub++;
      }
    }

    const byCount = (a, b) => b.count - a.count || b.minutes - a.minutes || a.name.localeCompare(b.name);
    s.positions = [...positions.values()].sort(byCount);
    s.hits = [...hits.values()].sort(byCount);
    s.tapped = [...tapped.values()].sort(byCount);

    const basis = s.minutes > 0 ? 'minutes' : 'count';
    const total = basis === 'minutes' ? s.minutes : s.drills;
    s.drillTime = {
      basis,
      rows: s.positions
        .map(p => ({ name: p.name, value: basis === 'minutes' ? p.minutes : p.count }))
        .filter(r => r.value > 0)
        .map(r => Object.assign(r, { pct: total ? (r.value / total) * 100 : 0 }))
        .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    };
    return s;
  },

  // ── Internal ──────────────────────────────────────────────────

  _req(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = this._db.transaction(storeName, mode);
      const request = fn(tx.objectStore(storeName));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  _lsRead() {
    try {
      return JSON.parse(localStorage.getItem(this._LS_KEY)) || {};
    } catch (e) {
      return {};
    }
  },

  _lsWrite() {
    try {
      localStorage.setItem(this._LS_KEY, JSON.stringify(this._entries));
    } catch (e) {
      console.error('Diary save failed', e);
    }
  }
};
