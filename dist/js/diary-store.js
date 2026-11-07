// Training Diary — persistence + pure date/heatmap helpers.
//
// Separate IndexedDB database ("movementDiary") so the Gameplan DB version is
// never touched. Entries are cached in memory after init() so screens can
// render synchronously; photos stay in their own store and load on demand.
// Falls back to localStorage (entries only, no photos) without IndexedDB.
//
// Entry shape (one per local calendar date):
//   { date: 'YYYY-MM-DD', drills: [{ id, name, desc, photoId? }],
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
