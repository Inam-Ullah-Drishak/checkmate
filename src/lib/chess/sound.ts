/**
 * Game sounds, synthesised with the Web Audio API: no audio files to ship or
 * license. Browsers only start audio after a user gesture, so the context is
 * created on the first call (always inside a click handler's call chain, or
 * resumed by the next one).
 */

export type Sound = "move" | "capture" | "check" | "win" | "lose" | "draw" | "skip" | "hint";

let context: AudioContext | null = null;

const audio = (): AudioContext | null => {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
};

const tone = (ctx: AudioContext, frequency: number, start: number, length: number, type: OscillatorType, volume: number): void => {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + length);
};

/** A short burst of filtered noise: the knock of a piece on a board. */
const knock = (ctx: AudioContext, start: number, length: number, volume: number): void => {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);

  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(start);
};

export const playSound = (sound: Sound, enabled: boolean): void => {
  if (!enabled) return;
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;

  switch (sound) {
    case "move":
      knock(ctx, now, 0.07, 0.9);
      tone(ctx, 190, now, 0.07, "triangle", 0.25);
      break;
    case "capture":
      knock(ctx, now, 0.12, 1.4);
      tone(ctx, 130, now, 0.14, "triangle", 0.4);
      break;
    case "check":
      tone(ctx, 660, now, 0.14, "sine", 0.25);
      tone(ctx, 880, now + 0.12, 0.2, "sine", 0.25);
      break;
    case "win":
      [523, 659, 784, 1047].forEach((frequency, index) => tone(ctx, frequency, now + index * 0.12, 0.3, "triangle", 0.3));
      break;
    case "lose":
      [392, 330, 262, 196].forEach((frequency, index) => tone(ctx, frequency, now + index * 0.14, 0.3, "triangle", 0.3));
      break;
    case "draw":
      tone(ctx, 440, now, 0.25, "sine", 0.25);
      tone(ctx, 440, now + 0.28, 0.25, "sine", 0.25);
      break;
    case "skip":
      tone(ctx, 300, now, 0.1, "square", 0.12);
      tone(ctx, 220, now + 0.1, 0.16, "square", 0.12);
      break;
    case "hint":
      tone(ctx, 988, now, 0.12, "sine", 0.2);
      break;
  }
};
