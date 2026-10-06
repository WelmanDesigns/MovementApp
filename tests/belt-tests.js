// Belt Tracker tests — plain Node, no framework (same style as
// gameplan-exports/test-import.js).  Run:  node tests/belt-tests.js
//
// Loads the real browser globals (BELT_SEED, BeltData, BeltStore) into a vm
// context with a localStorage mock, then exercises count logic, import seed
// data, persistence and review references.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'src', 'js');

// ── Test harness ──────────────────────────────────────────────
let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
function section(name) { console.log('\n' + name); }

// ── localStorage mock + app globals ───────────────────────────
function makeContext(storageBacking) {
  const backing = storageBacking || {};
  const sandbox = {
    console,
    localStorage: {
      getItem: k => (k in backing ? backing[k] : null),
      setItem: (k, v) => { backing[k] = String(v); },
      removeItem: k => { delete backing[k]; }
    },
    __backing: backing
  };
  const ctx = vm.createContext(sandbox);
  for (const file of ['belt-seed-generated.js', 'belt-data.js', 'belt-store.js']) {
    vm.runInContext(fs.readFileSync(path.join(JS_DIR, file), 'utf8'), ctx, { filename: file });
  }
  vm.runInContext('BeltStore.load();', ctx);
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);

// ══ 1. Count-status logic ═════════════════════════════════════
section('Count-status logic');
{
  const ctx = makeContext();
  const status = (moves, target) => run(ctx,
    `BeltStore.groupStatus({ requirementMode: 'target_count', targetCount: ${target} }, ${JSON.stringify(moves)})`);
  const mk = (n) => Array.from({ length: n }, (_, i) =>
    ({ name: 'Move ' + i, status: 'not_started', isSelected: true }));

  let s = status(mk(2), 3);
  check('required 3, current 2 → "Add 1 more"', s.state === 'below' && s.text === '2 of 3 moves · Add 1 more', s.text);
  s = status(mk(3), 3);
  check('required 3, current 3 → "Requirement met"', s.state === 'met' && s.text === '3 of 3 moves · Requirement met', s.text);
  s = status(mk(5), 3);
  check('required 3, current 5 → "Only 3 required"', s.state === 'above' && s.text === '5 moves selected · Only 3 required', s.text);

  const withBlank = mk(3); withBlank[1].name = '   ';
  s = status(withBlank, 3);
  check('blank move names do not count', s.current === 2 && s.state === 'below', 'current=' + s.current);

  const withUnselected = mk(4); withUnselected[3].isSelected = false;
  s = status(withUnselected, 3);
  check('unselected (suggested/removed) moves do not count', s.current === 3, 'current=' + s.current);

  // Suggested moves never enter groupStatus: verify via a real stage group
  run(ctx, `BeltStore.getStageState('blue-exam')`);
  const g = run(ctx, `
    (() => {
      const t = BeltData.getStageTemplate('blue-exam');
      for (const sec of t.sections) for (const grp of sec.groups)
        if (grp.id === 'submissions--armlock') {
          const st = BeltStore.groupStatus(grp, BeltStore.movesForGroup('blue-exam', grp.id));
          return { suggestions: BeltStore.suggestionsForGroup('blue-exam', grp).length, current: st.current, target: st.target };
        }
    })()`);
  check('suggested moves do not affect the count', g.suggestions > 0 && g.current === 0 && g.target === 5,
    JSON.stringify(g));

  const ex = run(ctx, `BeltStore.groupStatus({ requirementMode: 'exact_named_list' },
    [{ name: 'A', status: 'exam_ready', isSelected: true },
     { name: 'B', status: 'reliable', isSelected: true },
     { name: 'C', status: 'drilling', isSelected: true }])`);
  check('exact list → "2 of 3 techniques marked ready"', ex.text === '2 of 3 techniques marked ready' && ex.state === 'progress', ex.text);
}

