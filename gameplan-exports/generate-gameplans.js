// Generates MovementApp gameplan import files for the evidence-based Gi game plan.
// Rev 2 (2026-07-12): adds 6 · Octopus Guard, knee-shield Direction B branch,
// guard-pull landings (Shallow DLR / Octopus), and side control -> knee ride.
// Reuses seed-* library ids so imports don't duplicate the starter library,
// and includes those entries in the file so nothing renders as "(missing move)".

const fs = require('fs');
const path = require('path');

const APP_DIR = 'C:/Users/ErikWelman/Documents/ClaudeCode/MovementApp';
const OUT_DIR = path.join(APP_DIR, 'gameplan-exports');

const NOW = new Date().toISOString();
const note = (text) => ({ text, createdAt: NOW });

// ── Load the seed library so copied entries match the app exactly ──
const seedSrc = fs.readFileSync(path.join(APP_DIR, 'src/js/gameplan-seed-data.js'), 'utf8');
const GAMEPLAN_SEED = new Function(seedSrc + '\nreturn GAMEPLAN_SEED;')();
const seedById = {};
GAMEPLAN_SEED.forEach(e => { seedById[e.id] = e; });

// ── Evidence notes attached to seed entries used in these plans ──
const seedNotes = {
  'seed-headquarters': 'Home base on top. A successful pass was associated with a 99.6% win probability across 1,089 adult black-belt matches. Build the game around getting ONE clean pass. If they pull guard first, enter here immediately and start passing - no separate decision needed.',
  'seed-toreando': 'Opening threat: 89% success rate at blue belt. Its main job is to make them turn, retract legs or expose inside position - not always to finish directly.',
  'seed-knee-cut': 'Central pass: 27.3% of successful elite passes (largest single pass), ~69% success at blue belt. Chain it - at 2022 Worlds 12 were finished vs 9 passers swept when forced. Win the underhook and far-side sleeve before committing.',
  'seed-half-guard-top': 'Settle here when the knee cut is blocked. Win the underhook, crossface and head position FIRST - wedges and shoulder pressure over speed.',
  'seed-half-guard-pass': 'Stabilising option: chest-to-chest pressure passing was the 2nd-largest clearly identified elite pass category. Crossface + underhook, flatten their hips, free the knee, free the foot last.',
  'seed-side-control': 'Stay heavy. They stay flat -> mount. They turn or turtle -> seatbelt -> back control. (Knee ride returns later as an option.)',
  'seed-knee-on-belly': 'Downstream finishing position, not part of your guard identity. From your Knee Ride plan: tricep control -> cross collar; arm behind armpit -> forward armbar; arm in front -> rearward armbar; pants grip -> scoop far arm -> armbar; turns away -> technical mount or back. Baseball/Canto chokes stay available but never outrank position or the armbar.',
  'seed-mount': 'Second scoring layer after the pass. Cross-collar choke and armbar live here.',
  'seed-back-control': 'Most decisive position in Gi BJJ. Back exposure produced 38% of all subs at 2022 black-belt Worlds (43% of male black-belt subs in 2026); every athlete who scored back-control points at 2022 Worlds won. Seatbelt + chest-to-back connection first.',
  'seed-bow-and-arrow': 'Primary finish. Rear chokes had the highest recorded success rate at white/blue belt (~75%). Establish the collar grip before trying to open the neck.',
  'seed-cross-collar': 'Main mount attack.',
  'seed-armbar': 'Second-best submission family (14% of male black-belt subs). From the back: only when they rotate far enough to escape.',
  'seed-turtle-top': 'Do not chase side control when they turtle.',
  'seed-turtle-back-take': 'Seatbelt first, then take the back. Half of the back takes at 2022 Worlds originated while the top player was passing.',
  'seed-single-leg-x': 'Main bottom engine. Leg-control actions created 60.5% of sweeps at 2022 Worlds; X-guard family sweeps succeeded ~63% at lower belts. First objective is to come up on top, not to submit.',
  'seed-seated-guard': 'Start seated, never flat. One sleeve or two-on-one, collar grip where available, shin-to-shin, head close to their hip or ribs.',
  'seed-knee-shield': 'Tier-1 bottom hub vs kneeling/pressure opponents. Direction A (they stay square): protect the crossface, underhook, onto your side, dogfight. Direction B (they hip-switch or turn away): clear the arm, sit up, Octopus Guard. The dilemma: face you and give up the underhook game, or turn away and give up Octopus.',
  'seed-underhook-sweep': 'Old-school: take it when their far leg becomes accessible from the dogfight.',
  'seed-guard-pull': 'Guard pulls established guard 94% of the time at lower belts - but only pull when you land somewhere useful: they stay standing -> Shallow DLR or shin-to-shin; they kneel -> knee shield; they hip-switch immediately -> Octopus.',
  'seed-straight-ankle': 'From SLX only when the finish is clearly available - otherwise take the sweep.',
  'seed-ankle-pick': 'Use when they pull their hips back. Elite takedowns happen in only ~14% of matches, but the scorer won 88% of those.',
  'seed-single-leg': 'Finish route for the collar drag, the SLX technical stand-up and the Octopus wrestle-up.',
  'seed-de-la-riva': 'Keep it SHALLOW - deep DLR demands hip rotation, hamstring tolerance and inversion that do not fit your attributes. Weight forward -> sideways sweep; controlled leg moves back -> stand-up foot sweep; sits back -> lapel sweep; posts a hand after being pulled -> SLX; knee-cuts or drops a hip beside you -> Octopus.'
};
const seedAliases = {
  'seed-de-la-riva': ['Shallow DLR']
};

