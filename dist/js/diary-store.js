// Training Diary — persistence + pure date/heatmap helpers.
//
// Separate IndexedDB database ("movementDiary") so the Gameplan DB version is
// never touched. Entries are cached in memory after init() so screens can
// render synchronously; photos stay in their own store and load on demand.
// Falls back to localStorage (entries only, no photos) without IndexedDB.
//
// Entry shape (one per local calendar date):
//   { date: 'YYYY-MM-DD',
//     drills: [{ id, name /* main position */, desc, photoId?,
//                techniques: [{ id, type: 'sweep'|'sub'|'control', name }] }],
//     rolls: [{ id, belt: 'white'|…|'black'|null, partner /* optional name */,
//               subs: [{ id, type: 'sub'|'subbed', technique, from /* position */ }],
//               noSub /* marked "No sub"; exclusive with subs */, notes }],
//     createdAt, updatedAt }
// Older rolls stored a single { outcome, technique }; normalize() upgrades them.

const DiaryStore = {
  _db: null,
  _useLocalStorage: false,
  _LS_KEY: 'diaryEntries',
  _entries: {},

  BELTS: [['white', 'White'], ['blue', 'Blue'], ['purple', 'Purple'], ['brown', 'Brown'], ['black', 'Black']],
  DRILL_TYPES: [['sweep', 'Sweep'], ['sub', 'Submission'], ['control', 'Control']],
  SUB_TYPES: [['sub', 'I subbed'], ['subbed', 'Got subbed']],

  // Built-in submission suggestions, so the list is complete even when the
  // Gameplan library has been trimmed. Spellings match the library seed.
  SUBMISSIONS: [
    // Chokes
    'Rear Naked Choke', 'Short Choke', 'Guillotine', 'Arm-In Guillotine', 'High-Elbow Guillotine',
    'Triangle Choke', 'Reverse Triangle', 'Arm Triangle', "D'Arce Choke", 'Anaconda Choke',
    'Peruvian Necktie', 'Japanese Necktie', 'North-South Choke', 'Von Flue Choke', 'Gogoplata',
    'Ezekiel Choke', 'Cross-Collar Choke', 'Lapel Choke', 'Bow-and-Arrow Choke', 'Baseball Bat Choke',
    'Loop Choke', 'Clock Choke', 'Paper Cutter Choke', 'Sliding Collar Choke', 'Single Wing Choke',
    'Karate Choke', 'Lazy Choke', 'Bulldog Choke',
    // Arms and shoulders
    'Armbar', 'Triangle Armbar', 'Kimura', 'Americana', 'Omoplata', 'Monoplata', 'Tarikoplata',
    'Baratoplata', 'Wrist Lock', 'Bicep Slicer', 'Mir Lock',
    // Legs
    'Straight Ankle Lock', 'Estima Lock', 'Kneebar', 'Toe Hold', 'Inside Heel Hook', 'Outside Heel Hook',
    'Calf Slicer', 'Banana Split', 'Electric Chair',
    // Spine / neck
    'Twister', 'Can Opener', 'Neck Crank'
  ],

  // Autocomplete lists by kind. `library` is the Gameplan library (array of
  // { type, label, category, tags }); typed history comes from diary entries.
  // Case-insensitive de-dupe, first spelling wins; each list sorted A–Z.
  suggestions(library) {
    const lists = { positions: new Map(), subs: new Map(), sweeps: new Map(), controls: new Map() };
    const put = (key, v) => {
      v = String(v || '').trim().replace(/\s+/g, ' ');
      if (v && !lists[key].has(v.toLowerCase())) lists[key].set(v.toLowerCase(), v);
    };
    for (const e of library || []) {
      if (!e || !e.label) continue;
      if (e.type === 'position') { put('positions', e.label); put('controls', e.label); }
      else if (e.type === 'submission') put('subs', e.label);
      else if (e.type === 'transition' &&
        (e.category === 'Sweeps' || (e.tags || []).includes('sweep'))) put('sweeps', e.label);
    }
    this.SUBMISSIONS.forEach(s => put('subs', s));
    const byType = { sweep: 'sweeps', sub: 'subs', control: 'controls' };
    for (const e of this.getAll()) {
      for (const d of e.drills || []) {
        put('positions', d.name);
        for (const t of d.techniques || []) if (byType[t.type]) put(byType[t.type], t.name);
      }
      for (const r of e.rolls || []) {
        for (const s of r.subs || []) { put('subs', s.technique); put('positions', s.from); }
      }
    }
    const out = {};
    for (const k in lists) out[k] = [...lists[k].values()].sort((a, b) => a.localeCompare(b));
    return out;
  },

  // Bring an entry (possibly from an older version or a backup) up to the
  // current shape. Idempotent; mutates and returns the entry.
  normalize(entry) {
    if (!entry) return entry;
    entry.drills = Array.isArray(entry.drills) ? entry.drills : [];
    entry.rolls = Array.isArray(entry.rolls) ? entry.rolls : [];
    for (const d of entry.drills) {
      if (!Array.isArray(d.techniques)) d.techniques = [];
    }
    for (const r of entry.rolls) {
      if (!Array.isArray(r.subs)) {
        r.subs = [];
        if (r.outcome === 'sub' || r.outcome === 'subbed') {
          r.subs.push({ id: r.id + 's', type: r.outcome, technique: r.technique || '' });
        }
        r.noSub = r.outcome === 'none';
      }
      delete r.outcome;
      delete r.technique;
      if (r.belt === undefined) r.belt = null;
      if (typeof r.noSub !== 'boolean') r.noSub = false;
      for (const s of r.subs) if (typeof s.from !== 'string') s.from = '';
    }
    return entry;
  },

  init() {
    return new Promise((resolve) => {
      const fallback = () => {
        this._db = null;
        this._useLocalStorage = true;
        this._entries = this._lsRead();
        Object.values(this._entries).forEach(e => this.normalize(e));
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
          for (const entry of all.result) this._entries[entry.date] = this.normalize(entry);
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
    this.normalize(entry);
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

  // Aggregate entries with startKey <= date <= endKey (null = open-ended).
  // Names are grouped case- and whitespace-insensitively; the first spelling
  // seen is the label. A drill counts when it has a position or a named technique; techniques
  // group by type + name. Each roll can hold several subs either way; noSub
  // counts rolls explicitly marked "No sub".
  stats(startKey, endKey) {
    const entries = Object.values(this._entries).filter(e =>
      (!startKey || e.date >= startKey) && (!endKey || e.date <= endKey));
    const positions = new Map(), hits = new Map(), tapped = new Map(), techniques = new Map();
    const clean = raw => String(raw || '').trim().replace(/\s+/g, ' ');
    const add = (map, raw, type) => {
      const name = clean(raw);
      if (!name) return;
      const key = (type ? type + ':' : '') + name.toLowerCase();
      if (!map.has(key)) map.set(key, { name, count: 0, type: type || null });
      map.get(key).count++;
    };
    const s = { classes: entries.length, drills: 0, rolls: 0, subsHit: 0, subsTapped: 0, noSub: 0 };
    const belts = new Map(), froms = new Map();
    const addFrom = (raw, type) => {
      const name = clean(raw);
      if (!name) return;
      const key = name.toLowerCase();
      if (!froms.has(key)) froms.set(key, { name, hit: 0, tapped: 0 });
      froms.get(key)[type === 'sub' ? 'hit' : 'tapped']++;
    };

    for (const e of entries) {
      for (const d of e.drills || []) {
        const techs = (d.techniques || []).filter(t => clean(t.name));
        if (!clean(d.name) && !techs.length) continue;
        s.drills++;
        add(positions, d.name);
        for (const t of techs) add(techniques, t.name, t.type);
      }
      for (const r of e.rolls || []) {
        s.rolls++;
        const subs = r.subs || [];
        let hit = 0, tap = 0;
        for (const ev of subs) {
          if (ev.type === 'sub') { hit++; add(hits, ev.technique); addFrom(ev.from, 'sub'); }
          else if (ev.type === 'subbed') { tap++; add(tapped, ev.technique); addFrom(ev.from, 'subbed'); }
        }
        s.subsHit += hit;
        s.subsTapped += tap;
        if (r.noSub && !hit && !tap) s.noSub++;
        const belt = r.belt || null;
        if (!belts.has(belt)) belts.set(belt, { belt, rolls: 0, hit: 0, tapped: 0 });
        const b = belts.get(belt);
        b.rolls++; b.hit += hit; b.tapped += tap;
      }
    }

    const byCount = (a, b) => b.count - a.count || a.name.localeCompare(b.name);
    s.positions = [...positions.values()].sort(byCount);
    s.hits = [...hits.values()].sort(byCount);
    s.tapped = [...tapped.values()].sort(byCount);
    s.techniques = [...techniques.values()].sort(byCount);
    // Belt order (white → black), rolls with no belt set last
    s.byBelt = this.BELTS.map(([k]) => belts.get(k)).filter(Boolean)
      .concat(belts.has(null) ? [belts.get(null)] : []);
    // Positions subs happened from, busiest first
    s.subFrom = [...froms.values()].sort((a, b) =>
      (b.hit + b.tapped) - (a.hit + a.tapped) || b.hit - a.hit || a.name.localeCompare(b.name));
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
