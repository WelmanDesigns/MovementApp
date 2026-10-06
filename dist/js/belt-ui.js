// Belt Tracker — rendering + interaction handlers.
// Screens: bt-home (stage list) and bt-stage (reusable, curriculum-driven).
// App.js delegates every data-action starting with "bt-" to BeltUI.handleAction,
// and input/change events inside .bt-stage-screen to handleInput/handleChange.

const BeltUI = {

  // Per-stage view state (in memory only): collapse, open editors, filters
  _view: null,
  _undoTimer: null,

  _initView(stageId, collapseDefault) {
    if (!this._view || this._view.stageId !== stageId) {
      this._view = {
        stageId,
        collapsed: {},
        collapseDefault: !!collapseDefault,
        editors: {},
        suggestOpen: {},
        statusFilter: 'all',
        belowOnly: false,
        query: ''
      };
    }
  },

  _isCollapsed(key) {
    const v = this._view;
    return v.collapsed[key] === undefined ? v.collapseDefault : v.collapsed[key];
  },

  _beltLabel(belt) {
    return belt.charAt(0).toUpperCase() + belt.slice(1) + ' Belt';
  },

  // ── Landing page ─────────────────────────────────────────────

  renderHome() {
    const cards = BeltData.STAGES.map(meta => this._stageCard(meta)).join('');
    return `
      <div class="screen bt-home-screen" role="main" aria-label="Belt Tracker">
        <header class="day-header">
          <button class="btn-back" data-nav="home" aria-label="Back to workouts">&#x2190;</button>
        </header>
        <header class="app-header">
          <h1>Belt Tracker</h1>
          <p class="bt-home-sub">Build your curriculum for each stripe and exam</p>
        </header>
        <div class="bt-stage-list">${cards}</div>
      </div>`;
  },

  _stageCard(meta) {
    const summary = BeltStore.stageSummary(meta.id);
    const metaBits = [];
    if (meta.minimumClasses) {
      metaBits.push('Min ' + meta.minimumClasses + ' classes' +
        (meta.minimumClassesContext ? ' ' + meta.minimumClassesContext : ''));
    }
    if (meta.printedExamPositionCount) {
      metaBits.push(meta.printedExamPositionCount + ' exam positions');
    }

    const progressBits = [];
    if (summary.groupsWithReq) {
      progressBits.push(summary.groupsComplete + ' of ' + summary.groupsWithReq + ' categories complete');
    }
    if (summary.hasTargets) {
      progressBits.push(summary.selectedCapped + ' of ' + summary.requiredTotal + ' required moves selected');
    }
    if (summary.hasExact) {
      progressBits.push(summary.readyCount + ' of ' + summary.listTotal + ' techniques ready');
    }
    const stateNote = summary.started ? '' : '<span class="bt-not-started">Not started</span>';

    return `
      <button class="bt-stage-card bt-belt-${meta.belt}" data-nav="bt-stage" data-stage-id="${meta.id}"
              aria-label="Open ${UI.esc(meta.title)}">
        <span class="bt-belt-band" aria-hidden="true">
          ${meta.stageType === 'stripe'
            ? Array.from({ length: 4 }, (_, i) =>
                `<span class="bt-band-stripe ${i < (meta.stripeNumber || 0) ? 'on' : ''}"></span>`).join('')
            : '<span class="bt-band-exam">EXAM</span>'}
        </span>
        <span class="bt-stage-card-info">
          <span class="bt-stage-card-title">${UI.esc(meta.title)}</span>
          ${metaBits.length ? `<span class="bt-stage-card-meta">${UI.esc(metaBits.join(' · '))}</span>` : ''}
          <span class="bt-stage-card-progress">${stateNote}${UI.esc(progressBits.join(' · '))}</span>
        </span>
        <span class="bt-stage-card-open" aria-hidden="true">Open &#x2192;</span>
      </button>`;
  },

  // ── Stage page ───────────────────────────────────────────────

  renderStage(stageId) {
    const template = BeltData.getStageTemplate(stageId);
    if (!template) return this.renderHome();
    const stage = BeltStore.getStageState(stageId);
    const totalDefaults = template.sections.reduce(
      (n, s) => n + s.groups.reduce((m, g) => m + g.defaultMoves.length, 0), 0);
    this._initView(stageId, totalDefaults > 60);

    const metaChips = [];
    if (template.minimumClasses) {
      metaChips.push('Min ' + template.minimumClasses + ' classes' +
        (template.minimumClassesContext ? ' ' + template.minimumClassesContext : ''));
    }
    if (template.printedExamPositionCount) {
      metaChips.push(template.printedExamPositionCount + ' printed exam positions');
    }

    const sectionsHTML = template.sections.map(sec => this._sectionHTML(template, sec)).join('');
    const reviewHTML = this._reviewHTML(template);

    return `
      <div class="screen bt-stage-screen" role="main" aria-label="${UI.esc(template.title)}" data-stage-id="${stageId}">
        <header class="day-header">
          <button class="btn-back" data-nav="bt-home" aria-label="Back to Belt Tracker">&#x2190;</button>
        </header>
        <header class="app-header bt-stage-header">
          <span class="bt-belt-chip bt-belt-${template.belt}">${UI.esc(this._beltLabel(template.belt))}</span>
          <h1>${UI.esc(template.title)}</h1>
          ${metaChips.length ? `<p class="bt-stage-meta">${metaChips.map(c => `<span class="bt-chip">${UI.esc(c)}</span>`).join('')}</p>` : ''}
          ${template.description ? `<p class="bt-stage-desc">${UI.esc(template.description)}</p>` : ''}
          <p class="bt-stage-summary" id="bt-stage-summary" role="status">${UI.esc(this._summaryText(stageId))}</p>
        </header>

        <details class="bt-stage-notes" ${stage.stageNotes ? 'open' : ''}>
          <summary>Stage notes</summary>
          <textarea id="bt-stage-notes" rows="3" aria-label="Stage notes"
            placeholder="Notes for this stage (autosaved)">${UI.esc(stage.stageNotes || '')}</textarea>
        </details>

        <div class="bt-toolbar" role="search">
          <input type="search" id="bt-search" placeholder="Search moves in this stage"
                 aria-label="Search moves in this stage" value="${UI.esc(this._view.query)}">
          <div class="bt-toolbar-row">
            <select id="bt-status-filter" aria-label="Filter by status">
              <option value="all">All statuses</option>
              ${BELT_STATUSES.map(s =>
                `<option value="${s.id}" ${this._view.statusFilter === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
            <button class="bt-toggle ${this._view.belowOnly ? 'active' : ''}" data-action="bt-filter-below"
                    aria-pressed="${this._view.belowOnly}">Below requirement</button>
            <button class="bt-toggle" data-action="bt-collapse-all">Collapse all</button>
            <button class="bt-toggle" data-action="bt-expand-all">Expand all</button>
          </div>
        </div>

        <div class="bt-sections">${sectionsHTML}${reviewHTML}</div>
      </div>`;
  },

  _summaryText(stageId) {
    const s = BeltStore.stageSummary(stageId);
    const bits = [];
    if (s.hasTargets) bits.push(s.selectedCapped + ' of ' + s.requiredTotal + ' required moves selected');
    if (s.hasExact) bits.push(s.readyCount + ' of ' + s.listTotal + ' techniques marked ready');
    if (s.groupsWithReq) bits.push(s.groupsComplete + ' of ' + s.groupsWithReq + ' categories complete');
    return bits.join(' · ');
  },

  _sectionStatusText(stageId, sec) {
    let current = 0, target = 0, ready = 0, total = 0;
    for (const grp of sec.groups) {
      if (grp.requirementMode === 'informational' || grp.requirementMode === 'none') continue;
      const st = BeltStore.groupStatus(grp, BeltStore.movesForGroup(stageId, grp.id));
      if (st.mode === 'target_count') { current += Math.min(st.current, st.target); target += st.target; }
      else { ready += st.ready; total += st.total; }
    }
    const bits = [];
    if (target) bits.push(current + ' of ' + target + ' required');
    if (total) bits.push(ready + ' of ' + total + ' ready');
    return bits.join(' · ');
  },

  _sectionHTML(template, sec) {
    const collapsed = this._isCollapsed('sec:' + sec.key);
    const statusText = this._sectionStatusText(template.id, sec);
    const groups = sec.groups.map(grp => this._groupHTML(template, grp)).join('');
    return `
      <section class="bt-section" data-section-key="${sec.key}">
        <button class="bt-section-header" data-action="bt-toggle-section" data-key="${sec.key}"
                aria-expanded="${!collapsed}">
          <span class="bt-section-title">${UI.esc(sec.name)}</span>
          ${statusText ? `<span class="bt-section-status" data-section-status="${sec.key}">${UI.esc(statusText)}</span>` : ''}
          <span class="bt-chevron" aria-hidden="true">${collapsed ? '&#x25B8;' : '&#x25BE;'}</span>
        </button>
        <div class="bt-section-body" ${collapsed ? 'hidden' : ''}>${groups}</div>
      </section>`;
  },

  _countHTML(status) {
    if (!status.text) {
      return status.mode === 'informational'
        ? '<span class="bt-count bt-count-info"><span aria-hidden="true">&#x2139;</span> Informational — not counted</span>'
        : '';
    }
    const icon = { below: '&#x25B2;', met: '&#x2713;', above: '&#x2795;', progress: '&#x25D0;' }[status.state] || '';
    return `<span class="bt-count bt-count-${status.state}" role="status">` +
           `<span class="bt-count-icon" aria-hidden="true">${icon}</span> ${UI.esc(status.text)}</span>`;
  },

  _groupHTML(template, grp) {
    const stageId = template.id;
    const moves = BeltStore.movesForGroup(stageId, grp.id);
    const status = BeltStore.groupStatus(grp, moves);
    const suggestions = BeltStore.suggestionsForGroup(stageId, grp);
    const suggestOpen = !!this._view.suggestOpen[grp.id];
    const isInfo = grp.requirementMode === 'informational';

    const rows = moves.map(m => this._moveRowHTML(stageId, grp, m)).join('');

    let suggestHTML = '';
    if (suggestions.length) {
      suggestHTML = `
        <div class="bt-suggest" data-group-suggest="${grp.id}" ${suggestOpen ? '' : 'hidden'}>
          <input type="search" class="bt-suggest-search" placeholder="Search suggestions"
                 aria-label="Search suggested moves" data-group-id="${grp.id}">
          <ul class="bt-suggest-list">
            ${suggestions.map(sug => `
              <li class="bt-suggest-item" data-search="${UI.esc((sug.name + ' ' + (sug.context || '')).toLowerCase())}">
                <span class="bt-suggest-name">${UI.esc(sug.name)}${this._contextFor(sug, grp) ? ` <span class="bt-move-context">${UI.esc(this._contextFor(sug, grp))}</span>` : ''}${sug.removedDefault ? ' <span class="bt-move-context">removed default</span>' : ''}</span>
                <button class="bt-mini-btn" data-action="bt-add-suggested" data-group-id="${grp.id}"
                        data-suggestion-id="${UI.esc(sug.id)}" aria-label="Add ${UI.esc(sug.name)} to my list">+ Add</button>
              </li>`).join('')}
          </ul>
        </div>`;
    }

    return `
      <div class="bt-group" data-group-id="${grp.id}" data-req-state="${status.state || ''}">
        <div class="bt-group-header">
          <h3 class="bt-group-title">${grp.name ? UI.esc(grp.name) : UI.esc('All techniques')}</h3>
          <span data-group-count="${grp.id}">${this._countHTML(status)}</span>
        </div>
        <ul class="bt-moves" data-group-moves="${grp.id}">${rows}</ul>
        <div class="bt-group-actions">
          <button class="bt-mini-btn" data-action="bt-add-custom" data-group-id="${grp.id}">+ Add custom move</button>
          ${suggestions.length ? `
            <button class="bt-mini-btn" data-action="bt-toggle-suggest" data-group-id="${grp.id}"
                    aria-expanded="${suggestOpen}">Suggestions (${suggestions.length})</button>` : ''}
          ${isInfo ? '' : `
            <button class="bt-mini-btn bt-danger-btn" data-action="bt-reset-group" data-group-id="${grp.id}">Reset defaults</button>`}
        </div>
        ${suggestHTML}
      </div>`;
  },

  _moveRowHTML(stageId, grp, m) {
    const editorOpen = !!this._view.editors[m.id];
    const statusMeta = BELT_STATUSES.find(s => s.id === m.status) || BELT_STATUSES[0];
    const isInfo = grp.requirementMode === 'informational';
    const ready = BeltStore.isReady(m);

    if (isInfo) {
      return `
        <li class="bt-move bt-move-info" data-move-id="${m.id}" data-search="${UI.esc((m.name + ' ' + (m.notes || '')).toLowerCase())}" data-status="${m.status}">
          <label class="bt-info-row">
            <input type="checkbox" data-action-check="bt-info-check" data-move-id="${m.id}" ${ready ? 'checked' : ''}>
            <span>${UI.esc(m.name)}</span>
          </label>
        </li>`;
    }

    return `
      <li class="bt-move ${ready ? 'bt-move-ready' : ''}" data-move-id="${m.id}"
          data-search="${UI.esc((m.name + ' ' + (m.notes || '')).toLowerCase())}" data-status="${m.status}">
        <div class="bt-move-row">
          <span class="bt-move-readymark" aria-hidden="true">${ready ? '&#x2713;' : ''}</span>
          <input class="bt-move-name" value="${UI.esc(m.name)}" data-move-id="${m.id}"
                 aria-label="Move name" placeholder="Move name">
          <button class="bt-status-chip bt-status-${m.status}" data-action="bt-toggle-editor" data-move-id="${m.id}"
                  aria-expanded="${editorOpen}"
                  aria-label="Edit ${UI.esc(m.name)}: status ${statusMeta.label}${m.notes ? ', has notes' : ''}">
            ${statusMeta.label}${m.notes ? ' &#x1F4DD;' : ''}
          </button>
        </div>
        <div class="bt-move-editor" ${editorOpen ? '' : 'hidden'}>
          <label class="bt-field">Status
            <select class="bt-status-select" data-move-id="${m.id}" aria-label="Status for ${UI.esc(m.name)}">
              ${BELT_STATUSES.map(s => `<option value="${s.id}" ${s.id === m.status ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </label>
          <label class="bt-field">Notes
            <textarea class="bt-move-notes" rows="3" data-move-id="${m.id}"
                      placeholder="Key details (autosaved)" aria-label="Notes for ${UI.esc(m.name)}">${UI.esc(m.notes || '')}</textarea>
          </label>
          <div class="bt-move-tools">
            <button class="bt-mini-btn" data-action="bt-move-up" data-move-id="${m.id}" aria-label="Move ${UI.esc(m.name)} up">&#x2191; Up</button>
            <button class="bt-mini-btn" data-action="bt-move-down" data-move-id="${m.id}" aria-label="Move ${UI.esc(m.name)} down">&#x2193; Down</button>
            <button class="bt-mini-btn bt-danger-btn" data-action="bt-remove-move" data-move-id="${m.id}"
                    aria-label="Remove ${UI.esc(m.name)} from my list">Remove</button>
            <span class="bt-move-source">${{ default: 'Curriculum', suggested: 'From suggestions', custom: 'Custom' }[m.source] || ''}</span>
          </div>
        </div>
      </li>`;
  },

  _reviewHTML(template) {
    if (!template.reviewRequirements.length) return '';
    const cards = template.reviewRequirements.map(req => {
      const prog = BeltStore.reviewProgress(req);
      const refMeta = BeltData.getStageMeta(req.stageId);
      const icon = prog.met ? '&#x2713;' : '&#x25D0;';
      return `
        <button class="bt-review-card ${prog.met ? 'met' : ''}" data-nav="bt-stage" data-stage-id="${req.stageId}"
                aria-label="${UI.esc(req.label)}: ${prog.ready} of ${prog.required} ready. Opens ${UI.esc(refMeta ? refMeta.title : req.stageId)}">
          <span class="bt-review-icon" aria-hidden="true">${icon}</span>
          <span class="bt-review-info">
            <span class="bt-review-label">${UI.esc(req.label)}</span>
            <span class="bt-review-progress">${prog.ready} of ${prog.required} ready · from ${UI.esc(refMeta ? refMeta.title : '')}</span>
          </span>
        </button>`;
    }).join('');
    return `
      <section class="bt-section bt-review-section">
        <div class="bt-section-header bt-review-header">
          <span class="bt-section-title">${UI.esc(template.reviewLabel)}</span>
          <span class="bt-section-status">progress read from earlier stages</span>
        </div>
        <div class="bt-review-cards">${cards}</div>
      </section>`;
  },

  // ── Actions (clicks) ─────────────────────────────────────────

  handleAction(action, el) {
    const stageId = this._view ? this._view.stageId : null;

    switch (action) {
      case 'bt-toggle-section': {
        const key = 'sec:' + el.dataset.key;
        this._view.collapsed[key] = !this._isCollapsed(key);
        const section = el.closest('.bt-section');
        const body = section.querySelector('.bt-section-body');
        const chev = el.querySelector('.bt-chevron');
        const collapsed = this._view.collapsed[key];
        if (body) body.hidden = collapsed;
        el.setAttribute('aria-expanded', String(!collapsed));
        if (chev) chev.innerHTML = collapsed ? '&#x25B8;' : '&#x25BE;';
        return;
      }
      case 'bt-collapse-all':
      case 'bt-expand-all': {
        const collapse = action === 'bt-collapse-all';
        document.querySelectorAll('.bt-section:not(.bt-review-section)').forEach(sec => {
          const key = 'sec:' + sec.dataset.sectionKey;
          this._view.collapsed[key] = collapse;
          const body = sec.querySelector('.bt-section-body');
          const header = sec.querySelector('.bt-section-header');
          const chev = sec.querySelector('.bt-chevron');
          if (body) body.hidden = collapse;
          if (header) header.setAttribute('aria-expanded', String(!collapse));
          if (chev) chev.innerHTML = collapse ? '&#x25B8;' : '&#x25BE;';
        });
        return;
      }
      case 'bt-filter-below':
        this._view.belowOnly = !this._view.belowOnly;
        el.classList.toggle('active', this._view.belowOnly);
        el.setAttribute('aria-pressed', String(this._view.belowOnly));
        this._applyFilters();
        return;

      case 'bt-toggle-editor': {
        const id = el.dataset.moveId;
        this._view.editors[id] = !this._view.editors[id];
        const li = el.closest('.bt-move');
        const editor = li && li.querySelector('.bt-move-editor');
        if (editor) editor.hidden = !this._view.editors[id];
        el.setAttribute('aria-expanded', String(!!this._view.editors[id]));
        return;
      }
      case 'bt-toggle-suggest': {
        const gid = el.dataset.groupId;
        this._view.suggestOpen[gid] = !this._view.suggestOpen[gid];
        const panel = document.querySelector(`[data-group-suggest="${gid}"]`);
        if (panel) panel.hidden = !this._view.suggestOpen[gid];
        el.setAttribute('aria-expanded', String(!!this._view.suggestOpen[gid]));
        return;
      }

      case 'bt-add-custom': {
        const move = BeltStore.addCustomMove(stageId, el.dataset.groupId, '');
        this._view.editors[move.id] = false;
        this._rerenderStage(stageId, () => {
          const input = document.querySelector(`.bt-move[data-move-id="${move.id}"] .bt-move-name`);
          if (input) input.focus();
        });
        return;
      }
      case 'bt-add-suggested': {
        const grp = this._findGroup(stageId, el.dataset.groupId);
        if (!grp) return;
        const tpl = this._findSuggestion(stageId, grp, el.dataset.suggestionId);
        if (tpl) {
          // Keep position context in the name when the category doesn't imply it
          const ctx = this._contextFor(tpl, grp);
          BeltStore.addSuggested(stageId, grp.id, ctx && !tpl.removedDefault
            ? { ...tpl, name: tpl.name + ' — ' + ctx } : tpl);
        }
        this._rerenderStage(stageId);
        return;
      }
      case 'bt-remove-move': {
        const move = BeltStore.removeMove(stageId, el.dataset.moveId);
        if (move) {
          delete this._view.editors[move.id];
          this._rerenderStage(stageId, () => this._showUndo(stageId, move));
        }
        return;
      }
      case 'bt-undo-remove': {
        BeltStore.undoRemove(stageId, el.dataset.moveId);
        this._hideUndo();
        this._rerenderStage(stageId);
        return;
      }
      case 'bt-move-up':
      case 'bt-move-down': {
        if (BeltStore.reorderMove(stageId, el.dataset.moveId, action === 'bt-move-up' ? -1 : 1)) {
          this._rerenderStage(stageId, () => {
            const btn = document.querySelector(`.bt-move[data-move-id="${el.dataset.moveId}"] [data-action="${action}"]`);
            if (btn) btn.focus();
          });
        }
        return;
      }
      case 'bt-reset-group': {
        const grp = this._findGroup(stageId, el.dataset.groupId);
        if (!grp) return;
        if (confirm('Reset "' + (grp.name || 'this category') + '" to its default list?\n\nYour edits, notes and custom moves in this category will be lost. Other categories are not affected.')) {
          BeltStore.resetGroup(stageId, grp);
          this._rerenderStage(stageId);
        }
        return;
      }
    }
  },

  // ── Autosaved inputs ─────────────────────────────────────────

  handleInput(e) {
    const t = e.target;
    const stageId = this._view ? this._view.stageId : null;
    if (!stageId) return;

    if (t.id === 'bt-stage-notes') {
      BeltStore.setStageNotes(stageId, t.value);
      return;
    }
    if (t.id === 'bt-search') {
      this._view.query = t.value;
      this._applyFilters();
      return;
    }
    if (t.classList.contains('bt-suggest-search')) {
      const list = t.closest('.bt-suggest').querySelectorAll('.bt-suggest-item');
      const q = t.value.toLowerCase().trim();
      list.forEach(item => { item.hidden = !!q && !item.dataset.search.includes(q); });
      return;
    }
    if (t.classList.contains('bt-move-name')) {
      BeltStore.updateMove(stageId, t.dataset.moveId, { name: t.value });
      const li = t.closest('.bt-move');
      if (li) li.dataset.search = (t.value + ' ').toLowerCase();
      this._refreshCounts(stageId, t.dataset.moveId);
      return;
    }
    if (t.classList.contains('bt-move-notes')) {
      BeltStore.updateMove(stageId, t.dataset.moveId, { notes: t.value });
      return;
    }
  },

  handleChange(e) {
    const t = e.target;
    const stageId = this._view ? this._view.stageId : null;
    if (!stageId) return;

    if (t.id === 'bt-status-filter') {
      this._view.statusFilter = t.value;
      this._applyFilters();
      return;
    }
    if (t.classList.contains('bt-status-select')) {
      const move = BeltStore.updateMove(stageId, t.dataset.moveId, { status: t.value });
      if (move) this._refreshMoveRow(stageId, move);
      return;
    }
    if (t.dataset.actionCheck === 'bt-info-check') {
      BeltStore.updateMove(stageId, t.dataset.moveId, { status: t.checked ? 'exam_ready' : 'not_started' });
      return;
    }
  },

  // ── Targeted DOM refresh (keeps focus while typing) ──────────

  _refreshMoveRow(stageId, move) {
    const li = document.querySelector(`.bt-move[data-move-id="${move.id}"]`);
    if (li) {
      li.dataset.status = move.status;
      const ready = BeltStore.isReady(move);
      li.classList.toggle('bt-move-ready', ready);
      const mark = li.querySelector('.bt-move-readymark');
      if (mark) mark.innerHTML = ready ? '&#x2713;' : '';
      const chip = li.querySelector('.bt-status-chip');
      if (chip) {
        const meta = BELT_STATUSES.find(s => s.id === move.status) || BELT_STATUSES[0];
        chip.className = 'bt-status-chip bt-status-' + move.status;
        chip.innerHTML = meta.label + (move.notes ? ' &#x1F4DD;' : '');
      }
    }
    this._refreshCounts(stageId, move.id);
  },

  _refreshCounts(stageId, moveId) {
    const move = BeltStore.getMove(stageId, moveId);
    if (!move) return;
    const template = BeltData.getStageTemplate(stageId);
    for (const sec of template.sections) {
      const grp = sec.groups.find(g => g.id === move.groupId);
      if (!grp) continue;
      const status = BeltStore.groupStatus(grp, BeltStore.movesForGroup(stageId, grp.id));
      const holder = document.querySelector(`[data-group-count="${grp.id}"]`);
      if (holder) holder.innerHTML = this._countHTML(status);
      const groupEl = document.querySelector(`.bt-group[data-group-id="${grp.id}"]`);
      if (groupEl) groupEl.dataset.reqState = status.state || '';
      const secStatus = document.querySelector(`[data-section-status="${sec.key}"]`);
      if (secStatus) secStatus.textContent = this._sectionStatusText(stageId, sec);
      break;
    }
    const summary = document.getElementById('bt-stage-summary');
    if (summary) summary.textContent = this._summaryText(stageId);
  },

  // Full stage re-render for structural changes; keeps scroll position
  _rerenderStage(stageId, afterRender) {
    const app = document.getElementById('app');
    const scrollY = window.scrollY;
    app.innerHTML = this.renderStage(stageId);
    window.scrollTo(0, scrollY);
    this._applyFilters();
    if (afterRender) afterRender();
  },

  // ── Search & filters ─────────────────────────────────────────

  _applyFilters() {
    const v = this._view;
    if (!v) return;
    const q = (v.query || '').toLowerCase().trim();
    const status = v.statusFilter;
    const filtering = !!q || status !== 'all' || v.belowOnly;

    document.querySelectorAll('.bt-section:not(.bt-review-section)').forEach(sec => {
      let sectionHasVisible = false;
      sec.querySelectorAll('.bt-group').forEach(grp => {
        if (v.belowOnly && grp.dataset.reqState !== 'below') {
          grp.hidden = true;
          return;
        }
        let groupHasMatch = false;
        grp.querySelectorAll('.bt-move').forEach(li => {
          const matchQ = !q || (li.dataset.search || '').includes(q);
          const matchS = status === 'all' || li.dataset.status === status;
          const show = matchQ && matchS;
          li.hidden = !show;
          if (show) groupHasMatch = true;
        });
        // Keep the group visible if only its suggestions match the search
        if (!groupHasMatch && q) {
          grp.querySelectorAll('.bt-suggest-item').forEach(item => {
            if ((item.dataset.search || '').includes(q)) groupHasMatch = true;
          });
        }
        grp.hidden = filtering && !groupHasMatch && (q !== '' || status !== 'all');
        if (!grp.hidden) sectionHasVisible = true;
      });
      sec.hidden = filtering && !sectionHasVisible;
      // Auto-expand while filtering so matches are visible
      if (filtering && sectionHasVisible) {
        const body = sec.querySelector('.bt-section-body');
        if (body) body.hidden = false;
      } else if (!filtering) {
        const key = 'sec:' + sec.dataset.sectionKey;
        const body = sec.querySelector('.bt-section-body');
        if (body) body.hidden = this._isCollapsed(key);
      }
    });
  },

  // ── Undo toast ───────────────────────────────────────────────

  _showUndo(stageId, move) {
    this._hideUndo();
    const toast = document.createElement('div');
    toast.className = 'bt-undo-toast';
    toast.id = 'bt-undo-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML =
      `<span>Removed &ldquo;${UI.esc(move.name || 'move')}&rdquo;` +
      (move.source !== 'custom' ? ' &middot; back in suggestions' : '') + '</span>' +
      `<button data-action="bt-undo-remove" data-move-id="${move.id}">Undo</button>`;
    document.body.appendChild(toast);
    this._undoTimer = setTimeout(() => this._hideUndo(), 6000);
  },

  _hideUndo() {
    if (this._undoTimer) { clearTimeout(this._undoTimer); this._undoTimer = null; }
    const toast = document.getElementById('bt-undo-toast');
    if (toast) toast.remove();
  },

  // ── Lookups ──────────────────────────────────────────────────

  _findGroup(stageId, groupId) {
    const template = BeltData.getStageTemplate(stageId);
    if (!template) return null;
    for (const sec of template.sections) {
      const g = sec.groups.find(x => x.id === groupId);
      if (g) return g;
    }
    return null;
  },

  _findSuggestion(stageId, grp, suggestionId) {
    const list = BeltStore.suggestionsForGroup(stageId, grp);
    return list.find(s => s.id === suggestionId) || null;
  },

  // A suggestion's position context, unless the category name already says it
  _contextFor(tpl, grp) {
    if (!tpl.context) return '';
    const gname = (grp.name || '').toLowerCase();
    return gname.includes(tpl.context.toLowerCase()) ? '' : tpl.context;
  }
};