// ── Custom library entries (ebg- prefix keeps them clear of seeds) ──
const entry = (id, type, label, opts) => {
  opts = opts || {};
  return {
    id: 'ebg-' + id,
    type,
    label,
    notes: opts.note ? [note(opts.note)] : [],
    links: [],
    tags: opts.tags || [],
    aliases: opts.aliases || [],
    variantOf: opts.variantOf || null,
    category: opts.cat || null,
    fromPositionId: opts.from || null,
    toPositionId: opts.to || null
  };
};

const customEntries = [
  // ── Standing / passing / SLX / half guard (rev 1) ──
  entry('foot-sweep', 'transition', 'Foot Sweep', {
    cat: 'Takedowns & standing', tags: ['takedown', 'gi'], aliases: ['De Ashi Barai'],
    from: 'seed-grip-fighting-range',
    note: 'First standing attack. Foot sweeps fit the bent, grip-heavy posture of Gi BJJ. You need one reliable foot sweep, not a broad judo repertoire.'
  }),
  entry('collar-drag', 'transition', 'Collar Drag', {
    cat: 'Takedowns & standing', tags: ['takedown', 'gi'],
    from: 'seed-grip-fighting-range', to: 'seed-single-leg-x',
    note: 'Second standing attack - drag into a single leg.'
  }),
  entry('react-pulls-guard', 'reaction', 'Pulls Guard', {
    cat: 'General reactions', aliases: ['Opponent pulls guard'],
    note: 'Best possible standing outcome for you: accept top and begin passing immediately.'
  }),
  entry('react-no-grips', 'reaction', 'No Useful Grips', {
    cat: 'General reactions', aliases: ['Cannot establish grips'],
    note: 'Do not hand-fight for minutes without a clear route - pull guard on purpose instead.'
  }),
  entry('slide-collar', 'submission', 'Sliding Collar Choke', {
    cat: 'Chokes', tags: ['choke', 'gi'], aliases: ['Slide-In Collar Choke'],
    from: 'seed-back-control',
    note: 'Primary finish alongside the bow-and-arrow. Establish the collar grip before trying to open the neck.'
  }),
  entry('trap-arm-switch', 'transition', 'Trap Arm & Switch Sides', {
    cat: 'Back takes', tags: ['back-take'],
    from: 'seed-back-control', to: 'seed-back-control',
    note: 'When they defend the choking arm: trap an arm, switch sides, re-attack the collar.'
  }),
  entry('react-traps-leg', 'reaction', 'Traps Your Leg', {
    cat: 'Passing defence', aliases: ['Opponent traps leg in half guard'],
    note: 'Do not force the knee cut from broken balance - settle chest-to-chest half guard and win the underhook.'
  }),
  entry('shin-to-shin', 'position', 'Shin-to-Shin', {
    cat: 'Guards', tags: ['bottom'], variantOf: 'seed-seated-guard',
    note: 'Entry hub from seated guard: sleeve or two-on-one, collar grip if available, head close to their hip, immediate entry underneath one leg.'
  }),
  entry('tech-standup-sweep', 'transition', 'Technical Stand-Up Sweep', {
    cat: 'Sweeps', tags: ['sweep'], from: 'seed-single-leg-x',
    note: 'Control the ankle, inside knee glued to their hip, off-balance backward or sideways, come to elbow then hand, stand while keeping the leg. No inversion or flexibility required.'
  }),
  entry('outside-dump', 'transition', 'Outside Dump', {
    cat: 'Sweeps', tags: ['sweep'], from: 'seed-single-leg-x',
    note: 'When they drive forward or peel your feet: redirect their knee across your centreline, extend the outside leg, rotate them to the trapped-leg side, follow up to top immediately.'
  }),
  entry('react-drives-forward', 'reaction', 'Drives Forward', {
    cat: 'General reactions', aliases: ['Opponent drives forward']
  }),
  entry('dogfight', 'position', 'Dogfight', {
    cat: 'Guards', tags: ['bottom'],
    note: 'Reached via the underhook from knee shield (Direction A - they stay square). The key skill is consistently getting the underhook and off your back - the sweeps follow.'
  }),
  entry('knee-tap', 'transition', 'Knee Tap', {
    cat: 'Sweeps', tags: ['sweep'], from: 'ebg-dogfight', to: 'seed-half-guard-top',
    note: 'First dogfight option - when their weight stays over the near knee.'
  }),
  entry('dogfight-back-take', 'transition', 'Dogfight Back Take', {
    cat: 'Back takes', tags: ['back-take'], from: 'ebg-dogfight', to: 'seed-back-control',
    note: 'When they over-whizzer and turn away.'
  }),
  entry('roll-under-sweep', 'transition', 'Roll-Under Sweep', {
    cat: 'Sweeps', tags: ['sweep'], from: 'ebg-dogfight', to: 'seed-half-guard-top',
    note: 'Tier 3 - only once the knee tap, old-school and single leg are already reliable.'
  }),

  // ── Octopus Guard system (rev 2) ──
  entry('octopus', 'position', 'Octopus Guard', {
    cat: 'Guards', tags: ['bottom', 'gi'], aliases: ['Octopus Half Guard'],
    note: 'Tier-1 reaction guard (Telles; Gi-specific system exists). Available when they hip-switch, turn hips away during a knee cut, reach for a crossface, reverse-kesa or sit heavily beside you. Control checklist: keep one leg trapped in half guard, clear the crossface arm past your centreline, SIT UP (not on your shoulder), wrap the far lat/waist/belt, chest attached to their back or rear shoulder, head above their shoulder, posting hand free. Get behind their shoulder line, not just around the waist. Attack order: 1 back take, 2 kosoto hip-bump, 3 wrestle-up, 4 butterfly sweep, 5 recover knee shield (a branch, not a failure).'
  }),
  entry('butterfly-octopus', 'position', 'Butterfly Octopus', {
    cat: 'Guards', tags: ['bottom'], variantOf: 'ebg-octopus',
    note: 'Add only after the back take, kosoto and wrestle-up already work. Inside butterfly hook while staying attached around their waist.'
  }),
  entry('clear-crossface', 'transition', 'Clear Crossface to Octopus', {
    cat: 'Octopus', from: 'seed-knee-shield', to: 'ebg-octopus',
    note: 'They drive the crossface arm across without controlling your hips - or they pass/flatten the knee shield and start settling chest-to-chest: do not concede side control. Keep the leg trapped in half guard, clear the arm past your head, sit up, wrap the far lat or belt.'
  }),
  entry('react-passes-shield', 'reaction', 'Passes Knee Shield', {
    cat: 'Passing defence', aliases: ['Opponent beats the knee shield', 'Shield flattened'],
    note: 'They flatten or clear your knee shield and begin coming chest-to-chest. This is an Octopus entry, not a lost guard - keep the half-guard leg, clear the crossface arm, sit up.'
  }),
  entry('hip-switch-entry', 'transition', 'Hip-Switch Octopus Entry', {
    cat: 'Octopus', from: 'seed-knee-shield', to: 'ebg-octopus',
    note: 'They hip-switch, reverse-kesa or back-step to pass without controlling your upper body: keep the leg trapped, sit up behind their shoulder line.'
  }),
  entry('dlr-to-octopus', 'transition', 'DLR to Octopus', {
    cat: 'Octopus', from: 'seed-de-la-riva', to: 'ebg-octopus',
    note: 'When the passer knee-cuts or drops a hip beside you to kill DLR: release any foot position that stops you sitting up, keep the near leg, clear the near arm across your body, wrap the far waist or belt. The same passing motion that weakens the DLR hook exposes the Octopus connection.'
  }),
  entry('octopus-back-take', 'transition', 'Octopus Back Take', {
    cat: 'Back takes', tags: ['back-take'], from: 'ebg-octopus', to: 'seed-back-control',
    note: 'Priority 1 - when they turn farther away, lift the near arm, pull out of the wrap, or straighten the trapped knee. Climb your chest higher behind their shoulder, control the far hip or belt, bring your bottom knee behind them, chair-sit or drag their hips toward you, seatbelt. Do NOT throw both hooks immediately if it breaks chest-to-back connection.'
  }),
  entry('kosoto-hip-bump', 'transition', 'Kosoto Hip-Bump Sweep', {
    cat: 'Sweeps', tags: ['sweep'], from: 'ebg-octopus', to: 'seed-half-guard-top',
    note: 'Primary reversal - when they stay low, drive backward into you, post the far hand or base toward the trapped leg. Outside foot behind their far ankle or calf, post your free hand, raise your hips, pull their upper body toward the wrapping arm, drive the lower body the opposite way. Land in Half Guard Top -> crossface + underhook -> pressure pass.'
  }),
  entry('octopus-wrestle-up', 'transition', 'Octopus Wrestle-Up', {
    cat: 'Sweeps', tags: ['sweep'], from: 'ebg-octopus', to: 'seed-headquarters',
    note: 'When they pull away, raise hips or start standing: maintain waist/belt control, post the free hand, head higher than theirs, release the leg only when you can stand, come up behind their hips or onto a single leg. Same wrestle-up movement as your SLX stand-up and collar-drag systems - one movement, several guards.'
  }),
  entry('octopus-butterfly-sweep', 'transition', 'Octopus Butterfly Sweep', {
    cat: 'Sweeps', tags: ['sweep'], from: 'ebg-butterfly-octopus', to: 'seed-half-guard-top',
    note: 'Secondary (add after the first three attacks work). When they widen the base to stop the hip bump: insert the inside hook, stay attached at the waist, fall toward the posting side, elevate the far thigh, follow up immediately.'
  }),
  entry('recover-knee-shield', 'transition', 'Recover Knee Shield', {
    cat: 'Octopus', from: 'ebg-octopus', to: 'seed-knee-shield',
    note: 'A branch, not a failure. When they square shoulders back in, win head height, step across your body, break the waist connection or force your shoulders down: do not cling - frame against the shoulder, bring the inside knee back across, rebuild the underhook or wait for the next hip switch. The height battle (head above their shoulder) is what keeps Octopus alive.'
  }),
  entry('react-hip-switch', 'reaction', 'Hip Switches', {
    cat: 'General reactions', aliases: ['Opponent hip-switches', 'Reverse kesa']
  }),
  entry('react-crossface', 'reaction', 'Attempts Crossface', {
    cat: 'General reactions', aliases: ['Opponent reaches for crossface']
  }),
  entry('react-stays-low', 'reaction', 'Stays Low', {
    cat: 'General reactions', aliases: ['Opponent stays low', 'Drives backward into you']
  }),
  entry('react-pulls-away', 'reaction', 'Pulls Away', {
    cat: 'General reactions', aliases: ['Opponent pulls away', 'Disengages']
  }),
  entry('react-raises-hips', 'reaction', 'Raises Hips', {
    cat: 'General reactions', aliases: ['Opponent raises hips']
  }),
  entry('react-squares-back', 'reaction', 'Squares Back In', {
    cat: 'General reactions', aliases: ['Opponent squares shoulders back']
  }),
  entry('react-steps-over', 'reaction', 'Steps Over', {
    cat: 'General reactions', aliases: ['Opponent steps across your body']
  }),
  entry('react-widens-base', 'reaction', 'Widens Base', {
    cat: 'General reactions', aliases: ['Opponent widens base']
  })
];
const customById = {};
customEntries.forEach(e => { customById[e.id] = e; });

