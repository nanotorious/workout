// catalog.js — the exercise library: load, order, search, and create custom entries.

import * as db from './db.js';
import { newId } from './timeline.js';

let exercises = [];

export async function load() {
  exercises = await db.listExercises();
  return exercises;
}

export const all = () => exercises;

export const byId = () => new Map(exercises.map((exercise) => [exercise.id, exercise]));

export const find = (id) => exercises.find((exercise) => exercise.id === id) || null;

export async function markUsed(exerciseId) {
  const exercise = find(exerciseId);
  if (!exercise) return;
  exercise.lastUsedAt = new Date().toISOString();
  await db.saveExercise(exercise);
}

export async function toggleFavourite(exerciseId) {
  const exercise = find(exerciseId);
  if (!exercise) return null;
  exercise.isFavourite = !exercise.isFavourite;
  await db.saveExercise(exercise);
  return exercise;
}

// Add Custom Exercise requires only a name (COMPOSER_SPEC.md → Exercise Picker).
// Everything else is optional and editable later.
export async function addCustom(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const existing = exercises.find((e) => e.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) return existing;

  const exercise = {
    id: newId('ex'),
    name: trimmed,
    category: 'custom',
    group: 'custom',
    aliases: [],
    equipment: [],
    defaultTarget: { mode: 'duration', seconds: 30 },
    isFavourite: false,
    isCustom: true,
    lastUsedAt: null
  };
  await db.saveExercise(exercise);
  exercises.push(exercise);
  return exercise;
}

function matches(exercise, query) {
  const needle = query.toLowerCase();
  if (exercise.name.toLowerCase().includes(needle)) return true;
  return (exercise.aliases || []).some((alias) => alias.toLowerCase().includes(needle));
}

// Ordering per COMPOSER_SPEC.md: recent → favourites → search matches → full list.
export function grouped(query = '') {
  const pool = query ? exercises.filter((e) => matches(e, query)) : exercises;

  if (query) return [{ label: 'Matches', items: pool }];

  const recent = pool
    .filter((e) => e.lastUsedAt)
    .sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1))
    .slice(0, 6);
  const recentIds = new Set(recent.map((e) => e.id));

  const favourites = pool.filter((e) => e.isFavourite && !recentIds.has(e.id));
  const favouriteIds = new Set(favourites.map((e) => e.id));

  const rest = pool
    .filter((e) => !recentIds.has(e.id) && !favouriteIds.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    { label: 'Recent', items: recent },
    { label: 'Favourites', items: favourites },
    { label: 'All exercises', items: rest }
  ].filter((group) => group.items.length);
}
