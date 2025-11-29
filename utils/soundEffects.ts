
let audioCtx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

const getContext = (): AudioContext => {
  if (!audioCtx) {
    // Support for Safari/older browsers
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx!;
};

// Helper to create noise buffer
const createNoiseBuffer = (ctx: AudioContext) => {
  if (!noiseBuffer) {
    const bufferSize = ctx.sampleRate * 2.0; // 2 seconds buffer
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  return noiseBuffer;
};

export const playCardSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const buffer = createNoiseBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;

    const gain = ctx.createGain();
    // Short sharp snap
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
  } catch (e) {
    // Ignore audio errors
  }
};

export const playShuffleSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const buffer = createNoiseBuffer(ctx);
    const t = ctx.currentTime;

    // Simulate a riffle shuffle (multiple rapid snaps)
    for (let i = 0; i < 10; i++) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass'; // More "papery" sound
      filter.frequency.value = 800 + Math.random() * 500;

      const gain = ctx.createGain();
      const startTime = t + i * 0.06; // spacing
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      source.start(startTime);
      source.stop(startTime + 0.1);
    }
  } catch (e) {}
};

export const playViraSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const t = ctx.currentTime;

    // Magical chime / Bell
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, t + 0.1); // Quick slide up
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5); // Long decay

    // Add some sparkle
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(2000, t);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.05, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 1.5);
    osc2.start(t);
    osc2.stop(t + 0.5);
  } catch (e) {}
};

export const playWinSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();
    
    const t = ctx.currentTime;
    // Victory fanfare (Major Arpeggio: C E G C)
    const notes = [523.25, 659.25, 783.99, 1046.50]; 

    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.value = freq;
        
        const start = t + (i * 0.1);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + 0.6);
    });
  } catch (e) {}
};

export const playLoseSound = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') ctx.resume();

    const t = ctx.currentTime;
    
    // Sad slide
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(80, t + 0.5); // Pitch drop
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.6);
  } catch (e) {}
};

export const playTrucoSound = () => {
    try {
        const ctx = getContext();
        if (ctx.state === 'suspended') ctx.resume();
        
        const t = ctx.currentTime;
        
        // 1. Heavy Impact (Table slam)
        const oscLow = ctx.createOscillator();
        oscLow.type = 'square';
        oscLow.frequency.setValueAtTime(80, t);
        oscLow.frequency.exponentialRampToValueAtTime(10, t + 0.3);
        
        const gainLow = ctx.createGain();
        gainLow.gain.setValueAtTime(0.4, t);
        gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        
        oscLow.connect(gainLow);
        gainLow.connect(ctx.destination);
        oscLow.start(t);
        oscLow.stop(t + 0.3);

        // 2. Alert/Siren sweep (The "Truco" shout feeling)
        const oscHigh = ctx.createOscillator();
        oscHigh.type = 'sawtooth';
        oscHigh.frequency.setValueAtTime(400, t);
        oscHigh.frequency.linearRampToValueAtTime(600, t + 0.1);
        
        const gainHigh = ctx.createGain();
        gainHigh.gain.setValueAtTime(0.1, t);
        gainHigh.gain.linearRampToValueAtTime(0, t + 0.2);
        
        oscHigh.connect(gainHigh);
        gainHigh.connect(ctx.destination);
        oscHigh.start(t);
        oscHigh.stop(t + 0.2);

    } catch(e) {}
}