// Deep-copy a seed entry and attach its evidence note/aliases
function seedCopy(id) {
  const src = seedById[id];
  if (!src) throw new Error('Unknown seed id: ' + id);
  const copy = JSON.parse(JSON.stringify(src));
  if (seedNotes[id]) copy.notes = [note(seedNotes[id])];
  if (seedAliases[id]) copy.aliases = [...new Set([...copy.aliases, ...seedAliases[id]])];
  return copy;
}

function resolveEntry(id) {
  if (id.startsWith('seed-')) return seedCopy(id);
  if (customById[id]) return customById[id];
  throw new Error('Unknown library id: ' + id);
}

// ── Plan builder ──
// nodes: [key, libraryId, x, y]; connections: [fromKey, toKey, label]
function buildPlan(id, name, nodeSpecs, connSpecs) {
  const keyToNodeId = {};
  const nodes = nodeSpecs.map((s, i) => {
    const nodeId = id + '-n' + (i + 1);
    if (keyToNodeId[s[0]]) throw new Error(id + ': duplicate node key ' + s[0]);
    keyToNodeId[s[0]] = nodeId;
    return { id: nodeId, libraryId: s[1], x: s[2], y: s[3] };
  });
  const connections = connSpecs.map((c, i) => {
    if (!keyToNodeId[c[0]] || !keyToNodeId[c[1]]) throw new Error(id + ': bad connection ' + c[0] + '->' + c[1]);
    return { id: id + '-c' + (i + 1), fromNodeId: keyToNodeId[c[0]], toNodeId: keyToNodeId[c[1]], label: c[2] || '' };
  });
  return {
    id, name, createdAt: NOW, updatedAt: NOW,
    viewport: { x: 10, y: 10, zoom: 0.7 },
    nodes, connections
  };
}

