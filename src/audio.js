// Audio system - procedural ambient sounds using Web Audio API
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
    this.loops = [];
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.6;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
    this.startAmbience();
  }

  // Generate noise buffer
  createNoiseBuffer(duration, type = 'white') {
    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'brown') {
        b0 = (b0 + (0.02 * white)) / 1.02;
        data[i] = b0 * 3.5;
      } else if (type === 'pink') {
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  startAmbience() {
    // Deep ship rumble (brown noise through low-pass)
    const rumbleSource = this.ctx.createBufferSource();
    rumbleSource.buffer = this.createNoiseBuffer(10, 'brown');
    rumbleSource.loop = true;
    const rumbleLow = this.ctx.createBiquadFilter();
    rumbleLow.type = 'lowpass';
    rumbleLow.frequency.value = 80;
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.value = 0.3;
    rumbleSource.connect(rumbleLow);
    rumbleLow.connect(rumbleGain);
    rumbleGain.connect(this.masterGain);
    rumbleSource.start();
    this.loops.push(rumbleSource);

    // Creaking metal (filtered noise bursts)
    this.scheduleCreaks();

    // Water dripping
    this.scheduleDrips();

    // Distant breathing (sinusoidal volume modulation)
    this.startBreathing();
  }

  scheduleCreaks() {
    const creak = () => {
      if (!this.initialized) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.value = 40 + Math.random() * 60;
      filter.type = 'bandpass';
      filter.frequency.value = 200 + Math.random() * 400;
      filter.Q.value = 5;

      const duration = 0.5 + Math.random() * 1.5;
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);

      setTimeout(creak, 3000 + Math.random() * 12000);
    };
    setTimeout(creak, 2000);
  }

  scheduleDrips() {
    const drip = () => {
      if (!this.initialized) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 800 + Math.random() * 2000;

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);

      setTimeout(drip, 1000 + Math.random() * 5000);
    };
    setTimeout(drip, 1000);
  }

  startBreathing() {
    const breathe = () => {
      if (!this.initialized) return;
      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = this.createNoiseBuffer(4, 'pink');

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 300;
      filter.Q.value = 2;

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      // Inhale
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 1.2);
      // Hold
      gain.gain.linearRampToValueAtTime(0.03, now + 1.5);
      // Exhale
      gain.gain.linearRampToValueAtTime(0.05, now + 2.0);
      gain.gain.linearRampToValueAtTime(0, now + 3.5);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noiseSource.start();
      noiseSource.stop(now + 3.5);

      setTimeout(breathe, 5000 + Math.random() * 10000);
    };
    setTimeout(breathe, 8000);
  }

  playFootstep() {
    if (!this.initialized) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.15, 'brown');
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.value = 400 + Math.random() * 200;

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.12);
  }

  playDoorOpen() {
    if (!this.initialized) return;
    const doorOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    doorOsc.type = 'sawtooth';
    doorOsc.frequency.setValueAtTime(60, this.ctx.currentTime);
    doorOsc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 1.5);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 200;
    filter.Q.value = 3;

    doorOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    doorOsc.start();
    doorOsc.stop(this.ctx.currentTime + 1.5);
  }

  playJumpScare() {
    if (!this.initialized) return;
    // Loud dissonant stinger
    const freqs = [100, 157, 233, 350, 520];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 1.5);
    });

    // Noise burst
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createNoiseBuffer(0.5, 'white');
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
    noise.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start();
    noise.stop(this.ctx.currentTime + 0.8);
  }

  playPickup() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(660, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  dispose() {
    this.initialized = false;
    this.loops.forEach(l => { try { l.stop(); } catch(e) {} });
    if (this.ctx) this.ctx.close();
  }
}
