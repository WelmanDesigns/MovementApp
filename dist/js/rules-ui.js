// IBJJF Rules — screen rendering (home, cards, lessons, quiz, result, checker)

const RulesUI = {
  UNIT_ICONS: { scoreboard: 'chart', scenarios: 'target', penalties: 'alert', legal: 'belt' },

  UNIT_ICONS: { scoreboard: 'chart', scenarios: 'target', penalties: 'alert', legal: 'belt' },

  UNIT_ICONS: { scoreboard: 'chart', scenarios: 'target', penalties: 'alert', legal: 'belt' },


  // Image helper — renders only when the key exists in the IMAGES bundle
  _img(key, alt, cls) {
    const src = (typeof IMAGES !== 'undefined' && key) ? IMAGES[key] : '';
    if (!src) return '';
    return `<img class="${cls || 'rules-card-image'}" src="${src}" alt="${UI.esc(alt)}" loading="lazy">`;
  },

  _ring(pct, complete) {
    const r = 20;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - Math.min(1, Math.max(0, pct)));
    return `
      <span class="rules-ring-wrap" aria-hidden="true">
        <svg class="rules-ring" viewBox="0 0 48 48">
          <circle class="rules-ring-bg" cx="24" cy="24" r="${r}"></circle>
          <circle class="rules-ring-fg ${complete ? 'rules-ring-done' : ''}" cx="24" cy="24" r="${r}"
            stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
        </svg>
        ${complete ? '<span class="rules-ring-check">' + Icon.svg('check', 16) + '</span>' : ''}
      </span>`;
  },

  // ── Rules home ───────────────────────────────────────────────

  renderHome() {
    let tilesHTML = '';
    for (const unit of RULES_UNITS) {
      const prog = RulesProgress.unitProgress(unit.id);
      const pctLabel = Math.round(prog.pct * 100);
      const nav = unit.cards && !unit.lessons.length
        ? `data-nav="rules-cards" data-unit="${unit.id}" data-index="0"`
        : `data-nav="rules-lessons" data-unit="${unit.id}"`;
      tilesHTML += `
        <button class="rules-unit-tile" ${nav}
          aria-label="${UI.esc(unit.title)}, ${prog.complete ? 'complete' : pctLabel + '% complete'}">
          ${Icon.badge(this.UNIT_ICONS[unit.id] || 'rules', 'rules')}
          <span class="rules-unit-text">
            <span class="rules-unit-title">${UI.esc(unit.title)}</span>
            <span class="rules-unit-sub">${UI.esc(unit.sub)}</span>
          </span>
          ${this._ring(prog.pct, prog.complete)}
        </button>`;
    }

    return `
      <div class="screen rules-home-screen" role="main" aria-label="IBJJF Rules">
        <header class="app-header">
          <h1>IBJJF Rules</h1>
          <p class="rules-tagline">Know the rules, win the scrambles</p>
        </header>
        <div class="rules-unit-list">${tilesHTML}</div>
      </div>`;
  },

  // ── Card reader ──────────────────────────────────────────────

  renderCards(unitId, index) {
    const unit = RULES_UNITS.find(u => u.id === unitId);
    const cards = unit ? RULES_CARDS[unit.cards] : null;
    if (!cards || !cards[index]) return '<div role="main">Card not found</div>';

    const card = cards[index];
    const isLast = index === cards.length - 1;
    const backNav = unit.lessons.length
      ? `data-nav="rules-lessons" data-unit="${unitId}"`
      : 'data-nav="rules-home"';

    const dots = cards.map((c, i) =>
      `<span class="rules-dot ${i === index ? 'active' : ''} ${RulesProgress.isCardRead(c.id) ? 'read' : ''}" aria-hidden="true"></span>`
    ).join('');

    let tableHTML = '';
    if (card.table) {
      const head = card.table.head.map(h => `<th>${UI.esc(h)}</th>`).join('');
      const rows = card.table.rows.map(r =>
        `<tr>${r.map(cell => `<td>${UI.esc(cell)}</td>`).join('')}</tr>`
      ).join('');
      tableHTML = `
        <div class="rules-table-wrap">
          <table class="rules-table">
            <thead><tr>${head}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`;
    }

    let miniQuizHTML = '';
    if (card.miniQuiz) {
      miniQuizHTML = `
        <div class="rules-mini-quiz" id="rules-mini-quiz">
          <p class="rules-mini-label">${Icon.svg('help', 16)} Quick check</p>
          <p class="rules-mini-question">${UI.esc(card.miniQuiz)}</p>
          <button class="rules-mini-reveal-btn" data-action="rules-reveal" aria-expanded="false">Reveal answer</button>
          <p class="rules-mini-answer">${UI.esc(card.miniAnswer)}</p>
        </div>`;
    }

    return `
      <div class="screen rules-cards-screen" role="main" aria-label="${UI.esc(card.title)}">
        <header class="day-header">
          <button class="btn-back" ${backNav} aria-label="Back">&#x2190;</button>
          <div class="rules-dots" aria-label="Card ${index + 1} of ${cards.length}">${dots}</div>
        </header>
        <div class="rules-card">
          ${card.badge ? `<span class="rules-points-badge rules-badge-warn">${UI.esc(card.badge)}</span>` : ''}
          <h2 class="rules-card-title">${UI.esc(card.title)}${card.points != null ? ` <span class="rules-card-points">${card.points} Point${card.points !== 1 ? 's' : ''}</span>` : ''}</h2>
          <p class="rules-card-rule">${UI.esc(card.rule)}</p>
          ${card.explain ? `<p class="rules-card-explain">${UI.esc(card.explain)}</p>` : ''}
          ${this._img(card.image, card.title)}
          ${tableHTML}
          ${card.trap ? `
            <div class="rules-trap">
              <span class="rules-trap-label">${Icon.svg('alert', 16)} Watch out</span>
              <p>${UI.esc(card.trap)}</p>
            </div>` : ''}
          ${miniQuizHTML}
        </div>
        <div class="rules-card-nav">
          ${index > 0
            ? `<button class="rules-btn-secondary" data-nav="rules-cards" data-unit="${unitId}" data-index="${index - 1}">&#x2190; Previous</button>`
            : '<span></span>'}
          <button class="rules-btn-primary" data-action="rules-card-done" data-unit="${unitId}" data-index="${index}">
            ${isLast ? (unit.lessons.length ? 'Done — to the quiz!' : 'Done!') : 'Got it &#x2192;'}
          </button>
        </div>
      </div>`;
  },

  // ── Lesson picker (unit detail) ──────────────────────────────

  renderLessonPicker(unitId) {
    const unit = RULES_UNITS.find(u => u.id === unitId);
    if (!unit) return '<div role="main">Unit not found</div>';

    let entriesHTML = '';

    if (unit.cards) {
      const cards = RULES_CARDS[unit.cards];
      const read = cards.filter(c => RulesProgress.isCardRead(c.id)).length;
      const allRead = read === cards.length;
      entriesHTML += `
        <button class="rules-lesson-item" data-nav="rules-cards" data-unit="${unitId}" data-index="0"
          aria-label="Rule cards, ${read} of ${cards.length} read">
          ${Icon.badge('book-open', 'rules')}
          <span class="rules-lesson-text">
            <span class="rules-lesson-title">Rule Cards</span>
            <span class="rules-lesson-sub">${read}/${cards.length} read</span>
          </span>
          <span class="rules-lesson-status ${allRead ? 'done' : ''}" aria-hidden="true">${allRead ? Icon.svg('check', 18) : Icon.svg('chevron-right', 18)}</span>
        </button>`;
    }

    if (unit.checker) {
      entriesHTML += `
        <button class="rules-lesson-item" data-nav="rules-checker" aria-label="Open the legality checker">
          ${Icon.badge('search', 'rules')}
          <span class="rules-lesson-text">
            <span class="rules-lesson-title">Can I do this?</span>
            <span class="rules-lesson-sub">Check any technique by belt</span>
          </span>
          <span class="rules-lesson-status" aria-hidden="true">${Icon.svg('chevron-right', 18)}</span>
        </button>`;
    }

    unit.lessons.forEach((lessonId, i) => {
      const lesson = RULES_LESSONS[lessonId];
      const stat = RulesProgress.getLesson(lessonId);
      const complete = RulesProgress.isLessonComplete(lessonId);
      const sub = stat
        ? `Best: ${stat.bestCorrect}/${stat.total}${stat.perfect ? ' · Perfect' : ''}`
        : `${lesson.questions.length} questions`;
      entriesHTML += `
        <button class="rules-lesson-item" data-nav="rules-quiz" data-lesson="${lessonId}"
          aria-label="Lesson ${i + 1}: ${UI.esc(lesson.title)}">
          ${complete ? Icon.badge('trophy', 'success') : Icon.badge('pencil', 'rules')}
          <span class="rules-lesson-text">
            <span class="rules-lesson-title">${UI.esc(lesson.title)}</span>
            <span class="rules-lesson-sub">${sub}</span>
          </span>
          <span class="rules-lesson-status ${complete ? 'done' : ''}" aria-hidden="true">${complete ? Icon.svg('check', 18) : Icon.svg('chevron-right', 18)}</span>
        </button>`;
    });

    return `
      <div class="screen rules-lessons-screen" role="main" aria-label="${UI.esc(unit.title)}">
        <header class="day-header">
          <button class="btn-back" data-nav="rules-home" aria-label="Back to IBJJF Rules">&#x2190;</button>
        </header>
        <header class="app-header">
          <h1>${UI.esc(unit.title)}</h1>
          <p class="rules-tagline">${UI.esc(unit.sub)}</p>
        </header>
        <div class="rules-lesson-list">${entriesHTML}</div>
      </div>`;
  },

  // ── Quiz session ─────────────────────────────────────────────

  renderQuiz() {
    const s = RulesQuiz.session;
    const q = RulesQuiz.current();
    if (!s || !q) return '<div role="main">No quiz in progress</div>';

    const total = RulesQuiz.total();
    const pct = (s.index / total) * 100;
    const lesson = RulesQuiz.lesson();

    const choicesHTML = q.choices.map((choice, i) => `
      <button class="quiz-choice" data-action="rules-answer" data-choice="${i}">
        <span class="quiz-choice-letter" aria-hidden="true">${String.fromCharCode(65 + i)}</span>
        <span class="quiz-choice-text">${UI.esc(choice)}</span>
      </button>`).join('');

    return `
      <div class="screen rules-quiz-screen" role="main" aria-label="Question ${s.index + 1} of ${total}">
        <header class="rules-quiz-header">
          <button class="rules-quiz-quit" data-action="rules-quit" aria-label="Quit lesson">&#x2715;</button>
          <div class="bjj-progress-bar rules-progress-bar">
            <div class="bjj-progress-fill rules-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="rules-quiz-counter">${s.index + 1}/${total}</span>
        </header>
        <p class="rules-quiz-lesson-title">${UI.esc(lesson.title)}</p>
        <h2 class="rules-quiz-prompt">${UI.esc(q.prompt)}</h2>
        <div class="rules-quiz-choices" id="rules-quiz-choices">${choicesHTML}</div>
        <div class="rules-feedback" id="rules-feedback" role="status" aria-live="polite">
          <p class="rules-feedback-headline" id="rules-feedback-headline"></p>
          <p class="rules-feedback-text" id="rules-feedback-text"></p>
          <button class="rules-btn-primary" data-action="rules-next" id="rules-next-btn"></button>
        </div>
      </div>`;
  },

  // ── Result screen ────────────────────────────────────────────

  renderResult(result) {
    const s = RulesQuiz.session;
    if (!s || !result) return '<div role="main">No result available</div>';

    const frac = result.correct / result.total;
    const perfect = result.correct === result.total;
    let headline, icon;
    if (perfect) { headline = RULES_COPY.result.perfect; icon = Icon.badge('trophy', 'success', 'lg'); }
    else if (frac >= 0.8) { headline = RULES_COPY.result.great; icon = Icon.badge('star', 'rules', 'lg'); }
    else if (frac >= 0.5) { headline = RULES_COPY.result.good; icon = Icon.badge('check-circle', 'rules', 'lg'); }
    else { headline = RULES_COPY.result.keepGoing; icon = Icon.badge('refresh', 'neutral', 'lg'); }

    const r = 54;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - frac);
    const confettiPieces = perfect
      ? `<div class="congrats-confetti" aria-hidden="true">${Array.from({ length: 12 }, () => '<div class="confetti-piece"></div>').join('')}</div>`
      : '';
    const unitId = RulesQuiz.lesson().unitId;

    return `
      <div class="screen rules-result-screen" role="main" aria-label="Lesson result: ${result.correct} of ${result.total} correct">
        ${confettiPieces}
        <div class="rules-result-content">
          <div class="rules-result-icon" aria-hidden="true">${icon}</div>
          <div class="rules-result-ring-wrap" aria-hidden="true">
            <svg class="rules-result-ring" viewBox="0 0 120 120">
              <circle class="rules-ring-bg" cx="60" cy="60" r="${r}"></circle>
              <circle class="rules-ring-fg ${perfect ? 'rules-ring-done' : ''}" cx="60" cy="60" r="${r}"
                stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
            </svg>
            <div class="rules-result-score">${result.correct}/${result.total}</div>
          </div>
          <h2>${UI.esc(headline)}</h2>
          ${result.isBest && !perfect ? '<p class="rules-result-best" role="status">New best score!</p>' : ''}
          <div class="congrats-buttons">
            <button class="btn-congrats-next rules-accent" data-nav="rules-quiz" data-lesson="${s.lessonId}">Try Again</button>
            <button class="btn-congrats-home" data-nav="rules-lessons" data-unit="${unitId}">Back to Lessons</button>
          </div>
        </div>
      </div>`;
  },

  // ── Legality checker ─────────────────────────────────────────

  _pillGroup(label, field, options, selected, statuses) {
    const pills = options.map(o => {
      const status = statuses ? statuses[o.id] : '';
      const statusLabel = status ? (status === 'legal' ? ' (legal)' : ' (illegal)') : '';
      return `
      <button class="rules-pill ${selected === o.id ? 'active' : ''} ${status || ''}"
        data-action="rules-check-set" data-field="${field}" data-value="${o.id}"
        aria-pressed="${selected === o.id}" aria-label="${UI.esc(o.label)}${statusLabel}">${UI.esc(o.label)}</button>`;
    }).join('');
    return `
      <div class="rules-pill-group">
        <p class="rules-pill-label">${UI.esc(label)}</p>
        <div class="rules-pill-row">${pills}</div>
      </div>`;
  },

  renderChecker(state) {
    const L = RULES_LEGALITY;
    // Adult ruleset; Masters/juvenile differences are covered in notes and quizzes
    let stepsHTML = this._pillGroup('Gi or No-Gi', 'gi', L.giModes, state.gi);
    if (state.gi) stepsHTML += this._pillGroup('Belt', 'belt', L.belts, state.belt);
    if (state.gi && state.belt) {
      // Pre-shade each technique pill with its legality for the chosen division
      const statuses = {};
      L.techniques.forEach(t => {
        const res = rulesCheckLegality('adult', state.gi, state.belt, t.id);
        statuses[t.id] = res ? res.status : '';
      });
      stepsHTML += this._pillGroup('Technique', 'tech',
        L.techniques.map(t => ({ id: t.id, label: t.name })), state.tech, statuses);
    }

    let resultHTML = '';
    if (state.gi && state.belt && state.tech) {
      const res = rulesCheckLegality('adult', state.gi, state.belt, state.tech);
      if (res) {
        const legal = res.status === 'legal';
        const dq = res.technique.dq && !legal;
        const verdict = legal ? 'LEGAL' : (dq ? 'ILLEGAL &mdash; DQ' : 'ILLEGAL');
        resultHTML = `
          <div class="rules-check-result ${legal ? 'legal' : 'illegal'}" role="status">
            <p class="rules-check-verdict">${legal ? Icon.svg('check-circle', 22) : Icon.svg('ban', 22)} ${verdict}</p>
            <p class="rules-check-tech">${UI.esc(res.technique.name)}</p>
            ${res.note ? `<p class="rules-check-note">${UI.esc(res.note)}</p>` : ''}
            ${this._img(res.technique.image, res.technique.name, 'rules-check-image')}
            <div class="rules-check-actions">
              <button class="rules-btn-primary" data-action="rules-check-set" data-field="tech" data-value="">Check another</button>
              <button class="rules-btn-secondary" data-action="rules-check-reset">Reset all</button>
            </div>
          </div>`;
      }
    }

    return `
      <div class="screen rules-checker-screen" role="main" aria-label="Legality checker">
        <header class="day-header">
          <button class="btn-back" data-nav="rules-lessons" data-unit="legal" aria-label="Back to Legal Moves">&#x2190;</button>
        </header>
        <header class="app-header">
          <h1>Can I do this?</h1>
          <p class="rules-tagline">Pick your division, then a technique</p>
        </header>
        ${stepsHTML}
        ${resultHTML}
      </div>`;
  }
};
