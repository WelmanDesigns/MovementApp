// Belt Tracker — user state, persisted in localStorage (same pattern as Progress).
//
// Curriculum templates (BeltData) are never mutated. Everything the user does
// lives here as user-owned move records, so a template update can add new
// defaults without touching edited names, notes, selections or custom moves.
//
// Move record shape (UserCurriculumMove):
//   { id, templateMoveId?, groupId, name, notes, status, source, isSelected,
//     sortOrder, isRemoved? }
//   source: 'default' | 'suggested' | 'custom'
//   Removed default/suggested moves keep their record (isRemoved: true) so they
//   reappear under Suggested and stay recoverable. Removed custom moves are
//   kept for undo and purged on the next app start.

const BeltStore = {
  STORAGE_KEY: 'beltTracker',

  _state: null,

  _defaultState() {
    return { version: 1, stages: {} };
  },

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      this._state = raw ? JSON.parse(raw) : this._defaultState();
    } catch {
      this._state = this._defaultState();
    }
    if (!this._state.stages) this._state.stages = {};
    // Session-scoped undo for removed custom moves: purge leftovers from
    // previous sessions
    for (const sid in this._state.stages) {
      const st = this._state.stages[sid];
      st.moves = (st.moves || []).filter(m => !(m.isRemoved && m.source === 'custom'));
    }
    return this._state;
  },

  _save() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._state));
  },

  _touch(stage) {
    stage.updatedAt = new Date().toISOString();
    this._save();
  },

  isStageStarted(stageId) {
    return !!this._state.stages[stageId];
  },

  // ── Seeding & template merge ─────────────────────────────────

  _defaultRecord(tpl, groupId, sortOrder, source) {
    return {
      id: 'u-' + tpl.id,
      templateMoveId: tpl.id,
      groupId,
      name: tpl.name,
      notes: tpl.defaultNotes || '',
      status: 'not_started',
      source: source || 'default',
      isSelected: true,
      sortOrder
    };
  },

  // User state for a stage, seeded lazily from the template on first access.
  // On later template versions, brand-new default moves are appended; existing
  // user records always win.
  getStageState(stageId) {
    const template = BeltData.getStageTemplate(stageId);
    if (!template) return null;

    let stage = this._state.stages[stageId];
    if (!stage) {
      stage = { seededVersion: template.templateVersion, stageNotes: '', moves: [], updatedAt: null };
      for (const sec of template.sections) {
        for (const grp of sec.groups) {
          grp.defaultMoves.forEach((tpl, i) => {
            stage.moves.push(this._defaultRecord(tpl, grp.id, (i + 1) * 10));
          });
        }
      }
      this._state.stages[stageId] = stage;
      this._touch(stage);
      return stage;
    }

    // Merge defaults added by a newer template (never overwrite user records)
    if (stage.seededVersion !== template.templateVersion) {
      const known = {};
      stage.moves.forEach(m => { if (m.templateMoveId) known[m.templateMoveId] = true; });
      let added = false;
      for (const sec of template.sections) {
        for (const grp of sec.groups) {
          grp.defaultMoves.forEach(tpl => {
            if (!known[tpl.id]) {
              stage.moves.push(this._defaultRecord(tpl, grp.id, this._nextSortOrder(stage, grp.id)));
              added = true;
            }
          });
        }
      }
      stage.seededVersion = template.templateVersion;
      if (added) this._touch(stage); else this._save();
    }
    return stage;
  },

  _nextSortOrder(stage, groupId) {
    let max = 0;
    stage.moves.forEach(m => {
      if (m.groupId === groupId && m.sortOrder > max) max = m.sortOrder;
    });
    return max + 10;
  },

  // ── Reads ────────────────────────────────────────────────────

  getMove(stageId, moveId) {
    const stage = this._state.stages[stageId];
    return stage ? stage.moves.find(m => m.id === moveId) || null : null;
  },

  // Selected ("My list") moves for a group, in sort order
  movesForGroup(stageId, groupId) {
    const stage = this.getStageState(stageId);
    if (!stage) return [];
    return stage.moves
      .filter(m => m.groupId === groupId && m.isSelected && !m.isRemoved)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  _normName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  },

  // Suggested moves for a group: template suggestions plus removed defaults,
  // minus anything already selected (by template id or same name)
  suggestionsForGroup(stageId, templateGroup) {
    const stage = this.getStageState(stageId);
    if (!stage) return [];
    const selected = stage.moves.filter(m => m.groupId === templateGroup.id && m.isSelected && !m.isRemoved);
    const takenIds = {};
    const takenNames = {};
    selected.forEach(m => {
      if (m.templateMoveId) takenIds[m.templateMoveId] = true;
      takenNames[this._normName(m.name)] = true;
    });

    const out = [];
    const seen = {};
    // Removed defaults come back as suggestions first
    stage.moves
      .filter(m => m.groupId === templateGroup.id && m.isRemoved && m.source !== 'custom')
      .forEach(m => {
        if (m.templateMoveId) seen[m.templateMoveId] = true;
        out.push({ id: m.templateMoveId || m.id, name: m.name, removedDefault: true });
      });
    (templateGroup.suggestedMoves || []).forEach(tpl => {
      if (takenIds[tpl.id] || seen[tpl.id] || takenNames[this._normName(tpl.name)]) return;
      out.push(tpl);
    });
    (templateGroup.defaultMoves || []).forEach(tpl => {
      // Defaults the user removed before this record scheme (or reset edge
      // cases): only offer if neither selected nor already listed
      if (takenIds[tpl.id] || seen[tpl.id] || takenNames[this._normName(tpl.name)]) return;
      const existing = stage.moves.find(m => m.templateMoveId === tpl.id);
      if (!existing) out.push(tpl);
    });
    return out;
  },

  // ── Mutations ────────────────────────────────────────────────

  setStageNotes(stageId, text) {
    const stage = this.getStageState(stageId);
    stage.stageNotes = text;
    this._touch(stage);
  },

  addCustomMove(stageId, groupId, name) {
    const stage = this.getStageState(stageId);
    const move = {
      id: 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      groupId,
      name: name || '',
      notes: '',
      status: 'not_started',
      source: 'custom',
      isSelected: true,
      sortOrder: this._nextSortOrder(stage, groupId)
    };
    stage.moves.push(move);
    this._touch(stage);
    return move;
  },

  // Add a suggested/library MoveTemplate to My list. Restores the original
  // record (with its notes/status) if this was a removed default.
  addSuggested(stageId, groupId, tpl) {
    const stage = this.getStageState(stageId);
    const existing = stage.moves.find(m => m.templateMoveId === tpl.id && m.groupId === groupId);
    if (existing) {
      existing.isRemoved = false;
      existing.isSelected = true;
      existing.sortOrder = this._nextSortOrder(stage, groupId);
      this._touch(stage);
      return existing;
    }
    const move = {
      id: 'u-' + tpl.id,
      templateMoveId: tpl.id,
      groupId,
      name: tpl.name,
      notes: tpl.defaultNotes || '',
      status: 'not_started',
      source: 'suggested',
      isSelected: true,
      sortOrder: this._nextSortOrder(stage, groupId)
    };
    stage.moves.push(move);
    this._touch(stage);
    return move;
  },

  // Autosaved edits (name, notes, status)
  updateMove(stageId, moveId, patch) {
    const stage = this.getStageState(stageId);
    const move = stage.moves.find(m => m.id === moveId);
    if (!move) return null;
    if (patch.name !== undefined) move.name = patch.name;
    if (patch.notes !== undefined) move.notes = patch.notes;
    if (patch.status !== undefined) move.status = patch.status;
    this._touch(stage);
    return move;
  },

  // Remove from My list. Default/suggested moves return to Suggested;
  // custom moves are kept (hidden) until undo expires at next app start.
  removeMove(stageId, moveId) {
    const stage = this.getStageState(stageId);
    const move = stage.moves.find(m => m.id === moveId);
    if (!move) return null;
    move.isSelected = false;
    move.isRemoved = true;
    this._touch(stage);
    return move;
  },

  undoRemove(stageId, moveId) {
    const stage = this.getStageState(stageId);
    const move = stage.moves.find(m => m.id === moveId);
    if (!move) return null;
    move.isRemoved = false;
    move.isSelected = true;
    this._touch(stage);
    return move;
  },

  // Swap with neighbour in sort order. dir: -1 up, +1 down.
  reorderMove(stageId, moveId, dir) {
    const stage = this.getStageState(stageId);
    const move = stage.moves.find(m => m.id === moveId);
    if (!move) return false;
    const peers = this.movesForGroup(stageId, move.groupId);
    const idx = peers.findIndex(m => m.id === moveId);
    const swapWith = peers[idx + dir];
    if (!swapWith) return false;
    const tmp = move.sortOrder;
    move.sortOrder = swapWith.sortOrder;
    swapWith.sortOrder = tmp;
    this._touch(stage);
    return true;
  },

  // Reset ONE category to its seeded defaults. Explicit action; other
  // categories are untouched.
  resetGroup(stageId, templateGroup) {
    const stage = this.getStageState(stageId);
    stage.moves = stage.moves.filter(m => m.groupId !== templateGroup.id);
    templateGroup.defaultMoves.forEach((tpl, i) => {
      stage.moves.push(this._defaultRecord(tpl, templateGroup.id, (i + 1) * 10));
    });
    this._touch(stage);
  },

  // ── Requirement counting ─────────────────────────────────────

  isReady(move) {
    return BELT_READY_STATUSES.includes(move.status);
  },

  // Only active, non-blank My-list moves count toward requirements
  countedMoves(moves) {
    return moves.filter(m => m.isSelected && !m.isRemoved && String(m.name).trim() !== '');
  },

  // Live requirement status for a group.
  //   target_count      -> { mode, current, target, state: below|met|above, text }
  //   exact_named_list  -> { mode, ready, total, state: met|progress, text }
  //   informational     -> { mode, state: null, text: null }
  groupStatus(templateGroup, moves) {
    const counted = this.countedMoves(moves);

    if (templateGroup.requirementMode === 'target_count') {
      const current = counted.length;
      const target = templateGroup.targetCount || 0;
      let state, text;
      if (current < target) {
        state = 'below';
        text = current + ' of ' + target + ' moves · Add ' + (target - current) + ' more';
      } else if (current === target) {
        state = 'met';
        text = current + ' of ' + target + ' moves · Requirement met';
      } else {
        state = 'above';
        text = current + ' moves selected · Only ' + target + ' required';
      }
      return { mode: 'target_count', current, target, state, text };
    }

    if (templateGroup.requirementMode === 'exact_named_list') {
      const ready = counted.filter(m => this.isReady(m)).length;
      const total = counted.length;
      return {
        mode: 'exact_named_list',
        ready,
        total,
        state: total > 0 && ready === total ? 'met' : 'progress',
        text: ready + ' of ' + total + ' techniques marked ready'
      };
    }

    return { mode: templateGroup.requirementMode || 'none', state: null, text: null };
  },

  // Roll-up for stage header and landing cards
  stageSummary(stageId) {
    const template = BeltData.getStageTemplate(stageId);
    if (!template) return null;
    const started = this.isStageStarted(stageId);

    let groupsWithReq = 0, groupsComplete = 0;
    let requiredTotal = 0, selectedCapped = 0, selectedTotal = 0;
    let readyCount = 0, listTotal = 0;
    let hasTargets = false, hasExact = false;

    for (const sec of template.sections) {
      for (const grp of sec.groups) {
        if (grp.requirementMode === 'informational' || grp.requirementMode === 'none') continue;
        const moves = started
          ? this.movesForGroup(stageId, grp.id)
          : grp.defaultMoves.map(t => ({ name: t.name, status: 'not_started', isSelected: true }));
        const status = this.groupStatus(grp, moves);
        groupsWithReq++;
        if (status.mode === 'target_count') {
          hasTargets = true;
          requiredTotal += status.target;
          selectedCapped += Math.min(status.current, status.target);
          selectedTotal += status.current;
          if (status.state !== 'below') groupsComplete++;
        } else {
          hasExact = true;
          readyCount += status.ready;
          listTotal += status.total;
          if (status.state === 'met') groupsComplete++;
        }
      }
    }

    return {
      started, groupsWithReq, groupsComplete,
      hasTargets, requiredTotal, selectedCapped, selectedTotal,
      hasExact, readyCount, listTotal,
      reviewCount: template.reviewRequirements.length
    };
  },

  // Progress for a review requirement — reads the REFERENCED stage's data,
  // never copies moves. Unstarted stages report template defaults at zero ready.
  reviewProgress(req) {
    let selected, ready = 0;
    if (this.isStageStarted(req.stageId)) {
      const moves = this.countedMoves(this.movesForGroup(req.stageId, req.groupId));
      selected = moves.length;
      ready = moves.filter(m => this.isReady(m)).length;
    } else {
      const template = BeltData.getStageTemplate(req.stageId);
      selected = 0;
      if (template) {
        for (const sec of template.sections) {
          const g = sec.groups.find(x => x.id === req.groupId);
          if (g) selected = g.defaultMoves.length;
        }
      }
    }
    return { required: req.count, selected, ready, met: ready >= req.count };
  }
};
