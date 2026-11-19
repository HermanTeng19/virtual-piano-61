// 61-Key (C2 – C7) Virtual Piano: Keyboard Mapping, Real Yamaha C5 Acoustic Grand Piano Engine, Waterfall & Auto-Performer

import { KEYS_61 } from './keys.js';
import { PIECE_INFO, compilePerformance } from './composition.js';

const FALL_SECONDS = 1.85; // Travel time from top of black stage down to the keys
const LEAD_IN_MS = 1250;   // Pre-roll so opening notes visibly glide down before striking Beat 1

// 22 studio-recorded Yamaha C5 Acoustic Grand Piano samples (max ±1 semitone pitch shift across all 61 keys)
const SALAMANDER_SAMPLES = [
  { midi: 33, file: 'A1.mp3' },
  { midi: 36, file: 'C2.mp3' },
  { midi: 39, file: 'Ds2.mp3' },
  { midi: 42, file: 'Fs2.mp3' },
  { midi: 45, file: 'A2.mp3' },
  { midi: 48, file: 'C3.mp3' },
  { midi: 51, file: 'Ds3.mp3' },
  { midi: 54, file: 'Fs3.mp3' },
  { midi: 57, file: 'A3.mp3' },
  { midi: 60, file: 'C4.mp3' },
  { midi: 63, file: 'Ds4.mp3' },
  { midi: 66, file: 'Fs4.mp3' },
  { midi: 69, file: 'A4.mp3' },
  { midi: 72, file: 'C5.mp3' },
  { midi: 75, file: 'Ds5.mp3' },
  { midi: 78, file: 'Fs5.mp3' },
  { midi: 81, file: 'A5.mp3' },
  { midi: 84, file: 'C6.mp3' },
  { midi: 87, file: 'Ds6.mp3' },
  { midi: 90, file: 'Fs6.mp3' },
  { midi: 93, file: 'A6.mp3' },
  { midi: 96, file: 'C7.mp3' }
];

class SalamanderGrandPiano {
  constructor() {
    this.ctx = null;
    this.compressor = null;
    this.masterGain = null;
    this.sustainPedal = false;

    this.rawMap = new Map();     // midi -> ArrayBuffer (prefetched immediately)
    this.bufferMap = new Map();  // midi -> AudioBuffer (decoded when AudioContext exists)
    this.prefetchPromise = null;
    this.decodePromise = null;

    this.activeVoices = new Map();
    this.sustainedVoices = [];
  }

  prefetch() {
    if (this.prefetchPromise) return this.prefetchPromise;
    this.prefetchPromise = Promise.all(
      SALAMANDER_SAMPLES.map(async (s) => {
        try {
          const res = await fetch(`./samples/${s.file}`);
          if (res.ok) {
            this.rawMap.set(s.midi, await res.arrayBuffer());
          }
        } catch (_) {}
      })
    );
    return this.prefetchPromise;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(16, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(2.6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.004, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.24, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.95, this.ctx.currentTime);

      // Subtle concert-hall blend (Salamander samples already have natural studio room warmth)
      const reverb = this.createReverb(1.85, 3.1);
      const reverbGain = this.ctx.createGain();
      reverbGain.gain.setValueAtTime(0.14, this.ctx.currentTime);

      this.compressor.connect(this.masterGain);
      this.compressor.connect(reverb);
      reverb.connect(reverbGain);
      reverbGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    if (!this.decodePromise) {
      this.decodePromise = this.decodeAll();
    }
  }

  async decodeAll() {
    await this.prefetch();
    if (!this.ctx) return;
    await Promise.all(
      SALAMANDER_SAMPLES.map(async (s) => {
        if (this.bufferMap.has(s.midi)) return;
        const raw = this.rawMap.get(s.midi);
        if (!raw) return;
        try {
          const decoded = await this.ctx.decodeAudioData(raw.slice(0));
          this.bufferMap.set(s.midi, decoded);
        } catch (_) {}
      })
    );
  }

  async ready() {
    this.init();
    await Promise.race([
      this.decodePromise,
      new Promise(resolve => setTimeout(resolve, 1800))
    ]);
  }

  createReverb(duration, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * 0.55;
      }
    }
    const conv = this.ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  findNearestSample(midi) {
    let best = null;
    let bestDiff = Infinity;
    for (const s of SALAMANDER_SAMPLES) {
      if (!this.bufferMap.has(s.midi)) continue;
      const diff = Math.abs(midi - s.midi);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
    return best;
  }

  setPedal(down) {
    if (this.sustainPedal === down) return;
    this.sustainPedal = down;
    if (!down) {
      for (const v of this.sustainedVoices) {
        this.fadeOut(v, 0.28);
      }
      this.sustainedVoices = [];
    }
  }

  noteOn(keyObj, velocity = 0.85) {
    this.init();
    if (!this.ctx) return;

    const { note, midi } = keyObj;
    if (this.activeVoices.has(note)) {
      const prev = this.activeVoices.get(note);
      this.sustainedVoices = this.sustainedVoices.filter(v => v !== prev);
      this.fadeOut(prev, 0.05);
      this.activeVoices.delete(note);
    }

    // Cap active sustained polyphony cleanly so heavy pedal passages remain lush and clear
    while (this.sustainedVoices.length > 44) {
      const oldest = this.sustainedVoices.shift();
      if (oldest) this.fadeOut(oldest, 0.2);
    }

    const nearest = this.findNearestSample(midi);
    if (!nearest) {
      // Fallback only during the tiny millisecond window before decodeAll finishes
      this.triggerFallbackNote(note, midi, velocity);
      return;
    }

    const now = this.ctx.currentTime;
    const buffer = this.bufferMap.get(nearest.midi);

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.setValueAtTime(Math.pow(2, (midi - nearest.midi) / 12), now);

    // Subtle stereo placement matching pianist's bench perspective
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.34, Math.min(0.34, ((midi - 64) / 30) * 0.3)), now);

