// exerciseFilters.js — pure filtering helpers shared by the exercise library UI.

export const EXERCISE_CATEGORIES = [
  ['strength_upper', 'Upper body'],
  ['strength_lower', 'Lower body'],
  ['cardio_conditioning', 'Conditioning'],
  ['core_prehab', 'Core & prehab'],
  ['custom', 'Custom']
];

export const EXERCISE_CATEGORY_LABELS = new Map(EXERCISE_CATEGORIES);

export function formatFilterLabel(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function equipmentFilterOptions(exercises) {
  return [...new Set(exercises.flatMap((exercise) => exercise.equipment || []))]
    .sort((a, b) => a.localeCompare(b));
}

export function exerciseMatchesFilters(exercise, {
  query = '',
  categories = new Set(),
  equipment = new Set()
} = {}) {
  if (categories.size && !categories.has(exercise.category || 'custom')) return false;

  const exerciseEquipment = new Set(exercise.equipment || []);
  if (equipment.size && ![...equipment].some((item) => exerciseEquipment.has(item))) return false;

  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const category = EXERCISE_CATEGORY_LABELS.get(exercise.category)
    || formatFilterLabel(exercise.category || 'custom');
  return [
    exercise.name,
    ...(exercise.aliases || []),
    ...(exercise.equipment || []),
    category
  ].join(' ').toLowerCase().includes(needle);
}