// ═══════════════ FULL PLANS (written to full/ subfolder) ═══════════════

// ── Full 1: Standing ──
const full1 = buildPlan('ebg-plan-standing', '1 · Standing Game (Full)', [
  ['standing', 'seed-standing', 280, 80],
  ['grips', 'seed-grip-fighting-range', 280, 210],
  ['noGrips', 'ebg-react-no-grips', 70, 210],
  ['guardPull', 'seed-guard-pull', 70, 340],
  ['seated', 'seed-seated-guard', 60, 470],
  ['dlr', 'seed-de-la-riva', 60, 610],
  ['kneeShield', 'seed-knee-shield', 150, 600],
  ['octopus', 'ebg-octopus', 240, 710],
  ['footSweep', 'ebg-foot-sweep', 180, 340],
  ['collarDrag', 'ebg-collar-drag', 320, 340],
  ['anklePick', 'seed-ankle-pick', 450, 340],
  ['singleLeg', 'seed-single-leg', 320, 470],
  ['pullsGuard', 'ebg-react-pulls-guard', 480, 470],
  ['hq', 'seed-headquarters', 320, 600]
], [
  ['standing', 'grips', 'collar + sleeve'],
  ['grips', 'footSweep', 'attack 1'],
  ['grips', 'collarDrag', 'attack 2'],
  ['grips', 'anklePick', 'hips pull back'],
  ['collarDrag', 'singleLeg', 'drag to the leg'],
  ['footSweep', 'hq', 'stay on top'],
  ['singleLeg', 'hq', ''],
  ['anklePick', 'hq', ''],
  ['grips', 'pullsGuard', ''],
  ['pullsGuard', 'hq', 'accept top'],
  ['grips', 'noGrips', 'no clear route'],
  ['noGrips', 'guardPull', 'pull with purpose'],
  ['guardPull', 'seated', 'vs standing · shin-to-shin'],
  ['seated', 'dlr', 'they stay square'],
  ['guardPull', 'kneeShield', 'vs kneeling'],
  ['kneeShield', 'octopus', 'they hip-switch']
]);

