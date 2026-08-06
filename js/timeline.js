// timeline.js — operations on the flat ordered step array.
//
// The timeline is the single playback format. Patterns compile into it (pattern.js);
// the player consumes it and nothing else. Every function here is pure: it returns a
// new steps array rather than mutating, which keeps undo and live-edit-while-running
// straightforward.

export function newId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function createWorkStep(exercise, target, extras = {}) {
  return {
    id: newId('step'),
    kind: 'work',
    exerciseId: exercise.id,
    // Denormalised on purpose: history must stay readable if the catalogue entry is
    // later renamed or deleted.
    exerciseName: exercise.name,
    target: target || exercise.defaultTarget || { mode: 'duration', seconds: 30 },
    side: extras.side || null,
    loadKg: extras.loadKg ?? null,
    notes: extras.notes || null,
    sourcePatternId: extras.sourcePatternId || null
  };
}

export function createRestStep(seconds, extras = {}) {
  return {
    id: newId('step'),
    kind: 'rest',
    exerciseId: null,
    exerciseName: null,
    target: { mode: 'duration', seconds },
    side: null,
    loadKg: null,
    notes: null,
    sourcePatternId: extras.sourcePatternId || null
  };
}

export function createWorkout(steps = []) {
  return {
    id: newId('wk'),
    name: null,
    createdAt: new Date().toISOString(),
    steps,
    estimatedDurationSeconds: estimateDuration(steps).seconds,
    sourceTemplateId: null
  };
}

export const addStep = (steps, step) => [...steps, step];

export const removeStep = (steps, stepId) => steps.filter((step) => step.id !== stepId);

export function duplicateStep(steps, stepId) {
  const index = steps.findIndex((step) => step.id === stepId);
  if (index === -1) return steps;
  const copy = { ...steps[index], id: newId('step') };
  return [...steps.slice(0, index + 1), copy, ...steps.slice(index + 1)];
}

export function moveStep(steps, stepId, delta) {
  const index = steps.findIndex((step) => step.id === stepId);
  const target = index + delta;
  if (index === -1 || target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}

export function updateStep(steps, stepId, changes) {
  return steps.map((step) => (step.id === stepId ? { ...step, ...changes } : step));
}

// Repeat a contiguous selection N further times, e.g. select three steps and repeat 3×
// to get the block four times in total.
export function repeatRange(steps, fromIndex, toIndex, times) {
  const block = steps.slice(fromIndex, toIndex + 1);
  if (!block.length || times < 1) return steps;
  const copies = [];
  for (let round = 0; round < times; round += 1) {
    for (const step of block) copies.push({ ...step, id: newId('step') });
  }
  return [...steps.slice(0, toIndex + 1), ...copies, ...steps.slice(toIndex + 1)];
}

// A workout containing repetition steps has no computable total duration (AUDIT.md F5).
// Report what is known and flag the rest so the UI can show "12 min +" rather than a
// number it cannot stand behind.
export function estimateDuration(steps) {
  let seconds = 0;
  let hasRepSteps = false;
  for (const step of steps) {
    if (step.target?.mode === 'duration') seconds += step.target.seconds || 0;
    else hasRepSteps = true;
  }
  return { seconds, hasRepSteps };
}

export function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) return `${seconds}s`;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function describeDuration(steps) {
  const { seconds, hasRepSteps } = estimateDuration(steps);
  if (!steps.length) return 'empty';
  return hasRepSteps ? `${formatDuration(seconds)} +` : formatDuration(seconds);
}

export function describeTarget(step) {
  if (!step.target) return '';
  return step.target.mode === 'reps' ? `${step.target.reps} reps` : `${step.target.seconds}s`;
}