// ══ 2. Data import (seed data) ════════════════════════════════
section('Data import');
{
  const ctx = makeContext();
  const totals = run(ctx, `
    (() => {
      const out = {};
      for (const sid in BELT_SEED.stages) {
        let n = 0;
        BELT_SEED.stages[sid].sections.forEach(s => s.groups.forEach(g => { n += g.defaultMoveIds.length; }));
        out[sid] = n;
      }
      return out;
    })()`);
  check('Blue Stripe 1 imports 52 moves', totals['blue-s1'] === 52, JSON.stringify(totals));
  check('Blue Stripe 2 imports 51 moves', totals['blue-s2'] === 51);
  check('Blue Stripe 3 imports 59 moves', totals['blue-s3'] === 59);
  check('Blue Stripe 4 imports 47 moves', totals['blue-s4'] === 47);
  check('Purple Belt Exam imports 177 moves', totals['purple-exam'] === 177);

  const ids = run(ctx, `Object.keys(BELT_SEED.moves)`);
  check('all seed move ids unique and stable-prefixed',
    new Set(ids).size === ids.length && ids.every(i => i.startsWith('sd-')));

  const blueExamSum = run(ctx, `
    (() => {
      let sum = 0;
      BeltData.getStageTemplate('blue-exam').sections.forEach(s =>
        s.groups.forEach(g => { if (g.requirementMode === 'target_count') sum += g.targetCount; }));
      return sum;
    })()`);
  check('Blue Belt Exam category targets sum to 100', blueExamSum === 100, 'sum=' + blueExamSum);

  const s1Targets = run(ctx, `
    (() => {
      const out = {};
      BeltData.getStageTemplate('blue-s1').sections.forEach(s =>
        s.groups.forEach(g => { if (g.requirementMode === 'target_count') out[g.id] = g.targetCount; }));
      return out;
    })()`);
  check('Blue Stripe 1 keeps printed targets (Judo 6, GP Open 6, ...)',
    s1Targets['takedowns--judo'] === 6 && s1Targets['guard-pass--open'] === 6 &&
    s1Targets['defence--esc-side-control'] === 3 &&
    Object.values(s1Targets).reduce((a, b) => a + b, 0) === 52,
    JSON.stringify(s1Targets));

  const s1Info = run(ctx, `
    (() => {
      const t = BeltData.getStageTemplate('blue-s1');
      for (const sec of t.sections) for (const g of sec.groups)
        if (g.id === 'basic--ibjjf-points') return g.requirementMode;
      return null;
    })()`);
  check('Blue Stripe 1 IBJJF points group is informational', s1Info === 'informational');

  // ID stability across repeated imports: re-run the importer to a temp copy
  // and compare (skipped when the spreadsheet or python are unavailable).
  const xlsxCandidates = [
    path.join(__dirname, '..', 'Belt Tracker', 'Purple belt exam.xlsx'),
    path.join(require('os').homedir(), 'Downloads', 'Purple belt exam.xlsx')
  ];
  const xlsx = xlsxCandidates.find(p => fs.existsSync(p));
  if (xlsx) {
    const { execFileSync } = require('child_process');
    const seedPath = path.join(JS_DIR, 'belt-seed-generated.js');
    const before = fs.readFileSync(seedPath, 'utf8');
    try {
      execFileSync('python', [path.join(__dirname, '..', 'import-belt-curriculum.py'), xlsx],
        { stdio: 'pipe' });
      const after = fs.readFileSync(seedPath, 'utf8');
      check('stable IDs unchanged between repeated imports', before === after);
    } catch (e) {
      fs.writeFileSync(seedPath, before);
      check('stable IDs unchanged between repeated imports', false, 'importer failed: ' + e.message);
    }
  } else {
    console.log('  – (skipped repeated-import check: spreadsheet not found)');
  }

  // White Belt curricula present
  const wb = run(ctx, `
    ['white-s1','white-s2','white-s3','white-s4'].map(id => {
      const t = BeltData.getStageTemplate(id);
      let n = 0;
      t.sections.forEach(s => s.groups.forEach(g => { n += g.defaultMoves.length; }));
      return n;
    })`);
  check('White Stripe 1–4 named curricula seeded (25/23/33/28 techniques)',
    wb[0] === 25 && wb[1] === 23 && wb[2] === 33 && wb[3] === 28, JSON.stringify(wb));
}