    // Velocity-sensitive felt hammer lowpass (keeps full acoustic grand clarity in all registers)
    const feltFilter = this.ctx.createBiquadFilter();
    feltFilter.type = 'lowpass';
    feltFilter.Q.setValueAtTime(0.5, now);
    const cutoff = Math.min(20000, 4200 + Math.pow(velocity, 1.1) * 15800);
    feltFilter.frequency.setValueAtTime(cutoff, now);

    // Balanced acoustic grand register voicing
    const registerBalance = midi < 48 ? 0.86 : (midi >= 69 ? 1.18 : 1.0);
    const targetGain = Math.max(0.06, Math.pow(velocity, 1.15) * 0.92 * registerBalance);

    const vGain = this.ctx.createGain();
    vGain.gain.setValueAtTime(0.001, now);
    vGain.gain.linearRampToValueAtTime(targetGain, now + 0.003);

    src.connect(feltFilter);
    feltFilter.connect(vGain);
    vGain.connect(panner);
    panner.connect(this.compressor);

    src.start(now);

    const voice = { note, src, vGain, stopped: false };
    src.onended = () => {
      voice.stopped = true;
      if (this.activeVoices.get(note) === voice) {
        this.activeVoices.delete(note);
      }
    };
    this.activeVoices.set(note, voice);
  }

  triggerFallbackNote(note, midi, velocity) {
    const now = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    const vGain = this.ctx.createGain();
    vGain.gain.setValueAtTime(0.001, now);
    vGain.gain.linearRampToValueAtTime(0.22 * velocity, now + 0.008);
    vGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.8);
    osc.connect(vGain);
    vGain.connect(this.compressor);
    osc.start(now);
    const voice = { note, src: osc, vGain, stopped: false };
    this.activeVoices.set(note, voice);
  }

  noteOff(keyObj) {
    if (!this.ctx) return;
    const voice = this.activeVoices.get(keyObj.note);
    if (!voice) return;

    if (this.sustainPedal) {
      if (!this.sustainedVoices.includes(voice)) {
        this.sustainedVoices.push(voice);
      }
    } else {
      this.fadeOut(voice, 0.25);
      this.activeVoices.delete(keyObj.note);
    }
  }

  fadeOut(voice, release = 0.25) {
    if (!this.ctx || voice.stopped) return;
    voice.stopped = true;
    const now = this.ctx.currentTime;
    try {
      voice.vGain.gain.cancelScheduledValues(now);
      voice.vGain.gain.setValueAtTime(Math.max(0.0001, voice.vGain.gain.value), now);
      voice.vGain.gain.setTargetAtTime(0.0001, now, release * 0.24);
      voice.src.stop(now + release + 0.14);
    } catch (_) {}
  }
}