// ── Full 4: Pressure passing ──
const full4 = buildPlan('ebg-plan-passing', '4 · Pressure Passing (Full)', [
  ['hq', 'seed-headquarters', 260, 80],
  ['toreando', 'seed-toreando', 260, 210],
  ['turnsIn', 'seed-react-turns-in', 260, 340],
  ['kneeCut', 'seed-knee-cut', 260, 470],
  ['trapsLeg', 'ebg-react-traps-leg', 110, 560],
  ['halfTop', 'seed-half-guard-top', 110, 690],
  ['halfPass', 'seed-half-guard-pass', 110, 820],
  ['side', 'seed-side-control', 280, 820],
  ['kob', 'seed-knee-on-belly', 150, 950],
  ['mount', 'seed-mount', 280, 950],
  ['turtles', 'seed-react-turtles', 430, 470],
  ['turtleTop', 'seed-turtle-top', 430, 600],
  ['backTake', 'seed-turtle-back-take', 430, 730],
  ['back', 'seed-back-control', 430, 860]
], [
  ['hq', 'toreando', 'threaten first'],
  ['toreando', 'turnsIn', 'turns / knee inside'],
  ['turnsIn', 'kneeCut', ''],
  ['kneeCut', 'side', 'underhook + far sleeve'],
  ['kneeCut', 'trapsLeg', 'leg trapped'],
  ['trapsLeg', 'halfTop', 'crossface + underhook'],
  ['halfTop', 'halfPass', 'flatten hips'],
  ['halfPass', 'side', 'knee free, foot last'],
  ['side', 'mount', 'they stay flat'],
  ['side', 'kob', 'or knee ride'],
  ['kneeCut', 'turtles', 'turtles mid-pass'],
  ['turtles', 'turtleTop', ''],
  ['turtleTop', 'backTake', 'seatbelt first'],
  ['backTake', 'back', 'not side control']
]);

// ── Full 5: Back & mount finishing ──
const full5 = buildPlan('ebg-plan-finishing', '5 · Back & Mount Finishing (Full)', [
  ['back', 'seed-back-control', 280, 80],
  ['bowArrow', 'seed-bow-and-arrow', 120, 210],
  ['slide', 'ebg-slide-collar', 440, 210],
  ['defends', 'seed-react-peels-grip', 260, 340],
  ['trapSwitch', 'ebg-trap-arm-switch', 430, 470],
  ['armbar', 'seed-armbar', 100, 470],
  ['mount', 'seed-mount', 100, 620],
  ['crossCollar', 'seed-cross-collar', 240, 620],
  ['turnsAway', 'seed-react-turns-away', 100, 750],
  ['techMount', 'seed-technical-mount', 240, 750],
  ['tmBackTake', 'seed-tech-mount-back-take', 380, 750]
], [
  ['back', 'bowArrow', 'collar grip first'],
  ['back', 'slide', 'alt collar finish'],
  ['bowArrow', 'defends', 'defends choking arm'],
  ['slide', 'defends', ''],
  ['defends', 'trapSwitch', ''],
  ['trapSwitch', 'back', 're-attack collar'],
  ['back', 'armbar', 'they rotate out'],
  ['mount', 'armbar', 'arm exposed'],
  ['mount', 'crossCollar', 'main attack'],
  ['mount', 'turnsAway', ''],
  ['turnsAway', 'techMount', ''],
  ['techMount', 'tmBackTake', ''],
  ['tmBackTake', 'back', 'back again']
]);

// ── Full 2: Seated guard → SLX ──
const full2 = buildPlan('ebg-plan-slx', '2 · Seated Guard to SLX (Full)', [
  ['seated', 'seed-seated-guard', 260, 80],
  ['shin', 'ebg-shin-to-shin', 260, 210],
  ['slx', 'seed-single-leg-x', 260, 340],
  ['ankle', 'seed-straight-ankle', 440, 240],
  ['standup', 'ebg-tech-standup-sweep', 160, 470],
  ['singleLeg', 'seed-single-leg', 160, 600],
  ['drives', 'ebg-react-drives-forward', 400, 470],
  ['dump', 'ebg-outside-dump', 400, 600],
  ['hq', 'seed-headquarters', 280, 720]
], [
  ['seated', 'shin', 'sleeve + collar, head close'],
  ['shin', 'slx', 'enter under the leg'],
  ['slx', 'ankle', 'only if clearly there'],
  ['slx', 'standup', 'off-balance them'],
  ['standup', 'singleLeg', 'stand with the leg'],
  ['slx', 'drives', ''],
  ['drives', 'dump', 'redirect the knee'],
  ['singleLeg', 'hq', 'come up on top'],
  ['dump', 'hq', 'follow them up']
]);