// ══ 3. Persistence ════════════════════════════════════════════
section('Persistence');
{
  const backing = {};
  let ctx = makeContext(backing);

  // Custom move remains after reload
  run(ctx, `
    BeltStore.getStageState('white-s1');
    const mv = BeltStore.addCustomMove('white-s1', 'sweeps--full-guard', 'Flower Sweep');
    BeltStore.updateMove('white-s1', mv.id, { notes: 'elbow control', status: 'drilling' });
  `);
  ctx = makeContext(backing); // simulates app restart on same storage
  const custom = run(ctx, `
    BeltStore.movesForGroup('white-s1', 'sweeps--full-guard').find(m => m.name === 'Flower Sweep')`);
  check('custom move remains after reload', !!custom && custom.notes === 'elbow control' && custom.status === 'drilling');

  // Edited default move retains the user edit (also across a template re-merge)
  run(ctx, `
    const first = BeltStore.movesForGroup('white-s1', 'submissions--full-guard')[0];
    BeltStore.updateMove('white-s1', first.id, { name: 'Cross Collar Choke' });
  `);
  ctx = makeContext(backing);
  run(ctx, `BeltData.templateVersion = 2;`); // future template update
  const edited = run(ctx, `BeltStore.movesForGroup('white-s1', 'submissions--full-guard')[0].name`);
  const groupSize = run(ctx, `BeltStore.movesForGroup('white-s1', 'submissions--full-guard').length`);
  check('edited default retains user edit after reload + template bump',
    edited === 'Cross Collar Choke' && groupSize === 5, edited + ' / ' + groupSize);

  // Removed default returns to suggestions and is recoverable
  const removedInfo = run(ctx, `
    (() => {
      const grp = (() => {
        const t = BeltData.getStageTemplate('white-s1');
        for (const sec of t.sections) for (const g of sec.groups)
          if (g.id === 'sweeps--full-guard') return g;
      })();
      const scissor = BeltStore.movesForGroup('white-s1', grp.id).find(m => m.name === 'Scissor');
      BeltStore.removeMove('white-s1', scissor.id);
      const inList = BeltStore.movesForGroup('white-s1', grp.id).some(m => m.name === 'Scissor');
      const suggested = BeltStore.suggestionsForGroup('white-s1', grp).some(s => s.name === 'Scissor');
      return { inList, suggested, id: scissor.id };
    })()`);
  check('removed default move appears in suggestions', !removedInfo.inList && removedInfo.suggested);
  const restored = run(ctx, `
    BeltStore.undoRemove('white-s1', ${JSON.stringify(removedInfo.id)});
    BeltStore.movesForGroup('white-s1', 'sweeps--full-guard').some(m => m.name === 'Scissor')`);
  check('undo restores the removed default', restored === true);

  // Reordering persists
  run(ctx, `
    const peers = BeltStore.movesForGroup('white-s1', 'warm-up--all');
    BeltStore.reorderMove('white-s1', peers[1].id, -1);
  `);
  ctx = makeContext(backing);
  const order = run(ctx, `BeltStore.movesForGroup('white-s1', 'warm-up--all').map(m => m.name).slice(0, 2)`);
  check('reordering persists after reload',
    order[0] === 'Front Hip Escape' && order[1] === 'Basic Hip Escape', JSON.stringify(order));

  // Reset category restores defaults without touching other categories
  const resetRes = run(ctx, `
    (() => {
      const t = BeltData.getStageTemplate('white-s1');
      let sweepGrp;
      for (const sec of t.sections) for (const g of sec.groups)
        if (g.id === 'sweeps--full-guard') sweepGrp = g;
      BeltStore.resetGroup('white-s1', sweepGrp);
      return {
        sweeps: BeltStore.movesForGroup('white-s1', 'sweeps--full-guard').map(m => m.name),
        subsFirst: BeltStore.movesForGroup('white-s1', 'submissions--full-guard')[0].name,
        warmupFirst: BeltStore.movesForGroup('white-s1', 'warm-up--all')[0].name
      };
    })()`);
  check('reset category restores its defaults',
    JSON.stringify(resetRes.sweeps) === JSON.stringify(['Sit Up', 'Scissor', 'See Saw']),
    JSON.stringify(resetRes.sweeps));
  check('reset does not alter unrelated categories',
    resetRes.subsFirst === 'Cross Collar Choke' && resetRes.warmupFirst === 'Front Hip Escape',
    resetRes.subsFirst + ' / ' + resetRes.warmupFirst);

  // Removed CUSTOM move survives within the session (undo window) but is
  // purged on next app start
  run(ctx, `
    const mv = BeltStore.movesForGroup('white-s1', 'sweeps--full-guard');
    const c = BeltStore.addCustomMove('white-s1', 'sweeps--full-guard', 'Temp Custom');
    BeltStore.removeMove('white-s1', c.id);
  `);
  ctx = makeContext(backing);
  const purged = run(ctx, `
    !BeltStore._state.stages['white-s1'].moves.some(m => m.name === 'Temp Custom')`);
  check('removed custom move purged after restart (undo is session-scoped)', purged === true);
}

// ══ 4. Review references ══════════════════════════════════════
section('Review references');
{
  const backing = {};
  const ctx = makeContext(backing);
  const res = run(ctx, `
    (() => {
      // Mark all 3 Stripe-1 full-guard sweeps ready
      BeltStore.getStageState('white-s1');
      BeltStore.movesForGroup('white-s1', 'sweeps--full-guard').forEach(m =>
        BeltStore.updateMove('white-s1', m.id, { status: 'exam_ready' }));

      const t2 = BeltData.getStageTemplate('white-s2');
      const req = t2.reviewRequirements.find(r => r.id === 'rev-s2-fg-sweeps');
      const before = BeltStore.getStageState('white-s2').moves.length;
      const prog = BeltStore.reviewProgress(req);
      const after = BeltStore.getStageState('white-s2').moves.length;
      const s1Count = BeltStore._state.stages['white-s1'].moves.length;
      const progAgain = BeltStore.reviewProgress(req);
      const s1CountAfter = BeltStore._state.stages['white-s1'].moves.length;
      return { prog, before, after, dupFree: s1Count === s1CountAfter, progAgain };
    })()`);
  check('review card reads progress from the earlier stage',
    res.prog.ready === 3 && res.prog.required === 3 && res.prog.met === true, JSON.stringify(res.prog));
  check('review requirements do not create duplicate moves',
    res.before === res.after && res.dupFree);

  const unstarted = run(ctx, `
    (() => {
      const t3 = BeltData.getStageTemplate('white-s3');
      const req = t3.reviewRequirements.find(r => r.id === 'rev-s3-back-subs');
      return BeltStore.reviewProgress(req);
    })()`);
  check('review of an unstarted stage reports zero ready (no seeding)',
    unstarted.ready === 0 && unstarted.required === 4 && unstarted.selected === 4, JSON.stringify(unstarted));
}

// ── Result ────────────────────────────────────────────────────
console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed ? 1 : 0);
