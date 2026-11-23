/* ============================================================
   世界猫生ガチャ — 音（Web Audio API のシンセ）
   外部の音声ファイルは使わず、その場で合成する。
   ON/OFF は localStorage に保存。ユーザー操作のタイミングで
   AudioContext.resume() するので、自動再生制限でエラーにならない。
   AudioContext が無い環境（テスト等）では静かに何もしない。
   ============================================================ */
(function (root) {
  'use strict';

  const KEY = 'catgacha.sound.v1';
  let enabled = readEnabled();
  let ctx = null;
  let master = null;
  let failed = false;

  function readEnabled() {
    try {
      const v = root.localStorage && root.localStorage.getItem(KEY);
      if (v === null || v === undefined) return true;
      return String(v) !== '0';
    } catch (e) { return true; }
  }

  function persist() {
    try {
      if (root.localStorage) root.localStorage.setItem(KEY, enabled ? '1' : '0');
    } catch (e) { /* 保存できない環境でも動かす */ }
  }

  function AudioCtor() {
    return root.AudioContext || root.webkitAudioContext || null;
  }

  function ensure() {
    if (!enabled || failed) return null;
    const C = AudioCtor();
    if (!C) return null;
    try {
      if (!ctx) {
        ctx = new C();
        master = ctx.createGain();
        master.gain.value = 0.42;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try { ctx.resume(); } catch (e) { /* resumeは非同期。失敗しても次の操作で再試行 */ }
      }
      return ctx;
    } catch (e) {
      failed = true;
      return null;
    }
  }

  /* 1音。freq→to へ滑らせる（猫の声の「にゃう」に使う） */
  function tone(o) {
    const c = ensure();
    if (!c) return;
    try {
      const t0 = (c.currentTime || 0) + (o.delay || 0);
      const dur = Math.max(0.04, o.dur || 0.16);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type || 'sine';
      if (osc.frequency && osc.frequency.setValueAtTime) {
        osc.frequency.setValueAtTime(o.freq || 440, t0);
        if (o.to && osc.frequency.exponentialRampToValueAtTime) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + dur);
        }
        if (o.vibrato && osc.frequency.linearRampToValueAtTime) {
          osc.frequency.linearRampToValueAtTime(o.vibrato, t0 + dur * 0.6);
          osc.frequency.linearRampToValueAtTime(o.freq || 440, t0 + dur);
        }
      }
      if (g.gain && g.gain.setValueAtTime) {
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(Math.max(0.001, o.vol || 0.14), t0 + Math.min(0.04, dur / 3));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      }
      osc.connect(g);
      g.connect(master || c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.06);
    } catch (e) { /* 音が出なくてもゲームは止めない */ }
  }

  /* みゃう♪（猫の声っぽい2音） */
  function meow(pitch) {
    const p = pitch || 720;
    tone({ freq: p, to: p * 1.32, dur: 0.12, type: 'triangle', vol: 0.12 });
    tone({ freq: p * 1.32, to: p * 0.78, dur: 0.20, type: 'sine', vol: 0.10, delay: 0.10, vibrato: p * 1.1 });
    tone({ freq: p * 2.02, to: p * 1.7, dur: 0.10, type: 'sine', vol: 0.03, delay: 0.12 });
  }

  function sparkle(base) {
    const b = base || 880;
    [0, 0.07, 0.15].forEach((d, i) => tone({ freq: b * Math.pow(1.25, i), dur: 0.16, type: 'sine', vol: 0.08, delay: d }));
  }

  const SOUNDS = {
    roll() {
      for (let i = 0; i < 6; i++) {
        tone({ freq: 520 + i * 70, dur: 0.055, type: 'square', vol: 0.035, delay: i * 0.12 });
      }
    },
    birth() {
      tone({ freq: 660, dur: 0.16, type: 'sine', vol: 0.10 });
      tone({ freq: 830, dur: 0.18, type: 'sine', vol: 0.10, delay: 0.13 });
      tone({ freq: 990, dur: 0.30, type: 'triangle', vol: 0.09, delay: 0.26 });
      meow(760);
    },
    tap() {
      meow(700 + Math.floor((root.Math && root.Math.random ? root.Math.random() : 0.5) * 4) * 45);
    },
    choice() {
      tone({ freq: 720, dur: 0.07, type: 'triangle', vol: 0.08 });
      tone({ freq: 1080, dur: 0.09, type: 'sine', vol: 0.05, delay: 0.05 });
    },
    adopt() {
      sparkle(760);
      tone({ freq: 520, dur: 0.24, type: 'sine', vol: 0.08, delay: 0.2 });
    },
    milestone() {
      [784, 988, 1175].forEach((f, i) => tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.08, delay: i * 0.11 }));
    },
    pinch() {
      tone({ freq: 300, to: 240, dur: 0.16, type: 'sine', vol: 0.09 });
      tone({ freq: 300, to: 240, dur: 0.16, type: 'sine', vol: 0.07, delay: 0.19 });
    },
    evolve() {
      [880, 1108, 1318, 1760].forEach((f, i) => tone({ freq: f, dur: 0.26, type: 'sine', vol: 0.06, delay: i * 0.09 }));
    },
    death() {
      [523, 440, 349, 262].forEach((f, i) => tone({ freq: f, dur: 0.9, type: 'sine', vol: 0.075, delay: i * 0.34 }));
      tone({ freq: 131, dur: 1.4, type: 'triangle', vol: 0.035, delay: 0.9 });
    },
    card() {
      tone({ freq: 1200, dur: 0.05, type: 'square', vol: 0.05 });
      tone({ freq: 900, dur: 0.06, type: 'square', vol: 0.04, delay: 0.06 });
      sparkle(1040);
    }
  };

  function play(name) {
    if (!enabled) return false;
    if (!SOUNDS[name]) return false;
    if (!ensure()) return false;
    try { SOUNDS[name](); return true; } catch (e) { return false; }
  }

  function isOn() { return enabled; }

  function setOn(on) {
    enabled = !!on;
    persist();
    if (enabled) { ensure(); play('choice'); }
    return enabled;
  }

  function toggle() { return setOn(!enabled); }

  const api = { KEY: KEY, isOn: isOn, setOn: setOn, toggle: toggle, play: play, ensure: ensure, SOUNDS: SOUNDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CATSOUND = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