// ── Full 3: Half guard & Octopus (merged) ──
// Direction A (dogfight system) on the left, full Octopus system on the right,
// sharing the knee shield hub at the top.
const full3 = buildPlan('ebg-plan-half-guard', '3 · Half Guard & Octopus (Full)', [
  // Shared hub
  ['kneeShield', 'seed-knee-shield', 500, 80],
  // Direction A: they stay square → underhook → dogfight
  ['dogfight', 'ebg-dogfight', 200, 240],
  ['rollUnder', 'ebg-roll-under-sweep', 60, 240],
  ['kneeTap', 'ebg-knee-tap', 60, 380],
  ['oldSchool', 'seed-underhook-sweep', 200, 380],
  ['stands', 'seed-react-stands-up', 310, 320],
  ['singleLegA', 'seed-single-leg', 310, 450],
  ['turnsAwayA', 'seed-react-turns-away', 90, 520],
  ['dfBackTake', 'ebg-dogfight-back-take', 90, 650],
  ['backA', 'seed-back-control', 90, 780],
  ['halfTopA', 'seed-half-guard-top', 250, 560],
  ['hqA', 'seed-headquarters', 330, 620],
  // Direction B entries: they turn away → Octopus
  ['dlr', 'seed-de-la-riva', 960, 80],
  ['rCrossface', 'ebg-react-crossface', 410, 200],
  ['rHipSwitch', 'ebg-react-hip-switch', 590, 200],
  ['rPassesShield', 'ebg-react-passes-shield', 740, 200],
  ['clearCF', 'ebg-clear-crossface', 410, 320],
  ['hsEntry', 'ebg-hip-switch-entry', 590, 320],
  ['dlrOct', 'ebg-dlr-to-octopus', 960, 320],
  // Octopus hub
  ['octopus', 'ebg-octopus', 730, 450],
  // Reaction gates
  ['rSquares', 'ebg-react-squares-back', 430, 620],
  ['rTurnsAwayB', 'seed-react-turns-away', 580, 620],
  ['rStaysLow', 'ebg-react-stays-low', 730, 620],
  ['rWidens', 'ebg-react-widens-base', 880, 620],
  ['rPullsAway', 'ebg-react-pulls-away', 1030, 620],
  // Secondary cues
  ['rStepsOver', 'ebg-react-steps-over', 505, 690],
  ['rPostsHand', 'seed-react-posts-hand', 805, 690],
  ['rRaisesHips', 'ebg-react-raises-hips', 1105, 690],
  // Octopus attacks
  ['recover', 'ebg-recover-knee-shield', 430, 760],
  ['backTakeB', 'ebg-octopus-back-take', 580, 760],
  ['kosoto', 'ebg-kosoto-hip-bump', 730, 760],
  ['bflyOct', 'ebg-butterfly-octopus', 880, 760],
  ['wrestleUp', 'ebg-octopus-wrestle-up', 1030, 760],
  // Octopus outcomes
  ['kneeShield2', 'seed-knee-shield', 430, 900],
  ['backB', 'seed-back-control', 580, 900],
  ['halfTopB', 'seed-half-guard-top', 730, 900],
  ['bflySweep', 'ebg-octopus-butterfly-sweep', 880, 880],
  ['singleLegB', 'seed-single-leg', 1030, 900],
  ['hqB', 'seed-headquarters', 910, 1010]
], [
  // Direction A
  ['kneeShield', 'dogfight', 'A: square → underhook'],
  ['dogfight', 'kneeTap', 'weight on near knee'],
  ['dogfight', 'oldSchool', 'far leg reachable'],
  ['dogfight', 'stands', ''],
  ['stands', 'singleLegA', ''],
  ['dogfight', 'turnsAwayA', 'over-whizzers'],
  ['turnsAwayA', 'dfBackTake', ''],
  ['dfBackTake', 'backA', ''],
  ['dogfight', 'rollUnder', 'last resort'],
  ['kneeTap', 'halfTopA', ''],
  ['oldSchool', 'halfTopA', ''],
  ['rollUnder', 'halfTopA', ''],
  ['singleLegA', 'hqA', 'on top'],
  ['halfTopA', 'hqA', 'pressure pass'],
  // Direction B entries
  ['kneeShield', 'rCrossface', 'B: drives arm across'],
  ['kneeShield', 'rHipSwitch', 'B: hip-switch / kesa'],
  ['kneeShield', 'rPassesShield', 'B: flattens the shield'],
  ['rCrossface', 'clearCF', 'clear past your head'],
  ['rPassesShield', 'clearCF', 'keep the half-guard leg'],
  ['rHipSwitch', 'hsEntry', 'sit up'],
  ['clearCF', 'octopus', ''],
  ['hsEntry', 'octopus', ''],
  ['dlr', 'dlrOct', 'knee cut / hip drops beside you'],
  ['dlrOct', 'octopus', 'wrap far waist or belt'],
  // Octopus attacks
  ['octopus', 'rTurnsAwayB', '1: turns farther'],
  ['rTurnsAwayB', 'backTakeB', 'chest high, chair-sit'],
  ['backTakeB', 'backB', 'seatbelt before hooks'],
  ['octopus', 'rStaysLow', '2: stays low'],
  ['rStaysLow', 'kosoto', ''],
  ['rPostsHand', 'kosoto', 'same cue'],
  ['kosoto', 'halfTopB', 'come up on top'],
  ['octopus', 'rPullsAway', '3: pulls away'],
  ['rPullsAway', 'wrestleUp', ''],
  ['rRaisesHips', 'wrestleUp', 'same cue'],
  ['wrestleUp', 'singleLegB', 'or behind their hips'],
  ['singleLegB', 'hqB', 'finish takedown'],
  ['octopus', 'rWidens', '4: widens base'],
  ['rWidens', 'bflyOct', 'inside hook, stay attached'],
  ['bflyOct', 'bflySweep', ''],
  ['bflySweep', 'halfTopB', 'follow up immediately'],
  ['octopus', 'rSquares', "5: don't cling"],
  ['rSquares', 'recover', ''],
  ['rStepsOver', 'recover', 'same cue'],
  ['recover', 'kneeShield2', 'rebuild underhook']
]);