class VirtualPiano61App {
  constructor() {
    this.synth = new SalamanderGrandPiano();
    this.synth.prefetch();

    this.container = document.getElementById('piano-keys');
    this.pedalBtn = document.getElementById('pedal-indicator');
    this.playBtn = document.getElementById('btn-play-piece');
    this.jumpClimaxBtn = document.getElementById('btn-jump-climax');
    this.nowPlaying = document.getElementById('now-playing');
    this.stageTimeSection = document.getElementById('stage-time-section');
    this.stageSubLabel = document.getElementById('stage-sub-label');
    this.canvas = document.getElementById('waterfall-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.whiteByCode = new Map();
    this.blackByCode = new Map();
    this.keyElByNote = new Map();
    this.keyBounds = new Map();
    this.octaveLines = [];
    this.pressedByCode = new Map();

    this.spaceDown = false;
    this.pedalLocked = false;
    this.pointerActive = false;

    this.isPerforming = false;
    this.perf = null;
    this.perfIdx = 0;
    this.perfNotesPlayed = 0;
    this.perfStart = 0;
    this.perfLabel = '';
    this.perfTimer = null;
    this.manualBars = [];

    this.sessionStart = performance.now();
    this.recordedEvents = [];
    window.pianoRecording = this.recordedEvents;

    this.buildKeyboard();
    this.measureKeyBounds();
    this.bindEvents();

    this.lastFrame = performance.now();
    requestAnimationFrame((t) => this.animateWaterfall(t));
  }

  buildKeyboard() {
    this.container.innerHTML = '';
    const whiteKeys = KEYS_61.filter(k => k.type === 'white');
    const totalWhites = whiteKeys.length;
    const rightEdgeByCode = new Map();

    whiteKeys.forEach((wk, index) => {
      this.whiteByCode.set(wk.code, wk);
      const rightEdgePct = ((index + 1) / totalWhites) * 100;
      rightEdgeByCode.set(wk.code, rightEdgePct);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key-white';
      btn.dataset.note = wk.note;
      btn.dataset.label = wk.label;
      btn.setAttribute('aria-label', `${wk.note} 白键 (按键 ${wk.label})`);

      const tag = document.createElement('span');
      tag.className = 'octave-tag';
      tag.textContent = wk.octaveTag || '';
      btn.appendChild(tag);

      const lbl = document.createElement('span');
      lbl.className = 'key-label';
      lbl.textContent = wk.label;
      btn.appendChild(lbl);

      this.bindPointer(btn, wk);
      this.container.appendChild(btn);
      this.keyElByNote.set(wk.note, btn);
    });

    const blackKeys = KEYS_61.filter(k => k.type === 'black');
    blackKeys.forEach((bk) => {
      this.blackByCode.set(bk.code, bk);
      const leftPct = rightEdgeByCode.get(bk.code);
      if (leftPct === undefined) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key-black';
      btn.dataset.note = bk.note;
      btn.dataset.label = bk.label;
      btn.setAttribute('aria-label', `${bk.note} 黑键 (Shift + ${bk.label})`);
      btn.style.setProperty('--bk-left', `${leftPct.toFixed(4)}%`);

      const lbl = document.createElement('span');
      lbl.className = 'key-label';
      lbl.textContent = bk.label;
      btn.appendChild(lbl);

      this.bindPointer(btn, bk);
      this.container.appendChild(btn);
      this.keyElByNote.set(bk.note, btn);
    });
  }

  measureKeyBounds() {
    const stageRect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, stageRect.width);
    const cssH = Math.max(1, stageRect.height);

    if (this.canvas.width !== Math.round(cssW * dpr) || this.canvas.height !== Math.round(cssH * dpr)) {
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
    }

    const keysRect = this.container.getBoundingClientRect();
    if (keysRect.width <= 0) return;

    this.keyBounds.clear();
    this.octaveLines = [];

    for (const k of KEYS_61) {
      const el = this.keyElByNote.get(k.note);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const x = r.left - keysRect.left;
      const w = r.width;
      this.keyBounds.set(k.note, { x, w, isBlack: k.type === 'black' });
      if (k.octaveTag) {
        this.octaveLines.push(x);
      }
    }
  }

