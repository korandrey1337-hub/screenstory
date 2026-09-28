/* ===========================================================
   STORYENGINE.JS — проигрывание window.STORY.
   Управление живёт в самом чате: выбираешь реплику и «отправляешь».
   Перед каждым днём — текст-подводка от первого лица.
   =========================================================== */
const Story = (function () {
  let idx = -1;
  let chatWin = null, chatLog = null, chatFoot = null, chatHeadSt = null;
  let popup = null;
  let pendingInbox = null;
  const desktop = () => document.getElementById("desktop");
  const SFX = {
    yandere: "assets/story/sfx_yandere.mp3",
    juri:    "assets/story/sfx_juri.mp3",
    horror:  "assets/story/sfx_horror.mp3",
    monster: "assets/story/sfx_monster.mp3",
    glass:   "assets/story/sfx_glass.mp3",
    knock:   "assets/story/sfx_knock.mp3"
  };

  function start() { idx = -1; advance(); }

  function closePopup() {
    if (!popup) return;
    var p = popup; popup = null;
    if (p._close) p._close();
  }

  function advance() {
    closePopup();
    idx++;
    if (idx >= STORY.length) return;
    render(STORY[idx]);
  }

  function render(b) {
    if ((b.t === "scene" || b.t === "msg" || b.t === "narr") && !chatReady()) return waitChat(b);
    if (b.t === "scene" || b.t === "msg" || b.t === "narr") markChatReady();
    switch (b.t) {
      case "intro":    return introScreen(b);
      case "day":      return dayCard(b);
      case "scene":    setScene(b.text); return advance();
      case "minigame": return waitGame();
      case "msg":      return renderMsg(b);
      case "narr":     return renderNarr(b);
      case "email":    return renderEmail(b);
      case "inbox":    return waitMail(b);
      case "wall":     setWall(b.src); return advance();
      case "music":    Bgm.to(b.src); return advance();
      case "mailadd":  inboxAdd(b.add || b.messages); { const mi = mailIcon(); if (mi) { mi.classList.add("unread"); if (b.badge) mi.classList.add("blink"); } } return advance();
      case "bgchat":   bgChat(b); return advance();
      case "fx":       return renderFx(b);
      case "end":      return finale();
      default:         return advance();
    }
  }

  /* ---------- Мессенджер: контакты + диалоги ---------- */
  const CONTACTS = [
    { id:"luna", name:"Luna_404", ava:"🌙", story:true, status:"онлайн", preview:"печатает…" },
    { id:"mom",  name:"Мама", ava:"👩", status:"была недавно", unread:2, preview:"опять за компом всю ночь…", msgs:[
      ["in","Ты поел сегодня?"],["in","Артём, позвони как сможешь"],["out","позже, занят"],["in","опять за компом всю ночь…"]] },
    { id:"dan",  name:"Данёк", ava:"🎮", status:"был недавно", unread:1, preview:"ты живой?", msgs:[
      ["in","го в катку"],["out","не сейчас"],["in","ты живой? тебя второй день нет"],["in","если занят, так и напиши"]] },
    { id:"work", name:"Тимлид", ava:"💼", status:"был недавно", preview:"Артём?", msgs:[
      ["in","отчёт когда будет?"],["in","Артём?"],["in","ну хотя бы напиши, что живой"]] },
    { id:"deliv",name:"Доставка", ava:"📦", status:"был недавно", preview:"Курьер не смог дозвониться", msgs:[
      ["in","Ваш заказ передан курьеру"],["in","Курьер не смог дозвониться. Перенос на завтра"]] },
    { id:"mira", name:"Мира", avatar:"assets/story/mira_avatar.png", status:"заблокирован", preview:"заблокирован", blocked:true, msgs:[
      { type:"stamp", text:"старый диалог" },
      ["in","Ты уснул?"],
      ["out","нет. просто слушаю, как у тебя в фоне шумит компьютер"],
      ["in","звучит странно, но мило"],
      ["out","мы созваниваемся уже четыре часа"],
      ["in","и ты всё равно молчишь половину времени :)"],
      { type:"photo", dir:"in", src:"assets/story/mira_call.png", caption:"сохранено из созвона • 02:11" },
      ["out","я потом смотрел этот скрин, когда не мог заснуть"],
      ["in","не делай так часто. лучше просто напиши мне"],
      { type:"stamp", text:"через месяц" },
      { type:"photo", dir:"in", src:"assets/story/mira_stream.png", caption:"её вечерний стрим" },
      ["out","я смотрел весь стрим"],
      ["in","я видела твой ник в зрителях. почему опять ничего не написал?"],
      ["out","не хотел мешать"],
      ["in","ты не мешаешь. мне наоборот спокойнее, когда ты рядом"],
      { type:"stamp", text:"потом" },
      ["in","Давай увидимся завтра? Без камеры. Просто кофе."],
      ["out","я не знаю"],
      ["in","Артём, ты третий раз так отвечаешь"],
      ["out","мне проще здесь"],
      ["in","мне тоже было проще. но я всё равно пришла бы"],
      ["out","я боюсь всё испортить"],
      ["in","ты уже портишь. молчанием"],
      { type:"stamp", text:"последний день" },
      ["in","Ты смотрел стрим и не ответил на мои сообщения"],
      ["out","я не мог"],
      ["in","ты мог. ты просто прятался"],
      ["out","прости"],
      ["in","Не сейчас. Я устала ждать человека, который любит только экран."],
      { type:"blocked", text:"Пользователь заблокировал вас" }
    ] }
  ];
  let messengerWin = null, msgrMain = null, msgrContacts = null;
  let lunaConv = null, lunaLog = null, lunaFoot = null, activeC = null;
  let msgrOpened = false, pendingChat = null, pendingGame = false;

  function chatIcon() { return document.querySelector('.icon[data-app="chat"]'); }
  function messengerVisible() { return !!(messengerWin && document.body.contains(messengerWin)); }
  function chatReady() { return msgrOpened || messengerVisible(); }
  function markChatReady() {
    msgrOpened = true;
    const ci = chatIcon(); if (ci) ci.classList.remove("unread", "blink");
    removeToast();
  }

  function ensureMessenger() {
    if (messengerWin && document.body.contains(messengerWin)) return;
    messengerWin = WM.createWindow({
      title: "Мессенджер", icon: "💬", bodyClass: "msgr-win", width: 520, x: 200, y: 45,
      build: (body) => {
        body.innerHTML = '<div class="msgr"><div class="msgr-side" id="msgr-side"></div><div class="msgr-main" id="msgr-main"></div></div>';
        msgrContacts = body.querySelector("#msgr-side");
        msgrMain = body.querySelector("#msgr-main");
        if (!lunaConv) {
          lunaConv = document.createElement("div"); lunaConv.className = "conv";
          lunaConv.innerHTML =
            '<div class="chat-head"><div class="ava"><img src="assets/story/luna.png" onerror="this.parentNode.textContent=\'🌙\'"></div>' +
            '<div><div class="who">Luna_404</div><div class="st" id="chat-st">онлайн</div></div></div>' +
            '<div class="chat-log"></div><div class="chat-foot"></div>';
          lunaLog = lunaConv.querySelector(".chat-log");
          lunaFoot = lunaConv.querySelector(".chat-foot");
          chatHeadSt = lunaConv.querySelector("#chat-st");
        }
        chatLog = lunaLog; chatFoot = lunaFoot;
        renderContacts(); selectContact("luna");
      },
      onClose: () => {
        messengerWin = null;
        msgrMain = null;
        msgrContacts = null;
        activeC = null;
        msgrOpened = false;
      }
    });
  }

  function avatarMarkup(c, cls) {
    if (c && c.avatar) return '<div class="' + cls + '"><img src="' + c.avatar + '" alt=""></div>';
    return '<div class="' + cls + '">' + ((c && c.ava) || "") + "</div>";
  }

  function renderContacts() {
    if (!msgrContacts) return;
    msgrContacts.innerHTML = "";
    CONTACTS.forEach((c) => {
      const row = document.createElement("div");
      row.className = "msgr-c" + (c.id === activeC ? " active" : "") + (c.unread ? " unread" : "") + (c.blocked ? " blocked" : "");
      row.innerHTML = avatarMarkup(c, "mc-ava") +
        '<div class="mc-main"><div class="mc-name">' + c.name + '</div><div class="mc-prev">' + (c.preview || "") + "</div></div>" +
        (c.unread ? '<div class="mc-badge">' + c.unread + "</div>" : "");
      row.addEventListener("click", () => selectContact(c.id));
      msgrContacts.appendChild(row);
    });
  }

  function selectContact(id) {
    activeC = id;
    const c = CONTACTS.find((x) => x.id === id); if (c) c.unread = 0;
    Sounds.click();
    msgrMain.innerHTML = "";
    if (id === "luna") msgrMain.appendChild(lunaConv);
    else msgrMain.appendChild(buildDecoy(c));
    renderContacts();
    const lg = msgrMain.querySelector(".chat-log");
    if (lg) requestAnimationFrame(() => { lg.scrollTop = lg.scrollHeight; });
  }

  function buildDecoy(c) {
    const wrap = document.createElement("div"); wrap.className = "conv" + (c.blocked ? " blocked-conv" : "");
    wrap.innerHTML = '<div class="chat-head">' + avatarMarkup(c, "ava") + '<div><div class="who">' + c.name + '</div><div class="st' + (c.blocked ? " blocked-st" : "") + '">' + (c.status || "был недавно") + '</div></div></div>';
    const log = document.createElement("div"); log.className = "chat-log";
    (c.msgs || []).forEach((m) => appendDecoyMessage(log, m));
    wrap.appendChild(log);
    const foot = document.createElement("div"); foot.className = "chat-foot";
    foot.innerHTML = c.blocked
      ? '<div class="cf-label blocked-note">Пользователь заблокирован. Новые сообщения не отправляются.</div>'
      : '<div class="cf-label" style="opacity:.6">← выбери Luna_404, чтобы продолжить</div>';
    wrap.appendChild(foot);
    return wrap;
  }

  function appendDecoyMessage(log, m) {
    if (Array.isArray(m)) {
      const d = document.createElement("div");
      d.className = "msg " + (m[0] === "out" ? "me" : "luna");
      d.textContent = m[1];
      log.appendChild(d);
      return;
    }
    if (!m || !m.type) return;
    if (m.type === "stamp" || m.type === "blocked") {
      const d = document.createElement("div");
      d.className = "msg sys old-stamp" + (m.type === "blocked" ? " blocked-msg" : "");
      d.textContent = m.text || "";
      log.appendChild(d);
      return;
    }
    if (m.type === "photo") {
      const d = document.createElement("div");
      d.className = "msg " + (m.dir === "out" ? "me" : "luna") + " msg-photo";
      const img = new Image();
      img.src = m.src;
      img.alt = "";
      img.addEventListener("click", () => openDecoyPhoto(m));
      d.appendChild(img);
      if (m.caption) {
        const cap = document.createElement("div");
        cap.className = "photo-cap";
        cap.textContent = m.caption;
        d.appendChild(cap);
      }
      log.appendChild(d);
    }
  }

  function openDecoyPhoto(m) {
    WM.createWindow({
      title: m.caption || "Фото", icon: "🖼", bodyClass: "image-window big-view", width: 420,
      build: (body) => {
        const img = new Image();
        img.className = "slot-img";
        img.src = m.src;
        body.appendChild(img);
      }
    });
  }

  function bgChat(b) {
    const c = CONTACTS.find((x) => x.id === b.id);
    if (!c) return;
    (b.msgs || []).forEach((m) => c.msgs.push(m));
    if (b.preview) c.preview = b.preview;
    if (activeC !== b.id) c.unread = (c.unread || 0) + (b.unread || (b.msgs ? b.msgs.length : 1));
    if (msgrOpened && messengerWin && document.body.contains(messengerWin)) {
      renderContacts();
      if (activeC === b.id) selectContact(b.id);   // если открыт этот чат — дописать
    }
    Sounds.beep(440, 0.03, "sine", 0.05);
  }

  function setScene(text) { ensureMessenger(); if (chatHeadSt) chatHeadSt.textContent = "онлайн"; }
  function pushBubble(who, text) { if (activeC !== "luna") selectContact("luna"); const m = document.createElement("div"); m.className = "msg " + who; m.textContent = text; lunaLog.appendChild(m); lunaLog.scrollTop = lunaLog.scrollHeight; }

  function footClear() { if (chatFoot) chatFoot.innerHTML = ""; }
  function footContinue() {
    if (!chatFoot) return; chatFoot.innerHTML = "";
    const b = document.createElement("button"); b.className = "cf-next"; b.textContent = "Далее ▸";
    b.onclick = () => { Sounds.click(); advance(); }; chatFoot.appendChild(b);
  }
  function footReply(beat) {
    ensureMessenger(); if (activeC !== "luna") selectContact("luna"); chatFoot.innerHTML = "";
    const opts = (beat.opts && beat.opts.length) ? beat.opts : [beat.text];
    const label = document.createElement("div"); label.className = "cf-label";
    label.textContent = opts.length > 1 ? "Выбери, что ответить:" : "Твоё сообщение:";
    chatFoot.appendChild(label);
    opts.forEach((text) => {
      const chip = document.createElement("button"); chip.className = "cf-chip";
      const sp = document.createElement("span"); sp.textContent = text;
      const bb = document.createElement("b"); bb.textContent = "➤";
      chip.appendChild(sp); chip.appendChild(bb);
      chip.onclick = () => { pushBubble("me", text); Sounds.beep(880, 0.03, "square", 0.05); footClear(); advance(); };
      chatFoot.appendChild(chip);
    });
    lunaLog.scrollTop = lunaLog.scrollHeight;
  }

  function renderMsg(b) {
    ensureMessenger(); if (activeC !== "luna") selectContact("luna");
    if (b.who === "me") { footReply(b); return; }
    footClear();
    const typing = document.createElement("div"); typing.className = "typing";
    typing.innerHTML = "печатает<span>.</span><span>.</span><span>.</span>";
    lunaLog.appendChild(typing); lunaLog.scrollTop = lunaLog.scrollHeight;
    setTimeout(() => {
      typing.remove(); pushBubble(b.who, b.text);
      if (b.who === "sys") Sounds.error(); else Sounds.beep(500, 0.04, "sine", 0.06);
      footContinue();
    }, 700 + Math.random() * 700);
  }
  function renderNarr(b) {
    ensureMessenger(); if (activeC !== "luna") selectContact("luna");
    const n = document.createElement("div"); n.className = "msg narr"; n.textContent = b.text;
    lunaLog.appendChild(n); lunaLog.scrollTop = lunaLog.scrollHeight; footContinue();
  }

  /* ждём, пока игрок сам откроет мессенджер и выберет Luna */
  function waitChat(b) {
    if (chatReady()) {
      markChatReady();
      pendingChat = null;
      return render(b);
    }
    pendingChat = b; toast("↖ Открой «Мессенджер» и выбери диалог с Luna");
    const ci = chatIcon(); if (ci) ci.classList.add("unread", "blink");
    Sounds.beep(500, 0.05, "sine", 0.06);
  }
  function openMessenger() {
    markChatReady(); ensureMessenger();
    if (window.HORROR_LOCK && Math.random() < 0.4) Sounds.voice(SFX.juri);
    if (pendingChat) { const b = pendingChat; pendingChat = null; render(b); }
  }
  function gameIcon() { return document.querySelector('.icon[data-app="game"]'); }
  function waitGame() {
    pendingGame = true; toast("↖ Открой «Онлайн-игру» на рабочем столе");
    const gi = gameIcon(); if (gi) gi.classList.add("unread", "blink");
    Sounds.beep(500, 0.05, "sine", 0.06);
  }
  function openGame() {
    const gi = gameIcon(); if (gi) gi.classList.remove("unread", "blink"); removeToast();
    if (pendingGame) { pendingGame = false; openShooter(() => advance()); }
    else { openShooter(function () {}); }
  }
  function toast(t) { removeToast(); const el = document.createElement("div"); el.id = "hint-toast"; el.textContent = t; desktop().appendChild(el); }
  function removeToast() { const el = document.getElementById("hint-toast"); if (el) el.remove(); }

  /* ---------- Подводка перед днём ---------- */
  function introScreen(b) {
    const c = document.createElement("div"); c.id = "intro-card";
    const box = document.createElement("div"); box.className = "ic-text";
    (b.lines || [b.text]).forEach((ln) => { const p = document.createElement("p"); p.textContent = ln; box.appendChild(p); });
    const btn = document.createElement("button"); btn.className = "ic-next"; btn.textContent = "Далее ▸";
    c.appendChild(box); c.appendChild(btn); document.body.appendChild(c);
    btn.addEventListener("click", () => { Sounds.click(); c.remove(); advance(); });
  }

  function dayCard(b) {
    // новый день — окна закрываются, чат/игру надо открывать заново
    if (lunaConv && lunaConv.parentNode) lunaConv.parentNode.removeChild(lunaConv);
    document.getElementById("windows-layer").innerHTML = "";
    document.getElementById("taskbar-items").innerHTML = "";
    messengerWin = null; msgrOpened = false; popup = null; pendingInbox = null; pendingChat = null; removeToast();
    const c = document.createElement("div"); c.id = "day-card";
    c.innerHTML = '<div class="dc-day">День ' + b.n + "</div>" +
      '<div class="dc-date">' + b.date + "</div>" +
      '<div class="dc-title">' + b.title + "</div>" +
      '<button class="dc-next">Продолжить</button>';
    document.body.appendChild(c);
    Sounds.beep(320, 0.14, "sine", 0.06);
    c.querySelector(".dc-next").addEventListener("click", () => { Sounds.click(); c.remove(); advance(); });
  }

  /* ---------- Почта ---------- */
  function renderEmail(b) {
    footClear(); Sounds.beep(300, 0.12, "sine", 0.08);
    popup = WM.createWindow({
      title: "Почта — новое письмо", icon: "📧", bodyClass: "mail-win",
      width: 360, x: 300, y: 90,
      build: (body) => {
        let html = '<div class="mail-head"><div class="mail-subj"></div><div class="mail-from"></div></div><div class="mail-body"></div>';
        if (b.att) html += '<div class="mail-att">📎 ' + b.att + "</div>";
        html += '<div class="mail-cont">Закрой окно, чтобы продолжить →</div>';
        body.innerHTML = html;
        body.querySelector(".mail-subj").textContent = "Тема: " + b.subj;
        body.querySelector(".mail-from").textContent = "От: " + b.from;
        body.querySelector(".mail-body").textContent = b.body;
      },
      onClose: () => { if (popup) { popup = null; advance(); } }
    });
  }

  /* ---------- Эффекты ---------- */
  function renderFx(b) {
    if (b.kind === "file")     return fxFile(b);
    if (b.kind === "seeyou")   return fxSeeYou(b);
    if (b.kind === "glitch")   return fxGlitch(b);
    if (b.kind === "photo")    return fxImage(b);
    if (b.kind === "webcam")   return fxWebcam(b);
    if (b.kind === "monitorEyes") return fxMonitorEyes(b);
    if (b.kind === "blackout") return fxBlackout(b);
    if (b.kind === "scream")   return fxScream(b);
    if (b.kind === "redtext")  return fxRedText(b);
    if (b.kind === "knock")    return fxKnock(b);
    if (b.kind === "glass")    return fxGlass(b);
    if (b.kind === "voice")    return fxVoice(b);
    if (b.kind === "folderstorm") return fxFolderStorm(b);
    if (b.kind === "lock")     { window.HORROR_LOCK = true; return advance(); }
    return advance();
  }
  function fxFile(b) {
    footClear();
    const ic = document.createElement("div"); ic.className = "icon";
    const x = Math.min(Math.max(128, Math.round(window.innerWidth * 0.18)), Math.max(128, window.innerWidth - 128));
    const y = Math.min(Math.max(72, Math.round(window.innerHeight * 0.18)), Math.max(72, window.innerHeight - 132));
    ic.style.cssText = "position:absolute;left:" + x + "px;top:" + y + "px;z-index:20";
    ic.innerHTML = '<div class="app-icon">📄</div><div class="icon-label" style="color:#e06">' + b.name + "</div>";
    desktop().appendChild(ic);
    Sounds.beep(180, 0.15, "sawtooth", 0.12);
    let vis = true; const bl = setInterval(() => { vis = !vis; ic.style.opacity = vis ? "1" : ".15"; }, 220);
    setTimeout(() => { clearInterval(bl); ic.remove(); ensureMessenger(); footContinue(); }, 3000);
  }
  function fxGlitch(b) {
    footClear(); const d = desktop(); d.classList.add("glitch");
    Sounds.beep(90, 0.5, "sawtooth", 0.14); Sounds.error();
    symbolBurst();
    setTimeout(() => { d.classList.remove("glitch"); ensureMessenger(); footContinue(); }, 1400);
  }
  function fxSeeYou(b) {
    footClear();
    const ov = document.createElement("div"); ov.id = "seeyou"; ov.textContent = b.text || "Я вижу тебя.";
    document.body.appendChild(ov);
    Sounds.error(); setTimeout(() => Sounds.beep(70, 0.8, "sawtooth", 0.16), 200);
    const go = () => { if (document.body.contains(ov)) { ov.remove(); advance(); } };
    ov.addEventListener("click", go); setTimeout(go, 3500);
  }
  function fxBlackout(b) {
    footClear();
    const ov = document.createElement("div"); ov.id = "seeyou";
    ov.style.background = "#000"; ov.style.color = "#cfd5e2"; ov.style.textShadow = "0 0 18px rgba(180,200,255,.4)";
    ov.textContent = b.text || ""; document.body.appendChild(ov);
    Sounds.beep(60, 1.2, "sine", 0.12);
    const go = () => { if (document.body.contains(ov)) { ov.remove(); advance(); } };
    ov.addEventListener("click", go); setTimeout(go, 3200);
  }
  function fxImage(b) {
    footClear(); Sounds.beep(240, 0.1, "sine", 0.07);
    popup = WM.createWindow({
      title: "🖼 просмотр", icon: "🖼", bodyClass: "image-window",
      width: 340, x: 320, y: 80,
      build: (body) => {
        const img = new Image(); img.className = "slot-img";
        img.onerror = () => { body.innerHTML = '<div class="slot-ph">[ сюда ляжет твоя картинка:<br>' + (b.src || "") + " ]</div>"; if (b.caption) addCap(body, b.caption); addClose(body); };
        img.onload = () => { body.innerHTML = ""; body.appendChild(img); if (b.caption) addCap(body, b.caption); addClose(body); };
        img.src = b.src;
      },
      onClose: () => { if (popup) { popup = null; advance(); } }
    });
  }
  function fxWebcam(b) {
    footClear(); Sounds.beep(70, 1.0, "sawtooth", 0.14);
    popup = WM.createWindow({
      title: "cam0 — включена", icon: "🎥", bodyClass: "cam-win",
      width: 340, x: 330, y: 90,
      build: (body) => {
        const feed = document.createElement("div"); feed.className = "cam-feed";
        feed.innerHTML = '<div class="rec">REC</div>';
        const img = new Image();
        img.onerror = () => { const ph = document.createElement("div"); ph.className = "slot-ph"; ph.innerHTML = "[ вебка: assets/story/webcam.jpg ]"; feed.appendChild(ph); };
        img.onload = () => feed.appendChild(img);
        img.src = b.src;
        if (b.caption) { const cap = document.createElement("div"); cap.className = "cam-caption"; cap.textContent = b.caption; feed.appendChild(cap); }
        body.appendChild(feed); addClose(body);
      },
      onClose: () => { if (popup) { popup = null; advance(); } }
    });
  }
  function fxMonitorEyes(b) {
    footClear();
    const ov = document.createElement("div");
    ov.id = "monitor-eyes";
    const img = new Image();
    img.src = b.src || "assets/story/monitor_eyes.png";
    ov.appendChild(img);
    document.body.appendChild(ov);
    desktop().classList.add("glitch");
    Sounds.error();
    Sounds.beep(58, 0.9, "sawtooth", 0.16);
    setTimeout(() => Sounds.beep(1120, 0.12, "square", 0.08), 180);
    setTimeout(() => {
      ov.remove();
      desktop().classList.remove("glitch");
      advance();
    }, b.dur || 1800);
  }
  function addCap(body, text) { const c = document.createElement("div"); c.className = "cam-caption"; c.style.position = "static"; c.textContent = text; body.appendChild(c); }
  function addClose(body) { const c = document.createElement("div"); c.className = "mail-cont"; c.textContent = "Закрой окно, чтобы продолжить →"; body.appendChild(c); }

  /* ---------- Кровь: натуральные брызги + подтёки (canvas) ---------- */
  function startBlood(cv, onSoaked) {
    const ctx = cv.getContext("2d");
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const W = cv.width, H = cv.height;
    const REDS = ["#5e0004", "#720106", "#8b0208", "#a3000a"];
    const drips = [];
    let frame = 0, wash = 0, running = true, fired = false;

    function irregular(x, y, r, color) {           // неровное пятно, а не круг
      ctx.fillStyle = color;
      ctx.beginPath();
      const n = 12 + ((Math.random() * 6) | 0);
      for (let i = 0; i <= n; i++) {
        const a = i / n * Math.PI * 2;
        const rr = r * (0.6 + Math.random() * 0.75);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.92;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    function splat() {
      const x = Math.random() * W;
      const y = Math.random() * H * 0.7;
      const r = 12 + Math.random() * 46;
      irregular(x, y, r * 1.15, "rgba(26,0,0,.5)");                    // тёмная кайма
      irregular(x, y, r, REDS[(Math.random() * REDS.length) | 0]);     // тело пятна
      for (let i = 0; i < 7; i++) {                                    // мелкие брызги
        const a = Math.random() * 6.283, d = r * (1.2 + Math.random() * 2.0);
        irregular(x + Math.cos(a) * d, y + Math.sin(a) * d, 1.5 + Math.random() * 5, REDS[1]);
      }
      const dn = 1 + ((Math.random() * 3) | 0);                        // подтёки вниз
      for (let i = 0; i < dn; i++) {
        drips.push({ x: x + (Math.random() - .5) * r, y: y + r * 0.55,
          w: 3 + Math.random() * 8, sp: 0.7 + Math.random() * 2.2,
          life: 70 + Math.random() * 190, c: REDS[(Math.random() * REDS.length) | 0] });
      }
      Sounds.beep(60 + Math.random() * 40, 0.12, "sawtooth", 0.05);
    }
    function step() {
      if (!running) return;
      frame++;
      if (frame < 170 && frame % 5 === 0) splat();
      for (let i = drips.length - 1; i >= 0; i--) {                    // стекающие струйки
        const d = drips[i];
        ctx.fillStyle = d.c;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.w / 2, d.sp + 2.5, 0, 0, 6.283);
        ctx.fill();
        d.y += d.sp; d.life--; d.sp *= 0.996;
        if (d.y > H || d.life <= 0) {
          ctx.beginPath(); ctx.arc(d.x, d.y, d.w * 0.62, 0, 6.283); ctx.fill();  // капля на конце
          drips.splice(i, 1);
        }
      }
      if (frame > 240) {                                               // экран заливает красным
        wash += 0.004;
        ctx.fillStyle = "rgba(86,0,4," + Math.min(0.05, wash) + ")";
        ctx.fillRect(0, 0, W, H);
      }
      if (frame > 400 && !fired) { fired = true; onSoaked && onSoaked(); }
      requestAnimationFrame(step);
    }
    step();
    return { stop: () => { running = false; } };
  }

  /* ---------- Почта: ждём, пока игрок сам откроет ярлык ---------- */
  function mailIcon() { return document.querySelector('.icon[data-app="mail"]'); }
  function updateMailBadge() {
    const mi = mailIcon(); if (!mi) return;
    const any = (window.INBOX || []).some((m) => !window.INBOX_READ[m.id]);
    if (any) mi.classList.add("unread"); else mi.classList.remove("unread", "blink");
  }
  function waitMail(b) {
    pendingInbox = b;
    const mi = mailIcon(); if (mi) mi.classList.add("unread", "blink");
    toast("↖ Пришло письмо — открой «Почту»");
    Sounds.beep(300, 0.12, "sine", 0.08);
  }
  function openMail() {
    const mi = mailIcon(); if (mi) mi.classList.remove("blink"); removeToast();
    if (window.HORROR_LOCK && Math.random() < 0.35) Sounds.voice(SFX.juri);
    if (pendingInbox) {
      const b = pendingInbox; pendingInbox = null;
      openInbox(b, () => { updateMailBadge(); advance(); });
    } else {
      openInbox({}, () => updateMailBadge());
    }
  }

  /* ---------- Обои рабочего стола (меняются по сюжету) ---------- */
  function setWall(src) {
    const d = document.getElementById("desktop");
    d.classList.add("wallpaper");
    d.style.backgroundImage = "url('" + src + "')";
  }

  /* ---------- Скримеры / глитчи / корраптед-текст ---------- */
  var SCARE_FACE =
    '<svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice">' +
    '<rect width="300" height="300" fill="#000"/>' +
    '<ellipse cx="150" cy="165" rx="96" ry="122" fill="#d2ccc2"/>' +
    '<ellipse cx="150" cy="165" rx="96" ry="122" fill="none" stroke="#0a0a0a" stroke-width="2"/>' +
    '<ellipse cx="110" cy="140" rx="27" ry="36" fill="#000"/>' +
    '<ellipse cx="190" cy="140" rx="27" ry="36" fill="#000"/>' +
    '<circle cx="110" cy="150" r="6" fill="#c00"/>' +
    '<circle cx="190" cy="150" r="6" fill="#c00"/>' +
    '<path d="M104 225 Q150 300 196 225 Q150 255 104 225 Z" fill="#150000"/>' +
    '<path d="M116 235 L120 265 M150 240 L150 275 M184 235 L180 265" stroke="#3a0000" stroke-width="3"/>' +
    '<path d="M110 176 L103 255 M190 176 L197 255" stroke="#6e0000" stroke-width="4"/>' +
    '</svg>';

  function loudStinger() {
    Sounds.beep(70, 0.55, "sawtooth", 0.22);
    Sounds.error();
    Sounds.beep(1250, 0.18, "square", 0.14);
    setTimeout(function () { Sounds.beep(52, 0.7, "sawtooth", 0.2); }, 60);
    setTimeout(function () { Sounds.error(); }, 120);
  }

  var SCARES = ["assets/story/scare.jpg", "assets/story/scare2.jpg", "assets/story/scare3.jpg"];
  var lastScare = -1;
  function nextScare() { var i; do { i = (Math.random() * SCARES.length) | 0; } while (i === lastScare && SCARES.length > 1); lastScare = i; return SCARES[i]; }
  function scream(opts, then) {
    opts = opts || {};
    var ov = document.createElement("div"); ov.id = "scream";
    var src = opts.img || nextScare();
    var im = new Image(); im.onerror = function () { ov.innerHTML = SCARE_FACE; }; im.src = src; ov.appendChild(im);
    if (Math.random() < 0.5) ov.classList.add("sc-zoom");
    document.body.appendChild(ov);
    desktop().classList.add("glitch");
    Sounds.voice(opts.sfx || SFX.horror);
    var dur = opts.dur || (760 + Math.random() * 300);
    setTimeout(function () { ov.remove(); desktop().classList.remove("glitch"); if (then) then(); }, dur);
  }
  function fxScream(b) {
    footClear();
    if (!b || !b.last) return fxRedText({ text: (b && b.text) || "НЕ СМОТРИ ТАК РАНО" });
    scream({ img: b.src, dur: b.dur }, function () { advance(); });
  }

  var ZAL = ["̀","́","̂","̃","̈","̧","҉","͟","͓","̖"];
  function corrupt(t) {
    var o = "";
    for (var i = 0; i < t.length; i++) {
      var ch = t[i]; o += ch;
      if (ch !== " " && Math.random() < 0.75) { var k = 1 + ((Math.random() * 3) | 0); for (var j = 0; j < k; j++) o += ZAL[(Math.random() * ZAL.length) | 0]; }
    }
    return o;
  }
  function fxRedText(b) {
    footClear();
    var ov = document.createElement("div"); ov.id = "seeyou"; ov.className = "corrupt";
    ov.textContent = corrupt(b.text || "");
    document.body.appendChild(ov);
    Sounds.error(); Sounds.beep(72, 0.6, "sawtooth", 0.16);
    var alive = true;
    var iv = setInterval(function () { if (!alive) return clearInterval(iv); ov.textContent = corrupt(b.text || ""); }, 130);
    symbolBurst();
    var go = function () { if (!alive) return; alive = false; clearInterval(iv); ov.remove(); advance(); };
    ov.addEventListener("click", go); setTimeout(go, 2600);
  }

  function overlayBeat(text, corr, sound) {
    footClear();
    var ov = document.createElement("div"); ov.id = "seeyou"; if (corr) ov.className = "corrupt";
    ov.textContent = corr ? corrupt(text) : text;
    document.body.appendChild(ov);
    if (sound) sound();
    var alive = true;
    var iv = corr ? setInterval(function () { if (!alive) return clearInterval(iv); ov.textContent = corrupt(text); }, 120) : null;
    var go = function () { if (!alive) return; alive = false; if (iv) clearInterval(iv); ov.remove(); advance(); };
    ov.addEventListener("click", go); setTimeout(go, 2600);
  }
  function fxKnock(b) { desktop().classList.add("glitch"); Sounds.voice(SFX.knock); setTimeout(function(){ desktop().classList.remove("glitch"); }, 1000); setTimeout(advance, 1300); }
  function fxGlass(b) { desktop().classList.add("glitch"); Sounds.voice(SFX.glass); setTimeout(function(){ desktop().classList.remove("glitch"); }, 1000); setTimeout(advance, 1300); }
  function fxVoice(b) { Sounds.voice(SFX.juri); overlayBeat((b.text || "открой дверь").toUpperCase(), true, null); }
  function fxFolderStorm(b) {
    footClear();
    var host = document.createElement("div"); host.id = "folder-storm"; desktop().appendChild(host);
    var names = ["папка","new folder","НЕ ОТКРЫВАЙ","luna","███","я","ты","💔","help","run","0439","🩸","don't","открой"];
    for (var i = 0; i < 46; i++) {
      var el = document.createElement("div"); el.className = "fs-folder";
      el.style.left = (Math.random() * 92) + "vw"; el.style.top = (Math.random() * 82) + "vh";
      el.innerHTML = '<div class="folder-icon"></div><div class="icon-label">' + names[(Math.random() * names.length) | 0] + "</div>";
      host.appendChild(el);
      Sounds.beep(180 + Math.random() * 500, 0.03, "square", 0.05);
    }
    desktop().classList.add("glitch"); symbolBurst();
    var n = 0; var iv = setInterval(function () { symbolBurst(); if (++n > 5) clearInterval(iv); }, 480);
    setTimeout(function () { desktop().classList.remove("glitch"); }, 2600);
    setTimeout(function () { host.remove(); }, 6500);
    setTimeout(function () { advance(); }, 3200);
  }
  /* красный текст-вспышка без продвижения сюжета (для «не выключай меня») */
  function redTextFlash(text) {
    var ov = document.createElement("div"); ov.id = "seeyou"; ov.className = "corrupt big";
    ov.textContent = corrupt(text); document.body.appendChild(ov);
    var alive = true;
    var iv = setInterval(function () { if (!alive) return clearInterval(iv); ov.textContent = corrupt(text); }, 110);
    var go = function () { alive = false; clearInterval(iv); if (ov.parentNode) ov.remove(); };
    ov.addEventListener("click", go); setTimeout(go, 2800);
  }
  function scare(text) { scream({ sfx: SFX.yandere, dur: 900 }); setTimeout(function () { redTextFlash(text || "НЕ ВЫКЛЮЧАЙ МЕНЯ"); }, 250); }

  function symbolBurst() {
    var SYM = "01#@%&$?¥Ø∆╬▓█≡░ｦﾊﾋﾌｷ01x";
    var host = document.createElement("div"); host.id = "sym-burst"; document.body.appendChild(host);
    for (var i = 0; i < 40; i++) {
      var sp = document.createElement("span");
      sp.textContent = SYM[(Math.random() * SYM.length) | 0];
      sp.style.left = (Math.random() * 100) + "vw";
      sp.style.top = (Math.random() * 100) + "vh";
      sp.style.fontSize = (10 + Math.random() * 26) + "px";
      sp.style.animationDelay = (Math.random() * 0.4) + "s";
      host.appendChild(sp);
    }
    setTimeout(function () { host.remove(); }, 1400);
  }

  /* ---------- Бегущие символы (для финала) ---------- */
  function symbolRain() {
    const host = document.createElement("div"); host.id = "sym-rain"; document.body.appendChild(host);
    const SYM = "01#@%&$?¥Ø∆╬▓█≡░ｦﾊﾋﾌｷ緑死見血";
    const step = 18, cols = Math.max(6, Math.floor(window.innerWidth / step));
    for (let i = 0; i < cols; i++) {
      const c = document.createElement("div"); c.className = "rain-col";
      c.style.left = (i * step) + "px";
      c.style.animationDuration = (2 + Math.random() * 3.5) + "s";
      c.style.animationDelay = (-Math.random() * 3) + "s";
      let str = ""; for (let j = 0; j < 26; j++) str += SYM[(Math.random() * SYM.length) | 0] + "<br>";
      c.innerHTML = str; host.appendChild(c);
    }
    return { stop: () => host.remove() };
  }

  /* ---------- Финал: символы + глитчи (без крови) ---------- */
  function reportGameComplete() {
    try {
      if (window.ScreenStoryTG && typeof window.ScreenStoryTG.sendComplete === "function") {
        window.ScreenStoryTG.sendComplete();
      }
    } catch (e) {}
  }

  function finale() {
    if (lunaConv && lunaConv.parentNode) lunaConv.parentNode.removeChild(lunaConv);
    document.getElementById("windows-layer").innerHTML = "";
    document.getElementById("taskbar-items").innerHTML = "";

    const f = document.createElement("div"); f.id = "final";
    f.innerHTML =
      '<img class="fin-shot" id="fin-shot" alt="">' +
      '<div class="fin-msg" id="fin-msg"></div>' +
      '<div class="fin-end" id="fin-end">КОНЕЦ<br><button class="fin-restart" id="fin-restart">Сначала</button></div>';
    document.body.appendChild(f);
    const msg = f.querySelector("#fin-msg");
    const shot = f.querySelector("#fin-shot");

    Sounds.beep(55, 2.4, "sawtooth", 0.12);
    setTimeout(() => { msg.textContent = "Спасибо, что впустил меня."; msg.style.opacity = "1"; Sounds.error(); }, 800);
    setTimeout(() => {
      msg.style.opacity = "0";
      shot.onerror = () => { shot.style.display = "none"; };
      shot.src = "assets/story/final.jpg"; shot.classList.add("show");
      f.classList.add("glitchy");
      const rain = symbolRain();
      loudStinger();
      let n = 0;
      const iv = setInterval(() => {
        symbolBurst();
        if (Math.random() < 0.45) Sounds.beep(60 + Math.random() * 90, 0.1, "sawtooth", 0.08);
        if (++n > 9) clearInterval(iv);
      }, 620);
      setTimeout(() => {
        rain.stop(); f.classList.remove("glitchy");
        f.querySelector("#fin-end").style.opacity = "1";
        f.querySelector("#fin-restart").addEventListener("click", () => location.reload());
        setTimeout(reportGameComplete, 1600);
      }, 7200);
    }, 2600);
  }

  return { start, openMail, openMessenger, openGame, setWall, scare };
})();
try { window.Story = Story; } catch(e) {}
