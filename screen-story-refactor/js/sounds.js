/* ===========================================================
   SOUNDS.JS — все звуки синтезируются через Web Audio API.
   Внешние файлы НЕ требуются. Если положить свои .wav/.mp3 в
   assets/sounds/, можно заменить функции на проигрывание файлов.
   =========================================================== */

const Sounds = (function () {
  let ctx = null;

  // Контекст создаётся после первого клика (политика браузеров)
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Базовый "бип" заданной частоты/длительности/формы
  function beep(freq, duration, type, gain) {
    const c = ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    g.gain.value = gain == null ? 0.15 : gain;
    osc.connect(g);
    g.connect(c.destination);
    const t = c.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Короткий "тик" клика по мышке
  function click() {
    beep(880, 0.04, "square", 0.08);
  }

  // Звук открытия папки/окна (восходящий свип)
  function openFolder() {
    const c = ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    g.gain.value = 0.12;
    osc.connect(g); g.connect(c.destination);
    const t = c.currentTime;
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.12);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.start(t); osc.stop(t + 0.2);
  }

  // Звук закрытия окна (нисходящий свип)
  function closeWindow() {
    const c = ensure();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "square";
    g.gain.value = 0.1;
    osc.connect(g); g.connect(c.destination);
    const t = c.currentTime;
    osc.frequency.setValueAtTime(700, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    g.gain.setValueAtTime(0.1, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.start(t); osc.stop(t + 0.18);
  }

  // Звук ошибки (классический "дзынь" из двух тонов)
  function error() {
    beep(200, 0.18, "sawtooth", 0.18);
    setTimeout(() => beep(160, 0.22, "sawtooth", 0.18), 120);
  }

  // Звук победы (восходящее арпеджио)
  function win() {
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((f, i) => {
      setTimeout(() => beep(f, 0.22, "square", 0.16), i * 130);
    });
  }

  // Звук включения компьютера (низкий гул + бип BIOS)
  function powerOn() {
    const c = ensure();
    // гул
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(60, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, c.currentTime + 0.8);
    g.gain.setValueAtTime(0.001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.4);
    osc.connect(g); g.connect(c.destination);
    osc.start(); osc.stop(c.currentTime + 1.5);
    // бип BIOS
    setTimeout(() => beep(1000, 0.18, "square", 0.12), 900);
  }


  // Шум (для битого стекла и т.п.)
  function noise(dur, gain, hp) {
    const c = ensure();
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = hp || 600;
    const g = c.createGain(); g.gain.value = gain == null ? 0.2 : gain;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(); src.stop(c.currentTime + dur);
  }
  // Стук в дверь — 3 глухих удара
  function knock() {
    [0, 260, 520].forEach((t) => setTimeout(() => { beep(70, 0.09, "sine", 0.32); noise(0.05, 0.08, 120); }, t));
  }
  // Битое стекло
  function glass() {
    noise(0.25, 0.28, 1500);
    for (let i = 0; i < 8; i++) setTimeout(() => beep(1200 + Math.random() * 2600, 0.04, "square", 0.06), i * 22);
  }
  // Страшный голос (файл)
  let voiceEl = null;
  function voice(src) {
    try { if (voiceEl) voiceEl.pause(); voiceEl = new Audio(src); voiceEl.volume = 0.9; voiceEl.play().catch(() => {}); } catch (e) {}
  }

  return {
    ensure, beep, click, openFolder, closeWindow,
    error, win, powerOn, noise, knock, glass, voice,
    getCtx: () => ctx
  };
})();
