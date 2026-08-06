// player.js — playback state machine for the flat timeline.
//
// Timing is deadline-based, never accumulated tick counts: a throttled or backgrounded
// tab refreshes its display less often but still computes the correct elapsed time, so a
// phase ends at the right moment either way. Whether cues actually *fire* with the screen
// locked is what spike/timer-spike.html exists to answer (AUDIT.md F2).

const TICK_MS = 200;
const COUNTDOWN_FROM = 3;

export class Player {
  constructor({ onTick, onStepChange, onFinish, onStateChange }) {
    this.onTick = onTick || (() => {});
    this.onStepChange = onStepChange || (() => {});
    this.onFinish = onFinish || (() => {});
    this.onStateChange = onStateChange || (() => {});

    this.steps = [];
    this.workout = null;
    this.index = 0;
    this.status = 'idle';          // idle | running | paused | finished
    this.stepDeadline = 0;         // epoch ms, duration steps only
    this.pausedRemainingMs = 0;
    this.stepStartedAt = 0;
    this.startedAt = null;
    this.completedStepIds = [];
    this.skippedStepIds = [];

    this.ticker = null;
    this.audioCtx = null;
    this.wakeLock = null;
    this.beepedAt = new Set();
    this.soundEnabled = true;
    this.vibrationEnabled = true;

    this.handleVisibility = this.handleVisibility.bind(this);
    document.addEventListener('visibilitychange', this.handleVisibility);
  }

  // --- Cues ------------------------------------------------------------------

  // Must be called from inside a user gesture or the context stays suspended.
  unlockAudio() {
    if (this.audioCtx) return this.audioCtx.resume();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return Promise.resolve();
    this.audioCtx = new Ctx();
    return this.audioCtx.resume();
  }

