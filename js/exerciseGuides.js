// exerciseGuides.js — compact, offline movement notes for the bundled catalogue.
// These are recognition cues, not a substitute for coaching or pain/injury advice.

const guide = (setup, move, cue, demo = null) => ({ setup, move, cue, demo });

const GUIDES = {
  bench_press: guide(
    'Lie with eyes under the bar, feet planted, and shoulder blades gently set back.',
    'Lower the bar toward the mid-chest, then press it up until the arms are straight.',
    'Keep wrists stacked over elbows and your upper back connected to the bench.',
    'press'
  ),
  incline_bench_press: guide(
    'Set the bench to a low incline, plant the feet, and hold the weights above the upper chest.',
    'Lower with elbows slightly below shoulder level, then press up and slightly inward.',
    'Keep the ribs controlled instead of turning the press into a steep back arch.',
    'press'
  ),
  chest_flys_free: guide(
    'Lie back with weights above the chest, palms facing, and a soft bend in the elbows.',
    'Open the arms in a wide arc, then bring the weights back together above the chest.',
    'Keep the elbow angle nearly fixed and stop before the shoulders feel overstretched.'
  ),
  chest_flys_machine: guide(
    'Adjust the seat so the handles line up with mid-chest and keep your back on the pad.',
    'Bring the handles together smoothly, pause, then return under control.',
    'Lead with the elbows and avoid letting the weight stack slam.'
  ),
  clean_and_press: guide(
    'Start with the weight close to the body, feet about hip-width, and brace the trunk.',
    'Drive through the legs to receive the weight at the shoulders, then press overhead.',
    'Keep the weight close during the clean and finish stacked over the middle of the foot.'
  ),
  shoulder_flys: guide(
    'Stand tall with light weights by your sides and elbows softly bent.',
    'Raise the arms out to about shoulder height, then lower slowly.',
    'Use a controlled range and keep the shoulders away from the ears.'
  ),
  pull_ups: guide(
    'Hang from the bar with a firm grip, long arms, and a lightly braced trunk.',
    'Pull the chest toward the bar, then lower to a controlled full hang.',
    'Start by drawing the shoulder blades down; avoid kicking for momentum.'
  ),
  lat_pulldown: guide(
    'Sit securely with thighs under the pad and grip the bar just outside shoulder width.',
    'Pull the bar toward the upper chest, then let the arms lengthen under control.',
    'Keep the torso mostly still and drive the elbows down rather than behind you.'
  ),
  machine_row_chest_supported: guide(
    'Set the chest pad so you can reach the handles with long arms and a neutral spine.',
    'Pull the handles toward the ribs, pause, then return until the shoulder blades spread.',
    'Keep the chest on the pad and avoid shrugging.'
  ),
  face_pull: guide(
    'Set a rope around eye level and step back with arms long.',
    'Pull the rope toward the face while separating the hands, then return slowly.',
    'Finish with elbows high and shoulder blades gently back, without arching the lower back.'
  ),
  back_flys: guide(
    'Hinge or sit supported with light weights and arms hanging beneath the shoulders.',
    'Open the arms wide until they align with the torso, then lower under control.',
    'Move from the upper back and keep the neck relaxed.'
  ),
  dumbbell_row: guide(
    'Support one hand and knee, keep the back long, and let the working arm hang.',
    'Pull the dumbbell toward the hip, then lower until the arm is long again.',
    'Keep the torso square and avoid twisting to lift the weight.',
    'row'
  ),
  deadlift: guide(
    'Stand with the load over mid-foot, hinge to grip it, and brace with a long spine.',
    'Push the floor away and stand tall, then send the hips back to lower the load.',
    'Keep the load close and let hips and shoulders rise together.',
    'hinge'
  ),
  squat: guide(
    'Stand around shoulder-width with feet rooted and trunk braced.',
    'Sit down between the hips, then drive through the whole foot to stand.',
    'Let knees track with the toes and use the deepest controlled range you own.',
    'squat'
  ),
  leg_press: guide(
    'Place the feet securely on the platform and keep hips and back against the pad.',
    'Lower until the knees are comfortably bent, then press the platform away.',
    'Keep knees tracking with toes and stop before the pelvis curls off the pad.'
  ),
  kettlebell_squat: guide(
    'Hold the kettlebell close to the chest and set the feet around shoulder-width.',
    'Lower between the hips, pause with control, then stand tall.',
    'Keep the bell close and maintain pressure through the whole foot.',
    'squat'
  ),
  goblet_squat: guide(
    'Cup the kettlebell or dumbbell at the chest and stand with feet around shoulder-width.',
    'Sit down between the hips, then push the floor away to stand.',
    'Keep elbows inside the knees and the load close to the torso.',
    'squat'
  ),
  reverse_lunge: guide(
    'Stand tall with feet under the hips and space clear behind you.',
    'Step one foot back, lower both knees, then push through the front foot to return.',
    'Keep the front knee tracking over the foot and the torso controlled.',
    'lunge'
  ),
  indoor_run: guide(
    'Start at an easy pace with a tall posture and relaxed hands.',
    'Build speed gradually while letting the arms swing naturally beside the body.',
    'Land quietly beneath you and use a pace you can sustain.',
    'run'
  ),
  outdoor_run: guide(
    'Begin easy, scan the route ahead, and settle into a tall relaxed posture.',
    'Run with short natural steps and let the arms move freely.',
    'Stay visible, adapt to the surface, and slow down before form becomes strained.',
    'run'
  ),
  kettlebell_swing: guide(
    'Set the bell slightly ahead, hinge back, and hike it high between the thighs.',
    'Snap the hips forward so the bell floats, then guide it back into the next hinge.',
    'Power comes from the hips—not a squat or an arm raise.',
    'swing'
  ),
  kettlebell_snatch: guide(
    'Start as for a one-arm swing with the bell close and the shoulder packed.',
    'Drive with the hips, guide the bell upward, and punch the hand through to finish overhead.',
    'Keep the bell close so it wraps softly around the wrist; practise with a light load first.'
  ),
  farmer_carry: guide(
    'Stand tall between the loads, grip firmly, and brace before lifting.',
    'Walk with short steady steps while keeping the weights quiet at your sides.',
    'Stay tall, keep ribs stacked over hips, and avoid leaning.'
  ),
  mcgill_big_three: guide(
    'Use the modified curl-up, side plank, and bird dog as three separate controlled holds.',
    'Brace gently, hold each position without losing alignment, and breathe normally.',
    'Quality matters more than range or fatigue; stop if a position increases pain.'
  ),
  landmine_press: guide(
    'Hold the bar end near one shoulder in a split or square stance and brace.',
    'Press forward and upward along the bar path, then return to the shoulder.',
    'Reach through the top without leaning back or shrugging.'
  ),
  single_arm_row: guide(
    'Use a staggered stance or support, hinge with a long back, and let one arm hang.',
    'Pull the weight toward the hip, pause, then lower to a long arm.',
    'Keep hips and shoulders square rather than rotating with the pull.',
    'row'
  ),
  pass_under_lunge: guide(
    'Hold the kettlebell in one hand and step into a controlled lunge.',
    'At the bottom, pass the bell beneath the front thigh to the other hand, then stand.',
    'Stay balanced and make the hand-off slow enough to keep the front foot rooted.',
    'lunge'
  ),
  alternating_hand_swing: guide(
    'Begin with a two-hand swing pattern and a confident hip hinge.',
    'When the bell floats, release one hand and receive it with the other before hinging again.',
    'Switch only during the weightless float; keep the free hand clear of the bell.',
    'swing'
  ),
  sumo_squat_pulse: guide(
    'Take a wide stance with toes turned out comfortably and hold the load centrally.',
    'Lower into a squat, make a small controlled pulse, then stand.',
    'Keep knees tracking over toes and make the pulse shallow, not bouncy.',
    'squat'
  ),
  uneven_lunge: guide(
    'Hold the weight on one side and set up in a stable split stance.',
    'Lower both knees under control, then drive through the front foot to stand.',
    'Resist being pulled sideways; complete both sides evenly.',
    'lunge'
  ),
  staggered_rdl: guide(
    'Place most weight on the front foot with the rear toes lightly supporting you.',
    'Send the hips back as the load travels near the front leg, then squeeze up to stand.',
    'Keep hips square and feel the front hamstring load without rounding.',
    'hinge'
  ),
  static_curtsey_lunge: guide(
    'Step one foot diagonally behind the other and settle into a stable crossed stance.',
    'Lower both knees, then push through the front foot to rise without changing foot position.',
    'Keep the front knee aligned with its toes and shorten the cross-step if balance is poor.',
    'lunge'
  ),
  lateral_lunge: guide(
    'Stand wide enough to step or shift sideways while keeping both feet planted.',
    'Sit the hips over one leg as that knee bends, then push back to centre.',
    'Keep the other leg long and the working foot fully grounded.',
    'lunge'
  ),
  overhead_press: guide(
    'Hold the kettlebell at shoulder height with wrist stacked and trunk braced.',
    'Press overhead until the arm is long, then lower to the rack position.',
    'Finish with the weight over the middle of the foot without leaning back.',
    'press'
  ),
  single_arm_chest_press: guide(
    'Lie on the mat with one weight over the chest, feet planted, and free arm relaxed.',
    'Lower the elbow toward the floor, then press the weight back over the shoulder.',
    'Keep ribs and hips level as the one-sided load tries to rotate you.',
    'press'
  ),
  tricep_diamond_press: guide(
    'Lie back and hold the kettlebell securely above the chest with both hands.',
    'Bend the elbows to lower the bell toward the upper chest, then straighten the arms.',
    'Keep elbows comfortably narrow and wrists neutral.'
  ),
  swing_squat_swing: guide(
    'Set up for a kettlebell swing with space around you and a secure grip.',
    'Perform a hip-driven swing, receive the bell at the chest for a squat, then return to the swing.',
    'Make each transition deliberate; do not chase speed at the expense of the hinge.'
  ),
  kettlebell_windmill: guide(
    'Press or hold a light bell overhead, turn the feet slightly, and keep eyes on the bell.',
    'Push the loaded-side hip out as the free hand traces down the other leg, then stand.',
    'Move only through a controlled range with the top arm vertical; learn unloaded first.'
  ),
  bulgarian_split_squat: guide(
    'Place the rear foot on a bench and set the front foot far enough forward for balance.',
    'Lower the rear knee toward the floor, then drive through the front foot to rise.',
    'Keep most pressure on the front leg and the front knee aligned with its toes.',
    'lunge'
  ),
  single_leg_glute_bridge: guide(
    'Lie on the mat with one foot planted close to the hips and the other leg lifted.',
    'Press through the planted foot to lift the hips, pause, then lower slowly.',
    'Keep the pelvis level and finish with the glute rather than arching the back.'
  ),
  swing_to_squat: guide(
    'Start with a clean two-hand swing and enough room around the kettlebell.',
    'Swing from the hips, receive the bell close to the chest, then descend into a squat.',
    'Stabilise the bell before squatting and reset the hinge before the next swing.'
  ),
  sumo_squat: guide(
    'Take a wide stance with a comfortable toe turn-out and hold the load centrally.',
    'Sit down between the hips, then drive through both feet to stand.',
    'Track knees with toes and keep the chest controlled.',
    'squat'
  ),
  single_leg_deadlift: guide(
    'Stand on one softly bent leg with the load in the opposite or same hand.',
    'Reach the free leg back as the torso hinges forward, then return to tall.',
    'Keep hips square and move as one long line from head to rear heel.',
    'hinge'
  ),
  goblet_squat_pulse: guide(
    'Hold the weight at the chest and settle into a stable goblet-squat stance.',
    'Lower, rise halfway or add the prescribed pulse, return low, then stand to complete the rep.',
    'Keep the sequence controlled and maintain whole-foot pressure.',
    'squat'
  ),
  landmine_switch_row: guide(
    'Hinge with a long back and hold the load securely between or beside the feet.',
    'Row toward one hip, lower with control, then switch hands or sides as prescribed.',
    'Keep the torso quiet during the hand change and pull toward the hip.',
    'row'
  ),
  shoulder_push_press: guide(
    'Rack the weight at the shoulder with feet planted and trunk braced.',
    'Dip the knees slightly, drive through the legs, and finish the press overhead.',
    'Keep the dip vertical and receive the weight softly back at the shoulder.',
    'press'
  ),
  pullover_russian_twist: guide(
    'Lie with the weight secure in both hands, then set a controlled seated twist position.',
    'Perform the pullover through a comfortable shoulder range, sit up if prescribed, and rotate from the ribs.',
    'Keep the load close during transitions and avoid yanking through the lower back.'
  ),
  tuck_hollow_toe_reach: guide(
    'Lie on the mat, brace gently, and find a tuck position with the lower back supported.',
    'Extend into a hollow shape, return to tuck, then reach toward the toes as prescribed.',
    'Shorten the lever whenever the lower back lifts or the neck strains.'
  )
};