const fullPlans = [full1, full2, full3, full4, full5];

// ═══════════════ STARTER PLANS (shipped at top level) ═══════════════
// Same ids as the full plans so importing one set overwrites the other -
// they act as a toggle. Reactions are edge labels, not nodes.

// ── Starter 1: Standing ──
const starter1 = buildPlan('ebg-plan-standing', '1 · Standing Game', [
  ['standing', 'seed-standing', 200, 80],
  ['grips', 'seed-grip-fighting-range', 200, 210],
  ['collarDrag', 'ebg-collar-drag', 100, 340],
  ['singleLeg', 'seed-single-leg', 100, 470],
  ['hq', 'seed-headquarters', 100, 600],
  ['guardPull', 'seed-guard-pull', 320, 340],
  ['seated', 'seed-seated-guard', 320, 470]
], [
  ['standing', 'grips', 'collar + sleeve'],
  ['grips', 'collarDrag', 'clear attacking angle'],
  ['collarDrag', 'singleLeg', 'drag to the leg'],
  ['singleLeg', 'hq', 'stay on top'],
  ['grips', 'guardPull', 'no clean attack'],
  ['guardPull', 'seated', 'land seated']
]);

// ── Starter 2: Seated guard → SLX ──
const starter2 = buildPlan('ebg-plan-slx', '2 · Seated Guard to SLX', [
  ['seated', 'seed-seated-guard', 200, 80],
  ['shin', 'ebg-shin-to-shin', 200, 210],
  ['slx', 'seed-single-leg-x', 200, 340],
  ['standup', 'ebg-tech-standup-sweep', 100, 470],
  ['singleLeg', 'seed-single-leg', 100, 600],
  ['dump', 'ebg-outside-dump', 320, 470],
  ['hq', 'seed-headquarters', 200, 730]
], [
  ['seated', 'shin', 'sleeve + collar, head close'],
  ['shin', 'slx', 'enter under the leg'],
  ['slx', 'standup', 'weight moves back'],
  ['standup', 'singleLeg', 'stand with the leg'],
  ['singleLeg', 'hq', 'come up on top'],
  ['slx', 'dump', 'drives forward'],
  ['dump', 'hq', 'follow them up']
]);

// ── Starter 3: Half guard & Octopus ──
const starter3 = buildPlan('ebg-plan-half-guard', '3 · Half Guard & Octopus', [
  ['kneeShield', 'seed-knee-shield', 260, 80],
  ['dogfight', 'ebg-dogfight', 120, 220],
  ['octopus', 'ebg-octopus', 420, 220],
  ['kneeTap', 'ebg-knee-tap', 60, 360],
  ['dfBackTake', 'ebg-dogfight-back-take', 190, 360],
  ['octBackTake', 'ebg-octopus-back-take', 350, 360],
  ['kosoto', 'ebg-kosoto-hip-bump', 480, 360],
  ['halfTop', 'seed-half-guard-top', 150, 520],
  ['back', 'seed-back-control', 350, 520],
  ['halfPass', 'seed-half-guard-pass', 150, 650],
  ['side', 'seed-side-control', 150, 780]
], [
  ['kneeShield', 'dogfight', 'square → underhook'],
  ['kneeShield', 'octopus', 'turns away → clear arm, sit up'],
  ['dogfight', 'kneeTap', 'weight on near knee'],
  ['kneeTap', 'halfTop', ''],
  ['dogfight', 'dfBackTake', 'whizzer, turns away'],
  ['dfBackTake', 'back', 'seatbelt first'],
  ['octopus', 'octBackTake', 'turns farther away'],
  ['octBackTake', 'back', 'chest high, chair-sit'],
  ['octopus', 'kosoto', 'stays low + heavy'],
  ['kosoto', 'halfTop', 'come up on top'],
  ['halfTop', 'halfPass', 'crossface + underhook'],
  ['halfPass', 'side', 'knee free, foot last']
]);

// ── Starter 4: Pressure passing ──
const starter4 = buildPlan('ebg-plan-passing', '4 · Pressure Passing', [
  ['hq', 'seed-headquarters', 200, 80],
  ['toreando', 'seed-toreando', 200, 210],
  ['kneeCut', 'seed-knee-cut', 200, 340],
  ['halfTop', 'seed-half-guard-top', 360, 440],
  ['halfPass', 'seed-half-guard-pass', 360, 570],
  ['side', 'seed-side-control', 160, 640],
  ['mount', 'seed-mount', 60, 770],
  ['back', 'seed-back-control', 280, 770]
], [
  ['hq', 'toreando', 'threaten first'],
  ['toreando', 'kneeCut', 'retracts / turns in'],
  ['kneeCut', 'side', 'your leg frees'],
  ['kneeCut', 'halfTop', 'they trap your leg'],
  ['halfTop', 'halfPass', 'crossface + underhook'],
  ['halfPass', 'side', 'knee free, foot last'],
  ['side', 'mount', 'stays flat'],
  ['side', 'back', 'turns or turtles → seatbelt']
]);

