// db.js — the only module that touches storage.
//
// Persisted JSON keys are snake_case (matching data/*.json); JavaScript identifiers are
// camelCase. The mapping happens here and nowhere else — see HANDOFF.md → Data shapes.

const DB_NAME = 'workoutApp';
const DB_VERSION = 1;
const BUNDLED_CONTENT_VERSION = 4;
const SEED_CATALOG_URL = 'data/exercise_catalog.json';
const SEED_TEMPLATES_URL = 'data/workout_templates.json';

export const DRAFT_KEY = 'draft_current';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('exercises')) db.createObjectStore('exercises', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(storeName, mode, action) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = action(store);
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  }));
}

const getAll = (storeName) => tx(storeName, 'readonly', (store) => store.getAll());
const getOne = (storeName, key) => tx(storeName, 'readonly', (store) => store.get(key));
const putOne = (storeName, value) => tx(storeName, 'readwrite', (store) => store.put(value));
const deleteOne = (storeName, key) => tx(storeName, 'readwrite', (store) => store.delete(key));

// --- Key mapping -------------------------------------------------------------
// Explicit per-shape rather than a generic recursive converter: the stored shapes are
// few and stable, and an explicit map makes an unexpected field loud instead of silent.

function targetFromStored(stored) {
  if (!stored) return null;
  return stored.mode === 'reps'
    ? { mode: 'reps', reps: stored.reps }
    : { mode: 'duration', seconds: stored.seconds };
}

function targetToStored(target) {
  if (!target) return null;
  return target.mode === 'reps'
    ? { mode: 'reps', reps: target.reps }
    : { mode: 'duration', seconds: target.seconds };
}

export function exerciseFromStored(stored) {
  return {
    id: stored.id,
    name: stored.name,
    category: stored.category,
    group: stored.group,
    aliases: stored.aliases || [],
    equipment: stored.equipment || [],
    defaultTarget: targetFromStored(stored.default_target) || { mode: 'duration', seconds: 30 },
    isFavourite: Boolean(stored.is_favourite),
    isCustom: Boolean(stored.is_custom),
    lastUsedAt: stored.last_used_at || null
  };
}

export function exerciseToStored(exercise) {
  return {
    id: exercise.id,
    name: exercise.name,
    category: exercise.category,
    group: exercise.group,
    aliases: exercise.aliases || [],
    equipment: exercise.equipment || [],
    default_target: targetToStored(exercise.defaultTarget),
    is_favourite: Boolean(exercise.isFavourite),
    is_custom: Boolean(exercise.isCustom),
    last_used_at: exercise.lastUsedAt || null
  };
}

export function stepFromStored(stored) {
  return {
    id: stored.id,
    kind: stored.kind,
    exerciseId: stored.exercise_id || null,
    exerciseName: stored.exercise_name || null,
    target: targetFromStored(stored.target),
    side: stored.side || null,
    loadKg: stored.load_kg ?? null,
    notes: stored.notes || null,
    sourcePatternId: stored.source_pattern_id || null
  };
}

export function stepToStored(step) {
  return {
    id: step.id,
    kind: step.kind,
    exercise_id: step.exerciseId || null,
    exercise_name: step.exerciseName || null,
    target: targetToStored(step.target),
    side: step.side || null,
    load_kg: step.loadKg ?? null,
    notes: step.notes || null,
    source_pattern_id: step.sourcePatternId || null
  };
}

export function workoutFromStored(stored) {
  return {
    id: stored.id,
    name: stored.name || null,
    createdAt: stored.created_at,
    steps: (stored.steps || []).map(stepFromStored),
    estimatedDurationSeconds: stored.estimated_duration_seconds ?? null,
    sourceTemplateId: stored.source_template_id || null
  };
}

export function workoutToStored(workout) {
  return {
    id: workout.id,
    name: workout.name || null,
    created_at: workout.createdAt,
    steps: (workout.steps || []).map(stepToStored),
    estimated_duration_seconds: workout.estimatedDurationSeconds ?? null,
    source_template_id: workout.sourceTemplateId || null
  };
}

function draftFromStored(stored) {
  if (!stored) return null;
  return {
    id: stored.id,
    workout: workoutFromStored(stored.workout),
    currentStepIndex: stored.current_step_index,
    stepElapsedSeconds: stored.step_elapsed_seconds,
    startedAt: stored.started_at,
    status: stored.status,
    completedStepIds: stored.completed_step_ids || [],
    skippedStepIds: stored.skipped_step_ids || []
  };
}

function draftToStored(draft) {
  return {
    id: draft.id,
    workout: workoutToStored(draft.workout),
    current_step_index: draft.currentStepIndex,
    step_elapsed_seconds: draft.stepElapsedSeconds,
    started_at: draft.startedAt,
    status: draft.status,
    completed_step_ids: draft.completedStepIds || [],
    skipped_step_ids: draft.skippedStepIds || []
  };
}

