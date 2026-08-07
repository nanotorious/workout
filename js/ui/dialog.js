// ui/dialog.js — in-app confirm and prompt.
//
// Native confirm()/prompt() block the whole page: the timer stops being repainted and
// the tab stops responding until the modal is dismissed. Mid-workout that is exactly
// wrong, so asking happens in the page instead.

const sheet = document.getElementById('dialog');
const titleEl = document.getElementById('dialog-title');
const messageEl = document.getElementById('dialog-message');
const inputEl = document.getElementById('dialog-input');
const confirmBtn = document.getElementById('dialog-confirm');
const cancelBtn = document.getElementById('dialog-cancel');

let resolveDialog = null;
let mode = 'confirm';

function close(result) {
  sheet.classList.add('hidden');
  const resolve = resolveDialog;
  resolveDialog = null;
  if (resolve) resolve(result);
}

confirmBtn.addEventListener('click', () => {
  if (mode === 'prompt') {
    const value = inputEl.value.trim();
    close(value || null);
  } else {
    close(true);
  }
});

cancelBtn.addEventListener('click', () => close(mode === 'prompt' ? null : false));
sheet.addEventListener('click', (event) => {
  if (event.target === sheet) close(mode === 'prompt' ? null : false);
});

inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') confirmBtn.click();
});

function open({ title, message = '', kind, value = '', placeholder = '', confirmLabel }) {
  mode = kind;
  titleEl.textContent = title;
  messageEl.textContent = message;
  messageEl.classList.toggle('hidden', !message);
  inputEl.classList.toggle('hidden', kind !== 'prompt');
  inputEl.value = value;
  inputEl.placeholder = placeholder;
  inputEl.type = kind === 'number' ? 'number' : 'text';
  cancelBtn.classList.toggle('hidden', kind === 'alert');
  cancelBtn.parentElement.classList.toggle('single-action', kind === 'alert');
  confirmBtn.textContent = confirmLabel || 'OK';
  sheet.classList.remove('hidden');
  if (kind === 'prompt') setTimeout(() => inputEl.focus(), 50);
  return new Promise((resolve) => { resolveDialog = resolve; });
}

export const confirm = (title, message, confirmLabel = 'Confirm') =>
  open({ title, message, kind: 'confirm', confirmLabel });

export const prompt = (title, { value = '', placeholder = '', confirmLabel = 'Save' } = {}) =>
  open({ title, kind: 'prompt', value, placeholder, confirmLabel });

export const alert = (title, message, confirmLabel = 'Got it') =>
  open({ title, message, kind: 'alert', confirmLabel });
