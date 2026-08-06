# Workout

A workout composer and interval timer that runs in the browser and installs to a phone
Home Screen. Compose a circuit on the day, run it as a timer, edit it while it is running.

- **Compose** — add exercises and rests to a timeline, set each one by time or reps.
- **Pattern** — generate a recurring `primary exercise → anchor exercise → rest` circuit,
  then edit any generated step.
- **Play** — large countdown, audible 3-2-1 cue, vibration, auto-advance, wake lock.
  Pause, skip, restart, +10s. Edit upcoming steps without stopping the timer.
- **Resume** — an interrupted workout survives the browser being killed.

Everything runs client-side. There is no backend, no account, and no network call at
runtime. All data — exercises, templates, and workout history — is stored in IndexedDB in
your own browser and never leaves the device. Export and Import write and read a plain
JSON file.

## Install

Open the site on the phone, then Share → Add to Home Screen. After the first load it works
with no network.

## Local development

```bash
python3 -m http.server 8713
```

Then open http://localhost:8713.

`spike/timer-spike.html` is a standalone check of whether a phone keeps counting down and
still beeps with the screen locked.
