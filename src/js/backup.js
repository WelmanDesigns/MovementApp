// Backup & restore — every piece of app data in one JSON file.
//
// Data lives in the browser's storage for the site's address, so a new
// address (or a new Home Screen install on iOS, which has its own storage)
// starts empty. A backup file is the bridge: save it in the old app,
// restore it in the new one.
//
// File shape:
//   { app: 'MovementApp', kind: 'full-backup', version: 1, exportedAt,
//     localStorage: { key: rawString },
//     gameplans: [...], library: [...],
//     diary: { entries: [...], photos: [{ id, dataUrl }] } }
// Older gameplan-only export files ({ library, gameplans }) are also accepted.

const Backup = {
  VERSION: 1,

  // Every localStorage key the app owns. Other apps on the same github.io
  // origin may share localStorage, so only these are exported/replaced.
  LS_KEYS: ['hipChallenge', 'ibjjfRules', 'beltTracker', 'gpLibrarySeeded',
    'gameplans', 'gameplanLibrary', 'diaryEntries'],
  LAST_BACKUP_KEY: 'movementLastBackup',

  _status: null, // { tone: 'ok'|'error', text } shown on the screen

  // ── Collect / apply ──────────────────────────────────────────

  collect() {
    const ls = {};
    for (const k of this.LS_KEYS) {
      try {
        const v = localStorage.getItem(k);
        if (v !== null) ls[k] = v;
      } catch (e) { /* storage unavailable */ }
    }
    const entries = DiaryStore.getAll();
    const photoIds = [];
    for (const e of entries) for (const d of e.drills) if (d.photoId) photoIds.push(d.photoId);

    return Promise.all([
      GameplanStore.getAll(),
      GameplanStore.getLibrary(),
      Promise.all(photoIds.map(id => DiaryStore.getPhoto(id)
        .then(blob => (blob ? this._blobToDataUrl(blob).then(dataUrl => ({ id, dataUrl })) : null))
        .catch(() => null)))
    ]).then(([gameplans, library, photos]) => ({
      app: 'MovementApp',
      kind: 'full-backup',
      version: this.VERSION,
      exportedAt: new Date().toISOString(),
      localStorage: ls,
      gameplans,
      library,
      diary: { entries, photos: photos.filter(Boolean) }
    }));
  },

  // Replace all app data with the backup's contents. Caller reloads after.
  apply(data) {
    if (!this.isFullBackup(data)) return Promise.reject(new Error('Not a Movement App backup file'));

    // 1. localStorage: set what the backup has, remove the rest of our keys
    for (const k of this.LS_KEYS) {
      try {
        if (Object.prototype.hasOwnProperty.call(data.localStorage || {}, k)) {
          localStorage.setItem(k, data.localStorage[k]);
        } else {
          localStorage.removeItem(k);
        }
      } catch (e) { /* storage unavailable */ }
    }
    // The library is restored as-is; never auto-seed starters on top of it
    try { localStorage.setItem('gpLibrarySeeded', '1'); } catch (e) {}

    // 2. Gameplans + library, 3. Diary entries + photos
    const diary = data.diary || { entries: [], photos: [] };
    return GameplanStore.clearAll()
      .then(() => GameplanStore.importData({ library: data.library || [], gameplans: data.gameplans || [] }))
      .then(() => DiaryStore.clearAll())
      .then(() => Promise.all((diary.photos || []).map(p =>
        this._dataUrlToBlob(p.dataUrl).then(blob => DiaryStore.putPhoto(p.id, blob)))))
      .then(() => Promise.all((diary.entries || []).filter(e => e && e.date).map(e => {
        // Without IndexedDB, photos can't be stored — drop dangling references
        if (!DiaryStore.photosEnabled()) e.drills.forEach(d => { delete d.photoId; });
        return DiaryStore.save(e);
      })));
  },

  isFullBackup(data) {
    return !!data && data.app === 'MovementApp' && data.kind === 'full-backup';
  },

  // ── Screen ───────────────────────────────────────────────────

  render() {
    const daysDone = CHALLENGE_DATA.filter(d => Progress.isDayComplete(d.day)).length;
    const rulesDone = RULES_UNITS.filter(u => RulesProgress.unitProgress(u.id).complete).length;
    const beltStarted = BeltData.STAGES.filter(s => BeltStore.isStageStarted(s.id)).length;
    const diaryCount = DiaryStore.count();
    const gpCount = GameplanStore.count;
    const libCount = Object.keys(GameplanStore._libraryCache || {}).length;
    let last = null;
    try { last = localStorage.getItem(this.LAST_BACKUP_KEY); } catch (e) {}
    const lastLabel = last
      ? new Date(last).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Never';

    const row = (icon, tone, title, value) => `
      <div class="list-row list-row-static">
        ${Icon.badge(icon, tone)}
        <span class="list-row-text"><span class="list-row-title">${title}</span></span>
        <span class="list-row-trail backup-count">${value}</span>
      </div>`;

    const status = this._status
      ? `<p class="backup-status backup-status-${this._status.tone}" role="status">${UI.esc(this._status.text)}</p>`
      : '';

    return `
      <div class="screen backup-screen" role="main" aria-label="Backup and restore">
        <header class="day-header">
          <button class="btn-back" data-nav="home" aria-label="Back to home"></button>
        </header>
        <header class="app-header">
          <h1>Backup &amp; restore</h1>
          <p>Your data is stored on this device only. Save a backup file to keep it safe, or to move it to a new phone or app.</p>
        </header>

        <div class="list-group">
          ${row('diary', 'diary', 'Diary classes', diaryCount)}
          ${row('gameplan', 'gp', 'Gameplans', gpCount)}
          ${row('gameplan', 'gp', 'Library moves', libCount)}
          ${row('belt', 'belt', 'Belt stages started', beltStarted)}
          ${row('stretch', 'hip', 'Hip challenge days', daysDone + '/21')}
          ${row('rules', 'rules', 'Rules sections mastered', rulesDone + '/' + RULES_UNITS.length)}
        </div>
        <p class="backup-last">Last backup: ${lastLabel}</p>

        <div class="backup-actions">
          <button class="btn btn-light btn-block" data-action="backup-export">
            ${Icon.svg('download', 20)} Save backup file
          </button>
          <button class="btn btn-ghost btn-block" data-action="backup-import">
            ${Icon.svg('upload', 20)} Restore from file
          </button>
        </div>
        ${status}
        <p class="backup-note">Restoring replaces everything in this app with the contents of the backup file.</p>
      </div>`;
  },

  handleAction(action) {
    if (action === 'backup-export') this.exportFile();
    if (action === 'backup-import') this.pickFile();
  },

  _setStatus(tone, text) {
    this._status = { tone, text };
    App.render('backup');
  },

  // ── Export ───────────────────────────────────────────────────

  exportFile() {
    this.collect().then(data => {
      const stamp = DiaryStore.todayKey();
      const name = `movement-backup-${stamp}.json`;
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const file = (typeof File === 'function') ? new File([blob], name, { type: 'application/json' }) : null;
      const done = () => {
        try { localStorage.setItem(this.LAST_BACKUP_KEY, new Date().toISOString()); } catch (e) {}
        const kb = Math.max(1, Math.round(blob.size / 1024));
        this._setStatus('ok', `Backup saved (${kb < 1024 ? kb + ' KB' : (kb / 1024).toFixed(1) + ' MB'}).`);
      };

      // Phones: the share sheet offers "Save to Files", AirDrop, email…
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (file && coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Movement App backup' })
          .then(done)
          .catch(err => { if (err && err.name !== 'AbortError') this._download(blob, name, done); });
        return;
      }
      this._download(blob, name, done);
    }).catch(err => {
      console.error('Backup failed', err);
      this._setStatus('error', 'Backup failed: ' + err.message);
    });
  },

  _download(blob, name, done) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    done();
  },

  // ── Import ───────────────────────────────────────────────────

  pickFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (file) this.importFile(file);
    });
    input.click();
  },

  importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(reader.result);
      } catch (e) {
        this._setStatus('error', 'That file is not a Movement App backup.');
        return;
      }
      this.importData(data);
    };
    reader.onerror = () => this._setStatus('error', 'Could not read that file.');
    reader.readAsText(file);
  },

  importData(data, skipConfirm) {
    // Older gameplan-only export: merge, don't replace
    if (data && !this.isFullBackup(data) && Array.isArray(data.library) && Array.isArray(data.gameplans)) {
      if (!skipConfirm && !confirm(`This is a gameplan export: import ${data.gameplans.length} gameplan(s) and ${data.library.length} library move(s)? Existing items are kept.`)) return Promise.resolve();
      return GameplanStore.importData(data).then(() => this._setStatus('ok', 'Gameplans imported.'));
    }
    if (!this.isFullBackup(data)) {
      this._setStatus('error', 'That file is not a Movement App backup.');
      return Promise.resolve();
    }
    const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'unknown date';
    if (!skipConfirm && !confirm(`Restore the backup from ${when}?\n\nThis replaces all data in this app.`)) return Promise.resolve();
    return this.apply(data).then(() => {
      this._status = null;
      // Reload so every in-memory store picks up the restored data
      location.reload();
    }).catch(err => {
      console.error('Restore failed', err);
      this._setStatus('error', 'Restore failed: ' + err.message);
    });
  },

  // ── Helpers ──────────────────────────────────────────────────

  _blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
  },

  _dataUrlToBlob(dataUrl) {
    return fetch(dataUrl).then(res => res.blob());
  }
};
