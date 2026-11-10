// alert sounds made in the browser (web audio), so there are no audio files to load or license (add later, web audio is temporary)
// each type gets its own chord, bigger alerts play higher and longer
let ctx;
const audio = () => {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

const CHORDS = {
  follow: [523.25, 659.25],             // C5 E5
  sub: [523.25, 659.25, 783.99],        // C major
  resub: [587.33, 739.99, 880],         // D major
  gift: [659.25, 830.61, 987.77, 1318.5], // E major + octave
  cheer: [698.46, 880, 1046.5],         // F major
  redemption: [440, 554.37]             // A C#
};

const WAVES = { pulse: 'sine', arcade: 'square', cozy: 'triangle', terminal: 'square', studio: 'sine' };

export function playAlertSound(type, { intensity = 0, style = 'pulse', volume = 0.18 } = {}) {
  try {
    const ac = audio();
    const now = ac.currentTime;
    const notes = CHORDS[type] || CHORDS.follow;
    const lift = 1 + intensity * 0.12;
    const quiet = WAVES[style] === 'square' ? 0.45 : 1; // square waves sound louder
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = WAVES[style] || 'sine';
      osc.frequency.value = freq * lift;
      const start = now + i * 0.09;
      const length = 0.35 + intensity * 0.15;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume * quiet, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
      osc.connect(gain).connect(ac.destination);
      osc.start(start);
      osc.stop(start + length + 0.05);
    });
  } catch {
    // no audio available (or blocked until the page is clicked), alerts still show
  }
}