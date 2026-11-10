// Diary tests — plain Node, no framework (same style as belt-tests.js). Run:
//   node tests/diary-tests.js
//
// Loads DiaryStore into a vm context with a localStorage mock and no
// IndexedDB, so the localStorage fallback path is exercised.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, '..', 'src', 'js');

let passed = 0, failed = 0;
function check(name, cond, detail) {
  if (cond) { passed++; console.log('  ✓ ' + name); }
  else { failed++; console.log('  ✗ ' + name + (detail ? ' — ' + detail : '')); }
}
function section(name) { console.log('\n' + name); }

function makeContext(backing) {
  backing = backing || {};
  const ctx = vm.createContext({
    console,
    localStorage: {
      getItem: k => (k in backing ? backing[k] : null),
      setItem: (k, v) => { backing[k] = String(v); },
      removeItem: k => { delete backing[k]; }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(JS_DIR, 'diary-store.js'), 'utf8'), ctx, { filename: 'diary-store.js' });
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);

(async () => {
  // ══ 1. Date helpers ═════════════════════════════════════════
  section('Date helpers');
  {
    const ctx = makeContext();
    check('todayKey uses local date (late evening stays same day)',
      run(ctx, `DiaryStore.todayKey(new Date(2026, 0, 5, 23, 30))`) === '2026-01-05');
    check('todayKey pads month and day', run(ctx, `DiaryStore.todayKey(new Date(2026, 2, 7))`) === '2026-03-07');
    check('addDays crosses month end', run(ctx, `DiaryStore.addDays('2026-01-31', 1)`) === '2026-02-01');
    check('addDays crosses year backwards', run(ctx, `DiaryStore.addDays('2026-01-01', -1)`) === '2025-12-31');
    check('weekStart of Saturday is Monday', run(ctx, `DiaryStore.weekStart('2026-11-07')`) === '2026-11-02');
    check('weekStart of Sunday is previous Monday', run(ctx, `DiaryStore.weekStart('2026-11-08')`) === '2026-11-02');
    check('weekStart of Monday is itself', run(ctx, `DiaryStore.weekStart('2026-11-02')`) === '2026-11-02');
  }

  // ══ 2. Heatmap ══════════════════════════════════════════════
  section('Heatmap');
  {
    const ctx = makeContext();
    const weeks = run(ctx, `DiaryStore.heatmapWeeks('2026-11-07', 26)`);
    check('26 columns of 7 days', weeks.length === 26 && weeks.every(c => c.length === 7));
    check('last column is the current week (Mon→Sun)',
      weeks[25][0] === '2026-11-02' && weeks[25][6] === '2026-11-08', JSON.stringify(weeks[25]));
    check('first column starts 25 weeks earlier on a Monday', weeks[0][0] === '2026-05-11', weeks[0][0]);
    const flat = [].concat(...weeks);
    check('days are consecutive with no gaps',
      flat.every((k, i) => i === 0 || run(ctx, `DiaryStore.addDays('${flat[i - 1]}', 1)`) === k));

    const lvl = (d, r) => run(ctx,
      `DiaryStore.level({ drills: new Array(${d}).fill({}), rolls: new Array(${r}).fill({}) })`);
    check('no entry → level 0', run(ctx, `DiaryStore.level(null)`) === 0);
    check('empty entry (just attended) → level 1', lvl(0, 0) === 1);
    check('1–2 items → level 1', lvl(1, 1) === 1);
    check('3–5 items → level 2', lvl(2, 1) === 2 && lvl(2, 3) === 2);
    check('6+ items → level 3', lvl(3, 3) === 3 && lvl(10, 0) === 3);
  }

  // ══ 3. Persistence (localStorage fallback) ══════════════════
  section('Persistence');
  {
    const backing = {};
    let ctx = makeContext(backing);
    await run(ctx, `DiaryStore.init()`);
    check('falls back to localStorage without IndexedDB', run(ctx, `DiaryStore._useLocalStorage`) === true);
    check('photos are disabled in fallback', run(ctx, `DiaryStore.photosEnabled()`) === false);

    await run(ctx, `DiaryStore.create('2026-11-07')`);
    check('empty entry still counts as attended', run(ctx, `DiaryStore.count()`) === 1);

    await run(ctx, `(() => {
      const e = DiaryStore.get('2026-11-07');
      e.drills.push({ id: 'd1', name: 'Knee Cut', desc: 'Hip low' });
      e.rolls.push({ id: 'r1', partner: 'Sam', outcome: 'subbed', technique: 'Triangle', notes: 'Posture' });
      return DiaryStore.save(e);
    })()`);
    await run(ctx, `DiaryStore.create('2026-11-03')`);
    await run(ctx, `DiaryStore.create('2026-10-20')`);

    // Reload from the same storage
    ctx = makeContext(backing);
    await run(ctx, `DiaryStore.init()`);
    const e = run(ctx, `DiaryStore.get('2026-11-07')`);
    check('entry survives reload (legacy roll migrated)', e && e.drills[0].name === 'Knee Cut' && e.rolls[0].subs[0].technique === 'Triangle');
    check('getAll is newest first',
      run(ctx, `DiaryStore.getAll().map(e => e.date).join(',')`) === '2026-11-07,2026-11-03,2026-10-20');
    check('countBetween: this month', run(ctx, `DiaryStore.countBetween('2026-11-01', '2026-11-07')`) === 2);
    const weeks = run(ctx, `DiaryStore.heatmapWeeks('2026-11-07', 26)`);
    check('countBetween: heatmap range',
      run(ctx, `DiaryStore.countBetween('${weeks[0][0]}', '2026-11-07')`) === 3);

    await run(ctx, `(() => {
      const e = DiaryStore.get('2026-11-03');
      return DiaryStore.move('2026-11-03', Object.assign({}, e, { date: '2026-11-04' }));
    })()`);
    check('move re-dates an entry', run(ctx, `!DiaryStore.get('2026-11-03') && !!DiaryStore.get('2026-11-04')`));

    await run(ctx, `DiaryStore.delete('2026-11-07')`);
    ctx = makeContext(backing);
    await run(ctx, `DiaryStore.init()`);
    check('delete persists', run(ctx, `DiaryStore.get('2026-11-07')`) === null && run(ctx, `DiaryStore.count()`) === 2);
  }

  // ══ 4. Review stats ═════════════════════════════════════════
  section('Review stats');
  {
    const ctx = makeContext();
    await run(ctx, `DiaryStore.init()`);
    check('rangeStart 30 days is inclusive of today', run(ctx, `DiaryStore.rangeStart('30', '2026-11-08')`) === '2026-10-10');
    check('rangeStart all is open-ended', run(ctx, `DiaryStore.rangeStart('all', '2026-11-08')`) === null);
    check('minutes ignores blank / invalid',
      run(ctx, `[DiaryStore.minutes({mins:''}), DiaryStore.minutes({mins:null}), DiaryStore.minutes({mins:-5}), DiaryStore.minutes({mins:'12'})].join()`) === '0,0,0,12');

    await run(ctx, `Promise.all([
      DiaryStore.save({ date: '2026-11-01', drills: [
        { id: 'a', name: 'Closed guard', mins: 20 }, { id: 'b', name: ' closed  GUARD ', mins: 10 },
        { id: 'c', name: 'Mount', mins: 10 }, { id: 'd', name: 'Side control' }, { id: 'e', name: '', mins: 99 }],
        rolls: [
          { id: 'r1', outcome: 'sub', technique: 'Armbar' }, { id: 'r2', outcome: 'sub', technique: 'armbar' },
          { id: 'r3', outcome: 'sub', technique: 'RNC' }, { id: 'r4', outcome: 'sub', technique: '' },
          { id: 'r5', outcome: 'subbed', technique: 'Triangle' }, { id: 'r6', outcome: 'none' }, { id: 'r7', outcome: null }] }),
      DiaryStore.save({ date: '2026-09-01', drills: [{ id: 'f', name: 'Mount', mins: 60 }], rolls: [] })
    ])`);

    const s = run(ctx, `DiaryStore.stats('2026-10-10', '2026-11-08')`);
    check('stats counts classes in range only', s.classes === 1, s.classes);
    check('unnamed drills are skipped', s.drills === 4, s.drills);
    check('legacy roll outcomes migrate to sub lines',
      s.rolls === 7 && s.subsHit === 4 && s.subsTapped === 1 && s.noSub === 1,
      JSON.stringify({ rolls: s.rolls, hit: s.subsHit, tap: s.subsTapped, none: s.noSub }));
    check('positions group case/space-insensitively, keep first spelling',
      s.positions[0].name === 'Closed guard' && s.positions[0].count === 2 && s.positions[0].minutes === 30);
    check('top sub hit is Armbar ×2', s.hits[0].name === 'Armbar' && s.hits[0].count === 2 && s.hits.length === 2);
    check('tapped list', s.tapped.length === 1 && s.tapped[0].name === 'Triangle');
    check('drill time uses minutes when logged', s.drillTime.basis === 'minutes' && s.minutes === 40 && s.timedDrills === 3);
    check('drill time % excludes untimed drills',
      s.drillTime.rows.length === 2 && s.drillTime.rows[0].pct === 75 && s.drillTime.rows[1].pct === 25,
      JSON.stringify(s.drillTime.rows));

    const all = run(ctx, `DiaryStore.stats(null, '2026-11-08')`);
    check('all-time includes older classes', all.classes === 2 && all.positions.find(p => p.name === 'Mount').minutes === 70);

    await run(ctx, `DiaryStore.save({ date: '2026-08-01', drills: [{ id: 'g', name: 'Knee cut' }, { id: 'h', name: 'Knee cut' }, { id: 'i', name: 'Guard pull' }], rolls: [] })`);
    const cnt = run(ctx, `DiaryStore.stats('2026-08-01', '2026-08-01')`);
    check('drill time falls back to share of drills without minutes',
      cnt.drillTime.basis === 'count' && Math.round(cnt.drillTime.rows[0].pct) === 67 && cnt.drillTime.rows[0].name === 'Knee cut');
    check('empty range', run(ctx, `DiaryStore.stats('2020-01-01', '2020-01-31').classes`) === 0);
  }

  // ══ 5. Drill techniques, multiple subs, partner belts ═══════
  section('Techniques, multi-sub rolls, belts');
  {
    const ctx = makeContext();
    await run(ctx, `DiaryStore.init()`);

    const legacy = run(ctx, `DiaryStore.normalize({ date: '2026-01-01',
      drills: [{ id: 'd', name: 'Mount' }],
      rolls: [{ id: 'r', partner: 'Sam', outcome: 'subbed', technique: 'Triangle', notes: '' }] })`);
    check('normalize gives old drills an empty technique list', Array.isArray(legacy.drills[0].techniques) && !legacy.drills[0].techniques.length);
    check('normalize turns outcome/technique into one sub line',
      legacy.rolls[0].subs.length === 1 && legacy.rolls[0].subs[0].type === 'subbed' &&
      legacy.rolls[0].subs[0].technique === 'Triangle' && !('outcome' in legacy.rolls[0]) && legacy.rolls[0].belt === null);
    check('legacy "No sub" outcome is kept', run(ctx, `DiaryStore.normalize({ date: 'x', drills: [],
      rolls: [{ id: 'r', outcome: 'none', technique: '' }, { id: 'q', outcome: null }] }).rolls.map(r => r.noSub).join()`) === 'true,false');
    check('normalize is idempotent', run(ctx, `(() => {
      const e = { date: 'x', drills: [], rolls: [{ id: 'r', outcome: 'sub', technique: 'Armbar' }] };
      DiaryStore.normalize(e); DiaryStore.normalize(e); return e.rolls[0].subs.length; })()`) === 1);

    await run(ctx, `DiaryStore.save({ date: '2026-11-09',
      drills: [
        { id: 'a', name: 'Closed guard', mins: 15, techniques: [
          { id: 't1', type: 'sweep', name: 'Scissor sweep' }, { id: 't2', type: 'sub', name: 'Armbar' },
          { id: 't3', type: 'sweep', name: 'scissor  SWEEP' }, { id: 't4', type: 'control', name: '' }] },
        { id: 'b', name: '', techniques: [{ id: 't5', type: 'control', name: 'Mount pressure' }] },
        { id: 'c', name: '', techniques: [{ id: 't6', type: 'sweep', name: '' }] }],
      rolls: [
        { id: 'r1', belt: 'blue', partner: '', notes: '', subs: [
          { id: 's1', type: 'sub', technique: 'Armbar' }, { id: 's2', type: 'sub', technique: 'Kimura' },
          { id: 's3', type: 'subbed', technique: 'Triangle' }] },
        { id: 'r2', belt: 'blue', partner: 'Jo', notes: '', subs: [{ id: 's4', type: 'sub', technique: '' }] },
        { id: 'r3', belt: 'black', partner: '', notes: '', subs: [
          { id: 's5', type: 'subbed', technique: 'Choke' }, { id: 's6', type: 'subbed', technique: 'choke' }] },
        { id: 'r4', belt: null, partner: '', notes: 'flow roll', subs: [], noSub: true },
        { id: 'r5', belt: 'white', partner: '', notes: '', subs: [] }] })`);

    const s = run(ctx, `DiaryStore.stats('2026-11-09', '2026-11-09')`);
    check('drill counts with techniques but no position; empty ones skipped', s.drills === 2, s.drills);
    check('techniques group by type + name',
      s.techniques[0].name === 'Scissor sweep' && s.techniques[0].type === 'sweep' && s.techniques[0].count === 2 &&
      s.techniques.length === 3, JSON.stringify(s.techniques));
    check('same name, different type stays separate',
      s.techniques.some(t => t.type === 'sub' && t.name === 'Armbar'));
    check('a roll can hold several subs both ways; only marked rolls count as no sub',
      s.rolls === 5 && s.subsHit === 3 && s.subsTapped === 3 && s.noSub === 1,
      JSON.stringify({ rolls: s.rolls, hit: s.subsHit, tap: s.subsTapped, none: s.noSub }));
    check('hits and taps rank across lines',
      s.hits.length === 2 && s.tapped[0].name === 'Choke' && s.tapped[0].count === 2);
    check('rolls by belt in belt order, unset last',
      s.byBelt.map(b => b.belt).join() === 'white,blue,black,' &&
      s.byBelt[1].rolls === 2 && s.byBelt[1].hit === 3 && s.byBelt[1].tapped === 1 &&
      s.byBelt[2].tapped === 2 && s.byBelt[3].belt === null, JSON.stringify(s.byBelt));
  }

  // ══ 6. Autocomplete suggestions by kind ════════════════════
  section('Suggestions');
  {
    const ctx = makeContext();
    await run(ctx, `DiaryStore.init()`);
    await run(ctx, `DiaryStore.save({ date: '2026-11-09',
      drills: [{ id: 'a', name: 'Spider Guard', techniques: [
        { id: 't1', type: 'sweep', name: 'Lasso Sweep' }, { id: 't2', type: 'sub', name: 'Spider Triangle' },
        { id: 't3', type: 'control', name: 'Body Triangle' }] }],
      rolls: [{ id: 'r', belt: 'blue', partner: '', notes: '', subs: [{ id: 's', type: 'subbed', technique: 'Choi Bar' }] }] })`);
    const lib = JSON.stringify([
      { type: 'position', label: 'Mount' },
      { type: 'submission', label: 'Armbar' },
      { type: 'submission', label: 'My Secret Choke' },
      { type: 'transition', label: 'Scissor Sweep', category: 'Sweeps' },
      { type: 'transition', label: 'Knee Cut Pass', category: 'Passing' },
      { type: 'transition', label: 'Single Leg Takedown', category: 'Takedowns & standing' },
      { type: 'reaction', label: 'Opponent posts hand' }]);
    const sg = run(ctx, `DiaryStore.suggestions(${lib})`);
    const has = (list, n) => sg[list].includes(n);
    check('subs list has no sweeps, passes, takedowns or positions',
      !has('subs', 'Scissor Sweep') && !has('subs', 'Knee Cut Pass') && !has('subs', 'Single Leg Takedown') &&
      !has('subs', 'Mount') && !has('subs', 'Lasso Sweep') && !has('subs', 'Spider Guard'));
    check('subs list has library, built-in and typed submissions',
      has('subs', 'My Secret Choke') && has('subs', 'Ezekiel Choke') && has('subs', 'Spider Triangle') && has('subs', 'Choi Bar'));
    check('subs list is de-duplicated', sg.subs.filter(n => n.toLowerCase() === 'armbar').length === 1);
    check('sweeps list: library sweeps + typed sweeps only',
      sg.sweeps.join() === 'Lasso Sweep,Scissor Sweep', sg.sweeps.join());
    check('positions list: library positions + drill positions only',
      sg.positions.join() === 'Mount,Spider Guard', sg.positions.join());
    check('controls list: positions + typed controls', has('controls', 'Mount') && has('controls', 'Body Triangle'));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