  beep(frequency, durationMs, volume = 0.35) {
    if (!this.soundEnabled || !this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    const now = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
    osc.connect(gain).connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  }

  vibrate(pattern) {
    if (this.vibrationEnabled && 'vibrate' in navigator) navigator.vibrate(pattern);
  }

  async requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => { this.wakeLock = null; });
    } catch (err) {
      console.warn('[player] wake lock unavailable:', err.message);
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      this.wakeLock.release().catch(() => {});
      this.wakeLock = null;
    }
  }

  handleVisibility() {
    if (document.visibilityState !== 'visible') return;
    if (this.audioCtx?.state === 'suspended') this.audioCtx.resume();
    if (this.status === 'running' && !this.wakeLock) this.requestWakeLock();
  }

  // --- Lifecycle -------------------------------------------------------------

  async start(workout, resumeState = null) {
    this.workout = workout;
    this.steps = workout.steps;
    this.startedAt = resumeState?.startedAt || new Date().toISOString();
    this.completedStepIds = resumeState?.completedStepIds || [];
    this.skippedStepIds = resumeState?.skippedStepIds || [];
    this.index = resumeState?.currentStepIndex ?? 0;

    await this.unlockAudio();
    await this.requestWakeLock();

    this.enterStep(this.index, resumeState?.stepElapsedSeconds || 0);
    this.setStatus('running');
    this.startTicker();
  }

  enterStep(index, elapsedSeconds = 0) {
    this.index = index;
    this.beepedAt = new Set();
    this.stepStartedAt = Date.now() - elapsedSeconds * 1000;

    const step = this.currentStep();
    if (!step) return;

    if (step.target.mode === 'duration') {
      this.stepDeadline = this.stepStartedAt + step.target.seconds * 1000;
    } else {
      this.stepDeadline = 0; // rep steps wait for a Done tap
    }

    if (elapsedSeconds === 0) {
      this.beep(step.kind === 'rest' ? 520 : 880, 160);
      this.vibrate(step.kind === 'rest' ? 120 : [90, 60, 90]);
    }
    this.onStepChange(this.snapshot());
  }

  startTicker() {
    if (this.ticker) return;
    this.ticker = setInterval(() => this.tick(), TICK_MS);
    this.tick();
  }

  stopTicker() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
  }

  tick() {
    if (this.status !== 'running') return;
    const step = this.currentStep();
    if (!step) return;

    if (step.target.mode === 'reps') {
      this.onTick(this.snapshot());
      return;
    }

    const remainingMs = this.stepDeadline - Date.now();
    const remaining = Math.max(0, Math.ceil(remainingMs / 1000));

    if (remaining <= COUNTDOWN_FROM && remaining > 0 && !this.beepedAt.has(remaining)) {
      this.beepedAt.add(remaining);
      this.beep(660, 90, 0.25);
    }

    this.onTick(this.snapshot());

    if (remainingMs <= 0) this.completeStep();
  }

  // A finished workout must ignore stray control taps: without this, a repeated Skip
  // keeps incrementing the counts and re-fires the finish screen.
  isActive() {
    return this.status === 'running' || this.status === 'paused';
  }

  completeStep() {
    if (!this.isActive()) return;
    const step = this.currentStep();
    if (step) this.completedStepIds.push(step.id);
    this.advance();
  }

  advance() {
    const next = this.index + 1;
    if (next >= this.steps.length) {
      this.finish();
      return;
    }
    this.enterStep(next, 0);
  }

  // --- Controls --------------------------------------------------------------

  pause() {
    if (this.status !== 'running') return;
    this.pausedRemainingMs = Math.max(0, this.stepDeadline - Date.now());
    this.setStatus('paused');
    this.stopTicker();
    this.releaseWakeLock();
    this.onTick(this.snapshot());
  }

  async resume() {
    if (this.status !== 'paused') return;
    const step = this.currentStep();
    if (step?.target.mode === 'duration') {
      this.stepDeadline = Date.now() + this.pausedRemainingMs;
      this.stepStartedAt = this.stepDeadline - step.target.seconds * 1000;
    }
    this.setStatus('running');
    await this.requestWakeLock();
    this.startTicker();
  }

  skip() {
    if (!this.isActive()) return;
    const step = this.currentStep();
    if (step) this.skippedStepIds.push(step.id);
    this.advance();
  }

  restartStep() {
    if (!this.isActive()) return;
    this.enterStep(this.index, 0);
  }

  previousStep() {
    if (!this.isActive() || this.index === 0) return;
    this.enterStep(this.index - 1, 0);
  }

  addSeconds(seconds) {
    const step = this.currentStep();
    if (!step || step.target.mode !== 'duration') return;
    this.stepDeadline += seconds * 1000;
    // Keep the step's own target in step with the extension, so a saved template
    // reflects what was actually performed rather than what was planned.
    step.target = { ...step.target, seconds: step.target.seconds + seconds };
    this.beepedAt = new Set();
    this.onTick(this.snapshot());
    this.onStepChange(this.snapshot());
  }

  // Rep steps advance only on an explicit tap (COMPOSER_SPEC.md → Repetition Exercise).
  markRepsDone() {
    if (!this.isActive()) return;
    const step = this.currentStep();
    if (!step || step.target.mode !== 'reps') return;
    this.completeStep();
  }

  // Live editing: replace the timeline mid-workout without disturbing the running step.
  // Editing a future step must not reset elapsed time on the current one
  // (COMPOSER_SPEC.md → Player).
  replaceSteps(nextSteps) {
    const current = this.currentStep();
    this.steps = nextSteps;
    if (this.workout) this.workout.steps = nextSteps;

    if (!current) return;
    const newIndex = nextSteps.findIndex((step) => step.id === current.id);
    if (newIndex === -1) {
      // The running step was deleted: move to whatever now occupies its position.
      this.index = Math.min(this.index, nextSteps.length - 1);
      if (this.index < 0 || !nextSteps.length) { this.finish(); return; }
      this.enterStep(this.index, 0);
    } else {
      this.index = newIndex;
      this.onStepChange(this.snapshot());
    }
  }

  finish() {
    if (this.status === 'finished') return;
    this.stopTicker();
    this.releaseWakeLock();
    this.setStatus('finished');
    this.beep(1180, 380, 0.4);
    this.vibrate([180, 90, 180]);
    this.onFinish(this.snapshot());
  }

  abandon() {
    this.stopTicker();
    this.releaseWakeLock();
    this.setStatus('idle');
  }

  destroy() {
    this.stopTicker();
    this.releaseWakeLock();
    document.removeEventListener('visibilitychange', this.handleVisibility);
  }

  // --- State -----------------------------------------------------------------

  setStatus(status) {
    this.status = status;
    this.onStateChange(this.snapshot());
  }

  currentStep() {
    return this.steps[this.index] || null;
  }

  nextStep() {
    return this.steps[this.index + 1] || null;
  }

  remainingSeconds() {
    const step = this.currentStep();
    if (!step || step.target.mode !== 'duration') return null;
    if (this.status === 'paused') return Math.ceil(this.pausedRemainingMs / 1000);
    return Math.max(0, Math.ceil((this.stepDeadline - Date.now()) / 1000));
  }

  elapsedStepSeconds() {
    return Math.max(0, Math.round((Date.now() - this.stepStartedAt) / 1000));
  }

  snapshot() {
    return {
      status: this.status,
      index: this.index,
      total: this.steps.length,
      step: this.currentStep(),
      next: this.nextStep(),
      remainingSeconds: this.remainingSeconds(),
      elapsedStepSeconds: this.elapsedStepSeconds(),
      startedAt: this.startedAt,
      completedStepIds: this.completedStepIds,
      skippedStepIds: this.skippedStepIds
    };
  }

  draftState() {
    return {
      workout: this.workout,
      currentStepIndex: this.index,
      stepElapsedSeconds: this.elapsedStepSeconds(),
      startedAt: this.startedAt,
      status: this.status === 'finished' ? 'abandoned' : this.status,
      completedStepIds: this.completedStepIds,
      skippedStepIds: this.skippedStepIds
    };
  }
}