// ── Starter 5: Back & mount finishing ──
const starter5 = buildPlan('ebg-plan-finishing', '5 · Back & Mount Finishing', [
  ['back', 'seed-back-control', 200, 80],
  ['bowArrow', 'seed-bow-and-arrow', 110, 220],
  ['trapSwitch', 'ebg-trap-arm-switch', 320, 220],
  ['mount', 'seed-mount', 200, 380],
  ['crossCollar', 'seed-cross-collar', 100, 510],
  ['techMount', 'seed-technical-mount', 320, 510]
], [
  ['back', 'bowArrow', 'collar available'],
  ['back', 'trapSwitch', 'controls choking arm'],
  ['trapSwitch', 'bowArrow', 're-attack the collar'],
  ['mount', 'crossCollar', 'stays flat'],
  ['mount', 'techMount', 'turns away'],
  ['techMount', 'back', 'take the back']
]);

const starterPlans = [starter1, starter2, starter3, starter4, starter5];

// ── Assemble export files ──
function libraryFor(planList) {
  const ids = new Set();
  planList.forEach(p => p.nodes.forEach(n => ids.add(n.libraryId)));
  return [...ids].map(resolveEntry);
}

function exportFile(planList, library) {
  return {
    app: 'MovementApp',
    version: 1,
    exportedAt: NOW,
    library: library || libraryFor(planList),
    gameplans: planList
  };
}

// The ALL files always carry the complete library (every custom entry plus
// every seed any plan has ever referenced) so hidden techniques stay in the
// app's library even when they are not placed on a starter chart.
const masterLibrary = libraryFor([...fullPlans, ...starterPlans]);

// ── Validate against the app's import rules ──
function validate(data, fileName) {
  if (!Array.isArray(data.library) || !Array.isArray(data.gameplans)) throw new Error(fileName + ': bad top level');
  const libIds = new Set(data.library.map(e => e.id));
  data.library.forEach(e => {
    if (!e.id || !e.type || e.label === undefined) throw new Error(fileName + ': invalid entry ' + JSON.stringify(e));
  });
  data.gameplans.forEach(gp => {
    if (!gp.id || !Array.isArray(gp.nodes) || !Array.isArray(gp.connections)) throw new Error(fileName + ': invalid gameplan ' + gp.id);
    const nodeIds = new Set(gp.nodes.map(n => n.id));
    gp.nodes.forEach(n => {
      if (!libIds.has(n.libraryId)) throw new Error(fileName + ': ' + gp.id + ' references missing library id ' + n.libraryId);
    });
    gp.connections.forEach(c => {
      if (!nodeIds.has(c.fromNodeId) || !nodeIds.has(c.toNodeId)) throw new Error(fileName + ': ' + gp.id + ' has dangling connection ' + c.id);
    });
    // Overlap check: node centres must be at least 90px apart
    for (let i = 0; i < gp.nodes.length; i++) {
      for (let j = i + 1; j < gp.nodes.length; j++) {
        const a = gp.nodes[i], b = gp.nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 90) throw new Error(fileName + ': ' + gp.id + ' nodes too close: ' + a.id + ' / ' + b.id + ' (' + Math.round(d) + 'px)');
      }
    }
  });
}

const FULL_DIR = path.join(OUT_DIR, 'full');
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(FULL_DIR, { recursive: true });

// Remove outputs from earlier revisions that no longer exist
[
  'evidence-gameplan-5-knee-shield-half-guard.json',
  'evidence-gameplan-6-octopus-guard.json',
  'evidence-gameplan-2-pressure-passing.json',
  'evidence-gameplan-3-back-mount-finishing.json',
  'evidence-gameplan-4-seated-guard-slx.json',
  'evidence-gameplan-5-half-guard-octopus.json'
].forEach(f => {
  const p = path.join(OUT_DIR, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

const files = [
  // Starter set (top level) — what Erik imports now
  [OUT_DIR, 'evidence-gameplan-ALL.json', exportFile(starterPlans, masterLibrary)],
  [OUT_DIR, 'evidence-gameplan-1-standing.json', exportFile([starter1])],
  [OUT_DIR, 'evidence-gameplan-2-seated-guard-slx.json', exportFile([starter2])],
  [OUT_DIR, 'evidence-gameplan-3-half-guard-octopus.json', exportFile([starter3])],
  [OUT_DIR, 'evidence-gameplan-4-pressure-passing.json', exportFile([starter4])],
  [OUT_DIR, 'evidence-gameplan-5-back-mount-finishing.json', exportFile([starter5])],
  // Full set (full/ subfolder) — re-import later to swap the big charts back in
  [FULL_DIR, 'full-gameplan-ALL.json', exportFile(fullPlans, masterLibrary)],
  [FULL_DIR, 'full-gameplan-1-standing.json', exportFile([full1])],
  [FULL_DIR, 'full-gameplan-2-seated-guard-slx.json', exportFile([full2])],
  [FULL_DIR, 'full-gameplan-3-half-guard-octopus.json', exportFile([full3])],
  [FULL_DIR, 'full-gameplan-4-pressure-passing.json', exportFile([full4])],
  [FULL_DIR, 'full-gameplan-5-back-mount-finishing.json', exportFile([full5])]
];

files.forEach(([dir, name, data]) => {
  validate(data, name);
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
  console.log('Wrote', path.relative(OUT_DIR, path.join(dir, name)), '-', data.gameplans.length, 'plan(s),', data.library.length, 'library entries');
});
console.log('Done ->', OUT_DIR);