function bundledVideoUrl(stored) {
  if (stored.video_url) return stored.video_url;
  if (stored.id === 'r0546_kettlebell_pattern') return 'https://youtu.be/VCcar3MA07w';
  if (stored.status !== 'monthly focus') return null;
  const match = (stored.source_ref || '').match(/([A-Za-z0-9_-]{11})$/);
  return match ? `https://youtu.be/${match[1]}` : null;
}

function templateFromStored(stored) {
  return {
    id: stored.id,
    name: stored.name,
    sourceRef: stored.source_ref || null,
    videoUrl: bundledVideoUrl(stored),
    status: stored.status || 'user',
    composerMode: stored.composer_mode || 'timeline',
    pattern: stored.pattern || null,
    steps: (stored.steps || []).map(stepFromStored),
    estimatedDurationSeconds: stored.estimated_duration_seconds ?? null,
    createdAt: stored.created_at || null
  };
}

function templateToStored(template) {
  return {
    id: template.id,
    name: template.name,
    source_ref: template.sourceRef || null,
    video_url: template.videoUrl || null,
    status: template.status || 'user',
    composer_mode: template.composerMode || 'timeline',
    pattern: template.pattern || null,
    steps: (template.steps || []).map(stepToStored),
    estimated_duration_seconds: template.estimatedDurationSeconds ?? null,
    created_at: template.createdAt || null
  };
}

function sessionFromStored(stored) {
  return {
    id: stored.id,
    workout: workoutFromStored(stored.workout),
    startedAt: stored.started_at,
    finishedAt: stored.finished_at,
    completedStepIds: stored.completed_step_ids || [],
    skippedStepIds: stored.skipped_step_ids || [],
    actualDurationSeconds: stored.actual_duration_seconds ?? null,
    note: stored.note || null
  };
}

function sessionToStored(session) {
  return {
    id: session.id,
    workout: workoutToStored(session.workout),
    started_at: session.startedAt,
    finished_at: session.finishedAt,
    completed_step_ids: session.completedStepIds || [],
    skipped_step_ids: session.skippedStepIds || [],
    actual_duration_seconds: session.actualDurationSeconds ?? null,
    note: session.note || null
  };
}

// --- Seeding -----------------------------------------------------------------

