/* ===========================================================
   BGM.JS — фоновая музыка с кроссфейдом.
   Bgm.play(src) — включить трек (плавно), заглушив предыдущий.
   =========================================================== */
const Bgm = (function () {
  let cur = null;
  const TARGET = 0.5;
  function fadeIn(a) {
    let v = 0; const iv = setInterval(() => { v = Math.min(TARGET, v + 0.03); a.volume = v; if (v >= TARGET) clearInterval(iv); }, 80);
  }
  function fadeOut(a) {
    let v = a.volume; const iv = setInterval(() => { v = Math.max(0, v - 0.04); a.volume = v; if (v <= 0) { clearInterval(iv); a.pause(); } }, 80);
  }
  function play(src) {
    if (cur) { try { fadeOut(cur); } catch (e) {} }
    const a = new Audio(src); a.loop = true; a.volume = 0;
    a.play().then(() => fadeIn(a)).catch(() => { /* нужен жест — попробуем позже */ });
    cur = a;
  }
  function to(src) { play(src); }
  function stop() { if (cur) { fadeOut(cur); cur = null; } }
  return { play, to, stop };
})();
