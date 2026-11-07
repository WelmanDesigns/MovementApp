// Gameplan UI — list, editor, and node detail screens

const GameplanUI = {

  // ── Gameplan List Screen ────────────────────────────────────

  renderList(gameplans) {
    const cards = gameplans.map(gp => {
      const nodeCount = gp.nodes.length;
      const updated = new Date(gp.updatedAt);
      const dateStr = updated.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `
        <div class="gp-plan-card" data-nav="gp-editor" data-gp-id="${gp.id}">
          <div class="gp-plan-card-info">
            <h3 class="gp-plan-card-name">${UI.esc(gp.name)}</h3>
            <p class="gp-plan-card-meta">${nodeCount} node${nodeCount !== 1 ? 's' : ''} &middot; ${dateStr}</p>
          </div>
          <button class="gp-plan-card-delete" data-action="gp-delete" data-gp-id="${gp.id}" aria-label="Delete ${UI.esc(gp.name)}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>`;
    }).join('');

    const empty = gameplans.length === 0
      ? '<p class="gp-empty">No gameplans yet. Create one to start mapping your BJJ game.</p>'
      : '';

    return `
      <div class="screen gp-list-screen" role="main" aria-label="BJJ Gameplans">
        <header class="app-header">
          <h1>Gameplans</h1>
          <p>Map how your positions connect</p>
        </header>
        <div class="gp-list-actions">
          <button class="gp-create-btn" data-action="gp-create">
            ${Icon.svg('plus', 18)}
            New gameplan
          </button>
          <button class="gp-library-btn" data-action="gp-open-library-browse">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            Library
          </button>
          <button class="gp-library-btn" data-action="gp-export" aria-label="Export backup" title="Export backup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="gp-library-btn" data-action="gp-import" aria-label="Import backup" title="Import backup">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </button>
        </div>
        ${empty}
        <div class="gp-plan-list">
          ${cards}
        </div>
      </div>`;
  },

  // ── Gameplan Editor Screen ──────────────────────────────────

  renderEditor(gameplan) {
    return `
      <div class="screen gp-editor-screen" role="main" aria-label="Gameplan Editor">
        <header class="gp-editor-header">
          <button class="btn-back" data-nav="gp-list" aria-label="Back">&#x2190;</button>
          <span class="gp-editor-title" data-action="gp-rename" title="Tap to rename">${UI.esc(gameplan.name)}</span>
        </header>
        <div class="gp-svg-container" id="gp-svg-container"></div>
        <div class="gp-toolbar">
          <button class="gp-toolbar-btn gp-toolbar-btn-labeled" data-action="gp-add-node" data-type="position" aria-label="Add Position">
            <svg width="20" height="20" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span class="gp-toolbar-label">Position</span>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-labeled" data-action="gp-add-node" data-type="transition" aria-label="Add Transition">
            <svg width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span class="gp-toolbar-label">Transition</span>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-labeled" data-action="gp-add-node" data-type="submission" aria-label="Add Submission">
            <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="12,3 22,20 2,20" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span class="gp-toolbar-label">Submission</span>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-labeled" data-action="gp-add-node" data-type="reaction" aria-label="Add Reaction">
            <svg width="20" height="20" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            <span class="gp-toolbar-label">Reaction</span>
          </button>
          <div class="gp-toolbar-divider"></div>
          <button class="gp-toolbar-btn gp-toolbar-btn-labeled" id="gp-btn-connect" data-action="gp-connect" aria-label="Connect nodes">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            <span class="gp-toolbar-label">Connect</span>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-labeled" data-action="gp-open-library" aria-label="Move Library">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
            <span class="gp-toolbar-label">Library</span>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-detail" id="gp-btn-conn-label" data-action="gp-edit-conn-label" aria-label="Edit connection label" title="Label" style="display:none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-detail" id="gp-btn-detail" data-action="gp-open-detail" aria-label="Node details" title="Details" style="display:none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
          </button>
          <button class="gp-toolbar-btn gp-toolbar-btn-danger" id="gp-btn-delete" data-action="gp-delete-node" aria-label="Delete node" title="Delete" style="display:none">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          </button>
        </div>
      </div>`;
  },

  // ── Node Detail Overlay ─────────────────────────────────────

  showNodeDetail(node) {
    // Remove existing overlay if present
    const existing = document.querySelector('.gp-node-detail-overlay');
    if (existing) existing.remove();

    const typeLabels = {
      position: 'Position',
      transition: 'Transition / Sweep',
      submission: 'Submission',
      reaction: 'Opponent Reaction'
    };
    const typeIcons = {
      position: '<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>',
      transition: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>',
      submission: '<polygon points="12,3 22,20 2,20" fill="none" stroke="currentColor" stroke-width="2"/>',
      reaction: '<polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="2"/>'
    };

    const notesHtml = node.notes.map((n, i) => {
      const date = new Date(n.createdAt);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="gp-note-item">
          <textarea class="gp-note-text-edit" data-action="gp-edit-note-inline" data-note-index="${i}" rows="2">${UI.esc(n.text)}</textarea>
          <div class="gp-note-actions">
            <span class="gp-note-date">${dateStr}</span>
            <button class="gp-note-delete" data-action="gp-delete-note" data-note-index="${i}" aria-label="Delete note">&times;</button>
          </div>
        </div>`;
    }).join('');

    const linksHtml = node.links.map((l, i) => {
      return `
        <div class="gp-link-item">
          <a href="${UI.esc(l.url)}" class="gp-link-url" data-action="gp-open-link" data-url="${UI.esc(l.url)}">${UI.esc(l.label || l.url)}</a>
          <button class="gp-link-delete" data-action="gp-delete-link" data-link-index="${i}" aria-label="Delete link">&times;</button>
        </div>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.className = 'gp-node-detail-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Node details');
    overlay.innerHTML = `
      <div class="gp-node-detail-content">
        <div class="gp-detail-header">
          <button class="gp-detail-close" data-action="gp-close-detail" aria-label="Close">&times;</button>
          <div class="gp-detail-type">
            <svg width="24" height="24" viewBox="0 0 24 24">${typeIcons[node.type]}</svg>
            <span>${typeLabels[node.type]}</span>
          </div>
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Name</label>
          <input class="gp-detail-input" id="gp-detail-label-input" type="text" value="${UI.esc(node.label)}" data-action="gp-edit-label" placeholder="Node name">
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Notes <span class="gp-detail-count">${node.notes.length}</span></label>
          <div class="gp-notes-list" id="gp-notes-list">
            ${notesHtml || '<p class="gp-empty-sub">No notes yet</p>'}
          </div>
          <div class="gp-note-add-row">
            <input class="gp-detail-input" id="gp-note-input" type="text" placeholder="Add a note...">
            <button class="gp-detail-add-btn" data-action="gp-add-note">+</button>
          </div>
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Links <span class="gp-detail-count">${node.links.length}</span></label>
          <div class="gp-links-list" id="gp-links-list">
            ${linksHtml || '<p class="gp-empty-sub">No links yet</p>'}
          </div>
          <div class="gp-detail-add-row gp-link-add-row">
            <input class="gp-detail-input" id="gp-link-url-input" type="url" placeholder="https://...">
            <input class="gp-detail-input gp-link-label-input" id="gp-link-label-input" type="text" placeholder="Label (optional)">
            <button class="gp-detail-add-btn" data-action="gp-add-link">Add</button>
          </div>
        </div>
      </div>`;

    document.getElementById('app').appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  closeNodeDetail() {
    const overlay = document.querySelector('.gp-node-detail-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
  },

  // ── Move Library Overlay ──────────────────────────────────

  _libraryMode: 'pick', // 'browse' or 'pick'

  showLibrary(entries, gameplans, currentGameplanId, mode) {
    this._libraryMode = mode || 'pick';
    const existing = document.querySelector('.gp-library-overlay');
    if (existing) existing.remove();

    const typeIcons = {
      position: '<rect x="4" y="4" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>',
      transition: '<circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>',
      submission: '<polygon points="11,3 20,18 2,18" fill="none" stroke="currentColor" stroke-width="2"/>',
      reaction: '<polygon points="11,2 20,11 11,20 2,11" fill="none" stroke="currentColor" stroke-width="2"/>'
    };
    const typeLabels = {
      position: 'Position',
      transition: 'Transition',
      submission: 'Submission',
      reaction: 'Reaction'
    };

    // Sort moves alphabetically
    const sorted = entries.slice().sort((a, b) => a.label.localeCompare(b.label));
    const byId = {};
    entries.forEach(e => { byId[e.id] = e; });

    const renderItem = (entry) => {
      const noteCount = entry.notes ? entry.notes.length : 0;
      const linkCount = entry.links ? entry.links.length : 0;
      const parent = entry.variantOf ? byId[entry.variantOf] : null;
      const tags = entry.tags || [];
      const aliases = entry.aliases || [];

      const meta = [];
      meta.push(typeLabels[entry.type] || entry.type);
      if (parent) meta.push('variant of ' + UI.esc(parent.label));
      if (tags.length > 0) meta.push(tags.map(t => UI.esc(t)).join(', '));
      if (noteCount > 0) meta.push(noteCount + ' note' + (noteCount !== 1 ? 's' : ''));
      if (linkCount > 0) meta.push(linkCount + ' link' + (linkCount !== 1 ? 's' : ''));

      // Everything the search box should match against
      const searchText = [entry.label]
        .concat(aliases)
        .concat(tags)
        .concat(entry.category ? [entry.category] : [])
        .concat(parent ? [parent.label] : [])
        .join(' ');

      const actionBtn = this._libraryMode === 'pick'
        ? `<button class="gp-library-item-add" data-action="gp-library-quick-add" data-library-id="${entry.id}" aria-label="Add to gameplan">+</button>`
        : `<button class="gp-library-item-delete" data-action="gp-library-delete" data-library-id="${entry.id}" aria-label="Delete move">&times;</button>`;
      return `
        <div class="gp-library-item gp-library-move" data-label="${UI.esc(entry.label)}" data-search="${UI.esc(searchText)}" data-type="${entry.type}">
          <div class="gp-library-item-main" data-action="gp-library-view" data-library-id="${entry.id}">
            <svg class="gp-library-item-icon gp-library-icon-${entry.type}" width="22" height="22" viewBox="0 0 22 22">${typeIcons[entry.type]}</svg>
            <div class="gp-library-item-info">
              <span class="gp-library-item-name">${UI.esc(entry.label)}</span>
              <span class="gp-library-item-meta">${meta.join(' &middot; ')}</span>
            </div>
          </div>
          ${actionBtn}
        </div>`;
    };

    // Group entries under category headers, in a canonical order
    const CATEGORY_ORDER = [
      'Standing', 'Guards', 'Top control', 'Bad positions',
      'Takedowns & standing', 'Passing', 'Sweeps', 'Escapes', 'Back takes',
      'Chokes', 'Arm attacks', 'Leg attacks',
      'General reactions', 'Submission defence', 'Passing defence'
    ];
    const groups = {};
    sorted.forEach(entry => {
      const cat = entry.category || 'Other';
      (groups[cat] = groups[cat] || []).push(entry);
    });
    const groupNames = Object.keys(groups).sort((a, b) => {
      const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    const movesHtml = sorted.length > 0 ? groupNames.map(cat => {
      return `<div class="gp-library-group-header" data-category="${UI.esc(cat)}">${UI.esc(cat)}</div>`
        + groups[cat].map(renderItem).join('');
    }).join('') : '<p class="gp-empty-sub gp-library-move">No moves in library yet.</p>';

    // "From here" suggestions: moves that start from the selected position node
    let suggestHtml = '';
    if (this._libraryMode === 'pick' && typeof GameplanCanvas !== 'undefined') {
      const sel = GameplanCanvas.getSelectedNode();
      if (sel && sel.type === 'position' && sel.libraryId) {
        const suggested = sorted.filter(en => en.fromPositionId === sel.libraryId);
        if (suggested.length > 0) {
          const rows = suggested.map(en => {
            const dest = en.toPositionId ? byId[en.toPositionId] : null;
            const destStr = dest ? ' &rarr; ' + UI.esc(dest.label) : '';
            return `
              <button class="gp-suggest-item" data-action="gp-library-suggest-add" data-library-id="${en.id}" data-from-node-id="${sel.id}">
                <svg class="gp-library-item-icon gp-library-icon-${en.type}" width="18" height="18" viewBox="0 0 22 22">${typeIcons[en.type]}</svg>
                <span class="gp-suggest-item-name">${UI.esc(en.label)}${destStr}</span>
                <span class="gp-suggest-item-plus">+</span>
              </button>`;
          }).join('');
          suggestHtml = `
            <div class="gp-library-suggest">
              <div class="gp-library-suggest-title">From ${UI.esc(sel.label)} <span class="gp-library-suggest-hint">adds connected</span></div>
              ${rows}
            </div>`;
        }
      }
    }

    const starterBtn = `
      <button class="gp-library-starter-btn gp-library-move" data-action="gp-library-add-starters">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        Add starter moves (standard BJJ positions &amp; submissions)
      </button>`;

    // Gameplans (exclude current)
    const otherPlans = (gameplans || []).filter(gp => gp.id !== currentGameplanId);
    const gameplansHtml = otherPlans.length > 0 ? otherPlans.map(gp => {
      const nodeCount = gp.nodes.length;
      const connCount = gp.connections.length;
      const meta = [];
      meta.push(nodeCount + ' node' + (nodeCount !== 1 ? 's' : ''));
      meta.push(connCount + ' connection' + (connCount !== 1 ? 's' : ''));
      return `
        <div class="gp-library-item gp-library-gameplan" data-label="${UI.esc(gp.name)}" data-type="gameplan" style="display:none">
          <div class="gp-library-item-main" data-action="gp-library-import-gameplan" data-gp-id="${gp.id}">
            <svg class="gp-library-item-icon gp-library-icon-gameplan" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="3" y="3" width="16" height="16" rx="3"/><circle cx="8" cy="8" r="2"/><circle cx="14" cy="14" r="2"/><path d="M9.5 9.5L12.5 12.5"/>
            </svg>
            <div class="gp-library-item-info">
              <span class="gp-library-item-name">${UI.esc(gp.name)}</span>
              <span class="gp-library-item-meta">${meta.join(' &middot; ')}</span>
            </div>
          </div>
        </div>`;
    }).join('') : '<p class="gp-empty-sub gp-library-gameplan" style="display:none">No other gameplans to import.</p>';

    const overlay = document.createElement('div');
    overlay.className = 'gp-library-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Move Library');
    overlay.innerHTML = `
      <div class="gp-library-content">
        <div class="gp-library-header">
          <h2>Library</h2>
          <button class="gp-detail-close" data-action="gp-close-library" aria-label="Close">&times;</button>
        </div>
        <input class="gp-detail-input gp-library-search" id="gp-library-search" type="text" placeholder="Search..." autocomplete="off">
        ${suggestHtml}
        <div class="gp-library-add-row">
          <span class="gp-library-add-label">Add:</span>
          <button class="gp-library-add-btn gp-library-add-position" data-action="gp-library-create" data-type="position">
            <svg width="14" height="14" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Position
          </button>
          <button class="gp-library-add-btn gp-library-add-transition" data-action="gp-library-create" data-type="transition">
            <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Transition
          </button>
          <button class="gp-library-add-btn gp-library-add-submission" data-action="gp-library-create" data-type="submission">
            <svg width="14" height="14" viewBox="0 0 24 24"><polygon points="12,3 22,20 2,20" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Submission
          </button>
          <button class="gp-library-add-btn gp-library-add-reaction" data-action="gp-library-create" data-type="reaction">
            <svg width="14" height="14" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Reaction
          </button>
        </div>
        <div class="gp-library-filters">
          <button class="gp-library-filter active" data-action="gp-library-filter" data-filter="all">All</button>
          <button class="gp-library-filter" data-action="gp-library-filter" data-filter="position">
            <svg width="14" height="14" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Position
          </button>
          <button class="gp-library-filter" data-action="gp-library-filter" data-filter="transition">
            <svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Transition
          </button>
          <button class="gp-library-filter" data-action="gp-library-filter" data-filter="submission">
            <svg width="14" height="14" viewBox="0 0 24 24"><polygon points="12,3 22,20 2,20" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Submission
          </button>
          <button class="gp-library-filter" data-action="gp-library-filter" data-filter="reaction">
            <svg width="14" height="14" viewBox="0 0 24 24"><polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="2"/></svg>
            Reaction
          </button>
          <button class="gp-library-filter" data-action="gp-library-filter" data-filter="gameplan">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><circle cx="15" cy="15" r="2"/><path d="M10.5 10.5L13.5 13.5"/></svg>
            Gameplans
          </button>
        </div>
        <div class="gp-library-list">
          ${movesHtml}
          ${gameplansHtml}
          ${starterBtn}
        </div>
      </div>`;

    document.getElementById('app').appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    const searchInput = document.getElementById('gp-library-search');
    if (searchInput) searchInput.focus();
  },

  showLibraryEntryDetail(entry) {
    const existing = document.querySelector('.gp-lib-detail-overlay');
    if (existing) existing.remove();

    const typeLabels = {
      position: 'Position',
      transition: 'Transition / Sweep',
      submission: 'Submission',
      reaction: 'Opponent Reaction'
    };
    const typeIcons = {
      position: '<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>',
      transition: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>',
      submission: '<polygon points="12,3 22,20 2,20" fill="none" stroke="currentColor" stroke-width="2"/>',
      reaction: '<polygon points="12,2 22,12 12,22 2,12" fill="none" stroke="currentColor" stroke-width="2"/>'
    };

    const notesHtml = (entry.notes || []).map((n, i) => {
      const date = new Date(n.createdAt);
      const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `
        <div class="gp-note-item">
          <textarea class="gp-note-text-edit" data-action="gp-lib-edit-note" data-note-index="${i}" rows="2">${UI.esc(n.text)}</textarea>
          <div class="gp-note-actions">
            <span class="gp-note-date">${dateStr}</span>
            <button class="gp-note-delete" data-action="gp-lib-delete-note" data-note-index="${i}" aria-label="Delete note">&times;</button>
          </div>
        </div>`;
    }).join('');

    const linksHtml = (entry.links || []).map((l, i) => {
      return `
        <div class="gp-link-item">
          <a href="${UI.esc(l.url)}" class="gp-link-url" data-action="gp-open-link" data-url="${UI.esc(l.url)}">${UI.esc(l.label || l.url)}</a>
          <button class="gp-link-delete" data-action="gp-lib-delete-link" data-link-index="${i}" aria-label="Delete link">&times;</button>
        </div>`;
    }).join('');

    const addBtn = this._libraryMode === 'pick'
      ? `<button class="gp-lib-add-to-gp-btn" data-action="gp-library-add-to-gameplan" data-library-id="${entry.id}">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
           Add to Gameplan
         </button>`
      : '';

    // Tags as removable chips
    const tags = entry.tags || [];
    const tagsHtml = tags.map((t, i) => `
      <span class="gp-tag-chip">${UI.esc(t)}<button class="gp-tag-remove" data-action="gp-lib-remove-tag" data-tag-index="${i}" aria-label="Remove tag ${UI.esc(t)}">&times;</button></span>
    `).join('');

    // Variant-of selector: other entries of the same type
    const cache = Object.values(GameplanStore._libraryCache || {});
    const allEntries = cache
      .filter(e => e.type === entry.type && e.id !== entry.id)
      .sort((a, b) => a.label.localeCompare(b.label));
    const variantOptions = ['<option value="">None (standalone move)</option>']
      .concat(allEntries.map(e =>
        `<option value="${UI.esc(e.id)}"${entry.variantOf === e.id ? ' selected' : ''}>${UI.esc(e.label)}</option>`
      )).join('');

    // Category input with datalist of existing categories
    const categories = [...new Set(cache.map(e => e.category).filter(Boolean))].sort();
    const categoryDatalist = categories.map(c => `<option value="${UI.esc(c)}"></option>`).join('');

    // From/To position selects (transitions and submissions only)
    const positions = cache
      .filter(e => e.type === 'position')
      .sort((a, b) => a.label.localeCompare(b.label));
    const posOptions = (selectedId) => ['<option value="">None</option>']
      .concat(positions.map(p =>
        `<option value="${UI.esc(p.id)}"${selectedId === p.id ? ' selected' : ''}>${UI.esc(p.label)}</option>`
      )).join('');
    const fromToHtml = (entry.type === 'transition' || entry.type === 'submission') ? `
        <div class="gp-detail-section gp-fromto-row">
          <div class="gp-fromto-col">
            <label class="gp-detail-label">From position</label>
            <select class="gp-detail-input gp-detail-select" id="gp-lib-from-select">${posOptions(entry.fromPositionId)}</select>
          </div>
          <div class="gp-fromto-col">
            <label class="gp-detail-label">To position</label>
            <select class="gp-detail-input gp-detail-select" id="gp-lib-to-select">${posOptions(entry.toPositionId)}</select>
          </div>
        </div>` : '';

    const overlay = document.createElement('div');
    overlay.className = 'gp-lib-detail-overlay';
    overlay.setAttribute('data-library-id', entry.id);
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Move details');
    overlay.innerHTML = `
      <div class="gp-node-detail-content">
        <div class="gp-detail-header">
          <button class="gp-detail-close" data-action="gp-lib-detail-back" aria-label="Back">&#x2190;</button>
          <div class="gp-detail-type">
            <svg width="24" height="24" viewBox="0 0 24 24">${typeIcons[entry.type] || ''}</svg>
            <span>${typeLabels[entry.type] || entry.type}</span>
          </div>
          ${addBtn}
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Name</label>
          <input class="gp-detail-input" id="gp-lib-detail-label" type="text" value="${UI.esc(entry.label)}" data-action="gp-lib-edit-label" placeholder="Move name">
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Category</label>
          <input class="gp-detail-input" id="gp-lib-category-input" type="text" list="gp-category-datalist" value="${UI.esc(entry.category || '')}" placeholder="e.g. Guards, Sweeps, Chokes...">
          <datalist id="gp-category-datalist">${categoryDatalist}</datalist>
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Variant of</label>
          <select class="gp-detail-input gp-detail-select" id="gp-lib-variant-select" data-action="gp-lib-set-variant">
            ${variantOptions}
          </select>
        </div>
        ${fromToHtml}

        <div class="gp-detail-section">
          <label class="gp-detail-label">Tags <span class="gp-detail-count">${tags.length}</span></label>
          <div class="gp-tags-list" id="gp-lib-tags-list">
            ${tagsHtml || '<p class="gp-empty-sub">No tags yet (e.g. gi, no-gi, top, bottom, sweep)</p>'}
          </div>
          <div class="gp-note-add-row">
            <input class="gp-detail-input" id="gp-lib-tag-input" type="text" placeholder="Add a tag..." autocapitalize="off">
            <button class="gp-detail-add-btn" data-action="gp-lib-add-tag">+</button>
          </div>
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Also known as <span class="gp-detail-count">${(entry.aliases || []).length}</span></label>
          <div class="gp-tags-list" id="gp-lib-aliases-list">
            ${(entry.aliases || []).map((a, i) => `
              <span class="gp-tag-chip gp-alias-chip">${UI.esc(a)}<button class="gp-tag-remove" data-action="gp-lib-remove-alias" data-alias-index="${i}" aria-label="Remove alias ${UI.esc(a)}">&times;</button></span>
            `).join('') || '<p class="gp-empty-sub">No other names (e.g. SLX, Ashi Garami)</p>'}
          </div>
          <div class="gp-note-add-row">
            <input class="gp-detail-input" id="gp-lib-alias-input" type="text" placeholder="Add another name..." autocapitalize="off">
            <button class="gp-detail-add-btn" data-action="gp-lib-add-alias">+</button>
          </div>
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Notes <span class="gp-detail-count">${(entry.notes || []).length}</span></label>
          <div class="gp-notes-list" id="gp-lib-notes-list">
            ${notesHtml || '<p class="gp-empty-sub">No notes yet</p>'}
          </div>
          <div class="gp-note-add-row">
            <input class="gp-detail-input" id="gp-lib-note-input" type="text" placeholder="Add a note...">
            <button class="gp-detail-add-btn" data-action="gp-lib-add-note">+</button>
          </div>
        </div>

        <div class="gp-detail-section">
          <label class="gp-detail-label">Links <span class="gp-detail-count">${(entry.links || []).length}</span></label>
          <div class="gp-links-list" id="gp-lib-links-list">
            ${linksHtml || '<p class="gp-empty-sub">No links yet</p>'}
          </div>
          <div class="gp-detail-add-row gp-link-add-row">
            <input class="gp-detail-input" id="gp-lib-link-url-input" type="url" placeholder="https://...">
            <input class="gp-detail-input gp-link-label-input" id="gp-lib-link-label-input" type="text" placeholder="Label (optional)">
            <button class="gp-detail-add-btn" data-action="gp-lib-add-link">Add</button>
          </div>
        </div>
      </div>`;

    document.getElementById('app').appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
  },

  closeLibraryEntryDetail() {
    const overlay = document.querySelector('.gp-lib-detail-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
  },

  closeLibrary() {
    const overlay = document.querySelector('.gp-library-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 200);
    }
  }
};