  bindPointer(btn, keyObj) {
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.pointerActive = true;
      this.pressKey(keyObj);
    });

    btn.addEventListener('pointerenter', () => {
      if (this.pointerActive) {
        this.pressKey(keyObj);
      }
    });

    btn.addEventListener('pointerup', () => {
      this.releaseKey(keyObj);
    });

    btn.addEventListener('pointerleave', () => {
      if (this.pointerActive) {
        this.releaseKey(keyObj);
      }
    });
  }

  bindEvents() {
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => this.measureKeyBounds());
      ro.observe(this.container);
    } else {
      window.addEventListener('resize', () => this.measureKeyBounds());
    }

    window.addEventListener('pointerup', () => {
      this.pointerActive = false;
    });

    window.addEventListener('keydown', (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.spaceDown) {
          this.spaceDown = true;
          this.syncPedal();
        }
        return;
      }

      if (e.repeat) return;

      let target = null;
      if (e.shiftKey && this.blackByCode.has(e.code)) {
        target = this.blackByCode.get(e.code);
      } else if (this.whiteByCode.has(e.code)) {
        target = this.whiteByCode.get(e.code);
      }

      if (target) {
        e.preventDefault();
        if (this.pressedByCode.has(e.code)) {
          this.releaseKey(this.pressedByCode.get(e.code));
        }
        this.pressedByCode.set(e.code, target);
        this.pressKey(target, e.velocity);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.spaceDown = false;
        this.syncPedal();
        return;
      }

      if (this.pressedByCode.has(e.code)) {
        const prev = this.pressedByCode.get(e.code);
        this.pressedByCode.delete(e.code);
        this.releaseKey(prev);
      }
    });

    window.addEventListener('blur', () => {
      this.spaceDown = false;
      this.syncPedal();
      for (const k of this.pressedByCode.values()) {
        this.releaseKey(k);
      }
      this.pressedByCode.clear();
    });

    this.pedalBtn.addEventListener('click', () => {
      this.pedalLocked = !this.pedalLocked;
      this.syncPedal();
      this.pedalBtn.blur();
    });

    this.playBtn.addEventListener('click', () => {
      if (this.isPerforming) this.stopPerformance('已停止');
      else this.startPerformance({ startAtSec: 0 });
      this.playBtn.blur();
    });

    if (this.jumpClimaxBtn) {
      this.jumpClimaxBtn.addEventListener('click', () => {
        if (this.isPerforming) this.stopPerformance('切换段落');
        this.startPerformance({ startAtSec: 40.5 });
        this.jumpClimaxBtn.blur();
      });
    }

    const dlg = document.getElementById('dialog-perform');
    document.getElementById('btn-perform-start').addEventListener('click', () => this.synth.init());
    dlg.addEventListener('close', () => {
      const choice = dlg.returnValue;
      dlg.returnValue = '';
      if (choice === 'play') this.startPerformance();
    });

    const params = new URLSearchParams(location.search);
    if (params.has('autostart')) {
      setTimeout(() => this.startPerformance({ skipDecodeWait: true }), 50);
    } else if (params.has('perform')) {
      dlg.showModal();
    }
  }

  fireKey(type, init, velocity) {
    const ev = new KeyboardEvent(type, { bubbles: true, cancelable: true, ...init });
    if (velocity != null) ev.velocity = velocity;
    window.dispatchEvent(ev);
  }

  dispatchPerfEvent(e) {
    if (e.kind === 'pedal') {
      this.fireKey(e.down ? 'keydown' : 'keyup', { code: 'Space', key: ' ' });
    } else if (!e.down) {
      this.fireKey('keyup', { code: e.code, key: e.label });
    } else if (e.shift) {
      this.fireKey('keydown', { code: 'ShiftLeft', key: 'Shift', shiftKey: true });
      this.fireKey('keydown', { code: e.code, key: e.label, shiftKey: true }, e.vel);
      this.fireKey('keyup', { code: 'ShiftLeft', key: 'Shift' });
    } else {
      this.fireKey('keydown', { code: e.code, key: e.label }, e.vel);
    }
  }

  async startPerformance({ skipDecodeWait = false, startAtSec = 0 } = {}) {
    if (this.isPerforming) return;
    this.isPerforming = true;
    this.playBtn.setAttribute('aria-pressed', 'true');
    this.playBtn.textContent = '⏳ 准备三角钢琴音源...';

    if (!skipDecodeWait) {
      await this.synth.ready();
      if (!this.isPerforming) return;
    } else {
      this.synth.init();
    }

    this.pedalLocked = false;
    this.syncPedal();
    this.manualBars = [];
    this.measureKeyBounds();

    this.perf = compilePerformance();
    this.perfIdx = 0;
    while (this.perfIdx < this.perf.events.length && this.perf.events[this.perfIdx].t < startAtSec) {
      this.perfIdx += 1;
    }
    this.perfNotesPlayed = 0;
    this.perfLabel = '';
    const leadIn = startAtSec > 0 ? 450 : LEAD_IN_MS;
    this.perfStart = performance.now() + leadIn - startAtSec * 1000;

    this.playBtn.textContent = '■ 停止';
    this.nowPlaying.hidden = false;
    document.documentElement.dataset.performance = 'playing';
    this.perfTick();
  }

  perfTick() {
    if (!this.isPerforming) return;
    const now = (performance.now() - this.perfStart) / 1000;
    const { events, totalTime, sections } = this.perf;
    while (this.perfIdx < events.length && events[this.perfIdx].t <= now) {
      this.dispatchPerfEvent(events[this.perfIdx]);
      this.perfIdx += 1;
    }

    let section = sections[0];
    for (const s of sections) if (now >= s.t) section = s;
    const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
    const stageStr = `${fmt(now)} / ${fmt(totalTime)} · ${section.label}`;
    if (stageStr !== this.perfLabel) {
      this.perfLabel = stageStr;
      if (this.stageTimeSection) this.stageTimeSection.textContent = stageStr;
      if (this.stageSubLabel && section.sub) this.stageSubLabel.textContent = section.sub;
      this.nowPlaying.textContent = `正在演奏《${PIECE_INFO.title}》· ${stageStr}`;
    }

    if (this.perfIdx >= events.length && now >= totalTime) {
      this.stopPerformance('演奏完毕');
      return;
    }
    const next = events[this.perfIdx];
    const wait = next ? Math.min(30, Math.max(0, (next.t - now) * 1000)) : 30;
    this.perfTimer = setTimeout(() => this.perfTick(), wait);
  }

  stopPerformance(message) {
    this.isPerforming = false;
    clearTimeout(this.perfTimer);
    for (const [code, keyObj] of [...this.pressedByCode.entries()]) {
      this.fireKey('keyup', { code, key: keyObj.label });
    }
    if (this.spaceDown) this.fireKey('keyup', { code: 'Space', key: ' ' });

    this.playBtn.setAttribute('aria-pressed', 'false');
    this.playBtn.textContent = `▶ 演奏《${PIECE_INFO.title}》`;
    this.nowPlaying.textContent = `《${PIECE_INFO.title}》${message}`;
    if (this.perf) {
      document.documentElement.dataset.performance = `done:${this.perfNotesPlayed}/${this.perf.noteCount}`;
    }
  }

  syncPedal() {
    const active = this.spaceDown || this.pedalLocked;
    this.synth.setPedal(active);
    this.pedalBtn.classList.toggle('active', active);
    this.pedalBtn.setAttribute('aria-pressed', String(active));

    this.recordedEvents.push({
      type: 'pedal',
      down: active,
      timeMs: Math.round(performance.now() - this.sessionStart)
    });
  }

  pressKey(keyObj, velocity = 0.85) {
    this.synth.noteOn(keyObj, velocity ?? 0.85);
    if (this.isPerforming) this.perfNotesPlayed += 1;

    const el = this.keyElByNote.get(keyObj.note);
    if (el) el.classList.add('pressed');

    if (!this.isPerforming) {
      const b = this.keyBounds.get(keyObj.note);
      if (b) {
        this.manualBars.push({
          note: keyObj.note,
          x: b.x,
          w: b.w,
          isBlack: b.isBlack,
          bottomOffset: 0,
          height: 6,
          held: true,
          alpha: 1
        });
      }
    }

    this.recordedEvents.push({
      type: 'noteOn',
      note: keyObj.note,
      midi: keyObj.midi,
      label: keyObj.label,
      timeMs: Math.round(performance.now() - this.sessionStart)
    });
  }

  releaseKey(keyObj) {
    this.synth.noteOff(keyObj);
    const el = this.keyElByNote.get(keyObj.note);
    if (el) el.classList.remove('pressed');

    if (!this.isPerforming) {
      for (let i = this.manualBars.length - 1; i >= 0; i--) {
        if (this.manualBars[i].note === keyObj.note && this.manualBars[i].held) {
          this.manualBars[i].held = false;
          break;
        }
      }
    }

    this.recordedEvents.push({
      type: 'noteOff',
      note: keyObj.note,
      midi: keyObj.midi,
      label: keyObj.label,
      timeMs: Math.round(performance.now() - this.sessionStart)
    });
  }

  drawNoteRect(ctx, x, y, w, h, isBlack, flushBottom) {
    const pad = isBlack ? 0.5 : 1.5;
    const rx = x + pad;
    const rw = Math.max(4, w - pad * 2);
    const r = Math.min(4.5, rw / 2, h / 2);
    const radii = flushBottom ? [r, r, 0, 0] : [r, r, r, r];

    ctx.save();
    ctx.shadowColor = isBlack ? 'rgba(196, 98, 42, 0.45)' : 'rgba(240, 134, 68, 0.48)';
    ctx.shadowBlur = 9;

    const grad = ctx.createLinearGradient(rx, y, rx, y + h);
    if (isBlack) {
      grad.addColorStop(0, '#c9682e');
      grad.addColorStop(1, '#a95020');
    } else {
      grad.addColorStop(0, '#f49556');
      grad.addColorStop(1, '#ea7b3b');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(rx, y, rw, h, radii);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = isBlack ? 'rgba(255, 196, 150, 0.28)' : 'rgba(255, 224, 194, 0.32)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  animateWaterfall(frameNow) {
    const dt = Math.min(0.05, (frameNow - this.lastFrame) / 1000);
    this.lastFrame = frameNow;

    const dpr = window.devicePixelRatio || 1;
    const W = this.canvas.width / dpr;
    const H = this.canvas.height / dpr;
    const ctx = this.ctx;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
    ctx.lineWidth = 1;
    for (const lx of this.octaveLines) {
      const px = Math.round(lx) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H);
      ctx.stroke();
    }

    if (this.isPerforming && this.perf) {
      const now = (performance.now() - this.perfStart) / 1000;
      const pxPerSec = H / FALL_SECONDS;

      for (const passBlack of [false, true]) {
        for (const n of this.perf.notes) {
          const b = this.keyBounds.get(n.note);
          if (!b || b.isBlack !== passBlack) continue;
          if (n.end < now || n.start > now + FALL_SECONDS) continue;

          const rawBottom = H - (n.start - now) * pxPerSec;
          const minVisualH = 11;
          const rawTop = Math.min(H - (n.end - now) * pxPerSec + 2.5, rawBottom - minVisualH);
          const flushBottom = rawBottom >= H - 0.5 && rawTop < H;

          const drawTop = Math.max(0, rawTop);
          const drawBottom = Math.min(H, rawBottom);
          const drawH = drawBottom - drawTop;
          if (drawH <= 0.5) continue;

          this.drawNoteRect(ctx, b.x, drawTop, b.w, drawH, b.isBlack, flushBottom);
        }
      }
    } else if (this.manualBars.length > 0) {
      const speed = 135;
      for (let i = this.manualBars.length - 1; i >= 0; i--) {
        const mb = this.manualBars[i];
        if (mb.held) {
          mb.height += speed * dt;
        } else {
          mb.bottomOffset += speed * dt;
          mb.alpha -= dt * 0.22;
        }
        const yBottom = H - mb.bottomOffset;
        const yTop = yBottom - mb.height;
        if (yBottom < 0 || mb.alpha <= 0.02) {
          this.manualBars.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, mb.alpha);
        this.drawNoteRect(ctx, mb.x, yTop, mb.w, mb.height, mb.isBlack, mb.held);
        ctx.restore();
      }
    }

    ctx.restore();
    requestAnimationFrame((t) => this.animateWaterfall(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.virtualPiano61 = new VirtualPiano61App();
});
