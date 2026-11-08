// Training Diary — rendering + interaction handlers.
// Screens: dy-home (heatmap + recent entries) and dy-entry (one class).
// App.js delegates data-action "dy-*" clicks to DiaryUI.handleAction, and
// input/change events inside .dy-entry-screen to handleInput/handleChange.
// Edits autosave (debounced); App.render calls DiaryUI.leave() on every
// screen change so the last edit is flushed and empty rows are pruned.

const DiaryUI = {
  HEATMAP_WEEKS: 26,

  _entry: null,      // entry open on dy-entry
  _saveTimer: null,
  _urls: [],         // object URLs for photo thumbnails

  // ── Helpers ──────────────────────────────────────────────────

  _fmtDate(key, withYear) {
    const d = DiaryStore.parseKey(key);
    const opts = { weekday: 'short', day: 'numeric', month: 'short' };
    if (withYear || d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('en-GB', opts);
  },

  _summary(entry) {
    const d = entry.drills.length, r = entry.rolls.length;
    if (!d && !r) return 'Attended';
    const bits = [];
    if (d) bits.push(d + ' drill' + (d !== 1 ? 's' : ''));
    if (r) bits.push(r + ' roll' + (r !== 1 ? 's' : ''));
    return bits.join(' · ');
  },

  // Move names for autocomplete: Gameplan library + anything typed before
  _moveNames() {
    const names = new Set();
    const lib = GameplanStore._libraryCache || {};
    for (const id in lib) if (lib[id] && lib[id].label) names.add(lib[id].label.trim());
    for (const e of DiaryStore.getAll()) {
      for (const d of e.drills) if (d.name && d.name.trim()) names.add(d.name.trim());
      for (const r of e.rolls) if (r.technique && r.technique.trim()) names.add(r.technique.trim());
    }
    return [...names].filter(Boolean).sort((a, b) => a.localeCompare(b));
  },

  // ── Home ─────────────────────────────────────────────────────

  renderHome() {
    const today = DiaryStore.todayKey();
    const total = DiaryStore.count();
    const monthCount = DiaryStore.countBetween(today.slice(0, 8) + '01', today);
    const sub = total
      ? `${total} class${total !== 1 ? 'es' : ''} · ${monthCount} this month`
      : 'Tap below after class — it takes seconds';
    const hasToday = !!DiaryStore.get(today);
    const entries = DiaryStore.getAll();

    const list = entries.length ? entries.map(e => {
      const names = e.drills.map(d => d.name).filter(Boolean).join(', ');
      return `
        <button class="dy-entry-card" data-nav="dy-entry" data-date="${e.date}">
          <span class="dy-entry-card-top">
            <span class="dy-entry-card-date">${UI.esc(this._fmtDate(e.date))}</span>
            <span class="dy-entry-card-sum">${this._summary(e)}</span>
          </span>
          ${names ? `<span class="dy-entry-card-names">${UI.esc(names)}</span>` : ''}
        </button>`;
    }).join('') : '';

    return `
      <div class="screen dy-home-screen" role="main" aria-label="Diary">
        <header class="day-header">
          <button class="btn-back btn-back-label" data-action="dy-back"
            aria-label="Back to ${App.SCREEN_LABELS[App.diaryBackTarget().screen]}">
            <span>${App.SCREEN_LABELS[App.diaryBackTarget().screen]}</span>
          </button>
        </header>
        <header class="app-header">
          <h1>Diary</h1>
          <p class="dy-home-sub">${sub}</p>
        </header>

        ${this._heatmap(today)}

        <button class="dy-log-btn" data-nav="dy-entry" data-date="${today}">
          ${hasToday ? Icon.svg('pencil', 18) + ' Edit today' : Icon.svg('plus', 20) + ' Log today'}
        </button>

        <div class="dy-home-actions">
          <button class="dy-secondary-btn" data-action="dy-past-toggle" aria-expanded="false" aria-controls="dy-past">
            ${Icon.svg('calendar', 18)} Log a past class
          </button>
          <button class="dy-secondary-btn" data-nav="dy-review">
            ${Icon.svg('chart', 18)} Review
          </button>
        </div>
        <div class="dy-past" id="dy-past" hidden>
          <label class="dy-past-label" for="dy-past-date">Class date</label>
          <div class="dy-past-row">
            <input type="date" class="dy-input dy-past-input" id="dy-past-date"
              value="${DiaryStore.addDays(today, -1)}" max="${today}">
            <button class="dy-past-go" data-action="dy-past-go">Open</button>
          </div>
          <p class="dy-past-hint">Or tap any day on the calendar above.</p>
        </div>

        ${entries.length ? `<h2 class="home-section-title dy-recent-title">Recent</h2>
          <div class="dy-entry-list">${list}</div>` : ''}
      </div>`;
  },

  _heatmap(today) {
    const weeks = DiaryStore.heatmapWeeks(today, this.HEATMAP_WEEKS);
    let prevMonth = null;
    const months = weeks.map(col => {
      const m = DiaryStore.parseKey(col[0]).getMonth();
      const label = m !== prevMonth
        ? DiaryStore.parseKey(col[0]).toLocaleDateString('en-GB', { month: 'short' }) : '';
      prevMonth = m;
      return `<span>${label}</span>`;
    }).join('');

    const cells = weeks.map(col => col.map(key => {
      if (key > today) return '<span class="dy-cell dy-cell-future"></span>';
      const entry = DiaryStore.get(key);
      const lvl = DiaryStore.level(entry);
      const cls = `dy-cell dy-l${lvl}${key === today ? ' dy-cell-today' : ''}`;
      if (!entry) {
        // Empty past days open a new entry so missed classes can be backfilled
        const label = `Log a class on ${this._fmtDate(key)}`;
        return `<button class="${cls}" data-nav="dy-entry" data-date="${key}"
          title="${UI.esc(label)}" aria-label="${UI.esc(label)}"></button>`;
      }
      const label = `${this._fmtDate(key)}: ${this._summary(entry)}`;
      return `<button class="${cls}" data-nav="dy-entry" data-date="${key}"
        title="${UI.esc(label)}" aria-label="${UI.esc(label)}"></button>`;
    }).join('')).join('');

    return `
      <div class="dy-heatmap-wrap">
        <div class="dy-heatmap" style="--weeks:${weeks.length}">
          <div class="dy-hm-days" aria-hidden="true"><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span></span></div>
          <div class="dy-hm-main">
            <div class="dy-hm-months" aria-hidden="true">${months}</div>
            <div class="dy-hm-grid">${cells}</div>
          </div>
        </div>
        <div class="dy-hm-legend" aria-hidden="true">
          Less <span class="dy-cell dy-l0"></span><span class="dy-cell dy-l1"></span><span class="dy-cell dy-l2"></span><span class="dy-cell dy-l3"></span> More
        </div>
      </div>`;
  },

  // Newest week sits on the right; scroll there on narrow screens
  afterRenderHome() {
    const wrap = document.querySelector('.dy-heatmap');
    if (wrap) wrap.scrollLeft = wrap.scrollWidth;
  },

  // ── Review ───────────────────────────────────────────────────

  REVIEW_RANGES: [['30', '30 days'], ['90', '3 months'], ['365', 'Year'], ['all', 'All time']],
  REVIEW_TOP: 8,
  _reviewRange: '90',

  _fmtMins(m) {
    m = Math.round(m);
    if (m < 60) return m + 'm';
    return Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + (m % 60) + 'm' : '');
  },

  renderReview() {
    const today = DiaryStore.todayKey();
    const start = DiaryStore.rangeStart(this._reviewRange, today);
    const s = DiaryStore.stats(start, today);
    const since = start
      ? 'Since ' + DiaryStore.parseKey(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'Every class you have logged';

    const ranges = this.REVIEW_RANGES.map(([val, label]) => {
      const on = val === this._reviewRange;
      return `<button class="dy-range-btn${on ? ' active' : ''}" data-action="dy-review-range"
        data-range="${val}" aria-pressed="${on}">${label}</button>`;
    }).join('');

    const tile = (value, label, cls) => `
      <div class="dy-tile"><span class="dy-tile-val${cls ? ' ' + cls : ''}">${value}</span><span class="dy-tile-label">${label}</span></div>`;

    let body;
    if (!s.classes) {
      body = `<p class="dy-review-empty">No classes logged in this period.</p>`;
    } else {
      const record = (s.subsHit || s.subsTapped)
        ? `<span class="dy-win">${s.subsHit}</span><span class="dy-rec-sep">–</span><span class="dy-loss">${s.subsTapped}</span>`
        : '0';
      body = `
        <div class="dy-tiles">
          ${tile(s.classes, 'Class' + (s.classes !== 1 ? 'es' : ''))}
          ${tile(s.rolls, 'Roll' + (s.rolls !== 1 ? 's' : ''))}
          ${tile(record, 'Subs hit – tapped')}
          ${tile(s.minutes ? this._fmtMins(s.minutes) : s.drills, s.minutes ? 'Drill time' : 'Drills')}
        </div>

        ${this._reviewSection('Top positions practiced', 'Times drilled',
          this._countBars(s.positions, 'pos', 'drill'),
          'Name your drills to see which positions you practise most.')}

        ${this._reviewSection('Drill time by position',
          s.drillTime.basis === 'minutes' ? 'Share of drill minutes' : 'Share of drills',
          this._timeBars(s.drillTime),
          'Name your drills to see where your drilling time goes.',
          this._timeNote(s))}

        ${this._reviewSection('Top submissions hit', 'In rolls',
          this._countBars(s.hits, 'hit', 'time'),
          s.subsHit
            ? 'Add the technique to your “I subbed” rolls to rank them here.'
            : 'No submissions logged yet — mark a roll “I subbed” and note the technique.',
          this._untaggedNote(s.subsHit, s.hits))}

        ${this._reviewSection('Top submissions tapped to', 'In rolls',
          this._countBars(s.tapped, 'tap', 'time'),
          s.subsTapped
            ? 'Add the technique to your “Got subbed” rolls to rank them here.'
            : 'No taps logged in this period.',
          this._untaggedNote(s.subsTapped, s.tapped))}`;
    }

    return `
      <div class="screen dy-review-screen" role="main" aria-label="Diary review">
        <header class="day-header">
          <button class="btn-back" data-nav="dy-home" aria-label="Back to diary">&#x2190;</button>
        </header>
        <header class="app-header">
          <h1>Review</h1>
          <p class="dy-home-sub">${since}</p>
        </header>
        <div class="dy-range" role="group" aria-label="Period">${ranges}</div>
        ${body}
      </div>`;
  },

  _reviewSection(title, sub, bars, emptyText, note) {
    return `
      <section class="dy-review-card">
        <div class="dy-review-head">
          <h2 class="dy-review-title">${title}</h2>
          <span class="dy-review-sub">${sub}</span>
        </div>
        ${bars || `<p class="dy-review-none">${emptyText}</p>`}
        ${note ? `<p class="dy-review-note">${note}</p>` : ''}
      </section>`;
  },

  _barRow(name, valueText, widthPct, tone, tip) {
    return `
      <li class="dy-bar" title="${UI.esc(tip)}">
        <div class="dy-bar-head">
          <span class="dy-bar-name">${UI.esc(name)}</span>
          <span class="dy-bar-val">${valueText}</span>
        </div>
        <div class="dy-bar-track"><div class="dy-bar-fill dy-tone-${tone}" style="width:${Math.max(2, widthPct).toFixed(1)}%"></div></div>
      </li>`;
  },

  // Ranked list, bar length relative to the top item
  _countBars(rows, tone, unit) {
    if (!rows.length) return '';
    const top = rows.slice(0, this.REVIEW_TOP);
    const max = top[0].count;
    const more = rows.length - top.length;
    return `<ol class="dy-bars">${top.map(r => this._barRow(r.name, r.count, (r.count / max) * 100, tone,
      `${r.name}: ${r.count} ${unit}${r.count !== 1 ? 's' : ''}`)).join('')}</ol>` +
      (more > 0 ? `<p class="dy-review-more">+ ${more} more</p>` : '');
  },

  // Part-of-whole list: bar length is the true percentage; the tail folds into "Other"
  _timeBars(dt) {
    if (!dt.rows.length) return '';
    let rows = dt.rows;
    if (rows.length > this.REVIEW_TOP) {
      const head = rows.slice(0, this.REVIEW_TOP - 1);
      const tail = rows.slice(this.REVIEW_TOP - 1);
      rows = head.concat([{
        name: `Other (${tail.length})`,
        value: tail.reduce((a, r) => a + r.value, 0),
        pct: tail.reduce((a, r) => a + r.pct, 0)
      }]);
    }
    const isMins = dt.basis === 'minutes';
    return `<ol class="dy-bars">${rows.map(r => {
      const pct = r.pct < 1 ? '<1%' : Math.round(r.pct) + '%';
      const detail = isMins ? this._fmtMins(r.value) : r.value + ' drill' + (r.value !== 1 ? 's' : '');
      return this._barRow(r.name, `${pct} <span class="dy-bar-detail">· ${detail}</span>`, r.pct, 'time',
        `${r.name}: ${pct} (${detail})`);
    }).join('')}</ol>`;
  },

  _timeNote(s) {
    if (!s.drills) return '';
    if (s.drillTime.basis === 'count') {
      return 'No drill times logged yet, so this is split by number of drills. Add minutes to your drills for a time split.';
    }
    const untimed = s.drills - s.timedDrills;
    return untimed ? `Based on ${s.timedDrills} of ${s.drills} drills — ${untimed} had no minutes logged.` : '';
  },

  _untaggedNote(total, rows) {
    const tagged = rows.reduce((a, r) => a + r.count, 0);
    const missing = total - tagged;
    return rows.length && missing > 0 ? `${missing} more with no technique noted.` : '';
  },

  // ── Entry screen ─────────────────────────────────────────────

  renderEntry(entry) {
    this._entry = entry;
    const today = DiaryStore.todayKey();
    const isToday = entry.date === today;
    const options = this._moveNames().map(n => `<option value="${UI.esc(n)}"></option>`).join('');

    return `
      <div class="screen dy-entry-screen" role="main" aria-label="Diary entry">
        <header class="day-header dy-entry-top">
          <button class="btn-back" data-nav="dy-home" aria-label="Back to diary">&#x2190;</button>
          <span class="dy-saved" aria-live="polite"></span>
        </header>

        <div class="dy-date-row">
          <button class="dy-date-btn" data-action="dy-pick-date" aria-label="Change date">
            <span class="dy-date-main">${UI.esc(this._fmtDate(entry.date))}</span>
            <span class="dy-date-hint">${isToday ? 'Today' : 'Change'} ${Icon.svg('chevron-down', 14)}</span>
          </button>
          <input type="date" class="dy-date-input" data-field="date" value="${entry.date}" max="${today}" tabindex="-1" aria-hidden="true">
        </div>

        <datalist id="dy-moves">${options}</datalist>

        <section class="dy-section">
          <h2 class="home-section-title">Drills</h2>
          <div class="dy-rows" id="dy-drills">${entry.drills.map(d => this._drillRow(d)).join('')}</div>
          <button class="dy-add-btn" data-action="dy-add-drill">+ Drill</button>
        </section>

        <section class="dy-section">
          <h2 class="home-section-title">Rolls</h2>
          <div class="dy-rows" id="dy-rolls">${entry.rolls.map(r => this._rollRow(r)).join('')}</div>
          <button class="dy-add-btn" data-action="dy-add-roll">+ Roll</button>
        </section>

        <button class="dy-delete-btn" data-action="dy-delete-entry">Delete entry</button>
      </div>`;
  },

  _drillRow(d) {
    const camera = DiaryStore.photosEnabled() ? `
      <label class="dy-icon-btn" aria-label="${d.photoId ? 'Replace photo' : 'Add photo'}" title="Photo">
        ${Icon.svg('camera', 20)}<input type="file" accept="image/*" data-field="photo" hidden>
      </label>` : '';
    const photo = d.photoId ? `
      <div class="dy-photo">
        <img data-photo-id="${d.photoId}" alt="Photo for ${UI.esc(d.name || 'drill')}">
        <button class="dy-photo-remove" data-action="dy-remove-photo" aria-label="Remove photo">${Icon.svg('x', 14)}</button>
      </div>` : '';
    return `
      <div class="dy-row" data-drill-id="${d.id}">
        <div class="dy-row-top">
          <input class="dy-input" data-field="name" list="dy-moves" placeholder="Position / technique"
            value="${UI.esc(d.name)}" autocomplete="off" enterkeyhint="next">
          <label class="dy-mins" title="Minutes spent on this drill">
            <input class="dy-input" type="number" inputmode="numeric" min="0" max="600" step="1"
              data-field="mins" placeholder="–" value="${d.mins != null ? d.mins : ''}" aria-label="Minutes">
            <span aria-hidden="true">min</span>
          </label>
          ${camera}
          <button class="dy-icon-btn" data-action="dy-remove-row" aria-label="Remove drill">${Icon.svg('x', 18)}</button>
        </div>
        <textarea class="dy-input dy-text" data-field="desc" rows="2" placeholder="Key details (optional)">${UI.esc(d.desc)}</textarea>
        ${photo}
      </div>`;
  },

  _rollRow(r) {
    const chip = (val, label) => `<button class="dy-chip dy-chip-${val}${r.outcome === val ? ' active' : ''}"
      data-action="dy-outcome" data-outcome="${val}" aria-pressed="${r.outcome === val}">${label}</button>`;
    const showTech = r.outcome === 'sub' || r.outcome === 'subbed';
    return `
      <div class="dy-row" data-roll-id="${r.id}">
        <div class="dy-row-top">
          <input class="dy-input" data-field="partner" placeholder="Partner (optional)"
            value="${UI.esc(r.partner)}" autocomplete="off" enterkeyhint="next">
          <button class="dy-icon-btn" data-action="dy-remove-row" aria-label="Remove roll">${Icon.svg('x', 18)}</button>
        </div>
        <div class="dy-chips" role="group" aria-label="Outcome">
          ${chip('sub', 'I subbed')}${chip('subbed', 'Got subbed')}${chip('none', 'No sub')}
        </div>
        <input class="dy-input" data-field="technique" list="dy-moves" autocomplete="off"
          placeholder="${this._techPlaceholder(r.outcome)}" value="${UI.esc(r.technique)}"${showTech ? '' : ' hidden'}>
        <textarea class="dy-input dy-text" data-field="notes" rows="2" placeholder="What went right / wrong (optional)">${UI.esc(r.notes)}</textarea>
      </div>`;
  },

  _techPlaceholder(outcome) {
    return outcome === 'subbed' ? 'Caught with what?' : 'Subbed them with what?';
  },

  // Load photo blobs into thumbnails after the entry screen is in the DOM
  afterRenderEntry() {
    document.querySelectorAll('.dy-entry-screen img[data-photo-id]').forEach(img => this._loadPhoto(img));
  },

  _loadPhoto(img) {
    DiaryStore.getPhoto(img.dataset.photoId).then(blob => {
      if (!blob || !img.isConnected) return;
      const url = URL.createObjectURL(blob);
      this._urls.push(url);
      img.src = url;
    }).catch(err => console.error('Photo load failed', err));
  },

  // ── Saving ───────────────────────────────────────────────────

  _scheduleSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.flush(true), 400);
  },

  flush(showHint) {
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    if (!this._entry) return Promise.resolve();
    return DiaryStore.save(this._entry).then(() => {
      if (showHint) this._flashSaved();
    }).catch(err => console.error('Diary save failed', err));
  },

  _flashSaved() {
    const el = document.querySelector('.dy-saved');
    if (!el) return;
    el.textContent = 'Saved ✓';
    el.classList.add('show');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => el.classList.remove('show'), 1200);
  },

  // Called by App.render on every navigation
  leave() {
    if (this._entry && DiaryStore.get(this._entry.date) === this._entry) {
      const e = this._entry;
      e.drills = e.drills.filter(d => (d.name || '').trim() || (d.desc || '').trim() || d.photoId || d.mins);
      e.rolls = e.rolls.filter(r => (r.partner || '').trim() || r.outcome || (r.technique || '').trim() || (r.notes || '').trim());
      this.flush(false);
    }
    clearTimeout(this._saveTimer);
    this._entry = null;
    this._urls.forEach(u => URL.revokeObjectURL(u));
    this._urls = [];
  },

  // ── Events ───────────────────────────────────────────────────

  _rowFor(el) {
    const row = el.closest('.dy-row');
    if (!row || !this._entry) return null;
    if (row.dataset.drillId) {
      return { row, kind: 'drills', item: this._entry.drills.find(d => d.id === row.dataset.drillId) };
    }
    return { row, kind: 'rolls', item: this._entry.rolls.find(r => r.id === row.dataset.rollId) };
  },

  handleAction(action, el) {
    const entry = this._entry;

    if (action === 'dy-add-drill' || action === 'dy-add-roll') {
      if (!entry) return;
      const isDrill = action === 'dy-add-drill';
      const item = isDrill
        ? { id: DiaryStore.newId(), name: '', desc: '' }
        : { id: DiaryStore.newId(), partner: '', outcome: null, technique: '', notes: '' };
      (isDrill ? entry.drills : entry.rolls).push(item);
      const list = document.getElementById(isDrill ? 'dy-drills' : 'dy-rolls');
      list.insertAdjacentHTML('beforeend', isDrill ? this._drillRow(item) : this._rollRow(item));
      const input = list.lastElementChild.querySelector('input');
      if (input) input.focus();
      this._scheduleSave();
      return;
    }

    if (action === 'dy-remove-row') {
      const r = this._rowFor(el);
      if (!r || !r.item) return;
      entry[r.kind] = entry[r.kind].filter(x => x !== r.item);
      if (r.item.photoId) DiaryStore.deletePhoto(r.item.photoId);
      r.row.remove();
      this._scheduleSave();
      return;
    }

    if (action === 'dy-outcome') {
      const r = this._rowFor(el);
      if (!r || !r.item) return;
      const val = el.dataset.outcome;
      r.item.outcome = r.item.outcome === val ? null : val; // tap again to clear
      r.row.querySelectorAll('.dy-chip').forEach(c => {
        const on = c.dataset.outcome === r.item.outcome;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on);
      });
      const tech = r.row.querySelector('[data-field="technique"]');
      const show = r.item.outcome === 'sub' || r.item.outcome === 'subbed';
      tech.hidden = !show;
      tech.placeholder = this._techPlaceholder(r.item.outcome);
      if (show && !tech.value) tech.focus();
      this._scheduleSave();
      return;
    }

    if (action === 'dy-remove-photo') {
      const r = this._rowFor(el);
      if (!r || !r.item || !r.item.photoId) return;
      DiaryStore.deletePhoto(r.item.photoId);
      delete r.item.photoId;
      r.row.outerHTML = this._drillRow(r.item);
      this._scheduleSave();
      return;
    }

    if (action === 'dy-back') {
      const target = App.diaryBackTarget();
      App.render(target.screen, target.params);
      return;
    }

    if (action === 'dy-past-toggle') {
      const panel = document.getElementById('dy-past');
      if (!panel) return;
      panel.hidden = !panel.hidden;
      el.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) document.getElementById('dy-past-date').focus();
      return;
    }

    if (action === 'dy-past-go') {
      const input = document.getElementById('dy-past-date');
      const date = input && input.value;
      if (!date) { if (input) input.focus(); return; }
      if (date > DiaryStore.todayKey()) { alert('That date is in the future.'); return; }
      App.render('dy-entry', { date });
      return;
    }

    if (action === 'dy-review-range') {
      this._reviewRange = el.dataset.range;
      App.render('dy-review');
      return;
    }

    if (action === 'dy-pick-date') {
      const input = document.querySelector('.dy-date-input');
      if (!input) return;
      try {
        input.showPicker();
      } catch (err) {
        // Older browsers: reveal the native input instead
        input.classList.add('dy-date-input-visible');
        input.focus();
      }
      return;
    }

    if (action === 'dy-delete-entry') {
      if (!entry) return;
      if (!confirm('Delete the entry for ' + this._fmtDate(entry.date, true) + '?')) return;
      const date = entry.date;
      this._entry = null;
      DiaryStore.delete(date).then(() => App.render('dy-home'));
    }
  },

  handleInput(e) {
    const field = e.target.dataset.field;
    if (!field || field === 'photo' || field === 'date') return;
    const r = this._rowFor(e.target);
    if (!r || !r.item) return;
    const v = e.target.value;
    r.item[field] = field === 'mins' ? (v === '' || isNaN(Number(v)) ? null : Number(v)) : v;
    this._scheduleSave();
  },

  handleChange(e) {
    const field = e.target.dataset.field;
    if (field === 'photo') this._onPhoto(e.target);
    else if (field === 'date') this._onDate(e.target.value);
  },

  _onPhoto(input) {
    const file = input.files && input.files[0];
    const r = this._rowFor(input);
    if (!file || !r || !r.item) return;
    const item = r.item;
    const entry = this._entry;
    this._resize(file).then(blob => DiaryStore.savePhoto(blob)).then(id => {
      if (item.photoId) DiaryStore.deletePhoto(item.photoId);
      item.photoId = id;
      if (this._entry !== entry) { DiaryStore.save(entry); return; } // user navigated away
      const row = document.querySelector(`[data-drill-id="${item.id}"]`);
      if (row) {
        row.outerHTML = this._drillRow(item);
        const img = document.querySelector(`[data-drill-id="${item.id}"] img[data-photo-id]`);
        if (img) this._loadPhoto(img);
      }
      this.flush(true);
    }).catch(err => {
      console.error('Photo failed', err);
      alert('Could not add that photo.');
    });
  },

  // Longest side 1280px, JPEG 0.8 — keeps phone photos to a few hundred KB
  _resize(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Encode failed'))), 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unreadable image')); };
      img.src = url;
    });
  },

  // Move the open entry to another date (merging if that day already has one)
  _onDate(newDate) {
    const entry = this._entry;
    if (!entry || !newDate || newDate === entry.date) return;
    if (newDate > DiaryStore.todayKey()) {
      alert('That date is in the future.');
      App.render('dy-entry', { date: entry.date });
      return;
    }
    const existing = DiaryStore.get(newDate);
    clearTimeout(this._saveTimer);
    let target;
    if (existing) {
      if (!confirm('There is already an entry on ' + this._fmtDate(newDate, true) + '. Merge this one into it?')) {
        App.render('dy-entry', { date: entry.date });
        return;
      }
      existing.drills = existing.drills.concat(entry.drills);
      existing.rolls = existing.rolls.concat(entry.rolls);
      target = existing;
    } else {
      target = Object.assign({}, entry, { date: newDate });
    }
    this._entry = null;
    DiaryStore.move(entry.date, target)
      .then(() => App.render('dy-entry', { date: newDate }));
  }
};