const FALLBACKS = {
  strength_upper: guide(
    'Set a stable position and choose a load you can control.',
    'Move through a comfortable range, then return slowly to the start.',
    'Keep joints stacked and stop if the movement causes sharp pain.'
  ),
  strength_lower: guide(
    'Plant the feet securely and brace before starting.',
    'Move through a comfortable lower-body range, then return with control.',
    'Keep knees tracking with toes and maintain whole-foot pressure.'
  ),
  cardio_conditioning: guide(
    'Clear enough space to move and begin at an easy pace.',
    'Build to the intended rhythm while keeping the movement controlled.',
    'Slow down before technique or breathing becomes uncontrolled.'
  ),
  core_prehab: guide(
    'Choose a comfortable position and create gentle trunk tension.',
    'Move or hold without losing your starting alignment.',
    'Use a pain-free range and prioritise control over intensity.'
  ),
  custom: guide(
    'Set up the equipment and space you normally use for this exercise.',
    'Follow your saved or coached version of the movement.',
    'Add a specific guide in a future catalogue update if you use this often.'
  )
};

export function getExerciseGuide(exercise) {
  return GUIDES[exercise.id] || FALLBACKS[exercise.category] || FALLBACKS.custom;
}

export function hasSpecificExerciseGuide(exerciseId) {
  return Object.hasOwn(GUIDES, exerciseId);
}

export const DEMO_LABELS = {
  squat: 'Animated squat movement cue',
  hinge: 'Animated hip-hinge movement cue',
  swing: 'Animated kettlebell-swing movement cue',
  lunge: 'Animated lunge movement cue',
  row: 'Animated rowing movement cue',
  press: 'Animated pressing movement cue',
  run: 'Animated running movement cue'
};
