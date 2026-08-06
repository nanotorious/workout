// ui/picker.js — exercise picker sheet. Resolves to an exercise, or null if dismissed.

import * as catalog from '../catalog.js';
import * as dialog from './dialog.js';

const sheet = document.getElementById('picker');
const searchInput = document.getElementById('picker-search');
const results = document.getElementById('picker-results');
const closeBtn = document.getElementById('picker-close');
const addCustomBtn = document.getElementById('picker-add-custom');

let resolvePick = null;

function close(result) {
  sheet.classList.add('hidden');
  searchInput.value = '';
  const resolve = resolvePick;
  resolvePick = null;
  if (resolve) resolve(result);
}

function render() {
  const query = searchInput.value.trim();
  const groups = catalog.grouped(query);
  results.innerHTML = '';

  if (!groups.length) {
    results.innerHTML = `<p class="empty">No match. Add "${escapeHtml(query)}" as a custom exercise below.</p>`;
    return;
  }

  for (const group of groups) {
    const heading = document.createElement('p');
    heading.className = 'picker-group';
    heading.textContent = group.label;
    results.appendChild(heading);

    for (const exercise of group.items) {
      const row = document.createElement('div');
      row.className = 'picker-item';

      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'card-main';
      pick.innerHTML = `<span class="card-title">${escapeHtml(exercise.name)}</span>
        <span class="card-sub">${describe(exercise)}</span>`;
      pick.addEventListener('click', async () => {
        await catalog.markUsed(exercise.id);
        close(exercise);
      });

      const fav = document.createElement('button');
      fav.type = 'button';
      fav.className = `picker-fav${exercise.isFavourite ? ' is-on' : ''}`;
      fav.textContent = exercise.isFavourite ? '★' : '☆';
      fav.setAttribute('aria-label', 'Toggle favourite');
      fav.addEventListener('click', async (event) => {
        event.stopPropagation();
        await catalog.toggleFavourite(exercise.id);
        render();
      });

      row.append(pick, fav);
      results.appendChild(row);
    }
  }
}

function describe(exercise) {
  const target = exercise.defaultTarget;
  const targetText = target.mode === 'reps' ? `${target.reps} reps` : `${target.seconds}s`;
  const equipment = (exercise.equipment || []).join(', ');
  return equipment ? `${targetText} · ${equipment}` : targetText;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
  ));
}

searchInput.addEventListener('input', render);
closeBtn.addEventListener('click', () => close(null));
sheet.addEventListener('click', (event) => { if (event.target === sheet) close(null); });

addCustomBtn.addEventListener('click', async () => {
  // Add Custom Exercise requires only a name (COMPOSER_SPEC.md → Exercise Picker).
  const name = searchInput.value.trim()
    || await dialog.prompt('Exercise name', { placeholder: 'e.g. Turkish Get-Up', confirmLabel: 'Add' });
  if (!name) return;
  const exercise = await catalog.addCustom(name);
  if (exercise) {
    await catalog.markUsed(exercise.id);
    close(exercise);
  }
});

export function open() {
  sheet.classList.remove('hidden');
  render();
  // Do not autofocus: on a phone that opens the keyboard over the list, and the common
  // case is tapping a recent exercise rather than typing.
  return new Promise((resolve) => { resolvePick = resolve; });
}
