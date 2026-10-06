// Runs the generated files through the app's real GameplanStore.importData +
// resolveNode code paths (localStorage fallback mode) to prove imports work.
const fs = require('fs');
const path = require('path');

const APP_DIR = 'C:/Users/ErikWelman/Documents/ClaudeCode/MovementApp';
const OUT_DIR = path.join(APP_DIR, 'gameplan-exports');

// Browser stubs
const lsData = {};
global.localStorage = {
  getItem: k => (k in lsData ? lsData[k] : null),
  setItem: (k, v) => { lsData[k] = String(v); },
  removeItem: k => { delete lsData[k]; }
};
global.window = { indexedDB: undefined }; // force localStorage fallback

const load = f => fs.readFileSync(path.join(APP_DIR, 'src/js', f), 'utf8');
const ctx = load('gameplan-seed-data.js') + '\n' + load('gameplan-data.js') + '\n' + load('gameplan-store.js') +
  '\nreturn { GameplanStore, GameplanData };';
const { GameplanStore } = new Function('window', 'localStorage', ctx)(global.window, global.localStorage);

(async () => {
  await GameplanStore.init(); // auto-seeds the 107 starter moves, like a fresh device

  const list = dir => fs.existsSync(dir)
    ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => path.join(dir, f))
    : [];
  // Full set first, then starters, so the store ends in the starter state
  const files = [...list(path.join(OUT_DIR, 'full')), ...list(OUT_DIR)];
  for (const p of files) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const res = await GameplanStore.importData(data);
    console.log(path.relative(OUT_DIR, p), '-> imported', res.gameplanCount, 'plan(s),', res.libraryCount, 'entries');
  }

  // Resolve every node of every plan the way the canvas renderer does
  const plans = await GameplanStore.getAll();
  let missing = 0, resolved = 0;
  plans.forEach(gp => {
    gp.nodes.forEach(n => {
      const r = GameplanStore.resolveNode(n);
      if (r.missing) { missing++; console.log('MISSING MOVE:', gp.name, n.libraryId); }
      else resolved++;
    });
  });
  console.log('\nPlans in store:', plans.map(p => p.name).join(' | '));
  console.log('Nodes resolved:', resolved, '| missing:', missing);
  if (missing > 0) process.exit(1);
  console.log('OK - all nodes resolve against the library after import');
})().catch(e => { console.error('FAILED:', e); process.exit(1); });
