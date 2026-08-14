/**
 * Tiny WebAudio sound effects for the chat — no audio files, no network.
 * Generated tones are soft so they never feel like an alarm.
 */
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(
  freq: number,
  start: number,
  dur: number,
  gain = 0.06,
  type: OscillatorType = "sine",
) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Soft two-tone "sent" chime. */
export function playSend() {
  tone(880, 0, 0.12, 0.05);
  tone(1318.5, 0.07, 0.16, 0.04);
}

/** Gentle "new message" pop — slightly brighter so it stands out. */
export function playReceive() {
  tone(659.3, 0, 0.14, 0.06, "triangle");
  tone(987.8, 0.08, 0.18, 0.05, "triangle");
}
