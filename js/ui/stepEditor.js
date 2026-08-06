// ui/stepEditor.js — edit one step's target, side, and load; or act on it
// (duplicate / move / delete). Resolves to an action object the caller applies.

const sheet = document.getElementById('step-editor');
const title = document.getElementById('step-editor-title');
const modeSeg = document.getElementById('step-mode');
const valueLabel = document.getElementById('step-value-label');
const valueInput = document.getElementById('step-value');
const presets = document.getElementById('step-presets');
const sideField = document.getElementById('step-side-field');
const sideSeg = document.getElementById('step-side');
const loadField = document.getElementById('step-load-field');
const loadInput = document.getElementById('step-load');

const WORK_PRESETS = [20, 30, 40, 45, 60];
const REST_PRESETS = [15, 30, 45, 60, 90];
const REP_PRESETS = [5, 8, 10, 12, 15];

let resolveEdit = null;
let mode = 'duration';
let side = null;
let currentStep = null;

function close(result) {
  sheet.classList.add('hidden');
  const resolve = resolveEdit;
  resolveEdit = null;
  if (resolve) resolve(result);
}

function presetValues() {
  if (mode === 'reps') return REP_PRESETS;
  return currentStep?.kind === 'rest' ? REST_PRESETS : WORK_PRESETS;
}

function renderPresets() {
  presets.innerHTML = '';
  for (const value of presetValues()) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip${Number(valueInput.value) === value ? ' is-active' : ''}`;
    chip.textContent = mode === 'reps' ? `${value}` : `${value}s`;
    chip.addEventListener('click', () => {
      valueInput.value = value;
      renderPresets();
    });
    presets.appendChild(chip);
  }
}

function renderMode() {
  for (const btn of modeSeg.querySelectorAll('.seg-btn')) {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  }
  valueLabel.textContent = mode === 'reps' ? 'Repetitions' : 'Seconds';
  renderPresets();
}

function renderSide() {
  for (const btn of sideSeg.querySelectorAll('.seg-btn')) {
    btn.classList.toggle('is-active', (btn.dataset.side || null) === side);
  }
}

modeSeg.addEventListener('click', (event) => {
  const btn = event.target.closest('.seg-btn');
  if (!btn) return;
  mode = btn.dataset.mode;
  renderMode();
});

sideSeg.addEventListener('click', (event) => {
  const btn = event.target.closest('.seg-btn');
  if (!btn) return;
  side = btn.dataset.side || null;
  renderSide();
});

valueInput.addEventListener('input', renderPresets);

document.getElementById('step-editor-close').addEventListener('click', () => close(null));
sheet.addEventListener('click', (event) => { if (event.target === sheet) close(null); });

document.getElementById('step-apply').addEventListener('click', () => {
  const value = Number(valueInput.value);
  if (!value || value < 1) { close(null); return; }
  close({
    action: 'update',
    changes: {
      target: mode === 'reps' ? { mode: 'reps', reps: value } : { mode: 'duration', seconds: value },
      side: currentStep.kind === 'rest' ? null : side,
      loadKg: loadInput.value === '' ? null : Number(loadInput.value)
    }
  });
});

document.getElementById('step-duplicate').addEventListener('click', () => close({ action: 'duplicate' }));
document.getElementById('step-up').addEventListener('click', () => close({ action: 'move', delta: -1 }));
document.getElementById('step-down').addEventListener('click', () => close({ action: 'move', delta: 1 }));
document.getElementById('step-delete').addEventListener('click', () => close({ action: 'delete' }));

export function open(step, { allowDelete = true } = {}) {
  currentStep = step;
  mode = step.target?.mode || 'duration';
  side = step.side || null;

  title.textContent = step.kind === 'rest' ? 'Rest' : step.exerciseName;
  valueInput.value = mode === 'reps' ? step.target.reps : step.target.seconds;
  loadInput.value = step.loadKg ?? '';

  const isRest = step.kind === 'rest';
  sideField.classList.toggle('hidden', isRest);
  loadField.classList.toggle('hidden', isRest);
  // A rest is a duration by definition — offering a reps mode here would be nonsense.
  modeSeg.classList.toggle('hidden', isRest);
  if (isRest) mode = 'duration';

  document.getElementById('step-delete').classList.toggle('hidden', !allowDelete);

  renderMode();
  renderSide();
  sheet.classList.remove('hidden');
  return new Promise((resolve) => { resolveEdit = resolve; });
}
