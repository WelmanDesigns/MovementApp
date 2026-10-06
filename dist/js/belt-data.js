// Belt Tracker — curriculum templates (data + assembly only, no UI logic).
//
// Two template sources are merged here:
//   1. Hand-authored stages below (White Stripe 1–4, Blue Belt Exam) plus
//      per-stage extras/overrides for spreadsheet stages.
//   2. BELT_SEED (belt-seed-generated.js) — generated from the curriculum
//      spreadsheet by import-belt-curriculum.py (Blue Stripe 1–4, Purple Exam).
//
// Requirement modes:
//   exact_named_list — White Belt style: the named techniques ARE the curriculum
//   target_count     — pick-your-own: N moves required in My list
//   informational    — checklist items that never count toward requirements

const BELT_STATUSES = [
  { id: 'not_started', label: 'Not started', short: '—' },
  { id: 'learning',    label: 'Learning',    short: 'L' },
  { id: 'drilling',    label: 'Drilling',    short: 'D' },
  { id: 'reliable',    label: 'Reliable',    short: 'R' },
  { id: 'exam_ready',  label: 'Exam ready',  short: '★' }
];

// Statuses that count as "ready" for exact lists and review requirements
const BELT_READY_STATUSES = ['reliable', 'exam_ready'];

const BeltData = {

  templateVersion: 1,

  // ── Stage metadata, in progression order ─────────────────────
  STAGES: [
    { id: 'white-s1', belt: 'white', stageType: 'stripe', stripeNumber: 1, order: 1,
      title: 'White Belt – Stripe 1', minimumClasses: 24,
      printedExamPositionCount: 32 },
    { id: 'white-s2', belt: 'white', stageType: 'stripe', stripeNumber: 2, order: 2,
      title: 'White Belt – Stripe 2', minimumClasses: 48,
      minimumClassesContext: 'after Stripe 1', printedExamPositionCount: 39 },
    { id: 'white-s3', belt: 'white', stageType: 'stripe', stripeNumber: 3, order: 3,
      title: 'White Belt – Stripe 3', minimumClasses: 48,
      minimumClassesContext: 'after Stripe 2', printedExamPositionCount: 47 },
    { id: 'white-s4', belt: 'white', stageType: 'stripe', stripeNumber: 4, order: 4,
      title: 'White Belt – Stripe 4', minimumClasses: 48,
      minimumClassesContext: 'after Stripe 3', printedExamPositionCount: 59 },
    { id: 'blue-exam', belt: 'blue', stageType: 'promotion_exam', order: 5,
      title: 'Blue Belt Exam', minimumClasses: 210, printedExamPositionCount: 100 },
    { id: 'blue-s1', belt: 'blue', stageType: 'stripe', stripeNumber: 1, order: 6,
      title: 'Blue Belt – Stripe 1', minimumClasses: 72,
      minimumClassesContext: 'after belt promotion', printedExamPositionCount: 52 },
    { id: 'blue-s2', belt: 'blue', stageType: 'stripe', stripeNumber: 2, order: 7,
      title: 'Blue Belt – Stripe 2' },
    { id: 'blue-s3', belt: 'blue', stageType: 'stripe', stripeNumber: 3, order: 8,
      title: 'Blue Belt – Stripe 3' },
    { id: 'blue-s4', belt: 'blue', stageType: 'stripe', stripeNumber: 4, order: 9,
      title: 'Blue Belt – Stripe 4' },
    { id: 'purple-exam', belt: 'purple', stageType: 'promotion_exam', order: 10,
      title: 'Purple Belt Exam' }
  ],

  // Friendlier display names for a few generated groups
  GROUP_NAME_OVERRIDES: {
    'takedowns--judo': 'Judo Takedowns'
  },

  // ── Hand-authored curricula ──────────────────────────────────
  // Groups: { id, name, mode, moves: [names], suggestSeed: [matchers], suggestRefs: [{stageId,groupId}] }
  // Section keys/orders follow the canonical section list.

  HAND_STAGES: {

    'white-s1': {
      sections: [
        { key: 'warm-up', name: 'Warm Up', order: 0, groups: [
          { id: 'warm-up--all', name: null, mode: 'exact_named_list',
            moves: ['Basic Hip Escape', 'Front Hip Escape', 'Side Roll', 'Back Roll', 'Front Roll',
                    'Side Fall', 'Technical Stand Up', 'S-Mount Walk', 'Samurai Walk'] }
        ]},
        { key: 'guard-pass', name: 'Guard Pass', order: 5, groups: [
          { id: 'guard-pass--full-guard', name: 'Full Guard', mode: 'exact_named_list',
            moves: ['Double Lapel Sleeve', 'Belt Control'],
            suggestSeed: [{ type: 'Guard pass', position: 'Full' }] }
        ]},
        { key: 'sweeps', name: 'Sweeps', order: 6, groups: [
          { id: 'sweeps--full-guard', name: 'Full Guard', mode: 'exact_named_list',
            moves: ['Sit Up', 'Scissor', 'See Saw'],
            suggestSeed: [{ type: 'Sweeps', position: 'Full' }] }
        ]},
        { key: 'defence', name: 'Defence & Escapes', order: 8, groups: [
          { id: 'defence--esc-mount', name: 'Mount Escapes', mode: 'exact_named_list',
            moves: ['Bridge & Roll', 'Hip Escape to Full Guard'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Mount' }] }
        ]},
        { key: 'submissions', name: 'Submissions', order: 7, groups: [
          { id: 'submissions--full-guard', name: 'Full Guard', mode: 'exact_named_list',
            moves: ['Lapel Choke', 'Kimura', 'Triangle', 'Armlock', 'Omoplata'],
            suggestSeed: [{ type: 'Submissions', position: 'Full' }] },
          { id: 'submissions--mount', name: 'Mount', mode: 'exact_named_list',
            moves: ['Lapel Choke', 'Ezekiel', 'Armbar', 'Americana'],
            suggestSeed: [{ type: 'Submissions', position: 'Mount' }] }
        ]}
      ]
    },

    'white-s2': {
      sections: [
        { key: 'control', name: 'Control', order: 2, groups: [
          { id: 'control--back', name: 'Back', mode: 'exact_named_list',
            moves: ['Seat Belt', 'Back Pack'] },
          { id: 'control--side-control', name: 'Side Control', mode: 'exact_named_list',
            moves: ['Shoulder Pressure', 'Sphinx'] },
          { id: 'control--knee-ride', name: 'Knee Ride', mode: 'exact_named_list',
            moves: ['Sleeve & Lapel with Foot Hook on Hip'] }
        ]},
        { key: 'guard-pass', name: 'Guard Pass', order: 5, groups: [
          { id: 'guard-pass--open-guard', name: 'Open Guard', mode: 'exact_named_list',
            moves: ['Toreada', 'Buchecha', 'Double Under'],
            suggestSeed: [{ type: 'Guard pass', position: 'Open' }] }
        ]},
        { key: 'sweeps', name: 'Sweeps', order: 6, groups: [
          { id: 'sweeps--open-guard', name: 'Open Guard', mode: 'exact_named_list',
            moves: ['From Pulling'],
            suggestSeed: [{ type: 'Sweeps', position: 'Open' }] }
        ]},
        { key: 'defence', name: 'Defence & Escapes', order: 8, groups: [
          { id: 'defence--esc-back', name: 'Back Escapes', mode: 'exact_named_list',
            moves: ['Classic', 'Slide Out'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Back' }] },
          { id: 'defence--esc-side-control', name: 'Side Control Escapes', mode: 'exact_named_list',
            moves: ['Flip', 'Hip Escape to Guard'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Side Control' }] },
          { id: 'defence--esc-knee-ride', name: 'Knee Ride Escapes', mode: 'exact_named_list',
            moves: ['Push Knee', 'Grip Under Foot'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Knee ride' }] }
        ]},
        { key: 'submissions', name: 'Submissions', order: 7, groups: [
          { id: 'submissions--back', name: 'Back', mode: 'exact_named_list',
            moves: ['Lapel Choke', 'Rear Naked Choke', 'Karate Choke', 'Bow & Arrow Choke'],
            suggestSeed: [{ type: 'Submissions', position: 'Back' }] },
          { id: 'submissions--side-control', name: 'Side Control', mode: 'exact_named_list',
            moves: ['Americana', 'Lazy Choke'],
            suggestSeed: [{ type: 'Submissions', position: 'Side Control' }] },
          { id: 'submissions--knee-ride', name: 'Knee Ride', mode: 'exact_named_list',
            moves: ['Armbar', 'Lapel Choke'] }
        ]}
      ],
      reviewRequirements: [
        { id: 'rev-s2-fg-sweeps', label: 'Full Guard: 3 sweeps', stageId: 'white-s1', groupId: 'sweeps--full-guard', count: 3 },
        { id: 'rev-s2-fg-passes', label: 'Full Guard: 2 guard passes', stageId: 'white-s1', groupId: 'guard-pass--full-guard', count: 2 },
        { id: 'rev-s2-fg-subs', label: 'Full Guard: 5 submissions', stageId: 'white-s1', groupId: 'submissions--full-guard', count: 5 },
        { id: 'rev-s2-mount-esc', label: 'Mount: 2 escapes', stageId: 'white-s1', groupId: 'defence--esc-mount', count: 2 },
        { id: 'rev-s2-mount-subs', label: 'Mount: 4 submissions', stageId: 'white-s1', groupId: 'submissions--mount', count: 4 }
      ],
      reviewLabel: 'Review Stripe 1'
    },

    'white-s3': {
      sections: [
        { key: 'control', name: 'Control', order: 2, groups: [
          { id: 'control--half-guard', name: 'Half Guard', mode: 'exact_named_list',
            moves: ['Top', 'Bottom', 'Knee Shield'] }
        ]},
        { key: 'takedowns', name: 'Takedowns', order: 3, groups: [
          { id: 'takedowns--all', name: null, mode: 'exact_named_list',
            moves: ['Single Leg', 'Double Leg', 'Osoto Gari', 'O Goshi', 'Ouchi Gari', 'Kouchi Gari'],
            suggestSeed: [{ type: 'Takedowns' }] }
        ]},
        { key: 'guard-pass', name: 'Guard Pass', order: 5, groups: [
          { id: 'guard-pass--half-guard', name: 'Half Guard', mode: 'exact_named_list',
            moves: ['Knee Slice', 'Three-Quarter Mount'],
            suggestSeed: [{ type: 'Guard pass', position: 'Half' }] },
          { id: 'guard-pass--butterfly', name: 'Butterfly', mode: 'exact_named_list',
            moves: ['Horse Kick', 'Flip'],
            suggestSeed: [{ type: 'Guard pass', position: 'Butterfly' }] },
          { id: 'guard-pass--x-guard', name: 'X Guard', mode: 'exact_named_list',
            moves: ['Backward', 'Forward'],
            suggestSeed: [{ type: 'Guard pass', position: 'X' }, { type: 'Guard pass', position: 'Single X' }] },
          { id: 'guard-pass--spider-guard', name: 'Spider Guard', mode: 'exact_named_list',
            moves: ['Basic', 'Lasso'],
            suggestSeed: [{ type: 'Guard pass', position: 'Spider' }] }
        ]},
        { key: 'sweeps', name: 'Sweeps', order: 6, groups: [
          { id: 'sweeps--half-guard', name: 'Half Guard', mode: 'exact_named_list',
            moves: ['Foot Hook', 'Dirty Sweep', 'Back Flip'],
            suggestSeed: [{ type: 'Sweeps', position: 'Half' }] },
          { id: 'sweeps--butterfly', name: 'Butterfly', mode: 'exact_named_list',
            moves: ['Foot Hook', 'Knee Kick'],
            suggestSeed: [{ type: 'Sweeps', position: 'Butterfly' }] },
          { id: 'sweeps--x-guard', name: 'X Guard', mode: 'exact_named_list',
            moves: ['Backward', 'Forward'],
            suggestSeed: [{ type: 'Sweeps', position: 'X' }, { type: 'Sweeps', position: 'Single X' }] },
          { id: 'sweeps--spider-guard', name: 'Spider Guard', mode: 'exact_named_list',
            moves: ['Basic', 'Lasso', 'Fat Man'],
            suggestSeed: [{ type: 'Sweeps', position: 'Spider' }] }
        ]},
        { key: 'submissions', name: 'Submissions', order: 7, groups: [
          { id: 'submissions--half-guard', name: 'Half Guard', mode: 'exact_named_list',
            moves: ['Americana', 'Kimura', 'Lapel Choke from Bottom'],
            suggestSeed: [{ type: 'Submissions', position: 'Half' }] },
          { id: 'submissions--butterfly', name: 'Butterfly', mode: 'exact_named_list',
            moves: ['Arm Slicer'] },
          { id: 'submissions--spider-guard', name: 'Spider Guard', mode: 'exact_named_list',
            moves: ['Triangle', 'Omoplata'],
            suggestSeed: [{ type: 'Submissions', position: 'Spider' }] }
        ]}
      ],
      reviewRequirements: [
        { id: 'rev-s3-back-ctl', label: 'Back: 2 controls', stageId: 'white-s2', groupId: 'control--back', count: 2 },
        { id: 'rev-s3-back-esc', label: 'Back: 2 escapes', stageId: 'white-s2', groupId: 'defence--esc-back', count: 2 },
        { id: 'rev-s3-back-subs', label: 'Back: 4 submissions', stageId: 'white-s2', groupId: 'submissions--back', count: 4 },
        { id: 'rev-s3-sc-ctl', label: 'Side Control: 2 controls', stageId: 'white-s2', groupId: 'control--side-control', count: 2 },
        { id: 'rev-s3-sc-esc', label: 'Side Control: 2 escapes', stageId: 'white-s2', groupId: 'defence--esc-side-control', count: 2 },
        { id: 'rev-s3-sc-subs', label: 'Side Control: 2 submissions', stageId: 'white-s2', groupId: 'submissions--side-control', count: 2 }
      ],
      reviewLabel: 'Review Stripe 2'
    },

    'white-s4': {
      sections: [
        { key: 'basic', name: 'Basic', order: 1, groups: [
          { id: 'basic--back-takes', name: 'Back Takes', mode: 'exact_named_list',
            moves: ['Berimbolo', 'Arm Drag from Butterfly Guard'],
            suggestSeed: [{ type: 'Basic', technique: 'Back take' }] },
          { id: 'basic--grip-breaks', name: 'Grip Breaks', mode: 'exact_named_list',
            moves: ['Simba', 'Sleeve Grip Break'],
            suggestSeed: [{ type: 'Basic', technique: 'Grip break' }] },
          { id: 'basic--mount-control', name: 'Mount Control', mode: 'exact_named_list',
            moves: ['Skydive', 'S-Mount', 'One Arm In', 'Back Mount'],
            suggestSeed: [{ type: 'Basic', technique: 'Control' }] }
        ]},
        { key: 'guard-pass', name: 'Guard Pass', order: 5, groups: [
          { id: 'guard-pass--dlr', name: 'DLR', mode: 'exact_named_list',
            moves: ['Jack Sparrow', 'Invert Half'],
            suggestSeed: [{ type: 'Guard pass', position: 'DLR' }] },
          { id: 'guard-pass--shallow-dlr', name: 'Shallow DLR', mode: 'exact_named_list',
            moves: ['Clearing Foot Hook', 'Knee Slice'] },
          { id: 'guard-pass--deep-half', name: 'Deep Half', mode: 'exact_named_list',
            moves: ['Crossface', 'Knee on Face'],
            suggestSeed: [{ type: 'Guard pass', position: 'Deep 1/2' }] }
        ]},
        { key: 'sweeps', name: 'Sweeps', order: 6, groups: [
          { id: 'sweeps--dlr', name: 'DLR', mode: 'exact_named_list',
            moves: ['Backwards', 'Sideways'],
            suggestSeed: [{ type: 'Sweeps', position: 'DLR' }] },
          { id: 'sweeps--shallow-dlr', name: 'Shallow DLR', mode: 'exact_named_list',
            moves: ['Backwards', 'Sideways'] },
          { id: 'sweeps--deep-half', name: 'Deep Half', mode: 'exact_named_list',
            moves: ['Basic', '50/50'],
            suggestSeed: [{ type: 'Sweeps', position: 'Deep 1/2' }] }
        ]},
        { key: 'defence', name: 'Defence & Escapes', order: 8, groups: [
          { id: 'defence--armlock', name: 'Armlock Defence', mode: 'exact_named_list',
            moves: ['From Full Guard', 'From Mount'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Armlock' }] },
          { id: 'defence--guillotine', name: 'Guillotine Defence', mode: 'exact_named_list',
            moves: ['From Full Guard', 'Stand Up'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Guillotine' }] },
          { id: 'defence--triangle', name: 'Triangle Defence', mode: 'exact_named_list',
            moves: ['Step Over', 'Block'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Triangle' }] },
          { id: 'defence--omoplata', name: 'Omoplata Defence', mode: 'exact_named_list',
            moves: ['Flip', 'Jump'],
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Omoplata' }] }
        ]}
      ],
      reviewRequirements: [
        { id: 'rev-s4-fg-passes', label: 'Full Guard: 2 guard passes', stageId: 'white-s1', groupId: 'guard-pass--full-guard', count: 2 },
        { id: 'rev-s4-fg-sweeps', label: 'Full Guard: 3 sweeps', stageId: 'white-s1', groupId: 'sweeps--full-guard', count: 3 },
        { id: 'rev-s4-fg-subs', label: 'Full Guard: 5 submissions', stageId: 'white-s1', groupId: 'submissions--full-guard', count: 5 },
        { id: 'rev-s4-hg-passes', label: 'Half Guard: 2 guard passes', stageId: 'white-s3', groupId: 'guard-pass--half-guard', count: 2 },
        { id: 'rev-s4-hg-sweeps', label: 'Half Guard: 3 sweeps', stageId: 'white-s3', groupId: 'sweeps--half-guard', count: 3 },
        { id: 'rev-s4-hg-subs', label: 'Half Guard: 3 submissions', stageId: 'white-s3', groupId: 'submissions--half-guard', count: 3 },
        { id: 'rev-s4-takedowns', label: 'Takedowns: 6', stageId: 'white-s3', groupId: 'takedowns--all', count: 6 },
        { id: 'rev-s4-og-passes', label: 'Open Guard: 3 guard passes', stageId: 'white-s2', groupId: 'guard-pass--open-guard', count: 3 },
        { id: 'rev-s4-mount-subs', label: 'Mount: 4 submissions', stageId: 'white-s1', groupId: 'submissions--mount', count: 4 }
      ],
      reviewLabel: 'Review Stripes 1–3'
    },

    'blue-exam': {
      sections: [
        { key: 'basic', name: 'Basic', order: 1, groups: [
          { id: 'basic--mount-control', name: 'Mount Control', mode: 'target_count', target: 4,
            suggestSeed: [{ type: 'Basic', technique: 'Control' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'basic--mount-control' }] },
          { id: 'basic--back-takes', name: 'Back Takes', mode: 'target_count', target: 3,
            suggestSeed: [{ type: 'Basic', technique: 'Back take' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'basic--back-takes' }] },
          { id: 'basic--grip-breaks', name: 'Grip Breaks', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Basic', technique: 'Grip break' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'basic--grip-breaks' }] }
        ]},
        { key: 'takedowns', name: 'Takedowns', order: 3, groups: [
          { id: 'takedowns--single-leg', name: 'Single Leg', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Takedowns', technique: 'Single leg' }] },
          { id: 'takedowns--double-leg', name: 'Double Leg', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Takedowns', technique: 'Double leg' }] },
          { id: 'takedowns--osoto-gari', name: 'Osoto Gari', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Takedowns', technique: 'Judo', nameContains: 'osoto' }] },
          { id: 'takedowns--o-goshi', name: 'O Goshi', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Takedowns', technique: 'Judo', nameContains: 'o goshi' }] },
          { id: 'takedowns--ouchi-gari', name: 'Ouchi Gari', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Takedowns', technique: 'Judo', nameContains: 'ouchi' }] },
          { id: 'takedowns--kouchi-gari', name: 'Kouchi Gari', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Takedowns', technique: 'Judo', nameContains: 'kouchi' }] }
        ]},
        { key: 'guard-pass', name: 'Guard Pass', order: 5, groups: [
          { id: 'guard-pass--open-guard', name: 'Open Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Guard pass', position: 'Open' }],
            suggestRefs: [{ stageId: 'white-s2', groupId: 'guard-pass--open-guard' }] },
          { id: 'guard-pass--full-guard', name: 'Full Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Guard pass', position: 'Full' }],
            suggestRefs: [{ stageId: 'white-s1', groupId: 'guard-pass--full-guard' }] },
          { id: 'guard-pass--half-guard', name: 'Half Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Guard pass', position: 'Half' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'guard-pass--half-guard' }] },
          { id: 'guard-pass--butterfly', name: 'Butterfly', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Guard pass', position: 'Butterfly' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'guard-pass--butterfly' }] },
          { id: 'guard-pass--x-guard', name: 'X Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Guard pass', position: 'X' }, { type: 'Guard pass', position: 'Single X' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'guard-pass--x-guard' }] },
          { id: 'guard-pass--spider-guard', name: 'Spider Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Guard pass', position: 'Spider' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'guard-pass--spider-guard' }] },
          { id: 'guard-pass--dlr', name: 'DLR', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Guard pass', position: 'DLR' }, { type: 'Guard pass', position: 'INV DLR' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'guard-pass--dlr' },
                          { stageId: 'white-s4', groupId: 'guard-pass--shallow-dlr' }] },
          { id: 'guard-pass--deep-half', name: 'Deep Half', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Guard pass', position: 'Deep 1/2' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'guard-pass--deep-half' }] }
        ]},
        { key: 'sweeps', name: 'Sweeps', order: 6, groups: [
          { id: 'sweeps--open-guard', name: 'Open Guard', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Sweeps', position: 'Open' }],
            suggestRefs: [{ stageId: 'white-s2', groupId: 'sweeps--open-guard' }] },
          { id: 'sweeps--full-guard', name: 'Full Guard', mode: 'target_count', target: 3,
            suggestSeed: [{ type: 'Sweeps', position: 'Full' }],
            suggestRefs: [{ stageId: 'white-s1', groupId: 'sweeps--full-guard' }] },
          { id: 'sweeps--half-guard', name: 'Half Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Sweeps', position: 'Half' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'sweeps--half-guard' }] },
          { id: 'sweeps--butterfly', name: 'Butterfly', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Sweeps', position: 'Butterfly' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'sweeps--butterfly' }] },
          { id: 'sweeps--x-guard', name: 'X Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Sweeps', position: 'X' }, { type: 'Sweeps', position: 'Single X' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'sweeps--x-guard' }] },
          { id: 'sweeps--spider-guard', name: 'Spider Guard', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Sweeps', position: 'Spider' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'sweeps--spider-guard' }] },
          { id: 'sweeps--dlr', name: 'DLR', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Sweeps', position: 'DLR' }, { type: 'Sweeps', position: 'INV DLR' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'sweeps--dlr' },
                          { stageId: 'white-s4', groupId: 'sweeps--shallow-dlr' }] },
          { id: 'sweeps--deep-half', name: 'Deep Half', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Sweeps', position: 'Deep 1/2' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'sweeps--deep-half' }] }
        ]},
        { key: 'submissions', name: 'Submissions', order: 7, groups: [
          { id: 'submissions--armlock', name: 'Armlock', mode: 'target_count', target: 5,
            suggestSeed: [{ type: 'Submissions', technique: 'Armlock' }] },
          { id: 'submissions--triangle', name: 'Triangle', mode: 'target_count', target: 4,
            suggestSeed: [{ type: 'Submissions', technique: 'Triangle' }],
            suggestRefs: [{ stageId: 'white-s3', groupId: 'submissions--spider-guard' }] },
          { id: 'submissions--americana', name: 'Americana', mode: 'target_count', target: 3,
            suggestSeed: [{ type: 'Submissions', technique: 'Americana' }] },
          { id: 'submissions--omoplata', name: 'Omoplata', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Submissions', technique: 'Omoplata' }] },
          { id: 'submissions--kimura', name: 'Kimura', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Submissions', technique: 'Kimura' }] },
          { id: 'submissions--shoulder-lock', name: 'Shoulder Lock', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Submissions', technique: 'Shoulder lock' }] },
          { id: 'submissions--foot-lock', name: 'Foot Lock', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Submissions', technique: 'Foot lock' }] },
          { id: 'submissions--wrist-lock', name: 'Wrist Lock', mode: 'target_count', target: 1,
            suggestSeed: [{ type: 'Submissions', technique: 'Wrist lock' }] }
        ]},
        { key: 'chokes', name: 'Chokes', order: 7.5, groups: [
          { id: 'chokes--from-guard', name: 'From Guard', mode: 'target_count', target: 5,
            suggestSeed: [{ type: 'Submissions', technique: 'Choke', position: 'Full' }] },
          { id: 'chokes--from-mount', name: 'From Mount', mode: 'target_count', target: 3,
            suggestSeed: [{ type: 'Submissions', technique: 'Choke', position: 'Mount' }] },
          { id: 'chokes--from-back', name: 'From Back', mode: 'target_count', target: 4,
            suggestSeed: [{ type: 'Submissions', technique: 'Choke', position: 'Back' }],
            suggestRefs: [{ stageId: 'white-s2', groupId: 'submissions--back' }] },
          { id: 'chokes--from-side-control', name: 'From Side Control', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Submissions', technique: 'Choke', position: 'Side Control' }] }
        ]},
        { key: 'defence', name: 'Defence & Escapes', order: 8, groups: [
          { id: 'defence--armlock', name: 'Armlock Defence', mode: 'target_count', target: 3,
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Armlock' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'defence--armlock' }] },
          { id: 'defence--triangle', name: 'Triangle Defence', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Triangle' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'defence--triangle' }] },
          { id: 'defence--americana', name: 'Americana Defence', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Americana' }] },
          { id: 'defence--omoplata', name: 'Omoplata Defence', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Omoplata' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'defence--omoplata' }] },
          { id: 'defence--kimura', name: 'Kimura Defence', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Kimura' }] },
          { id: 'defence--guillotine', name: 'Guillotine Defence', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: 'Guillotine' }],
            suggestRefs: [{ stageId: 'white-s4', groupId: 'defence--guillotine' }] },
          { id: 'defence--esc-mount', name: 'Mount Escapes', mode: 'target_count', target: 3,
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Mount' }],
            suggestRefs: [{ stageId: 'white-s1', groupId: 'defence--esc-mount' }] },
          { id: 'defence--esc-back', name: 'Back Escapes', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Back' }],
            suggestRefs: [{ stageId: 'white-s2', groupId: 'defence--esc-back' }] },
          { id: 'defence--esc-side-control', name: 'Side Control Escapes', mode: 'target_count', target: 2,
            suggestSeed: [{ type: 'Defense & Escapes', technique: '', position: 'Side Control' }],
            suggestRefs: [{ stageId: 'white-s2', groupId: 'defence--esc-side-control' }] }
        ]}
      ]
    }
  },

  // Extra hand-authored content merged into generated (spreadsheet) stages
  STAGE_EXTRAS: {
    'blue-s1': {
      prependSections: [
        { key: 'basic', name: 'Basic', order: 1, groups: [
          { id: 'basic--ibjjf-points', name: 'IBJJF Points System', mode: 'informational',
            moves: ['Points', 'Advantages and Penalties'] }
        ]}
      ]
    }
  },

  // ── Assembly ─────────────────────────────────────────────────

  getStageMeta(stageId) {
    return this.STAGES.find(s => s.id === stageId) || null;
  },

  _normName(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  },

  _slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
  },

  // Seed-library moves matching a {type, technique?, position?, nameContains?} matcher
  _seedMatches(matcher) {
    const out = [];
    for (const id in BELT_SEED.moves) {
      const m = BELT_SEED.moves[id];
      if (m.type !== matcher.type) continue;
      if (matcher.technique !== undefined && m.technique !== matcher.technique) continue;
      if (matcher.position !== undefined && m.position !== matcher.position) continue;
      if (matcher.nameContains && !m.name.toLowerCase().includes(matcher.nameContains)) continue;
      out.push(m);
    }
    return out;
  },

  _seedMoveTemplate(m) {
    const t = { id: m.id, name: m.name };
    if (m.context) t.context = m.context;
    else if (m.position && m.technique && m.type === 'Submissions') t.context = '';
    if (m.defaultNotes) t.defaultNotes = m.defaultNotes;
    return t;
  },

  // MoveTemplates for a hand-authored group's default list (stable name-derived ids)
  _handMoveTemplates(stageId, group) {
    const seen = {};
    return (group.moves || []).map(name => {
      let base = stageId + '--' + group.id + '--' + this._slug(name);
      let id = base;
      let n = 2;
      while (seen[id]) { id = base + '-' + n; n++; }
      seen[id] = true;
      return { id, name };
    });
  },

  // Resolve a group's suggested MoveTemplates, excluding anything already
  // in the default list (matched by normalised name).
  _resolveSuggestions(group, defaults) {
    const taken = {};
    defaults.forEach(d => { taken[this._normName(d.name)] = true; });
    const out = [];
    const push = (tpl) => {
      const key = this._normName(tpl.name);
      if (taken[key]) return;
      taken[key] = true;
      out.push(tpl);
    };
    (group.suggestSeed || []).forEach(matcher => {
      this._seedMatches(matcher).forEach(m => push(this._seedMoveTemplate(m)));
    });
    (group.suggestRefs || []).forEach(ref => {
      const hand = this.HAND_STAGES[ref.stageId];
      if (!hand) return;
      for (const sec of hand.sections) {
        const g = sec.groups.find(x => x.id === ref.groupId);
        if (g) this._handMoveTemplates(ref.stageId, g).forEach(t => push(t));
      }
    });
    return out;
  },

  // Full stage template: metadata + sections/groups with resolved default and
  // suggested MoveTemplates. Pure function of checked-in data.
  getStageTemplate(stageId) {
    const meta = this.getStageMeta(stageId);
    if (!meta) return null;

    const hand = this.HAND_STAGES[stageId];
    const generated = (typeof BELT_SEED !== 'undefined') ? BELT_SEED.stages[stageId] : null;
    let sections = [];

    if (hand) {
      sections = hand.sections.map(sec => ({
        key: sec.key, name: sec.name, order: sec.order,
        groups: sec.groups.map(g => {
          const defaults = this._handMoveTemplates(stageId, g);
          return {
            id: g.id, name: g.name,
            requirementMode: g.mode,
            targetCount: g.mode === 'target_count' ? g.target : null,
            defaultMoves: defaults,
            suggestedMoves: this._resolveSuggestions(g, defaults)
          };
        })
      }));
    } else if (generated) {
      sections = generated.sections.map(sec => ({
        key: sec.key, name: sec.name, order: sec.order,
        groups: sec.groups.map(g => ({
          id: g.id,
          name: this.GROUP_NAME_OVERRIDES[g.id] || g.name,
          requirementMode: g.requirementMode,
          targetCount: g.targetCount,
          defaultMoves: g.defaultMoveIds.map(id => this._seedMoveTemplate(BELT_SEED.moves[id])),
          suggestedMoves: g.suggestedMoveIds.map(id => this._seedMoveTemplate(BELT_SEED.moves[id]))
        }))
      }));
    }

    const extras = this.STAGE_EXTRAS[stageId];
    if (extras && extras.prependSections) {
      const pre = extras.prependSections.map(sec => ({
        key: sec.key, name: sec.name, order: sec.order,
        groups: sec.groups.map(g => ({
          id: g.id, name: g.name,
          requirementMode: g.mode,
          targetCount: null,
          defaultMoves: this._handMoveTemplates(stageId, g),
          suggestedMoves: []
        }))
      }));
      sections = pre.concat(sections);
    }

    sections.sort((a, b) => a.order - b.order);

    return {
      ...meta,
      templateVersion: this.templateVersion,
      sections,
      reviewRequirements: (hand && hand.reviewRequirements) || [],
      reviewLabel: (hand && hand.reviewLabel) || 'Review'
    };
  }
};
