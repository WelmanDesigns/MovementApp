// Gameplan persistence — IndexedDB with localStorage fallback

const GameplanStore = {
  _db: null,
  _useLocalStorage: false,
  _LS_KEY: 'gameplans',
  _LS_LIB_KEY: 'gameplanLibrary',
  count: 0,
  _libraryCache: null, // in-memory cache for fast lookups

  init() {
    return new Promise((resolve) => {
      if (!window.indexedDB) {
        this._useLocalStorage = true;
        this._loadLibraryCache().then(() => {
          this._updateCount();
          resolve();
        });
        return;
      }

      const request = indexedDB.open('movementApp', 2);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('gameplans')) {
          db.createObjectStore('gameplans', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('library')) {
          db.createObjectStore('library', { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this._db = e.target.result;
        this._migrateAndLoadLibrary().then(() => {
          this._updateCount();
          resolve();
        });
      };

      request.onerror = () => {
        this._useLocalStorage = true;
        this._loadLibraryCache().then(() => {
          this._updateCount();
          resolve();
        });
      };
    });
  },

  // ── Gameplan CRUD ─────────────────────────────────────────

  getAll() {
    if (this._useLocalStorage) {
      const plans = this._lsRead(this._LS_KEY);
      plans.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return Promise.resolve(plans);
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('gameplans', 'readonly');
      const store = tx.objectStore('gameplans');
      const request = store.getAll();
      request.onsuccess = () => {
        const plans = request.result;
        plans.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        resolve(plans);
      };
      request.onerror = () => reject(request.error);
    });
  },

  get(id) {
    if (this._useLocalStorage) {
      const plans = this._lsRead(this._LS_KEY);
      return Promise.resolve(plans.find(p => p.id === id) || null);
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('gameplans', 'readonly');
      const store = tx.objectStore('gameplans');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  save(gameplan) {
    gameplan.updatedAt = new Date().toISOString();

    if (this._useLocalStorage) {
      const plans = this._lsRead(this._LS_KEY);
      const idx = plans.findIndex(p => p.id === gameplan.id);
      if (idx >= 0) {
        plans[idx] = gameplan;
      } else {
        plans.push(gameplan);
      }
      this._lsWrite(this._LS_KEY, plans);
      this._updateCount();
      return Promise.resolve(gameplan);
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('gameplans', 'readwrite');
      const store = tx.objectStore('gameplans');
      const request = store.put(gameplan);
      request.onsuccess = () => {
        this._updateCount();
        resolve(gameplan);
      };
      request.onerror = () => reject(request.error);
    });
  },

  delete(id) {
    if (this._useLocalStorage) {
      const plans = this._lsRead(this._LS_KEY).filter(p => p.id !== id);
      this._lsWrite(this._LS_KEY, plans);
      this._updateCount();
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('gameplans', 'readwrite');
      const store = tx.objectStore('gameplans');
      const request = store.delete(id);
      request.onsuccess = () => {
        this._updateCount();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  },

  // ── Library CRUD ──────────────────────────────────────────

  getLibrary() {
    return Promise.resolve(Object.values(this._libraryCache || {}));
  },

  getLibraryEntry(id) {
    return this._libraryCache ? this._libraryCache[id] || null : null;
  },

  saveLibraryEntry(entry) {
    this._normalizeEntry(entry);
    this._libraryCache[entry.id] = entry;

    if (this._useLocalStorage) {
      this._lsWrite(this._LS_LIB_KEY, Object.values(this._libraryCache));
      return Promise.resolve(entry);
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('library', 'readwrite');
      const store = tx.objectStore('library');
      const request = store.put(entry);
      request.onsuccess = () => resolve(entry);
      request.onerror = () => reject(request.error);
    });
  },

  deleteLibraryEntry(id) {
    delete this._libraryCache[id];

    if (this._useLocalStorage) {
      this._lsWrite(this._LS_LIB_KEY, Object.values(this._libraryCache));
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const tx = this._db.transaction('library', 'readwrite');
      const store = tx.objectStore('library');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // ── Resolve node data from library ────────────────────────

  resolveNode(node) {
    // If node has libraryId, merge library data in
    if (node.libraryId && this._libraryCache) {
      const entry = this._libraryCache[node.libraryId];
      if (entry) {
        return {
          id: node.id,
          libraryId: node.libraryId,
          x: node.x,
          y: node.y,
          type: entry.type,
          label: entry.label,
          notes: entry.notes,
          links: entry.links
        };
      }
      // Library entry was deleted — render a placeholder instead of crashing
      return {
        id: node.id,
        libraryId: node.libraryId,
        x: node.x,
        y: node.y,
        type: 'position',
        label: '(missing move)',
        notes: [],
        links: [],
        missing: true
      };
    }
    // Legacy node with embedded data — fill in anything absent so rendering never crashes
    return {
      id: node.id,
      x: node.x || 0,
      y: node.y || 0,
      type: node.type || 'position',
      label: node.label || '(unnamed)',
      notes: node.notes || [],
      links: node.links || []
    };
  },

  // ── Referential integrity ─────────────────────────────────

  // Returns { nodeCount, planNames } for a library entry across all gameplans
  countLibraryUsage(libraryId) {
    return this.getAll().then(plans => {
      let nodeCount = 0;
      const planNames = [];
      plans.forEach(gp => {
        const used = gp.nodes.filter(n => n.libraryId === libraryId).length;
        if (used > 0) {
          nodeCount += used;
          planNames.push(gp.name);
        }
      });
      return { nodeCount: nodeCount, planNames: planNames };
    });
  },

  // Find an existing entry by name (label or alias), optionally restricted to a type
  findLibraryEntry(label, type) {
    if (!this._libraryCache || !label) return null;
    const needle = label.trim().toLowerCase();
    const entries = Object.values(this._libraryCache);
    for (const entry of entries) {
      if (type && entry.type !== type) continue;
      if (entry.label.trim().toLowerCase() === needle) return entry;
      if ((entry.aliases || []).some(a => a.trim().toLowerCase() === needle)) return entry;
    }
    return null;
  },

  // ── Export / Import ───────────────────────────────────────

  exportData() {
    return Promise.all([this.getAll(), this.getLibrary()]).then(([plans, entries]) => {
      return {
        app: 'MovementApp',
        version: 1,
        exportedAt: new Date().toISOString(),
        library: entries,
        gameplans: plans
      };
    });
  },

  // Merges by id: existing entries/plans with the same id are overwritten.
  // Returns { libraryCount, gameplanCount }.
  importData(data) {
    if (!data || !Array.isArray(data.library) || !Array.isArray(data.gameplans)) {
      return Promise.reject(new Error('Not a valid MovementApp export file'));
    }
    const saves = [];
    data.library.forEach(entry => {
      if (entry && entry.id && entry.type && entry.label !== undefined) {
        saves.push(this.saveLibraryEntry(this._normalizeEntry(entry)));
      }
    });
    data.gameplans.forEach(gp => {
      if (gp && gp.id && Array.isArray(gp.nodes) && Array.isArray(gp.connections)) {
        saves.push(this.save(gp));
      }
    });
    return Promise.all(saves).then(() => ({
      libraryCount: data.library.length,
      gameplanCount: data.gameplans.length
    }));
  },

  // Remove every gameplan and library entry (used by full backup restore)
  clearAll() {
    this._libraryCache = {};
    this.count = 0;
    if (this._useLocalStorage) {
      this._lsWrite(this._LS_KEY, []);
      this._lsWrite(this._LS_LIB_KEY, []);
      return Promise.resolve();
    }
    return Promise.all(['gameplans', 'library'].map(name => new Promise((resolve, reject) => {
      const request = this._db.transaction(name, 'readwrite').objectStore(name).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    })));
  },

  // ── Starter library ───────────────────────────────────────

  // Adds seed moves, skipping any whose name or alias already exists.
  // Returns the number of entries added.
  addStarterLibrary() {
    const seeds = GameplanData.seedLibrary();
    const saves = [];
    let added = 0;
    seeds.forEach(seed => {
      if (this._libraryCache[seed.id]) return; // already seeded
      if (this.findLibraryEntry(seed.label)) return; // user has their own version
      saves.push(this.saveLibraryEntry(seed));
      added++;
    });
    return Promise.all(saves).then(() => added);
  },

  // ── Migration & init helpers ──────────────────────────────

  // Ensure entries loaded from storage or imports have all current fields
  _normalizeEntry(entry) {
    if (!entry.notes) entry.notes = [];
    if (!entry.links) entry.links = [];
    if (!entry.tags) entry.tags = [];
    if (!entry.aliases) entry.aliases = [];
    if (entry.variantOf === undefined) entry.variantOf = null;
    if (entry.category === undefined) entry.category = null;
    if (entry.fromPositionId === undefined) entry.fromPositionId = null;
    if (entry.toPositionId === undefined) entry.toPositionId = null;
    return entry;
  },

  _loadLibraryCache() {
    if (this._useLocalStorage) {
      const entries = this._lsRead(this._LS_LIB_KEY);
      this._libraryCache = {};
      entries.forEach(e => { this._libraryCache[e.id] = this._normalizeEntry(e); });
      // Migrate any legacy nodes
      return this._migrateLegacyNodes().then(() => this._maybeAutoSeed());
    }
    return Promise.resolve();
  },

  _migrateAndLoadLibrary() {
    // Load library entries into cache
    return new Promise((resolve) => {
      const tx = this._db.transaction('library', 'readonly');
      const store = tx.objectStore('library');
      const request = store.getAll();
      request.onsuccess = () => {
        this._libraryCache = {};
        (request.result || []).forEach(e => { this._libraryCache[e.id] = this._normalizeEntry(e); });
        // Migrate legacy nodes
        this._migrateLegacyNodes().then(() => this._maybeAutoSeed()).then(resolve);
      };
      request.onerror = () => {
        this._libraryCache = {};
        resolve();
      };
    });
  },

  // First run with an empty library: pre-fill with the starter moves
  _maybeAutoSeed() {
    try {
      if (localStorage.getItem('gpLibrarySeeded')) return Promise.resolve();
    } catch (e) { /* localStorage unavailable — seed check skipped */ }
    if (Object.keys(this._libraryCache).length > 0) {
      // Existing users keep their library; they can add starters from the Library screen
      try { localStorage.setItem('gpLibrarySeeded', '1'); } catch (e) {}
      return Promise.resolve();
    }
    return this.addStarterLibrary().then(() => {
      try { localStorage.setItem('gpLibrarySeeded', '1'); } catch (e) {}
    });
  },

  _migrateLegacyNodes() {
    // Find gameplans with old-style embedded nodes (have 'type' but no 'libraryId')
    return this.getAll().then(plans => {
      const saves = [];
      plans.forEach(gp => {
        let changed = false;
        gp.nodes.forEach((node, i) => {
          if (node.type && !node.libraryId) {
            // Create library entry from embedded data
            const entry = GameplanData.createLibraryEntry(node.type, node.label);
            entry.notes = node.notes || [];
            entry.links = node.links || [];
            this._libraryCache[entry.id] = entry;
            saves.push(this.saveLibraryEntry(entry));

            // Convert node to reference
            gp.nodes[i] = {
              id: node.id,
              libraryId: entry.id,
              x: node.x,
              y: node.y
            };
            changed = true;
          }
        });
        if (changed) {
          saves.push(this.save(gp));
        }
      });
      return Promise.all(saves);
    });
  },

  // ── Internal helpers ──────────────────────────────────────

  _updateCount() {
    if (this._useLocalStorage) {
      this.count = this._lsRead(this._LS_KEY).length;
      return;
    }
    if (!this._db) { this.count = 0; return; }

    const tx = this._db.transaction('gameplans', 'readonly');
    const store = tx.objectStore('gameplans');
    const request = store.count();
    request.onsuccess = () => { this.count = request.result; };
  },

  _lsRead(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  },

  _lsWrite(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
};
