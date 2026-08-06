// pattern.js — compiles a compact pattern into ordinary timeline steps.
//
// The compiler owns nothing after it emits. Generated steps are indistinguishable from
// hand-added ones (PLAN.md acceptance criterion) apart from a sourcePatternId used for
// provenance display only. Re-running the compiler replaces, never merges.

import { createWorkStep, createRestStep, newId } from './timeline.js';

// primary_anchor_rest — the R0546 shape:
//
//   for round in 1..rounds:
//       for primary in primaryExerciseIds:
//           work  (primary, primaryTarget)
//           work  (anchor, anchorTarget)     if an anchor is set
//           rest  (restSeconds)              if restSeconds > 0
//
// The trailing rest of the final iteration is dropped: ending a workout on a rest is
// wrong, and keeping it is the difference between a correct and an off-by-one estimate.
export function compilePrimaryAnchorRest(config, exercisesById) {
  const {
    primaryExerciseIds = [],
    primaryTarget = { mode: 'duration', seconds: 30 },
    anchorExerciseId = null,
    anchorTarget = { mode: 'duration', seconds: 30 },
    restSeconds = 30,
    rounds = 1
  } = config;

  const patternId = newId('pat');
  const steps = [];
  const anchor = anchorExerciseId ? exercisesById.get(anchorExerciseId) : null;

  for (let round = 0; round < rounds; round += 1) {
    primaryExerciseIds.forEach((primaryId, primaryIndex) => {
      const primary = exercisesById.get(primaryId);
      if (!primary) return;

      steps.push(createWorkStep(primary, { ...primaryTarget }, { sourcePatternId: patternId }));
      if (anchor) {
        steps.push(createWorkStep(anchor, { ...anchorTarget }, { sourcePatternId: patternId }));
      }

      const isFinal = round === rounds - 1 && primaryIndex === primaryExerciseIds.length - 1;
      if (restSeconds > 0 && !isFinal) {
        steps.push(createRestStep(restSeconds, { sourcePatternId: patternId }));
      }
    });
  }

  return steps;
}

// Read a stored template pattern (snake_case, as in data/workout_templates.json) into
// the camelCase config the compiler takes.
export function configFromStoredPattern(pattern) {
  if (!pattern) return null;
  return {
    primaryExerciseIds: pattern.primary_exercise_ids || [],
    primaryTarget: pattern.primary_target?.mode === 'reps'
      ? { mode: 'reps', reps: pattern.primary_target.reps }
      : { mode: 'duration', seconds: pattern.primary_target?.seconds ?? 30 },
    anchorExerciseId: pattern.anchor?.exercise_id || null,
    anchorTarget: pattern.anchor?.target?.mode === 'reps'
      ? { mode: 'reps', reps: pattern.anchor.target.reps }
      : { mode: 'duration', seconds: pattern.anchor?.target?.seconds ?? 30 },
    restSeconds: pattern.rest_seconds ?? 30,
    rounds: pattern.rounds ?? 1
  };
}

export function compileTemplate(template, exercisesById) {
  if (template.steps?.length) return template.steps.map((step) => ({ ...step }));
  const config = configFromStoredPattern(template.pattern);
  if (!config) return [];
  return compilePrimaryAnchorRest(config, exercisesById);
}
