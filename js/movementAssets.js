// movementAssets.js — vetted Lottie movement animations.
//
// These sit ON TOP of the SVG/CSS cues in exerciseGuides.js, they do not replace them.
// Resolution order when an exercise guide is opened:
//
//   Lottie asset (mapped, and reachable) → family SVG/CSS cue → text-only guide
//
// Every asset below was watched through a full loop, renders on the near-black canvas with
// no baked-in background, carries no branding, and is "Free to use under the Lottie Simple
// License" (checked 2026-08-09). Provenance is in data/source_manifest.json.
//
// Deliberate reuse: one lunge animation serves three lunge variants, one swing serves two.
// The library has no asset for the specific variant, and a correct generic movement reads
// better than a wrong specific one.
//
// Do not add an asset here without watching it. Rejected candidates and the reasons are
// listed in MOVEMENT_GRAPHICS.md — several plausible-looking hits are a treasure chest, a
// windmill building, or carry a brand watermark.

const ASSET_BASE = 'assets/lottie/';

// exercise_id → { file, label }
const MOVEMENT_ASSETS = {
  // — consistent set, one creator —
  deadlift:                { file: 'barbell-deadlift.json', label: 'Animated barbell deadlift demonstration' },
  single_arm_row:          { file: 'one-arm-row.json',      label: 'Animated one-arm dumbbell row demonstration' },
  dumbbell_row:            { file: 'one-arm-row.json',      label: 'Animated one-arm dumbbell row demonstration' },
  lat_pulldown:            { file: 'cable-pulldown.json',   label: 'Animated cable pulldown demonstration' },
  kettlebell_swing:        { file: 'swing.json',            label: 'Animated kettlebell swing demonstration' },
  alternating_hand_swing:  { file: 'swing.json',            label: 'Animated kettlebell swing demonstration' },
  single_leg_glute_bridge: { file: 'hip-thrust.json',       label: 'Animated hip thrust demonstration' },

  // — mixed creators, individually vetted —
  squat:                   { file: 'squat.json',            label: 'Animated squat demonstration' },
  kettlebell_squat:        { file: 'squat.json',            label: 'Animated squat demonstration' },
  sumo_squat:              { file: 'sumo-squat.json',       label: 'Animated sumo squat demonstration' },
  sumo_squat_pulse:        { file: 'sumo-squat.json',       label: 'Animated sumo squat demonstration' },
  // Goblet squats get the kettlebell-held-at-centre animation rather than the barbell
  // back squat — the weight position is the whole point of the movement.
  goblet_squat:            { file: 'sumo-squat.json',       label: 'Animated weighted squat demonstration' },
  goblet_squat_pulse:      { file: 'sumo-squat.json',       label: 'Animated weighted squat demonstration' },
  reverse_lunge:           { file: 'lunge.json',            label: 'Animated lunge demonstration' },
  pass_under_lunge:        { file: 'lunge.json',            label: 'Animated lunge demonstration' },
  uneven_lunge:            { file: 'lunge.json',            label: 'Animated lunge demonstration' },
  bulgarian_split_squat:   { file: 'split-squat.json',      label: 'Animated split squat demonstration' },
  overhead_press:          { file: 'overhead-press.json',   label: 'Animated overhead press demonstration' },
  shoulder_push_press:     { file: 'overhead-press.json',   label: 'Animated overhead press demonstration' }
};

export function getMovementAsset(exerciseId) {
  const asset = MOVEMENT_ASSETS[exerciseId];
  if (!asset) return null;
  return { path: ASSET_BASE + asset.file, label: asset.label };
}

export function hasMovementAsset(exerciseId) {
  return Object.hasOwn(MOVEMENT_ASSETS, exerciseId);
}

// Distinct files, for the "download movement graphics" warm-up.
export function allMovementAssetPaths() {
  return [...new Set(Object.values(MOVEMENT_ASSETS).map((a) => ASSET_BASE + a.file))];
}

// Exposed so the smoke test can verify every mapping points at a file that is
// actually shipped, and that no shipped file is left unreferenced.
export function movementAssetEntries() {
  return Object.entries(MOVEMENT_ASSETS).map(([id, asset]) => ({ id, file: asset.file }));
}
