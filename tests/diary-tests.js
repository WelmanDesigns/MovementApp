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

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