async function fetchJson(url) {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

// Exercises whose meaning is still unresolved must not reach the picker.
// See AUDIT.md F4 and STATUS.md → Open Decisions.
const isUnresolved = (exercise) => exercise.category === 'unresolved';

// The seed catalogue predates default_target/equipment (AUDIT.md F4). Rather than
// rewrite the shipped file, derive sensible defaults by group at seed time so every
// added step arrives pre-filled instead of empty.
const GROUP_DEFAULTS = {
  conditioning: { target: { mode: 'duration', seconds: 30 }, equipment: ['kettlebell'] },
  running: { target: { mode: 'duration', seconds: 300 }, equipment: [] },
  core_stability: { target: { mode: 'duration', seconds: 45 }, equipment: ['mat'] },
  lower_body: { target: { mode: 'reps', reps: 10 }, equipment: [] },
  chest_push: { target: { mode: 'reps', reps: 8 }, equipment: [] },
  back_pull: { target: { mode: 'reps', reps: 8 }, equipment: [] }
};

const KETTLEBELL_IDS = new Set([
  'kettlebell_swing', 'kettlebell_snatch', 'kettlebell_squat',
  'goblet_squat', 'farmer_carry', 'clean_and_press'
]);

function applySeedDefaults(stored) {
  const fallback = GROUP_DEFAULTS[stored.group] || { target: { mode: 'reps', reps: 10 }, equipment: [] };
  const equipment = KETTLEBELL_IDS.has(stored.id) ? ['kettlebell'] : fallback.equipment;
  return {
    ...stored,
    equipment: stored.equipment || equipment,
    default_target: stored.default_target || fallback.target
  };
}

async function seedIfEmpty() {
  const seeded = await getOne('meta', 'seeded_at');
  if (seeded) return;

  const catalog = await fetchJson(SEED_CATALOG_URL);
  const exercises = (catalog.exercises || []).filter((e) => !isUnresolved(e)).map(applySeedDefaults);
  for (const exercise of exercises) await putOne('exercises', exercise);

  try {
    const templates = await fetchJson(SEED_TEMPLATES_URL);
    for (const template of templates.templates || []) await putOne('templates', template);
  } catch (err) {
    console.warn('[db] no seed templates:', err.message);
  }

  await putOne('meta', { key: 'seeded_at', value: new Date().toISOString() });
  await putOne('meta', { key: 'schema_version', value: 1 });
  await putOne('meta', { key: 'bundled_content_version', value: BUNDLED_CONTENT_VERSION });
  console.info(`[db] seeded ${exercises.length} exercises`);
}

// Seed files used to be read only on a brand-new install. Bundled monthly templates
// must also reach an existing phone without clearing its history, custom exercises, or
// user-made templates. Content updates therefore insert only IDs that are not already
// present and record their own version independently of the database schema.
async function syncBundledContent() {
  const current = await getOne('meta', 'bundled_content_version');
  if ((current?.value || 0) >= BUNDLED_CONTENT_VERSION) return;

  const catalog = await fetchJson(SEED_CATALOG_URL);
  const exercises = (catalog.exercises || []).filter((e) => !isUnresolved(e)).map(applySeedDefaults);
  for (const exercise of exercises) {
    if (!await getOne('exercises', exercise.id)) await putOne('exercises', exercise);
  }

  const templates = await fetchJson(SEED_TEMPLATES_URL);
  for (const template of templates.templates || []) {
    if (await getOne('meta', `deleted_template:${template.id}`)) continue;
    const existing = await getOne('templates', template.id);
    // Seeded templates are managed bundled content. Refresh them so a link or timing
    // correction reaches phones that received an earlier version. User-created
    // templates are never overwritten, and deletion tombstones above still win.
    if (!existing || template.status !== 'user') await putOne('templates', template);
  }

  await putOne('meta', { key: 'bundled_content_version', value: BUNDLED_CONTENT_VERSION });
}

export async function init() {
  await openDb();
  await seedIfEmpty();
  await syncBundledContent();
}

// --- Public API --------------------------------------------------------------

export async function listExercises() {
  const rows = await getAll('exercises');
  return rows.filter((row) => !isUnresolved(row)).map(exerciseFromStored);
}

export async function saveExercise(exercise) {
  await putOne('exercises', exerciseToStored(exercise));
  return exercise;
}

export async function listTemplates() {
  const rows = await getAll('templates');
  return rows.map(templateFromStored);
}

export async function getTemplate(id) {
  const row = await getOne('templates', id);
  return row ? templateFromStored(row) : null;
}

export async function saveTemplate(template) {
  await putOne('templates', templateToStored(template));
  await deleteOne('meta', `deleted_template:${template.id}`);
  return template;
}

export async function deleteTemplate(id) {
  await deleteOne('templates', id);
  // A later bundled-content update must not resurrect a template deliberately removed.
  await putOne('meta', { key: `deleted_template:${id}`, value: true });
}

export async function getDraft() {
  const row = await getOne('drafts', DRAFT_KEY);
  return draftFromStored(row);
}

export async function saveDraft(draft) {
  await putOne('drafts', draftToStored({ ...draft, id: DRAFT_KEY }));
}

export async function clearDraft() {
  await deleteOne('drafts', DRAFT_KEY);
}

export async function listSessions() {
  const rows = await getAll('sessions');
  return rows.map(sessionFromStored).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1));
}

export async function saveSession(session) {
  await putOne('sessions', sessionToStored(session));
  return session;
}

// Export writes the stored shape verbatim, so an export file is directly comparable
// with the seed files in data/ — see AUDIT.md F1.
export async function exportAll() {
  const [exercises, templates, sessions] = await Promise.all([
    getAll('exercises'), getAll('templates'), getAll('sessions')
  ]);
  return {
    schema_version: 1,
    exported_at: new Date().toISOString(),
    exercises,
    templates,
    sessions
  };
}

// The counterpart to exportAll. IndexedDB is origin-scoped, so moving the app to a
// different address (LAN IP → https host) starts from an empty database — without an
// import, an export is a read-only dump rather than a backup. See AUDIT.md F8.
export function validateImport(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Not a workout export file');
  if (payload.schema_version !== 1) throw new Error(`Unsupported schema_version: ${payload.schema_version}`);
  for (const store of ['exercises', 'templates', 'sessions']) {
    if (payload[store] !== undefined && !Array.isArray(payload[store])) {
      throw new Error(`${store} must be a list`);
    }
  }
  return true;
}

export async function importAll(payload) {
  validateImport(payload);

  const counts = { exercises: 0, templates: 0, sessions: 0 };
  // Merge rather than replace: importing an old backup must not delete newer sessions.
  // Matching ids are overwritten, which makes a repeated import idempotent.
  for (const store of ['exercises', 'templates', 'sessions']) {
    for (const row of payload[store] || []) {
      if (!row?.id) continue;
      await putOne(store, row);
      counts[store] += 1;
    }
  }
  await putOne('meta', { key: 'seeded_at', value: new Date().toISOString() });
  return counts;
}
