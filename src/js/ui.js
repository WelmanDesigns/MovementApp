// UI rendering — main home, hip challenge screens, BJJ circuit screens

const UI = {

  // ── Helpers ──────────────────────────────────────────────────

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },

  esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  getMotivation(daysCompleted) {
    if (daysCompleted === 0) return null;
    if (daysCompleted === 1) return { text: '1 day done. You\'ve got this!', icon: '&#x1F331;' };
    if (daysCompleted <= 3) return { text: `${daysCompleted} days done. Great start!`, icon: '&#x1F4AA;' };
    if (daysCompleted <= 6) return { text: `${daysCompleted} days done. Building momentum!`, icon: '&#x1F525;' };
    if (daysCompleted <= 9) return { text: `${daysCompleted} days done. Keep pushing!`, icon: '&#x26A1;' };
    if (daysCompleted === 10) return { text: '10 days done. Almost halfway!', icon: '&#x1F3AF;' };
    if (daysCompleted <= 13) return { text: `${daysCompleted} days done. Halfway there!`, icon: '&#x2B50;' };
    if (daysCompleted <= 16) return { text: `${daysCompleted} days done. Over the hill!`, icon: '&#x1F680;' };
    if (daysCompleted <= 18) return { text: `${daysCompleted} days done. The end is in sight!`, icon: '&#x1F3C3;' };
    if (daysCompleted === 19) return { text: '19 days done. So close!', icon: '&#x1F4AB;' };
    if (daysCompleted === 20) return { text: '20 days done. You\'ve worked so hard, finish strong!', icon: '&#x1F525;' };
    return { text: '21 days. You did it!', icon: '&#x1F3C6;' };
  },

  // ── Main Home Screen (Workout Selector) ────────────────────

  renderMainHome() {
    const daysCompleted = CHALLENGE_DATA.filter(d => Progress.isDayComplete(d.day)).length;
    const hipSubtext = daysCompleted > 0 ? `${daysCompleted}/21 days complete` : 'Start your journey';
    const gpCount = GameplanStore.count;
    const gpSubtext = gpCount > 0 ? `${gpCount} gameplan${gpCount !== 1 ? 's' : ''}` : 'Map your BJJ game';
    const rulesUnitsDone = RULES_UNITS.filter(u => RulesProgress.unitProgress(u.id).complete).length;
    const rulesSubtext = rulesUnitsDone > 0
      ? `${rulesUnitsDone}/${RULES_UNITS.length} sections mastered`
      : 'Know the rules, win the scrambles';
    const beltStarted = BeltData.STAGES.filter(s => BeltStore.isStageStarted(s.id)).length;
    const beltSubtext = beltStarted > 0
      ? `${beltStarted}/${BeltData.STAGES.length} stages started`
      : 'Your curriculum, stripe by stripe';

    return `
      <div class="screen main-home-screen" role="main" aria-label="Movement App">
        <header class="app-header">
          <h1>Movement App</h1>
        </header>

        <section class="home-section">
          <h2 class="home-section-title">Gameplan</h2>
          <div class="workout-cards">
            <button class="workout-card workout-card-gp" data-nav="gp-list" aria-label="BJJ Gameplan">
              <div class="workout-card-icon" aria-hidden="true">&#x1F4CB;</div>
              <h2 class="workout-card-title">BJJ Gameplan</h2>
              <p class="workout-card-sub">${gpSubtext}</p>
            </button>
          </div>
        </section>

        <section class="home-section">
          <h2 class="home-section-title">Learn</h2>
          <div class="workout-cards">
            <button class="workout-card workout-card-rules" data-nav="rules-home" aria-label="IBJJF Rules">
              <div class="workout-card-icon" aria-hidden="true">&#x2696;&#xFE0F;</div>
              <h2 class="workout-card-title">IBJJF Rules</h2>
              <p class="workout-card-sub">${rulesSubtext}</p>
            </button>
            <button class="workout-card workout-card-belt" data-nav="bt-home" aria-label="Belt Tracker">
              <div class="workout-card-icon" aria-hidden="true">&#x1F3C5;</div>
              <h2 class="workout-card-title">Belt Tracker</h2>
              <p class="workout-card-sub">${beltSubtext}</p>
            </button>
          </div>
        </section>

        <section class="home-section">
          <h2 class="home-section-title">Keep Moving</h2>
          <div class="workout-cards">
            <button class="workout-card workout-card-hip" data-nav="hip-home" aria-label="21-Day Hip Opening Challenge">
              <div class="workout-card-icon" aria-hidden="true">&#x1F9D8;</div>
              <h2 class="workout-card-title">21-Day Hip Opening Challenge</h2>
              <p class="workout-card-sub">${hipSubtext}</p>
            </button>
            <button class="workout-card workout-card-bjj" data-nav="bjj-start" aria-label="BJJ Yoga Ball Circuit">
              <div class="workout-card-icon" aria-hidden="true">&#x1F94B;</div>
              <h2 class="workout-card-title">BJJ Yoga Ball Circuit</h2>
              <p class="workout-card-sub">Bounce into it</p>
            </button>
          </div>
        </section>
      </div>`;
  },

  // ── Hip Challenge Home Screen ──────────────────────────────

  renderHome() {
    const currentDay = Progress.getCurrentDay();
    const allComplete = CHALLENGE_DATA.every(d => Progress.isDayComplete(d.day));
    const daysCompleted = CHALLENGE_DATA.filter(d => Progress.isDayComplete(d.day)).length;
    const motivation = this.getMotivation(daysCompleted);

    let motivationHTML = '';
    if (motivation) {
      motivationHTML = `
        <div class="streak-badge" role="status" aria-label="${motivation.text}">
          <span class="streak-fire" aria-hidden="true">${motivation.icon}</span>
          <span class="streak-count">${motivation.text}</span>
        </div>`;
    }

    let daysHTML = '';
    for (const dayData of CHALLENGE_DATA) {
      const done = Progress.isDayComplete(dayData.day);
      const isCurrent = dayData.day === currentDay && !allComplete;
      const completedCount = Progress.completedPosesForDay(dayData.day);
      const totalCount = dayData.poses.length;
      const hasProgress = completedCount > 0 && !done;

      let statusClass = '';
      let ariaLabel = `Day ${dayData.day}`;
      if (done) {
        statusClass = 'day-done';
        ariaLabel += ', completed';
      } else if (isCurrent) {
        statusClass = 'day-current';
        ariaLabel += ', current day';
      }
      if (hasProgress) ariaLabel += `, ${completedCount} of ${totalCount} poses done`;

      daysHTML += `
        <button class="day-card ${statusClass}" data-nav="day" data-day="${dayData.day}" aria-label="${ariaLabel}">
          <span class="day-number" aria-hidden="true">${dayData.day}</span>
          ${done ? '<span class="day-check" aria-hidden="true">&#x2713;</span>' : ''}
          ${hasProgress ? `<span class="day-partial" aria-hidden="true">${completedCount}/${totalCount}</span>` : ''}
          ${isCurrent ? '<span class="day-today" aria-hidden="true">TODAY</span>' : ''}
        </button>`;
    }

    return `
      <div class="screen home-screen" role="main" aria-label="Challenge overview">
        <header class="day-header">
          <button class="btn-back" data-nav="home" aria-label="Back to workouts">&#x2190;</button>
        </header>
        <header class="app-header">
          <h1>21-Day Hip Opening Challenge</h1>
          ${motivationHTML}
        </header>
        ${allComplete ? `
          <div class="all-complete-banner" role="status">
            <span aria-hidden="true">&#x1F3C6;</span> Challenge Complete! Amazing work!
          </div>` : ''}
        <nav class="day-grid" aria-label="Challenge days">${daysHTML}</nav>
        <button class="reset-btn" data-action="reset-all">Reset All Progress</button>
      </div>`;
  },

  // ── Day Detail Screen ────────────────────────────────────────

  renderDay(dayNumber) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    if (!dayData) return '<div role="main">Day not found</div>';

    const currentDay = Progress.getCurrentDay();
    const isActive = dayNumber === currentDay;
    const isDone = Progress.isDayComplete(dayNumber);
    const completedCount = Progress.completedPosesForDay(dayNumber);
    const totalCount = dayData.poses.length;
    const progressPct = (completedCount / totalCount) * 100;

    let posesHTML = '';
    for (let i = 0; i < dayData.poses.length; i++) {
      const pose = dayData.poses[i];
      const done = Progress.isPoseDone(pose.id);
      const imgSrc = typeof IMAGES !== 'undefined' ? IMAGES[pose.imageKey] : '';
      const poseName = this.esc(pose.name);

      posesHTML += `
        <div class="pose-card ${done ? 'pose-done' : ''}" role="listitem">
          <div class="pose-image-wrap">
            ${imgSrc ? `<img class="pose-image" src="${imgSrc}" alt="${poseName}" loading="lazy">` : '<div class="pose-image-placeholder" role="img" aria-label="No image available"></div>'}
            ${done ? '<div class="pose-done-overlay" aria-hidden="true">&#x2713;</div>' : ''}
          </div>
          <div class="pose-info">
            <h3 class="pose-name">${poseName}</h3>
            <span class="pose-duration">${this.formatTime(pose.duration)}</span>
          </div>
          <div class="pose-action">
            ${done
              ? `<span class="pose-complete-label" aria-label="${poseName}, completed">Done</span>`
              : isActive
                ? `<button class="btn-start" data-nav="timer" data-day="${dayNumber}" data-pose="${i}" aria-label="Start ${poseName}">Start</button>`
                : '<span class="pose-locked-label" aria-label="Locked">&mdash;</span>'
            }
          </div>
        </div>`;
    }

    return `
      <div class="screen day-screen" role="main" aria-label="Day ${dayNumber} detail">
        <header class="day-header">
          <button class="btn-back" data-nav="hip-home" aria-label="Back to overview">&#x2190;</button>
          <nav class="day-nav" aria-label="Day navigation">
            ${dayNumber > 1 ? `<button class="btn-nav-arrow" data-nav="day" data-day="${dayNumber - 1}" aria-label="Previous day">&#x25C0;</button>` : '<span class="btn-nav-spacer"></span>'}
            <h2>Day ${dayNumber}</h2>
            ${dayNumber < 21 ? `<button class="btn-nav-arrow" data-nav="day" data-day="${dayNumber + 1}" aria-label="Next day">&#x25B6;</button>` : '<span class="btn-nav-spacer"></span>'}
          </nav>
          <div class="day-progress-wrap" role="progressbar" aria-valuenow="${completedCount}" aria-valuemin="0" aria-valuemax="${totalCount}" aria-label="Day progress: ${completedCount} of ${totalCount} poses">
            <div class="day-progress-bar">
              <div class="day-progress-fill" style="width:${progressPct}%"></div>
            </div>
            <span class="day-progress-text">${completedCount}/${totalCount} poses</span>
          </div>
        </header>
        ${isDone ? `
          <div class="day-done-banner" role="status">
            <span aria-hidden="true">&#x2705;</span> Day ${dayNumber} Complete!
          </div>` : ''}
        ${!isActive && !isDone ? `
          <div class="day-preview-banner" role="status">
            Preview &mdash; Complete Day ${currentDay} first
          </div>` : ''}
        <div class="pose-list" role="list" aria-label="Poses for day ${dayNumber}">${posesHTML}</div>
      </div>`;
  },

  // ── Timer Screen ─────────────────────────────────────────────

  renderTimer(dayNumber, poseIndex) {
    const dayData = CHALLENGE_DATA.find(d => d.day === dayNumber);
    const pose = dayData.poses[poseIndex];
    const imgSrc = typeof IMAGES !== 'undefined' ? IMAGES[pose.imageKey] : '';
    const poseName = this.esc(pose.name);

    return `
      <div class="screen timer-screen" role="main" aria-label="Timer for ${poseName}">
        <button class="btn-back-timer" data-nav="day" data-day="${dayNumber}" aria-label="Back to day ${dayNumber}">&#x2190; Back</button>
        <div class="timer-pose-name">${poseName}</div>
        <div class="timer-image-wrap" data-action="zoom-image" role="button" aria-label="Zoom image of ${poseName}">
          ${imgSrc ? `<img class="timer-image" src="${imgSrc}" alt="${poseName}">` : ''}
        </div>
        <div class="image-lightbox" id="image-lightbox" data-action="close-lightbox" role="dialog" aria-label="Enlarged image of ${poseName}" aria-modal="true" tabindex="-1">
          ${imgSrc ? `<img class="lightbox-image" src="${imgSrc}" alt="${poseName}">` : ''}
        </div>
        <div class="timer-ring-wrap" role="timer" aria-label="Countdown timer">
          <svg class="timer-ring" viewBox="0 0 200 200" aria-hidden="true">
            <circle class="timer-ring-bg" cx="100" cy="100" r="90" />
            <circle class="timer-ring-fg" cx="100" cy="100" r="90"
              stroke-dasharray="${2 * Math.PI * 90}"
              stroke-dashoffset="0" />
          </svg>
          <div class="timer-display" id="timer-display" aria-live="polite" aria-atomic="true">${this.formatTime(pose.duration)}</div>
        </div>
        <div class="timer-controls">
          <button class="btn-timer-toggle" id="btn-timer-toggle" aria-label="Start timer">Start</button>
          <button class="btn-timer-skip" id="btn-timer-skip" aria-label="Skip this pose">Skip</button>
        </div>
      </div>`;
  },

  updateTimer(remaining, progress, isRunning) {
    const display = document.getElementById('timer-display');
    if (display) display.textContent = this.formatTime(Math.ceil(remaining));

    const ring = document.querySelector('.timer-ring-fg');
    if (ring) {
      const circumference = 2 * Math.PI * 90;
      ring.style.strokeDashoffset = circumference * progress;
    }

    const btn = document.getElementById('btn-timer-toggle');
    if (btn) {
      const label = isRunning ? 'Pause' : 'Resume';
      btn.textContent = label;
      btn.setAttribute('aria-label', label + ' timer');
    }
  },

  // ── Congratulations Modal ────────────────────────────────────

  renderCongrats(dayNumber) {
    const daysCompleted = CHALLENGE_DATA.filter(d => Progress.isDayComplete(d.day)).length;
    const motivation = this.getMotivation(daysCompleted);
    const confettiPieces = Array.from({ length: 12 }, () => '<div class="confetti-piece"></div>').join('');
    return `
      <div class="congrats-overlay" id="congrats-overlay" role="dialog" aria-label="Day ${dayNumber} complete" aria-modal="true">
        <div class="congrats-content">
          <div class="congrats-confetti" aria-hidden="true">${confettiPieces}</div>
          <div class="congrats-icon" aria-hidden="true">&#x1F389;</div>
          <h2>Day ${dayNumber} Complete!</h2>
          ${motivation ? `<p class="congrats-streak" role="status">${motivation.icon} ${motivation.text}</p>` : ''}
          <div class="congrats-buttons">
            ${dayNumber < 21
              ? `<button class="btn-congrats-next" data-nav="day" data-day="${dayNumber + 1}">Next Day &#x2192;</button>`
              : `<button class="btn-congrats-next" data-nav="home">&#x1F3C6; Challenge Complete!</button>`
            }
            <button class="btn-congrats-home" data-nav="home">Home</button>
          </div>
        </div>
      </div>`;
  },

  // ── BJJ Screens ──────────────────────────────────────────────

  _formatDurationLabel(secs) {
    if (secs < 60) return secs + 's';
    const m = secs / 60;
    return m + ' min';
  },

  renderBjjStart() {
    const dur = App.bjjDuration;
    const totalMin = Math.round((dur * 10) / 60);
    const label = this._formatDurationLabel(dur);

    // 30s to 5min in 30s increments
    const options = [];
    for (let s = 30; s <= 300; s += 30) {
      options.push(`<div class="scroll-wheel-item" data-value="${s}">${this._formatDurationLabel(s)}</div>`);
    }

    return `
      <div class="screen bjj-start-screen" role="main" aria-label="BJJ Yoga Ball Circuit">
        <header class="day-header">
          <button class="btn-back" data-nav="home" aria-label="Back to workouts">&#x2190;</button>
        </header>
        <div class="bjj-start-content">
          <div class="bjj-start-icon" aria-hidden="true">&#x1F94B;</div>
          <h1>BJJ Yoga Ball Circuit</h1>
          <p class="bjj-start-label">Time per exercise</p>
          <div class="scroll-wheel-wrap" aria-label="Select duration">
            <div class="scroll-wheel-fade-top"></div>
            <div class="scroll-wheel" id="bjj-scroll-wheel">
              ${options.join('')}
            </div>
            <div class="scroll-wheel-fade-bottom"></div>
            <div class="scroll-wheel-highlight"></div>
          </div>
          <p class="bjj-start-info" id="bjj-total-info">10 exercises &middot; ${label} each &middot; ${totalMin} min total</p>
          <button class="btn-bjj-go" data-nav="bjj-circuit" data-exercise="0" aria-label="Start Circuit">Start Circuit</button>
        </div>
      </div>`;
  },

  renderBjjCountdown() {
    return `
      <div class="screen bjj-countdown-screen" role="main" aria-label="Get ready">
        <div class="bjj-countdown" id="bjj-countdown-number" aria-live="assertive">3</div>
      </div>`;
  },

  renderBjjCircuit(exerciseIndex) {
    const exercise = BJJ_EXERCISES[exerciseIndex];
    const imgSrc = typeof IMAGES !== 'undefined' ? IMAGES[exercise.imageKey] : '';
    const progressPct = ((exerciseIndex) / BJJ_EXERCISES.length) * 100;

    return `
      <div class="screen bjj-circuit-screen" role="main" aria-label="Exercise ${exerciseIndex + 1} of ${BJJ_EXERCISES.length}">
        <button class="btn-back-timer" data-nav="home" aria-label="Back to home">&#x2190; Back</button>
        <div class="bjj-circuit-header">
          <span class="bjj-exercise-counter">${exerciseIndex + 1} / ${BJJ_EXERCISES.length}</span>
          <h2 class="bjj-exercise-name">${this.esc(exercise.name)}</h2>
        </div>
        <div class="bjj-gif-container">
          ${imgSrc ? `<img class="bjj-gif" src="${imgSrc}" alt="${this.esc(exercise.name)}">` : '<div class="bjj-gif-placeholder"></div>'}
        </div>
        <div class="bjj-timer-display" id="bjj-timer-display" role="timer" aria-live="polite" aria-atomic="true">Starting in 3</div>
        <div class="bjj-progress-bar-wrap">
          <div class="bjj-progress-bar">
            <div class="bjj-progress-fill" id="bjj-progress-fill" style="width:0%"></div>
          </div>
        </div>
        <div class="bjj-controls">
          <button class="btn-bjj-toggle" id="btn-bjj-toggle" aria-label="Pause timer">Pause</button>
          <button class="btn-bjj-skip" id="btn-bjj-skip" data-exercise="${exerciseIndex}" aria-label="Skip exercise">Skip</button>
        </div>
      </div>`;
  },

  updateBjjTimer(remaining, progress, isRunning) {
    const display = document.getElementById('bjj-timer-display');
    if (display) display.textContent = this.formatTime(Math.ceil(remaining));

    const fill = document.getElementById('bjj-progress-fill');
    if (fill) {
      fill.style.width = (progress * 100) + '%';
    }

    const btn = document.getElementById('btn-bjj-toggle');
    if (btn) {
      const label = isRunning ? 'Pause' : 'Resume';
      btn.textContent = label;
      btn.setAttribute('aria-label', label + ' timer');
    }
  },

  renderBjjComplete() {
    const confettiPieces = Array.from({ length: 12 }, () => '<div class="confetti-piece"></div>').join('');
    return `
      <div class="screen bjj-complete-screen" role="main" aria-label="Circuit complete">
        <div class="congrats-confetti" aria-hidden="true">${confettiPieces}</div>
        <div class="bjj-complete-content">
          <div class="congrats-icon" aria-hidden="true">&#x1F389;</div>
          <h2>Circuit Complete!</h2>
          <p class="bjj-complete-sub">All 10 exercises done. Great work!</p>
          <div class="congrats-buttons">
            <button class="btn-congrats-next bjj-accent" data-action="bjj-restart">Start Again</button>
            <button class="btn-congrats-home" data-nav="home">Home</button>
          </div>
        </div>
      </div>`;
  },
};
