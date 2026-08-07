// app.js — bootstrap and view orchestration.

import * as db from './db.js';
import * as catalog from './catalog.js';
import * as picker from './ui/picker.js';
import * as stepEditor from './ui/stepEditor.js';
import * as dialog from './ui/dialog.js';
import { Player } from './player.js';
import { compilePrimaryAnchorRest, compileTemplate } from './pattern.js';
import {
  createWorkStep, createRestStep, createWorkout, addStep, removeStep,
  duplicateStep, moveStep, updateStep, repeatRange,
  describeDuration, describeTarget, estimateDuration, formatDuration
} from './timeline.js';

const $ = (id) => document.getElementById(id);

const state = {
  steps: [],
  workout: null,
  sourceTemplateId: null,
  sourceTemplate: null,
  editingDuringPlayback: false,
  patternPrimaries: [],
  patternAnchorId: null
};

let player = null;

// --- View switching ----------------------------------------------------------

function showView(name) {
  for (const view of document.querySelectorAll('.view')) {
    view.classList.toggle('hidden', view.dataset.view !== name);
  }
  window.scrollTo(0, 0);
}

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.add('hidden'), 2400);
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

// --- Home --------------------------------------------------------------------

async function renderHome() {
  const [templates, sessions, draft] = await Promise.all([
    db.listTemplates(), db.listSessions(), db.getDraft()
  ]);

  const banner = $('resume-banner');
  if (draft && draft.status !== 'abandoned' && draft.workout?.steps?.length) {
    const stepName = draft.workout.steps[draft.currentStepIndex]?.exerciseName || 'Rest';
    $('resume-detail').textContent =
      `Step ${draft.currentStepIndex + 1} of ${draft.workout.steps.length} — ${stepName}`;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }

  const templateList = $('template-list');
  templateList.innerHTML = '';
  if (!templates.length) {
    templateList.innerHTML = '<p class="empty">No templates yet. Compose a workout and save it.</p>';
  }
  for (const template of templates) {
    const card = document.createElement('div');
    card.className = 'card';

    const main = document.createElement('button');
    main.type = 'button';
    main.className = 'card-main';
    const steps = compileTemplate(template, catalog.byId());
    main.innerHTML = `<span class="card-title">${escapeHtml(template.name)}</span>
      <span class="card-sub">${steps.length} steps · ${describeDuration(steps)}</span>`;
    main.addEventListener('click', () => openTemplate(template));

    card.appendChild(main);
    const actions = document.createElement('div');
    actions.className = 'template-actions';

    if (template.videoUrl) {
      const video = document.createElement('a');
      video.className = 'template-video';
      video.href = template.videoUrl;
      video.target = '_blank';
      video.rel = 'noopener noreferrer';
      video.setAttribute('aria-label', `Watch ${template.name} video`);
      video.textContent = '▶ Video';
      actions.appendChild(video);
    }

    // AUDIT.md F3: the seeded R0546 template is partly guessed and its steps total
    // 6 minutes, not 15. Say so where it is used rather than only in the docs.
    if (template.status && template.status !== 'user') {
      const badge = document.createElement('span');
      badge.className = template.status === 'starter' ? 'badge badge-warn' : 'badge';
      badge.textContent = template.status === 'starter' ? 'unverified' : template.status;
      badge.title = 'Seeded from R0546; exercise list not yet confirmed against the video.';
      actions.appendChild(badge);
    }
    if (actions.childElementCount) card.appendChild(actions);
    templateList.appendChild(card);
  }

  const sessionList = $('session-list');
  sessionList.innerHTML = '';
  if (!sessions.length) {
    sessionList.innerHTML = '<p class="empty">No sessions recorded yet.</p>';
  }
  for (const session of sessions.slice(0, 8)) {
    const card = document.createElement('div');
    card.className = 'card';
    const when = new Date(session.finishedAt).toLocaleString('en-GB',
      { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    card.innerHTML = `<div class="card-main">
        <span class="card-title">${escapeHtml(session.workout.name || 'Untitled workout')}</span>
        <span class="card-sub">${when} · ${formatDuration(session.actualDurationSeconds || 0)}
        · ${session.completedStepIds.length}/${session.workout.steps.length} steps</span>
      </div>`;
    sessionList.appendChild(card);
  }
}

async function openTemplate(template) {
  // Starting from a template creates a new workout snapshot; live edits never write
  // back to the template (COMPOSER_SPEC.md → Saving Behavior).
  state.steps = compileTemplate(template, catalog.byId());
  state.sourceTemplateId = template.id;
  state.sourceTemplate = template;
  $('compose-title').textContent = template.name;
  renderCompose();
  showView('compose');
}

// --- Compose -----------------------------------------------------------------

function renderCompose() {
  const list = $('timeline');
  list.innerHTML = '';

  if (!state.steps.length) {
    list.innerHTML = '<p class="empty">Empty. Add an exercise to begin.</p>';
  }

  state.steps.forEach((step, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `timeline-step${step.kind === 'rest' ? ' is-rest' : ''}`;

    const detail = [];
    if (step.side) detail.push(step.side);
    if (step.loadKg) detail.push(`${step.loadKg} kg`);
    // sourcePatternId is deliberately not shown: generated steps must be
    // indistinguishable from hand-added ones (PLAN.md acceptance criterion).

    button.innerHTML = `
      <span class="step-index">${index + 1}</span>
      <span class="step-name">${escapeHtml(step.exerciseName || 'Rest')}
        ${detail.length ? `<span class="step-sub">${escapeHtml(detail.join(' · '))}</span>` : ''}</span>
      <span class="step-target">${describeTarget(step)}</span>`;
    button.addEventListener('click', () => editStep(step.id));

    item.appendChild(button);
    list.appendChild(item);
  });

  const { hasRepSteps } = estimateDuration(state.steps);
  $('compose-summary').textContent = state.steps.length
    ? `${state.steps.length} steps · ${describeDuration(state.steps)}${hasRepSteps ? ' (rep steps have no fixed length)' : ''}`
    : 'empty';
  $('start-workout').disabled = !state.steps.length;
  renderTemplateDetailActions();
}

function renderTemplateDetailActions() {
  const wrap = $('template-detail-actions');
  const template = state.sourceTemplate;
  const visible = Boolean(template) && !state.editingDuringPlayback;
  wrap.classList.toggle('hidden', !visible);
  if (!visible) return;

  const video = $('template-follow-video');
  video.classList.toggle('hidden', !template.videoUrl);
  if (template.videoUrl) {
    video.href = template.videoUrl;
    video.setAttribute('aria-label', `Follow ${template.name} video`);
  } else {
    video.removeAttribute('href');
  }
}

$('template-delete').addEventListener('click', async () => {
  const template = state.sourceTemplate;
  if (!template) return;
  const confirmed = await dialog.confirm(
    `Delete “${template.name}”?`,
    'This removes the template. Your workout history is unchanged, and this open timeline will remain available.',
    'Delete'
  );
  if (!confirmed) return;

  await db.deleteTemplate(template.id);
  state.sourceTemplateId = null;
  state.sourceTemplate = null;
  renderTemplateDetailActions();
  toast('Template deleted');
});

async function editStep(stepId) {
  const step = state.steps.find((candidate) => candidate.id === stepId);
  if (!step) return;

  const result = await stepEditor.open(step);
  if (!result) return;

  if (result.action === 'update') state.steps = updateStep(state.steps, stepId, result.changes);
  if (result.action === 'duplicate') state.steps = duplicateStep(state.steps, stepId);
  if (result.action === 'move') state.steps = moveStep(state.steps, stepId, result.delta);
  if (result.action === 'delete') state.steps = removeStep(state.steps, stepId);

  if (state.editingDuringPlayback) {
    player.replaceSteps(state.steps);
    await persistDraft();
    renderCompose();
  } else {
    renderCompose();
  }
}

$('add-exercise').addEventListener('click', async () => {
  const exercise = await picker.open();
  if (!exercise) return;
  state.steps = addStep(state.steps, createWorkStep(exercise, { ...exercise.defaultTarget }));
  if (state.editingDuringPlayback) player.replaceSteps(state.steps);
  renderCompose();
});

$('add-rest').addEventListener('click', () => {
  state.steps = addStep(state.steps, createRestStep(30));
  if (state.editingDuringPlayback) player.replaceSteps(state.steps);
  renderCompose();
});

$('repeat-all').addEventListener('click', async () => {
  if (!state.steps.length) return;
  const answer = await dialog.prompt('Repeat the whole timeline how many extra times?', {
    value: '1', confirmLabel: 'Repeat'
  });
  const times = Number(answer);
  if (!times || times < 1) return;
  state.steps = repeatRange(state.steps, 0, state.steps.length - 1, times);
  if (state.editingDuringPlayback) player.replaceSteps(state.steps);
  renderCompose();
});

$('compose-save-template').addEventListener('click', async () => {
  if (!state.steps.length) { toast('Nothing to save'); return; }
  const name = await dialog.prompt('Template name', { placeholder: 'e.g. Kettlebell 15' });
  if (!name) return;
  await saveTemplateFromSteps(name, state.steps);
  toast('Template saved');
  renderHome();
});

async function saveTemplateFromSteps(name, steps) {
  const { seconds } = estimateDuration(steps);
  await db.saveTemplate({
    id: `tpl_${Date.now().toString(36)}`,
    name,
    sourceRef: null,
    status: 'user',
    composerMode: 'timeline',
    pattern: null,
    steps,
    estimatedDurationSeconds: seconds,
    createdAt: new Date().toISOString()
  });
}

// --- Pattern builder ---------------------------------------------------------

function renderPattern() {
  const row = $('pattern-primaries');
  row.innerHTML = '';
  for (const [index, exercise] of state.patternPrimaries.entries()) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.innerHTML = `${escapeHtml(exercise.name)}<span class="chip-remove">✕</span>`;
    chip.addEventListener('click', () => {
      state.patternPrimaries.splice(index, 1);
      renderPattern();
    });
    row.appendChild(chip);
  }

  const anchor = state.patternAnchorId ? catalog.find(state.patternAnchorId) : null;
  $('pattern-anchor-name').textContent = anchor ? anchor.name : 'None';

  const preview = buildPatternSteps();
  $('pattern-summary').textContent = preview.length
    ? `${preview.length} steps · ${describeDuration(preview)}`
    : 'no primaries chosen';
  $('pattern-generate').disabled = !preview.length;
}

function buildPatternSteps() {
  if (!state.patternPrimaries.length) return [];
  return compilePrimaryAnchorRest({
    primaryExerciseIds: state.patternPrimaries.map((exercise) => exercise.id),
    primaryTarget: { mode: 'duration', seconds: Number($('pattern-primary-seconds').value) || 30 },
    anchorExerciseId: state.patternAnchorId,
    anchorTarget: { mode: 'duration', seconds: Number($('pattern-anchor-seconds').value) || 30 },
    restSeconds: Number($('pattern-rest-seconds').value) || 0,
    rounds: Number($('pattern-rounds').value) || 1
  }, catalog.byId());
}

$('pattern-add-primary').addEventListener('click', async () => {
  const exercise = await picker.open();
  if (!exercise) return;
  state.patternPrimaries.push(exercise);
  renderPattern();
});

$('pattern-pick-anchor').addEventListener('click', async () => {
  const exercise = await picker.open();
  if (!exercise) return;
  state.patternAnchorId = exercise.id;
  renderPattern();
});

$('pattern-clear-anchor').addEventListener('click', () => {
  state.patternAnchorId = null;
  renderPattern();
});

for (const id of ['pattern-primary-seconds', 'pattern-anchor-seconds', 'pattern-rest-seconds', 'pattern-rounds']) {
  $(id).addEventListener('input', renderPattern);
}

$('pattern-generate').addEventListener('click', () => {
  // Once generated these are ordinary steps — the compiler owns nothing afterwards.
  state.steps = buildPatternSteps();
  state.sourceTemplateId = null;
  state.sourceTemplate = null;
  $('compose-title').textContent = 'Compose';
  renderCompose();
  showView('compose');
});

// --- Player ------------------------------------------------------------------

function renderPlayer(snapshot) {
  const view = $('view-play');
  const step = snapshot.step;
  if (!step) return;

  const isRest = step.kind === 'rest';
  view.classList.toggle('is-rest', isRest);
  view.classList.toggle('is-paused', snapshot.status === 'paused');
  view.classList.toggle('is-ending', snapshot.remainingSeconds !== null && snapshot.remainingSeconds <= 3);

  $('play-kind').textContent = isRest ? 'Rest' : 'Work';
  $('play-exercise').textContent = step.exerciseName || 'Rest';
  $('play-position').textContent = `${snapshot.index + 1} / ${snapshot.total}`;

  const isReps = step.target.mode === 'reps';
  $('play-count').textContent = isReps ? step.target.reps : (snapshot.remainingSeconds ?? 0);
  $('play-reps-done').classList.toggle('hidden', !isReps);
  $('play-add-ten').disabled = isReps;

  const detail = [];
  if (isReps) detail.push('reps — tap Done when finished');
  if (step.side) detail.push(step.side);
  if (step.loadKg) detail.push(`${step.loadKg} kg`);
  $('play-detail').textContent = detail.join(' · ');

  $('play-next').textContent = snapshot.next
    ? `${snapshot.next.exerciseName || 'Rest'} · ${describeTarget(snapshot.next)}`
    : 'Finish';

  $('play-progress-fill').style.width = `${((snapshot.index) / Math.max(1, snapshot.total)) * 100}%`;

  const remainingSteps = player.steps.slice(snapshot.index + 1);
  const { seconds, hasRepSteps } = estimateDuration(remainingSteps);
  const total = seconds + (snapshot.remainingSeconds || 0);
  $('play-total-remaining').textContent = `${formatDuration(total)}${hasRepSteps ? ' +' : ''} left`;

  $('play-pause').textContent = snapshot.status === 'paused' ? 'Resume' : 'Pause';
}

async function persistDraft() {
  if (!player || player.status === 'finished' || player.status === 'idle') return;
  await db.saveDraft(player.draftState());
}

async function startWorkout(resumeDraft = null) {
  const workout = resumeDraft
    ? resumeDraft.workout
    : { ...createWorkout(state.steps), sourceTemplateId: state.sourceTemplateId };

  state.workout = workout;
  state.steps = workout.steps;
  state.editingDuringPlayback = false;

  if (player) player.destroy();
  player = new Player({
    onTick: renderPlayer,
    onStepChange: (snapshot) => { renderPlayer(snapshot); persistDraft(); },
    onStateChange: (snapshot) => { renderPlayer(snapshot); persistDraft(); },
    onFinish: onWorkoutFinished
  });

  showView('play');
  player.start(workout, resumeDraft);
}

$('start-workout').addEventListener('click', () => {
  // The same button returns to a running workout when the compose view was opened
  // mid-playback, rather than restarting it.
  if (state.editingDuringPlayback) {
    state.editingDuringPlayback = false;
    $('compose-title').textContent = 'Compose';
    $('start-workout').textContent = 'Start workout';
    showView('play');
    renderPlayer(player.snapshot());
    return;
  }
  startWorkout();
});

$('play-pause').addEventListener('click', () => {
  if (player.status === 'paused') player.resume();
  else player.pause();
});
$('play-skip').addEventListener('click', () => player.skip());
$('play-restart').addEventListener('click', () => player.restartStep());
$('play-prev').addEventListener('click', () => player.previousStep());
$('play-add-ten').addEventListener('click', () => player.addSeconds(10));
$('play-reps-done').addEventListener('click', () => player.markRepsDone());

$('play-edit').addEventListener('click', () => {
  // Editing upcoming steps must not stop the timer (COMPOSER_SPEC.md → Player).
  state.editingDuringPlayback = true;
  state.steps = player.steps;
  $('compose-title').textContent = 'Editing (running)';
  $('start-workout').textContent = 'Back to workout';
  renderCompose();
  showView('compose');
  toast('Timer still running');
});

$('play-quit').addEventListener('click', async () => {
  // The timer keeps running behind the dialog — cancelling costs nothing.
  const ok = await dialog.confirm('End this workout?', 'You can still save it to history.', 'End');
  if (ok) player.finish();
});

// --- Finish ------------------------------------------------------------------

let pendingFinish = null;

function onWorkoutFinished(snapshot) {
  pendingFinish = snapshot;
  const elapsed = Math.round((Date.now() - new Date(snapshot.startedAt).getTime()) / 1000);
  $('finish-summary').innerHTML = `<dl>
      <dt>Time</dt><dd>${formatDuration(elapsed)}</dd>
      <dt>Steps completed</dt><dd>${snapshot.completedStepIds.length} / ${snapshot.total}</dd>
      <dt>Skipped</dt><dd>${snapshot.skippedStepIds.length}</dd>
    </dl>`;
  $('finish-name').value = state.workout?.name || '';
  $('finish-note').value = '';
  showView('finish');
}

async function saveSessionRecord() {
  const elapsed = Math.round((Date.now() - new Date(pendingFinish.startedAt).getTime()) / 1000);
  const name = $('finish-name').value.trim() || null;
  state.workout.name = name;
  await db.saveSession({
    id: `sess_${Date.now().toString(36)}`,
    workout: state.workout,
    startedAt: pendingFinish.startedAt,
    finishedAt: new Date().toISOString(),
    completedStepIds: pendingFinish.completedStepIds,
    skippedStepIds: pendingFinish.skippedStepIds,
    actualDurationSeconds: elapsed,
    note: $('finish-note').value.trim() || null
  });
  await db.clearDraft();
}

$('finish-save-template').addEventListener('click', async () => {
  const name = $('finish-name').value.trim() || `Workout ${new Date().toLocaleDateString('en-GB')}`;
  $('finish-name').value = name;
  await saveSessionRecord();
  await saveTemplateFromSteps(name, state.workout.steps);
  toast('Saved to history and templates');
  await goHome();
});

$('finish-save-history').addEventListener('click', async () => {
  await saveSessionRecord();
  toast('Saved to history');
  await goHome();
});

$('finish-discard').addEventListener('click', async () => {
  await db.clearDraft();
  await goHome();
});

// --- Navigation --------------------------------------------------------------

async function goHome() {
  state.steps = [];
  state.workout = null;
  state.sourceTemplateId = null;
  state.sourceTemplate = null;
  state.editingDuringPlayback = false;
  pendingFinish = null;
  $('compose-title').textContent = 'Compose';
  await renderHome();
  showView('home');
}

for (const button of document.querySelectorAll('[data-back]')) {
  button.addEventListener('click', () => {
    if (state.editingDuringPlayback) {
      state.editingDuringPlayback = false;
      $('compose-title').textContent = 'Compose';
      $('start-workout').textContent = 'Start workout';
      showView('play');
      renderPlayer(player.snapshot());
      return;
    }
    goHome();
  });
}

$('go-compose').addEventListener('click', () => {
  state.steps = [];
  state.sourceTemplateId = null;
  state.sourceTemplate = null;
  $('compose-title').textContent = 'Compose';
  renderCompose();
  showView('compose');
});

$('go-pattern').addEventListener('click', () => {
  state.patternPrimaries = [];
  state.patternAnchorId = catalog.find('kettlebell_swing') ? 'kettlebell_swing' : null;
  renderPattern();
  showView('pattern');
});

$('resume-continue').addEventListener('click', async () => {
  const draft = await db.getDraft();
  if (!draft) return;
  // Resume paused: the workout should not restart running while the phone is still
  // in a pocket. The user presses Resume when they are ready.
  await startWorkout(draft);
  player.pause();
});

$('resume-discard').addEventListener('click', async () => {
  await db.clearDraft();
  await renderHome();
});

$('home-export').addEventListener('click', async () => {
  const payload = await db.exportAll();
  const filename = 'workout-sync.json';
  const file = new File([JSON.stringify(payload, null, 2)], filename,
    { type: 'application/json' });

  try {
    // Desktop Chrome can write directly to a user-chosen iCloud Drive file.
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'Workout backup', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(file);
      await writable.close();
      toast('Backup saved');
      return;
    }

    // iPhone PWAs cannot retain an iCloud file handle. The share sheet provides
    // Save to Files → iCloud Drive without pretending this is automatic sync.
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Workout backup' });
      toast('Backup shared');
      return;
    }

    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    toast('Backup downloaded');
  } catch (err) {
    if (err.name !== 'AbortError') toast(`Backup failed: ${err.message}`);
  }
});

$('home-import').addEventListener('click', () => $('import-file').click());

$('import-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    const counts = await db.importAll(payload);
    await catalog.load();
    await renderHome();
    toast(`Restored ${counts.sessions} sessions, ${counts.templates} templates`);
  } catch (err) {
    toast(`Import failed: ${err.message}`);
  } finally {
    event.target.value = '';
  }
});

// Persist on the way out — a phone that kills the tab still leaves a resumable draft.
window.addEventListener('pagehide', () => {
  if (player && (player.status === 'running' || player.status === 'paused')) {
    db.saveDraft(player.draftState());
  }
});

// --- Bootstrap ---------------------------------------------------------------

async function init() {
  await db.init();
  await catalog.load();
  await renderHome();
  showView('home');

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('[app] service worker registration failed:', err.message);
    });
  }
}

init().catch((err) => {
  console.error(err);
  document.body.innerHTML = `<div class="view"><h1>Failed to start</h1>
    <p class="muted">${escapeHtml(err.message)}</p></div>`;
});
