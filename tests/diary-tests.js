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
    check('entry survives reload', e && e.drills[0].name === 'Knee Cut' && e.rolls[0].technique === 'Triangle');
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
    check('roll outcome totals', s.rolls === 7 && s.subsHit === 4 && s.subsTapped === 1 && s.noSub === 1);
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

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
