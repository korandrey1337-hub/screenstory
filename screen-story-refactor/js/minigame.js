/* ===========================================================
   MINIGAME.JS — 2D-стрелялка (вид сверху). Играем сами.
   ПК:  WASD / стрелки — движение, мышь — прицел, ЛКМ (или пробел) — огонь.
   Тач: тащи пальцем — движение, тапни — выстрел в точку тапа.
   Цель: 20 фрагов. Есть «Пропустить».
   =========================================================== */
function openShooter(onDone) {
  let done = false;
  const finish = () => { if (done) return; done = true; running = false; cleanup(); onDone && onDone(); };
  let running = true;

  const W = 440, H = 300;
  let ctx, canvas;
  const keys = {};
  const player = { x: W / 2, y: H / 2, r: 11, hp: 5, spd: 2.4 };
  const aim = { x: W / 2, y: 40 };
  let bullets = [], enemies = [], score = 0, cd = 0, tSpawn = 0, over = false;
  let firing = false, moveTarget = null;

  const win = WM.createWindow({
    title: "ОНЛАЙН-ИГРА — матч",
    icon: "🎮",
    bodyClass: "mg-win",
    width: W + 16, x: 150, y: 55,
    build: (body) => {
      canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H; canvas.className = "mg-canvas";
      body.appendChild(canvas);
      ctx = canvas.getContext("2d");

      const hud = document.createElement("div");
      hud.className = "mg-hud";
      hud.innerHTML = '<span id="mg-score">Фраги: 0 / 20</span>' +
                      '<span id="mg-hp">HP: 5</span>' +
                      '<span class="mg-tip">WASD — ходить, мышь — целься, ЛКМ — огонь</span>' +
                      '<button id="mg-skip">Пропустить ▸</button>';
      body.appendChild(hud);
      hud.querySelector("#mg-skip").addEventListener("click", () => { win._close(); finish(); });

      window.addEventListener("keydown", kd);
      window.addEventListener("keyup", ku);
      canvas.addEventListener("mousemove", mmove);
      canvas.addEventListener("mousedown", mdown);
      window.addEventListener("mouseup", mup);
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("touchstart", tstart, { passive: false });
      canvas.addEventListener("touchmove", tmove, { passive: false });
      canvas.addEventListener("touchend", tend);

      loop();
    },
    onClose: () => { running = false; cleanup(); finish(); }
  });

  function cleanup() {
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("mouseup", mup);
  }

  function kd(e) {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === " ") { firing = true; e.preventDefault(); }
  }
  function ku(e) { const k = e.key.toLowerCase(); keys[k] = false; if (k === " ") firing = false; }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  function tpos(e) {
    const r = canvas.getBoundingClientRect(); const t = e.touches[0] || e.changedTouches[0];
    return { x: (t.clientX - r.left) / r.width * W, y: (t.clientY - r.top) / r.height * H };
  }
  function mmove(e) { const p = pos(e); aim.x = p.x; aim.y = p.y; }
  function mdown(e) { const p = pos(e); aim.x = p.x; aim.y = p.y; firing = true; shoot(); }
  function mup() { firing = false; }

  function tstart(e) { const p = tpos(e); aim.x = p.x; aim.y = p.y; moveTarget = p; shoot(); e.preventDefault(); }
  function tmove(e) { const p = tpos(e); moveTarget = p; e.preventDefault(); }
  function tend() { moveTarget = null; }

  function shoot() {
    if (over || cd > 0) return;
    cd = 10;
    const a = Math.atan2(aim.y - player.y, aim.x - player.x);
    bullets.push({ x: player.x, y: player.y, vx: Math.cos(a) * 6.2, vy: Math.sin(a) * 6.2 });
    Sounds.beep(720, 0.03, "square", 0.05);
  }

  function spawn() {
    const s = (Math.random() * 4) | 0; let x, y;
    if (s === 0) { x = Math.random() * W; y = -12; }
    else if (s === 1) { x = W + 12; y = Math.random() * H; }
    else if (s === 2) { x = Math.random() * W; y = H + 12; }
    else { x = -12; y = Math.random() * H; }
    enemies.push({ x, y, r: 10, spd: 0.7 + Math.random() * 0.8 });
  }

  function loop() {
    if (!running) return;
    if (cd > 0) cd--;

    // движение
    let dx = 0, dy = 0;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (moveTarget) { dx = moveTarget.x - player.x; dy = moveTarget.y - player.y; const m = Math.hypot(dx, dy); if (m < 5) { dx = dy = 0; } }
    const ml = Math.hypot(dx, dy) || 1;
    if (dx || dy) { player.x += dx / ml * player.spd; player.y += dy / ml * player.spd; }
    player.x = Math.max(player.r, Math.min(W - player.r, player.x));
    player.y = Math.max(player.r, Math.min(H - player.r, player.y));

    if (!over) {
      tSpawn++; if (tSpawn > 42) { tSpawn = 0; spawn(); }
      if (firing) shoot();               // удержание ЛКМ/пробела — очередь
    }

    bullets.forEach((b) => { b.x += b.vx; b.y += b.vy; });
    bullets = bullets.filter((b) => b.x > -10 && b.x < W + 10 && b.y > -10 && b.y < H + 10);
    enemies.forEach((e) => { const a = Math.atan2(player.y - e.y, player.x - e.x); e.x += Math.cos(a) * e.spd; e.y += Math.sin(a) * e.spd; });

    for (let i = enemies.length - 1; i >= 0; i--) {
      for (let j = bullets.length - 1; j >= 0; j--) {
        if (Math.hypot(enemies[i].x - bullets[j].x, enemies[i].y - bullets[j].y) < enemies[i].r + 3) {
          enemies.splice(i, 1); bullets.splice(j, 1); score++;
          const sc = document.getElementById("mg-score"); if (sc) sc.textContent = "Фраги: " + score + " / 20";
          Sounds.beep(400, 0.05, "square", 0.06);
          if (score >= 20 && !over) endGame(true);
          break;
        }
      }
    }
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (Math.hypot(enemies[i].x - player.x, enemies[i].y - player.y) < enemies[i].r + player.r) {
        enemies.splice(i, 1); player.hp--;
        const hp = document.getElementById("mg-hp"); if (hp) hp.textContent = "HP: " + Math.max(0, player.hp);
        Sounds.error();
        if (player.hp <= 0 && !over) endGame(false);
      }
    }
    draw();
    requestAnimationFrame(loop);
  }

  function draw() {
    ctx.fillStyle = "#0c1018"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#151b28"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // линия прицела + перекрестие
    const a = Math.atan2(aim.y - player.y, aim.x - player.x);
    ctx.strokeStyle = "rgba(120,170,255,.25)"; ctx.beginPath();
    ctx.moveTo(player.x, player.y); ctx.lineTo(player.x + Math.cos(a) * 60, player.y + Math.sin(a) * 60); ctx.stroke();
    ctx.strokeStyle = "#5f8fd0"; ctx.beginPath(); ctx.arc(aim.x, aim.y, 7, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(aim.x - 10, aim.y); ctx.lineTo(aim.x + 10, aim.y);
    ctx.moveTo(aim.x, aim.y - 10); ctx.lineTo(aim.x, aim.y + 10); ctx.stroke();

    enemies.forEach((e) => { ctx.fillStyle = "#e0574a"; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 7); ctx.fill(); });
    ctx.fillStyle = "#ffe27a"; bullets.forEach((b) => { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill(); });

    // игрок — «ствол» смотрит в прицел
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(a);
    ctx.fillStyle = "#4da3ff"; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, 7); ctx.fill();
    ctx.fillStyle = "#cfe6ff"; ctx.fillRect(player.r - 3, -3, 10, 6);
    ctx.restore();
    ctx.fillStyle = "#dff"; ctx.beginPath(); ctx.arc(player.x, player.y, 3.5, 0, 7); ctx.fill();
  }

  function endGame(wonMatch) {
    over = true; firing = false;
    const body = win.querySelector(".window-body");
    const ov = document.createElement("div"); ov.className = "mg-over";
    ov.innerHTML = '<div class="mg-title">' + (wonMatch ? "ПОБЕДА В МАТЧЕ" : "МАТЧ ОКОНЧЕН") + "</div>" +
      '<div class="mg-sub">' + (wonMatch ? "gg. Luna: «неплохо ты стреляешь»" : "Luna вытащила катку. «в следующий раз прикрою»") + "</div>" +
      '<button class="mg-cont">Продолжить ▸</button>';
    body.appendChild(ov);
    Sounds.win();
    ov.querySelector(".mg-cont").addEventListener("click", () => { win._close(); finish(); });
  }
}
