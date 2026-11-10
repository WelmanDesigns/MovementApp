// App controller — navigation, events, timer management

const App = {
  currentTimer: null,
  currentDay: 1,
  currentPoseIndex: 0,
  bjjCountdownTimer: null,
  bjjDuration: 120,

  _currentGameplan: null,

  _checkerState: { gi: null, belt: null, tech: null },
  _lastQuizResult: null,

  init() {
    Progress.load();
    RulesProgress.load();
    BeltStore.load();
    this.currentDay = Progress.getCurrentDay();
    this.bindGlobalEvents();
    this._initTabBar();
    Promise.all([GameplanStore.init(), DiaryStore.init()]).then(() => {
      this.render('home');
    }).catch(() => {
      this.render('home');
    });
  },

  // ── Bottom tab bar ─────────────────────────────────────────
  // Top-level screens show the tab bar; sub-screens (editors, timers,
  // quizzes) hide it and rely on the top bar's back button.
  TABS: [
    ['home', 'Home', 'home'],
    ['dy-home', 'Diary', 'diary'],
    ['gp-list', 'Gameplan', 'gameplan'],
    ['bt-home', 'Belt', 'belt'],
    ['rules-home', 'Rules', 'rules']
  ],
  TAB_FOR_SCREEN: {
    'home': 'home', 'hip-home': 'home', 'bjj-start': 'home',
    'dy-home': 'dy-home', 'gp-list': 'gp-list', 'bt-home': 'bt-home', 'rules-home': 'rules-home'
  },
  _screen: null,
  _params: null,

  // Where the Diary's back button returns to: the last screen visited before
  // entering the diary (moving between the diary and its entries doesn't count)
  _diaryReturn: null,
  SCREEN_LABELS: {
    'home': 'Home', 'hip-home': 'Hip Opening', 'bjj-start': 'Circuit',
    'gp-list': 'Gameplans', 'bt-home': 'Belt', 'rules-home': 'Rules'
  },

  diaryBackTarget() {
    const r = this._diaryReturn;
    return r && this.SCREEN_LABELS[r.screen] ? r : { screen: 'home', params: null };
  },

  _initTabBar() {
    const nav = document.getElementById('tabbar');
    if (!nav) return;
    nav.innerHTML = '<div class="tabbar-inner">' + this.TABS.map(([screen, label, icon]) =>
      `<button class="tab" data-tab="${screen}">${Icon.svg(icon, 24)}<span>${label}</span></button>`
    ).join('') + '</div>';
    nav.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-tab]');
      if (!tab) return;
      if (navigator.vibrate) navigator.vibrate(8);
      this.render(tab.dataset.tab);
    });
  },

  _updateTabBar(screen) {
    const nav = document.getElementById('tabbar');
    if (!nav) return;
    const active = this.TAB_FOR_SCREEN[screen];
    nav.hidden = !active;
    document.body.classList.toggle('has-tabbar', !!active);
    nav.querySelectorAll('.tab').forEach(btn => {
      const on = btn.dataset.tab === active;
      btn.classList.toggle('active', on);
      if (on) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  },

  render(screen, params) {
    const app = document.getElementById('app');

    // New screen starts at the top; re-renders of the same screen keep scroll
    if (screen !== this._screen) app.scrollTop = 0;
    const inDiary = s => s === 'dy-home' || s === 'dy-entry' || s === 'dy-review';
    if (inDiary(screen) && this._screen && !inDiary(this._screen)) {
      this._diaryReturn = { screen: this._screen, params: this._params };
    }
    this._screen = screen;
    this._params = params || null;
    this._updateTabBar(screen);

    // Clean up timer if leaving timer screen
    if (this.currentTimer) {
      this.currentTimer.destroy();
      this.currentTimer = null;
    }
    if (this.bjjCountdownTimer) {
      clearInterval(this.bjjCountdownTimer);
      this.bjjCountdownTimer = null;
    }
    // Flush pending diary edits and prune empty rows before leaving
    DiaryUI.leave();
    // Clean up gameplan canvas if leaving editor
    if (screen !== 'gp-editor' && GameplanCanvas._svg) {
      GameplanCanvas.destroy();
    }

    switch (screen) {
      case 'home':
        app.innerHTML = UI.renderMainHome();
        break;
      case 'hip-home':
        app.innerHTML = UI.renderHome();
        break;
      case 'day':
        this.currentDay = params.day;
        app.innerHTML = UI.renderDay(params.day);
        break;
      case 'timer':
        this.currentDay = params.day;
        this.currentPoseIndex = params.pose;
        app.innerHTML = UI.renderTimer(params.day, params.pose);
        this.initTimer(params.day, params.pose);
        break;
      case 'bjj-start':
        app.innerHTML = UI.renderBjjStart();
        this.initBjjScrollWheel();
        break;
      case 'bjj-countdown':
        app.innerHTML = UI.renderBjjCountdown();
        this.initBjjCountdown();
        break;
      case 'bjj-circuit':
        const idx = params ? params.exercise : 0;
        app.innerHTML = UI.renderBjjCircuit(idx);
        this.initBjjTimer(idx);
        break;
      case 'bjj-complete':
        app.innerHTML = UI.renderBjjComplete();
        break;

      // ── IBJJF Rules screens ───────────────────────────────
      case 'rules-home':
        app.innerHTML = RulesUI.renderHome();
        break;
      case 'rules-cards':
        app.innerHTML = RulesUI.renderCards(params.unit, params.index || 0);
        break;
      case 'rules-lessons':
        app.innerHTML = RulesUI.renderLessonPicker(params.unit);
        break;
      case 'rules-quiz':
        // Always a fresh session; bounce home if the lesson id is unknown
        if (!params || !RulesQuiz.start(params.lesson)) {
          app.innerHTML = RulesUI.renderHome();
          break;
        }
        app.innerHTML = RulesUI.renderQuiz();
        break;
      case 'rules-result':
        if (!this._lastQuizResult || !RulesQuiz.session) {
          app.innerHTML = RulesUI.renderHome();
          break;
        }
        app.innerHTML = RulesUI.renderResult(this._lastQuizResult);
        break;
      case 'rules-checker':
        app.innerHTML = RulesUI.renderChecker(this._checkerState);
        break;

      // ── Diary screens ─────────────────────────────────────
      case 'dy-home':
        app.innerHTML = DiaryUI.renderHome();
        DiaryUI.afterRenderHome();
        break;
      case 'dy-review':
        app.innerHTML = DiaryUI.renderReview();
        break;
      case 'dy-entry': {
        // Opening a date with no entry creates one — that marks the day attended —
        // except a draft (empty heatmap day), which saves only once something is added
        const date = (params && params.date) || DiaryStore.todayKey();
        const show = (entry, draft) => {
          app.innerHTML = DiaryUI.renderEntry(entry, draft);
          DiaryUI.afterRenderEntry();
        };
        const existing = DiaryStore.get(date);
        if (existing) {
          show(existing);
        } else if (params && params.draft) {
          show(DiaryStore.normalize({ date, drills: [], rolls: [] }), true);
        } else {
          DiaryStore.create(date).then(show).catch(err => {
            console.error('Could not create diary entry', err);
            this.render('dy-home');
          });
        }
        break;
      }

      // ── Backup & restore ──────────────────────────────────
      case 'backup':
        app.innerHTML = Backup.render();
        break;

      // ── Belt Tracker screens ──────────────────────────────
      case 'bt-home':
        app.innerHTML = BeltUI.renderHome();
        break;
      case 'bt-stage':
        app.innerHTML = BeltUI.renderStage(params.stageId);
        BeltUI._applyFilters(); // saved search/filter state from this session
        break;

      // ── Gameplan screens ──────────────────────────────────
      case 'gp-list':
        GameplanStore.getAll().then(plans => {
          app.innerHTML = GameplanUI.renderList(plans);
        }).catch(err => {
          console.error('Failed to load gameplans', err);
          app.innerHTML = GameplanUI.renderList([]);
        });
        break;
      case 'gp-editor':
        GameplanStore.get(params.id).then(gp => {
          if (!gp) { this.render('gp-list'); return; }
          this._currentGameplan = gp;
          app.innerHTML = GameplanUI.renderEditor(gp);
          GameplanCanvas.init('gp-svg-container', gp);
        }).catch(err => {
          console.error('Failed to open gameplan', err);
          alert('Could not open this gameplan. See console for details.');
          this.render('gp-list');
        });
        break;
    }
  },

  bindGlobalEvents() {
    // Event delegation on #app
    document.getElementById('app').addEventListener('click', (e) => {
      // Check data-action BEFORE data-nav so buttons inside nav elements work
      const earlyAction = e.target.closest('[data-action]');
      if (earlyAction && earlyAction.dataset.action === 'gp-delete') {
        e.stopPropagation();
        const gpId = earlyAction.dataset.gpId;
        if (confirm('Delete this gameplan?')) {
          GameplanStore.delete(gpId).then(() => {
            this.render('gp-list');
          });
        }
        return;
      }

      const target = e.target.closest('[data-nav]');
      if (target) {
        const nav = target.dataset.nav;
        if (nav === 'home') {
          this.render('home');
        } else if (nav === 'hip-home') {
          this.render('hip-home');
        } else if (nav === 'day') {
          this.render('day', { day: parseInt(target.dataset.day) });
        } else if (nav === 'timer') {
          this.render('timer', {
            day: parseInt(target.dataset.day),
            pose: parseInt(target.dataset.pose)
          });
        } else if (nav === 'bjj-start') {
          this.render('bjj-start');
        } else if (nav === 'bjj-countdown') {
          this.render('bjj-countdown');
        } else if (nav === 'bjj-circuit') {
          this.render('bjj-circuit', { exercise: parseInt(target.dataset.exercise || 0) });
        } else if (nav === 'bjj-complete') {
          this.render('bjj-complete');
        } else if (nav === 'gp-list') {
          this.render('gp-list');
        } else if (nav === 'gp-editor') {
          this.render('gp-editor', { id: target.dataset.gpId });
        } else if (nav === 'rules-home') {
          this.render('rules-home');
        } else if (nav === 'rules-cards') {
          this.render('rules-cards', { unit: target.dataset.unit, index: parseInt(target.dataset.index || 0) });
        } else if (nav === 'rules-lessons') {
          this.render('rules-lessons', { unit: target.dataset.unit });
        } else if (nav === 'rules-quiz') {
          this.render('rules-quiz', { lesson: target.dataset.lesson });
        } else if (nav === 'rules-checker') {
          this.render('rules-checker');
        } else if (nav === 'backup') {
          Backup._status = null;
          this.render('backup');
        } else if (nav === 'dy-home') {
          this.render('dy-home');
        } else if (nav === 'dy-entry') {
          this.render('dy-entry', { date: target.dataset.date, draft: target.dataset.draft === '1' });
        } else if (nav === 'dy-review') {
          this.render('dy-review');
        } else if (nav === 'bt-home') {
          this.render('bt-home');
        } else if (nav === 'bt-stage') {
          this.render('bt-stage', { stageId: target.dataset.stageId });
        }
        return;
      }

      // ── Gameplan actions ──────────────────────────────────
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.dataset.action;

        // Belt Tracker actions are handled by BeltUI
        if (action.startsWith('bt-')) {
          BeltUI.handleAction(action, actionEl, e);
          return;
        }

        // Backup & restore actions
        if (action.startsWith('backup-')) {
          Backup.handleAction(action, actionEl, e);
          return;
        }

        // Diary actions are handled by DiaryUI
        if (action.startsWith('dy-')) {
          DiaryUI.handleAction(action, actionEl, e);
          return;
        }

        if (action === 'gp-create') {
          const gp = GameplanData.createGameplan();
          GameplanStore.save(gp).then(() => {
            this.render('gp-editor', { id: gp.id });
          });
          return;
        }

        if (action === 'gp-delete') {
          e.stopPropagation();
          const gpId = actionEl.dataset.gpId;
          if (confirm('Delete this gameplan?')) {
            GameplanStore.delete(gpId).then(() => {
              this.render('gp-list');
            });
          }
          return;
        }

        if (action === 'gp-add-node') {
          const type = actionEl.dataset.type;
          const typeNames = { position: 'Position', transition: 'Transition', submission: 'Submission', reaction: 'Reaction' };
          const newLabel = prompt('Name this ' + (typeNames[type] || 'node') + ':');
          if (newLabel !== null && newLabel.trim()) {
            const result = GameplanCanvas.addNode(type, newLabel.trim());
          }
          return;
        }

        if (action === 'gp-connect') {
          GameplanCanvas.setConnectMode(!GameplanCanvas._connectMode);
          return;
        }

        if (action === 'gp-delete-node') {
          const connId = GameplanCanvas._selectedConnId;
          if (connId) {
            GameplanCanvas.deleteConnection(connId);
            GameplanCanvas.selectConnection(null);
            return;
          }
          const nodeId = GameplanCanvas._selectedNodeId;
          if (nodeId) {
            GameplanCanvas.deleteNode(nodeId);
          }
          return;
        }

        if (action === 'gp-open-detail') {
          const node = GameplanCanvas.getSelectedNode();
          if (node) GameplanUI.showNodeDetail(node);
          return;
        }

        if (action === 'gp-close-detail') {
          GameplanUI.closeNodeDetail();
          return;
        }

        if (action === 'gp-add-note') {
          const input = document.getElementById('gp-note-input');
          if (input && input.value.trim()) {
            const resolved = GameplanCanvas.getSelectedNode();
            const raw = GameplanCanvas.getRawSelectedNode();
            if (resolved && raw && raw.libraryId) {
              const entry = GameplanStore.getLibraryEntry(raw.libraryId);
              if (entry) {
                entry.notes.push({ text: input.value.trim(), createdAt: new Date().toISOString() });
                GameplanStore.saveLibraryEntry(entry);
                GameplanUI.showNodeDetail(GameplanStore.resolveNode(raw));
              }
            }
          }
          return;
        }

        if (action === 'gp-delete-note') {
          const idx = parseInt(actionEl.dataset.noteIndex);
          const raw = GameplanCanvas.getRawSelectedNode();
          if (raw && raw.libraryId && !isNaN(idx)) {
            const entry = GameplanStore.getLibraryEntry(raw.libraryId);
            if (entry) {
              entry.notes.splice(idx, 1);
              GameplanStore.saveLibraryEntry(entry);
              GameplanUI.showNodeDetail(GameplanStore.resolveNode(raw));
            }
          }
          return;
        }

        if (action === 'gp-add-link') {
          const urlInput = document.getElementById('gp-link-url-input');
          const labelInput = document.getElementById('gp-link-label-input');
          if (urlInput && urlInput.value.trim()) {
            const raw = GameplanCanvas.getRawSelectedNode();
            if (raw && raw.libraryId) {
              const entry = GameplanStore.getLibraryEntry(raw.libraryId);
              if (entry) {
                entry.links.push({
                  url: urlInput.value.trim(),
                  label: (labelInput && labelInput.value.trim()) || ''
                });
                GameplanStore.saveLibraryEntry(entry);
                GameplanUI.showNodeDetail(GameplanStore.resolveNode(raw));
              }
            }
          }
          return;
        }

        if (action === 'gp-delete-link') {
          const idx = parseInt(actionEl.dataset.linkIndex);
          const raw = GameplanCanvas.getRawSelectedNode();
          if (raw && raw.libraryId && !isNaN(idx)) {
            const entry = GameplanStore.getLibraryEntry(raw.libraryId);
            if (entry) {
              entry.links.splice(idx, 1);
              GameplanStore.saveLibraryEntry(entry);
              GameplanUI.showNodeDetail(GameplanStore.resolveNode(raw));
            }
          }
          return;
        }

        if (action === 'gp-open-link') {
          e.preventDefault();
          const url = actionEl.dataset.url;
          if (url) window.open(url, '_blank');
          return;
        }

        if (action === 'gp-rename') {
          const gp = GameplanCanvas.getGameplan();
          if (gp) {
            const newName = prompt('Rename gameplan:', gp.name);
            if (newName !== null && newName.trim()) {
              gp.name = newName.trim();
              actionEl.textContent = gp.name;
              GameplanCanvas._scheduleSave();
            }
          }
          return;
        }

        if (action === 'gp-edit-conn-label') {
          const connId = GameplanCanvas._selectedConnId;
          if (connId) {
            const conn = GameplanCanvas.getConnection(connId);
            const current = conn ? conn.label : '';
            const label = prompt('Connection label (e.g. "if opponent posts"):', current);
            if (label !== null) {
              GameplanCanvas.updateConnectionLabel(connId, label.trim());
            }
          }
          return;
        }

        if (action === 'gp-export') {
          GameplanStore.exportData().then(data => {
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const stamp = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = 'movement-gameplans-' + stamp + '.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }).catch(err => {
            console.error('Export failed', err);
            alert('Export failed. See console for details.');
          });
          return;
        }

        if (action === 'gp-import') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';
          input.addEventListener('change', () => {
            const file = input.files && input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              let data;
              try {
                data = JSON.parse(reader.result);
              } catch (err) {
                alert('That file is not valid JSON.');
                return;
              }
              const libCount = Array.isArray(data.library) ? data.library.length : 0;
              const gpCount = Array.isArray(data.gameplans) ? data.gameplans.length : 0;
              if (!confirm('Import ' + gpCount + ' gameplan(s) and ' + libCount + ' library move(s)?\n\n' +
                'Items with matching ids will be overwritten; everything else is kept.')) return;
              GameplanStore.importData(data).then(() => {
                this.render('gp-list');
              }).catch(err => {
                console.error('Import failed', err);
                alert('Import failed: ' + err.message);
              });
            };
            reader.readAsText(file);
          });
          input.click();
          return;
        }

        if (action === 'gp-tap-connection') {
          const connId = actionEl.dataset.connHit;
          if (connId) {
            GameplanCanvas.selectConnection(connId);
          }
          return;
        }

        if (action === 'gp-edit-label') {
          // Handled via input change below
          return;
        }

        if (action === 'gp-open-library') {
          Promise.all([
            GameplanStore.getLibrary(),
            GameplanStore.getAll()
          ]).then(([entries, plans]) => {
            const currentId = GameplanCanvas.getGameplan() ? GameplanCanvas.getGameplan().id : null;
            GameplanUI.showLibrary(entries, plans, currentId, 'pick');
          });
          return;
        }

        if (action === 'gp-open-library-browse') {
          Promise.all([
            GameplanStore.getLibrary(),
            GameplanStore.getAll()
          ]).then(([entries, plans]) => {
            GameplanUI.showLibrary(entries, plans, null, 'browse');
          });
          return;
        }

        if (action === 'gp-library-import-gameplan') {
          const gpId = actionEl.dataset.gpId;
          if (gpId) {
            GameplanStore.get(gpId).then(sourceGp => {
              if (sourceGp) {
                GameplanCanvas.importGameplan(sourceGp);
                GameplanUI.closeLibrary();
              }
            });
          }
          return;
        }

        if (action === 'gp-library-create') {
          const type = actionEl.dataset.type;
          const typeNames = { position: 'Position', transition: 'Transition', submission: 'Submission', reaction: 'Reaction' };
          const name = prompt('Name this ' + (typeNames[type] || 'move') + ':');
          if (name && name.trim()) {
            // Reuse an existing move with this name instead of duplicating
            const existing = GameplanStore.findLibraryEntry(name.trim(), type);
            if (existing) {
              alert('"' + existing.label + '" is already in the library.');
            } else {
              const entry = GameplanData.createLibraryEntry(type, name.trim());
              GameplanStore.saveLibraryEntry(entry);
            }
            this._refreshLibraryOverlay();
          }
          return;
        }

        if (action === 'gp-library-view') {
          const libId = actionEl.dataset.libraryId;
          if (libId) {
            const entry = GameplanStore.getLibraryEntry(libId);
            if (entry) GameplanUI.showLibraryEntryDetail(entry);
          }
          return;
        }

        if (action === 'gp-library-quick-add') {
          const libId = actionEl.dataset.libraryId;
          if (libId) {
            GameplanCanvas.addNodeFromLibrary(libId);
            GameplanUI.closeLibrary();
          }
          return;
        }

        if (action === 'gp-library-suggest-add') {
          const libId = actionEl.dataset.libraryId;
          const fromNodeId = actionEl.dataset.fromNodeId;
          if (libId) {
            GameplanCanvas.addNodeFromLibrary(libId, fromNodeId || null);
            GameplanUI.closeLibrary();
          }
          return;
        }

        if (action === 'gp-library-delete') {
          const libId = actionEl.dataset.libraryId;
          if (libId) {
            const entry = GameplanStore.getLibraryEntry(libId);
            const name = entry ? entry.label : 'this move';
            // Check whether any gameplan still uses this move before deleting
            GameplanStore.countLibraryUsage(libId).then(usage => {
              let msg;
              if (usage.nodeCount > 0) {
                msg = '"' + name + '" is used by ' + usage.nodeCount + ' node' + (usage.nodeCount !== 1 ? 's' : '') +
                  ' in: ' + usage.planNames.join(', ') + '.\n\n' +
                  'Deleting it will leave those nodes as "(missing move)" placeholders. Delete anyway?';
              } else {
                msg = 'Remove "' + name + '" from the library? This cannot be undone.';
              }
              if (confirm(msg)) {
                GameplanStore.deleteLibraryEntry(libId);
                const item = actionEl.closest('.gp-library-item');
                if (item) item.remove();
              }
            });
          }
          return;
        }

        if (action === 'gp-library-add-starters') {
          GameplanStore.addStarterLibrary().then(added => {
            alert(added > 0
              ? 'Added ' + added + ' starter move' + (added !== 1 ? 's' : '') + ' to your library.'
              : 'All starter moves are already in your library.');
            if (added > 0) this._refreshLibraryOverlay();
          });
          return;
        }

        if (action === 'gp-library-add-to-gameplan') {
          const libId = actionEl.dataset.libraryId;
          if (libId) {
            GameplanCanvas.addNodeFromLibrary(libId);
            GameplanUI.closeLibraryEntryDetail();
            GameplanUI.closeLibrary();
          }
          return;
        }

        if (action === 'gp-lib-detail-back') {
          GameplanUI.closeLibraryEntryDetail();
          return;
        }

        if (action === 'gp-lib-add-note') {
          const input = document.getElementById('gp-lib-note-input');
          const overlay = document.querySelector('.gp-lib-detail-overlay');
          const libId = overlay ? overlay.dataset.libraryId : null;
          if (input && input.value.trim() && libId) {
            const entry = GameplanStore.getLibraryEntry(libId);
            if (entry) {
              entry.notes.push({ text: input.value.trim(), createdAt: new Date().toISOString() });
              GameplanStore.saveLibraryEntry(entry);
              GameplanUI.showLibraryEntryDetail(entry);
            }
          }
          return;
        }

        if (action === 'gp-lib-delete-note') {
          const idx = parseInt(actionEl.dataset.noteIndex);
          const overlay = document.querySelector('.gp-lib-detail-overlay');
          const libId = overlay ? overlay.dataset.libraryId : null;
          if (libId && !isNaN(idx)) {
            const entry = GameplanStore.getLibraryEntry(libId);
            if (entry) {
              entry.notes.splice(idx, 1);
              GameplanStore.saveLibraryEntry(entry);
              GameplanUI.showLibraryEntryDetail(entry);
            }
          }
          return;
        }

        if (action === 'gp-lib-add-link') {
          const urlInput = document.getElementById('gp-lib-link-url-input');
          const labelInput = document.getElementById('gp-lib-link-label-input');
          const overlay = document.querySelector('.gp-lib-detail-overlay');
          const libId = overlay ? overlay.dataset.libraryId : null;
          if (urlInput && urlInput.value.trim() && libId) {
            const entry = GameplanStore.getLibraryEntry(libId);
            if (entry) {
              entry.links.push({
                url: urlInput.value.trim(),
                label: (labelInput && labelInput.value.trim()) || ''
              });
              GameplanStore.saveLibraryEntry(entry);
              GameplanUI.showLibraryEntryDetail(entry);
            }
          }
          return;
        }

        if (action === 'gp-lib-delete-link') {
          const idx = parseInt(actionEl.dataset.linkIndex);
          const overlay = document.querySelector('.gp-lib-detail-overlay');
          const libId = overlay ? overlay.dataset.libraryId : null;
          if (libId && !isNaN(idx)) {
            const entry = GameplanStore.getLibraryEntry(libId);
            if (entry) {
              entry.links.splice(idx, 1);
              GameplanStore.saveLibraryEntry(entry);
              GameplanUI.showLibraryEntryDetail(entry);
            }
          }
          return;
        }

        if (action === 'gp-lib-add-tag') {
          const input = document.getElementById('gp-lib-tag-input');
          const entry = this._getOpenLibraryEntry();
          if (input && input.value.trim() && entry) {
            const tag = input.value.trim().toLowerCase();
            if (!entry.tags.includes(tag)) {
              entry.tags.push(tag);
              GameplanStore.saveLibraryEntry(entry);
            }
            GameplanUI.showLibraryEntryDetail(entry);
          }
          return;
        }

        if (action === 'gp-lib-remove-tag') {
          const idx = parseInt(actionEl.dataset.tagIndex);
          const entry = this._getOpenLibraryEntry();
          if (entry && !isNaN(idx)) {
            entry.tags.splice(idx, 1);
            GameplanStore.saveLibraryEntry(entry);
            GameplanUI.showLibraryEntryDetail(entry);
          }
          return;
        }

        if (action === 'gp-lib-add-alias') {
          const input = document.getElementById('gp-lib-alias-input');
          const entry = this._getOpenLibraryEntry();
          if (input && input.value.trim() && entry) {
            const alias = input.value.trim();
            if (!entry.aliases.some(a => a.toLowerCase() === alias.toLowerCase())) {
              entry.aliases.push(alias);
              GameplanStore.saveLibraryEntry(entry);
            }
            GameplanUI.showLibraryEntryDetail(entry);
          }
          return;
        }

        if (action === 'gp-lib-remove-alias') {
          const idx = parseInt(actionEl.dataset.aliasIndex);
          const entry = this._getOpenLibraryEntry();
          if (entry && !isNaN(idx)) {
            entry.aliases.splice(idx, 1);
            GameplanStore.saveLibraryEntry(entry);
            GameplanUI.showLibraryEntryDetail(entry);
          }
          return;
        }

        if (action === 'gp-library-filter') {
          const filter = actionEl.dataset.filter;
          // Update active state on buttons
          document.querySelectorAll('.gp-library-filter').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
          });
          // Apply filter + search together
          this._applyLibraryFilter();
          return;
        }

        if (action === 'gp-close-library') {
          GameplanUI.closeLibrary();
          return;
        }

        // ── IBJJF Rules actions ───────────────────────────────

        if (action === 'rules-answer') {
          const choiceIdx = parseInt(actionEl.dataset.choice);
          const res = RulesQuiz.answer(choiceIdx);
          if (!res) return; // already answered — ignore double taps

          document.querySelectorAll('#rules-quiz-choices .quiz-choice').forEach((btn, i) => {
            btn.disabled = true;
            if (i === res.answerIdx) btn.classList.add('correct');
            if (i === choiceIdx && !res.isCorrect) btn.classList.add('wrong');
          });

          const fb = document.getElementById('rules-feedback');
          const head = document.getElementById('rules-feedback-headline');
          const text = document.getElementById('rules-feedback-text');
          const nextBtn = document.getElementById('rules-next-btn');
          if (fb && head && text && nextBtn) {
            head.textContent = res.isCorrect
              ? rulesRandomCopy(RULES_COPY.correct)
              : rulesRandomCopy(RULES_COPY.wrong);
            text.textContent = res.feedback;
            fb.classList.add('show', res.isCorrect ? 'good' : 'bad');
            const isLast = RulesQuiz.session.index === RulesQuiz.total() - 1;
            nextBtn.textContent = isLast ? 'See results' : 'Continue';
            nextBtn.focus();
          }
          if (navigator.vibrate) navigator.vibrate(res.isCorrect ? 50 : [60, 40, 60]);
          return;
        }

        if (action === 'rules-next') {
          if (RulesQuiz.next()) {
            document.getElementById('app').innerHTML = RulesUI.renderQuiz();
          } else {
            this._lastQuizResult = RulesQuiz.finish();
            this.render('rules-result');
          }
          return;
        }

        if (action === 'rules-quit') {
          const lesson = RulesQuiz.lesson();
          if (confirm('Quit this lesson? Progress in it won\'t be saved.')) {
            const unitId = lesson ? lesson.unitId : null;
            RulesQuiz.clear();
            if (unitId) {
              this.render('rules-lessons', { unit: unitId });
            } else {
              this.render('rules-home');
            }
          }
          return;
        }

        if (action === 'rules-card-done') {
          const unitId = actionEl.dataset.unit;
          const index = parseInt(actionEl.dataset.index);
          const unit = RULES_UNITS.find(u => u.id === unitId);
          const cards = unit ? RULES_CARDS[unit.cards] : null;
          if (!cards || !cards[index]) return;
          RulesProgress.markCardRead(cards[index].id);
          if (index < cards.length - 1) {
            this.render('rules-cards', { unit: unitId, index: index + 1 });
          } else if (unit.lessons.length) {
            this.render('rules-lessons', { unit: unitId });
          } else {
            this.render('rules-home');
          }
          return;
        }

        if (action === 'rules-reveal') {
          const box = document.getElementById('rules-mini-quiz');
          if (box) {
            box.classList.add('revealed');
            actionEl.setAttribute('aria-expanded', 'true');
          }
          return;
        }

        if (action === 'rules-check-set') {
          const field = actionEl.dataset.field;
          this._checkerState[field] = actionEl.dataset.value || null;
          if (field === 'tech' && this._checkerState.tech) {
            RulesProgress.addCheckerLookup();
          }
          this.render('rules-checker');
          return;
        }

        if (action === 'rules-check-reset') {
          this._checkerState = { gi: null, belt: null, tech: null };
          this.render('rules-checker');
          return;
        }
      }

      // Image lightbox
      if (e.target.closest('[data-action="zoom-image"]')) {
        const lb = document.getElementById('image-lightbox');
        if (lb) {
          lb.classList.add('active');
          lb.focus();
        }
        return;
      }
      if (e.target.closest('[data-action="close-lightbox"]')) {
        this._closeLightbox();
        return;
      }

      // Timer controls (Hip Challenge)
      if (e.target.id === 'btn-timer-toggle') {
        if (this.currentTimer) {
          this.currentTimer.toggle();
          const btn = document.getElementById('btn-timer-toggle');
          if (btn) {
            const label = this.currentTimer.isRunning ? 'Pause' : 'Resume';
            btn.textContent = label;
            btn.setAttribute('aria-label', label + ' timer');
          }
        }
        return;
      }
      if (e.target.id === 'btn-timer-skip') {
        if (this.currentTimer) this.currentTimer.skip();
        return;
      }

      // BJJ Timer controls
      if (e.target.id === 'btn-bjj-toggle') {
        if (this.currentTimer) {
          this.currentTimer.toggle();
          const btn = document.getElementById('btn-bjj-toggle');
          if (btn) {
            const label = this.currentTimer.isRunning ? 'Pause' : 'Resume';
            btn.textContent = label;
            btn.setAttribute('aria-label', label + ' timer');
          }
        }
        return;
      }
      if (e.target.id === 'btn-bjj-skip') {
        if (this.currentTimer) {
          const skipIdx = parseInt(document.getElementById('btn-bjj-skip').dataset.exercise);
          this.currentTimer.destroy();
          this.currentTimer = null;
          this.onBjjExerciseComplete(skipIdx);
        }
        return;
      }

      // BJJ restart
      if (e.target.closest('[data-action="bjj-restart"]')) {
        this.render('bjj-circuit', { exercise: 0 });
        return;
      }

      // Pose complete — continue button
      if (e.target.closest('[data-action="pose-continue"]')) {
        const btn = e.target.closest('[data-action="pose-continue"]');
        const day = parseInt(btn.dataset.day);
        const pose = parseInt(btn.dataset.pose);
        this.render('timer', { day, pose });
        return;
      }

      // Reset all
      if (e.target.closest('[data-action="reset-all"]')) {
        if (confirm('Reset all progress? This cannot be undone.')) {
          Progress.resetAll();
          this.render('hip-home');
        }
      }
    });

    // Gameplan input handling (label edit + library search)
    document.getElementById('app').addEventListener('input', (e) => {
      // Belt Tracker autosaved fields
      if (e.target.closest('.bt-stage-screen')) {
        BeltUI.handleInput(e);
        return;
      }
      // Diary autosaved fields
      if (e.target.closest('.dy-entry-screen')) {
        DiaryUI.handleInput(e);
        return;
      }
      if (e.target.id === 'gp-detail-label-input') {
        const node = GameplanCanvas.getSelectedNode();
        if (node) {
          GameplanCanvas.updateNodeLabel(node.id, e.target.value);
        }
      }
      if (e.target.id === 'gp-library-search') {
        this._applyLibraryFilter();
      }
      if (e.target.dataset.action === 'gp-edit-note-inline') {
        const idx = parseInt(e.target.dataset.noteIndex);
        const raw = GameplanCanvas.getRawSelectedNode();
        if (raw && raw.libraryId && !isNaN(idx)) {
          const entry = GameplanStore.getLibraryEntry(raw.libraryId);
          if (entry && entry.notes[idx]) {
            entry.notes[idx].text = e.target.value;
            GameplanStore.saveLibraryEntry(entry);
          }
        }
      }
      // Library entry detail: category editing
      if (e.target.id === 'gp-lib-category-input') {
        const entry = this._getOpenLibraryEntry();
        if (entry) {
          entry.category = e.target.value.trim() || null;
          GameplanStore.saveLibraryEntry(entry);
        }
      }
      // Library entry detail: label editing
      if (e.target.id === 'gp-lib-detail-label') {
        const overlay = document.querySelector('.gp-lib-detail-overlay');
        const libId = overlay ? overlay.dataset.libraryId : null;
        if (libId) {
          const entry = GameplanStore.getLibraryEntry(libId);
          if (entry) {
            entry.label = e.target.value;
            GameplanStore.saveLibraryEntry(entry);
          }
        }
      }
      // Library entry detail: inline note editing
      if (e.target.dataset.action === 'gp-lib-edit-note') {
        const idx = parseInt(e.target.dataset.noteIndex);
        const overlay = document.querySelector('.gp-lib-detail-overlay');
        const libId = overlay ? overlay.dataset.libraryId : null;
        if (libId && !isNaN(idx)) {
          const entry = GameplanStore.getLibraryEntry(libId);
          if (entry && entry.notes[idx]) {
            entry.notes[idx].text = e.target.value;
            GameplanStore.saveLibraryEntry(entry);
          }
        }
      }
    });

    // Library entry detail: variant-of and from/to position selectors
    document.getElementById('app').addEventListener('change', (e) => {
      // Belt Tracker selects and checkboxes
      if (e.target.closest('.bt-stage-screen')) {
        BeltUI.handleChange(e);
        return;
      }
      // Diary photo picker and date change
      if (e.target.closest('.dy-entry-screen')) {
        DiaryUI.handleChange(e);
        return;
      }
      if (e.target.id === 'gp-lib-variant-select') {
        const entry = this._getOpenLibraryEntry();
        if (entry) {
          entry.variantOf = e.target.value || null;
          GameplanStore.saveLibraryEntry(entry);
        }
      }
      if (e.target.id === 'gp-lib-from-select') {
        const entry = this._getOpenLibraryEntry();
        if (entry) {
          entry.fromPositionId = e.target.value || null;
          GameplanStore.saveLibraryEntry(entry);
        }
      }
      if (e.target.id === 'gp-lib-to-select') {
        const entry = this._getOpenLibraryEntry();
        if (entry) {
          entry.toPositionId = e.target.value || null;
          GameplanStore.saveLibraryEntry(entry);
        }
      }
    });

    // Don't lose the last edit if the app is closed or backgrounded
    // before the debounced save fires
    window.addEventListener('pagehide', () => {
      GameplanCanvas.flush();
      DiaryUI.flush();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        GameplanCanvas.flush();
        DiaryUI.flush();
      }
    });

    // Global keyboard handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // Close library entry detail first
        const gpLibDetail = document.querySelector('.gp-lib-detail-overlay');
        if (gpLibDetail) {
          GameplanUI.closeLibraryEntryDetail();
          return;
        }

        // Close library overlay
        const gpLibrary = document.querySelector('.gp-library-overlay');
        if (gpLibrary) {
          GameplanUI.closeLibrary();
          return;
        }

        // Close gameplan node detail overlay
        const gpDetail = document.querySelector('.gp-node-detail-overlay');
        if (gpDetail) {
          GameplanUI.closeNodeDetail();
          return;
        }

        // Exit connect mode
        if (GameplanCanvas._connectMode) {
          GameplanCanvas.setConnectMode(false);
          return;
        }

        // Close lightbox if open
        const lb = document.getElementById('image-lightbox');
        if (lb && lb.classList.contains('active')) {
          this._closeLightbox();
          return;
        }

        // Close congrats overlay if open
        const congrats = document.getElementById('congrats-overlay');
        if (congrats && congrats.classList.contains('active')) {
          this.render('hip-home');
          return;
        }

        // Close pose-complete overlay if open
        const poseOverlay = document.querySelector('.pose-complete-overlay');
        if (poseOverlay) {
          poseOverlay.remove();
          return;
        }

        // Quit a rules lesson in progress (with confirm)
        const quizQuit = document.querySelector('.rules-quiz-screen [data-action="rules-quit"]');
        if (quizQuit) {
          quizQuit.click();
          return;
        }
      }

      // Spacebar to toggle timer when on timer screen or BJJ circuit
      if (e.key === ' ') {
        const timerBtn = document.getElementById('btn-timer-toggle') || document.getElementById('btn-bjj-toggle');
        if (timerBtn && (e.target === document.body || e.target === document.getElementById('app'))) {
          e.preventDefault();
          if (this.currentTimer) {
            this.currentTimer.toggle();
            const label = this.currentTimer.isRunning ? 'Pause' : 'Resume';
            timerBtn.textContent = label;
            timerBtn.setAttribute('aria-label', label + ' timer');
          }
        }
      }
    });
  },

  _applyLibraryFilter() {
    const searchInput = document.getElementById('gp-library-search');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const activeFilter = document.querySelector('.gp-library-filter.active');
    const typeFilter = activeFilter ? activeFilter.dataset.filter : 'all';

    // Show/hide moves and gameplans based on filter
    const items = document.querySelectorAll('.gp-library-item, .gp-empty-sub');
    items.forEach(item => {
      // Search matches name, aliases, tags, and parent move name
      const haystack = (item.dataset.search || item.dataset.label || '').toLowerCase();
      const type = item.dataset.type || '';
      const isMove = item.classList.contains('gp-library-move');
      const isGameplan = item.classList.contains('gp-library-gameplan');

      if (typeFilter === 'gameplan') {
        // Show only gameplans
        if (isMove) { item.style.display = 'none'; return; }
        if (isGameplan) {
          const matchesSearch = !query || haystack.includes(query);
          item.style.display = matchesSearch ? '' : 'none';
          return;
        }
      } else {
        // Show only moves (hide gameplans)
        if (isGameplan) { item.style.display = 'none'; return; }
        if (isMove) {
          const matchesSearch = !query || haystack.includes(query);
          const matchesType = typeFilter === 'all' || type === typeFilter;
          item.style.display = (matchesSearch && matchesType) ? '' : 'none';
          return;
        }
      }
      // Empty-state paragraphs
      if (item.tagName === 'P') {
        item.style.display = (typeFilter === 'gameplan' && item.classList.contains('gp-library-gameplan')) ||
                             (typeFilter !== 'gameplan' && item.classList.contains('gp-library-move')) ? '' : 'none';
      }
    });

    // Starter-library button: only relevant when browsing moves
    const starterBtn = document.querySelector('.gp-library-starter-btn');
    if (starterBtn) starterBtn.style.display = typeFilter === 'gameplan' ? 'none' : '';

    // Category headers: hide when searching, or when no item in the group is visible
    document.querySelectorAll('.gp-library-group-header').forEach(header => {
      if (query || typeFilter === 'gameplan') { header.style.display = 'none'; return; }
      let anyVisible = false;
      let el = header.nextElementSibling;
      while (el && !el.classList.contains('gp-library-group-header')) {
        if (el.classList.contains('gp-library-item') && el.style.display !== 'none') {
          anyVisible = true;
          break;
        }
        el = el.nextElementSibling;
      }
      header.style.display = anyVisible ? '' : 'none';
    });

    // "From here" suggestions: hide while searching or on the gameplan filter
    const suggest = document.querySelector('.gp-library-suggest');
    if (suggest) suggest.style.display = (query || typeFilter === 'gameplan') ? 'none' : '';
  },

  // The library entry whose detail overlay is currently open
  _getOpenLibraryEntry() {
    const overlay = document.querySelector('.gp-lib-detail-overlay');
    const libId = overlay ? overlay.dataset.libraryId : null;
    return libId ? GameplanStore.getLibraryEntry(libId) : null;
  },

  // Re-render the library overlay in place (after adds/imports)
  _refreshLibraryOverlay() {
    const overlay = document.querySelector('.gp-library-overlay');
    if (!overlay) return;
    Promise.all([
      GameplanStore.getLibrary(),
      GameplanStore.getAll()
    ]).then(([entries, plans]) => {
      const currentId = GameplanCanvas.getGameplan() ? GameplanCanvas.getGameplan().id : null;
      GameplanUI.showLibrary(entries, plans, currentId, GameplanUI._libraryMode);
    });
  },

  _closeLightbox() {
    const lb = document.getElementById('image-lightbox');
    if (lb) {
      lb.classList.remove('active');
      const trigger = document.querySelector('[data-action="zoom-image"]');
      if (trigger) trigger.focus();
    }
  },

  // ── Hip Challenge Timer ──────────────────────────────────────

  initTimer(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];

    this.currentTimer = new PoseTimer(
      pose.duration,
      (remaining) => {
        UI.updateTimer(remaining, this.currentTimer.progress, this.currentTimer.isRunning);
      },
      () => {
        this.onPoseComplete(dayNumber, poseIndex);
      }
    );
  },

  onPoseComplete(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];

    if (navigator.vibrate) navigator.vibrate(200);
    Progress.markPoseDone(pose.id);

    if (Progress.isDayComplete(dayNumber)) {
      Progress.markDayComplete(dayNumber);
      this.showCongrats(dayNumber);
    } else {
      const nextIndex = dayData.poses.findIndex((p, i) => i > poseIndex && !Progress.isPoseDone(p.id));
      if (nextIndex !== -1) {
        this.showPoseComplete(pose.name, dayNumber, nextIndex);
      } else {
        this.render('day', { day: dayNumber });
      }
    }
  },

  showPoseComplete(poseName, dayNumber, nextPoseIndex) {
    const app = document.getElementById('app');
    const overlay = document.createElement('div');
    overlay.className = 'pose-complete-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', `${poseName} complete`);
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="pose-complete-content">
        <div class="pose-complete-check" aria-hidden="true">&#x2713;</div>
        <p>${UI.esc(poseName)}</p>
        <p class="pose-complete-next">Up next...</p>
        <button class="btn-pose-continue" data-action="pose-continue" data-day="${dayNumber}" data-pose="${nextPoseIndex}">Continue</button>
      </div>`;
    app.appendChild(overlay);

    requestAnimationFrame(() => {
      const btn = overlay.querySelector('.btn-pose-continue');
      if (btn) btn.focus();
    });
  },

  showCongrats(dayNumber) {
    const app = document.getElementById('app');
    app.insertAdjacentHTML('beforeend', UI.renderCongrats(dayNumber));

    requestAnimationFrame(() => {
      const overlay = document.getElementById('congrats-overlay');
      if (overlay) {
        overlay.classList.add('active');
        const firstBtn = overlay.querySelector('.btn-congrats-next');
        if (firstBtn) firstBtn.focus();
      }
    });
  },

  // ── BJJ Circuit ──────────────────────────────────────────────

  initBjjScrollWheel() {
    const wheel = document.getElementById('bjj-scroll-wheel');
    if (!wheel) return;

    const items = wheel.querySelectorAll('.scroll-wheel-item');
    const ITEM_HEIGHT = 48;
    const values = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300];

    // Find initial index from current bjjDuration
    let currentIndex = values.indexOf(this.bjjDuration);
    if (currentIndex === -1) currentIndex = 3; // default 2min

    // Scroll to selected position
    wheel.scrollTop = currentIndex * ITEM_HEIGHT;
    items[currentIndex].classList.add('selected');

    const updateSelection = () => {
      const scrollPos = wheel.scrollTop;
      const idx = Math.round(scrollPos / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, values.length - 1));

      items.forEach(item => item.classList.remove('selected'));
      items[clampedIdx].classList.add('selected');

      this.bjjDuration = values[clampedIdx];

      const info = document.getElementById('bjj-total-info');
      if (info) {
        const totalMin = Math.round((this.bjjDuration * 10) / 60);
        info.textContent = `10 exercises \u00b7 ${UI._formatDurationLabel(this.bjjDuration)} each \u00b7 ${totalMin} min total`;
      }
    };

    let scrollTimeout;
    wheel.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Snap to nearest item
        const idx = Math.round(wheel.scrollTop / ITEM_HEIGHT);
        const clampedIdx = Math.max(0, Math.min(idx, values.length - 1));
        wheel.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
        updateSelection();
      }, 80);
    });
  },

  initBjjCountdown() {
    let count = 3;
    const display = document.getElementById('bjj-countdown-number');
    if (display) display.textContent = count;

    this.bjjCountdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        if (display) {
          display.textContent = count;
          display.classList.remove('bjj-countdown-pulse');
          void display.offsetWidth;
          display.classList.add('bjj-countdown-pulse');
        }
      } else if (count === 0) {
        if (display) {
          display.textContent = 'GO!';
          display.classList.remove('bjj-countdown-pulse');
          void display.offsetWidth;
          display.classList.add('bjj-countdown-pulse');
        }
      } else {
        clearInterval(this.bjjCountdownTimer);
        this.bjjCountdownTimer = null;
        this.render('bjj-circuit', { exercise: 0 });
      }
    }, 1000);
  },

  initBjjTimer(exerciseIndex) {
    this.currentTimer = new PoseTimer(
      this.bjjDuration,
      (remaining) => {
        UI.updateBjjTimer(remaining, this.currentTimer.progress, this.currentTimer.isRunning);
      },
      () => {
        this.onBjjExerciseComplete(exerciseIndex);
      }
    );

    // 3-2-1 countdown in the timer display before starting the main timer
    let count = 3;
    const display = document.getElementById('bjj-timer-display');
    const toggleBtn = document.getElementById('btn-bjj-toggle');

    // Disable pause button during countdown
    if (toggleBtn) toggleBtn.disabled = true;
    if (display) {
      display.textContent = 'Starting in ' + count;
      display.classList.add('bjj-countdown-active');
    }

    this.bjjCountdownTimer = setInterval(() => {
      count--;
      if (count > 0) {
        if (display) display.textContent = 'Starting in ' + count;
      } else if (count === 0) {
        if (display) display.textContent = 'GO!';
      } else {
        clearInterval(this.bjjCountdownTimer);
        this.bjjCountdownTimer = null;
        if (display) display.classList.remove('bjj-countdown-active');
        if (toggleBtn) toggleBtn.disabled = false;
        this.currentTimer.start();
      }
    }, 1000);
  },

  onBjjExerciseComplete(index) {
    if (navigator.vibrate) navigator.vibrate(200);

    if (index < BJJ_EXERCISES.length - 1) {
      this.render('bjj-circuit', { exercise: index + 1 });
    } else {
      this.render('bjj-complete');
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
