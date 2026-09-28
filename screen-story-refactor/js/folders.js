/* ===========================================================
   FOLDERS.JS — содержимое папок рабочего стола.
   Музыка — пусто. Не трогать — 2 картинки. Секретики — под паролем.
   =========================================================== */

/* ---------- Музыка (плеер с треками) ---------- */
const MUSIC_TRACKS = [
  { name: "Scary Orchestra — Dark Ambient", src: "assets/story/music1.mp3" },
  { name: "曇りのち雨 — дождь после облаков", src: "assets/story/music2.mp3" }
];
function openMusicFolder() {
  WM.createWindow({
    title: "Музыка", icon: "📁", width: 320,
    build: (body) => {
      const fm = document.createElement("div"); fm.className = "filemanager";
      MUSIC_TRACKS.forEach((t) => {
        const el = document.createElement("div"); el.className = "file-item"; el.style.width = "120px";
        el.innerHTML = '<div class="file-icon">🎵</div><div class="file-name"></div>';
        el.querySelector(".file-name").textContent = t.name;
        const open = () => openTrack(t);
        el.addEventListener("click", () => { fm.querySelectorAll(".file-item").forEach((i) => i.classList.remove("selected")); el.classList.add("selected"); Sounds.click(); });
        el.addEventListener("dblclick", open);
        let lt = 0; el.addEventListener("touchend", (e) => { const n = Date.now(); if (n - lt < 350) { e.preventDefault(); open(); } lt = n; });
        fm.appendChild(el);
      });
      body.appendChild(fm);
      const s = document.createElement("div"); s.className = "statusbar"; s.textContent = "Двойной клик — включить трек";
      body.appendChild(s);
    }
  });
}
function openTrack(t) {
  if (typeof Bgm !== "undefined") Bgm.stop();     // не накладываем на фоновую музыку
  WM.createWindow({
    title: t.name, icon: "🎵", bodyClass: "player-win", width: 320,
    build: (body) => {
      const cap = document.createElement("div"); cap.className = "trk-name"; cap.textContent = "🎵 " + t.name;
      body.appendChild(cap);
      const a = document.createElement("audio"); a.src = t.src; a.controls = true; a.autoplay = true; a.style.width = "100%";
      body.appendChild(a);
    }
  });
}

/* ---------- Не трогать ---------- */
const NOTOUCH = [
  { name: "💔", src: "assets/story/girl.jpg" },
  { name: "Se33re5", src: "assets/story/minion.jpg" }
];
function openNotouch() {
  WM.createWindow({
    title: "Не трогать", icon: "📁", width: 300,
    build: (body) => {
      const warn = document.createElement("div"); warn.className = "statusbar";
      warn.style.marginBottom = "6px"; warn.textContent = "⚠ Я же просил не трогать…";
      body.appendChild(warn);
      const fm = document.createElement("div"); fm.className = "filemanager";
      NOTOUCH.forEach((it) => {
        const el = document.createElement("div"); el.className = "file-item";
        el.innerHTML = '<div class="file-icon">🖼</div><div class="file-name"></div>';
        el.querySelector(".file-name").textContent = it.name;
        const open = () => openImageWin(it);
        el.addEventListener("click", () => { fm.querySelectorAll(".file-item").forEach((i) => i.classList.remove("selected")); el.classList.add("selected"); Sounds.click(); });
        el.addEventListener("dblclick", open);
        let lt = 0; el.addEventListener("touchend", (e) => { const n = Date.now(); if (n - lt < 350) { e.preventDefault(); open(); } lt = n; });
        fm.appendChild(el);
      });
      body.appendChild(fm);
    }
  });
}
function openImageWin(it) {
  WM.createWindow({
    title: it.name, icon: "🖼", bodyClass: "image-window big-view", width: 420,
    build: (body) => { const img = new Image(); img.className = "slot-img"; img.src = it.src; body.appendChild(img); }
  });
}

/* ---------- Секретики (под паролем) ---------- */
const SECRET_PASSWORD = "Se33re5";
const SECRET_DOCS = [
  { name: "прости.txt", body:
"Я был идиотом.\n\nЯ оттолкнул тебя, когда ты была рядом. Придумывал причины, молчал тогда, когда надо было говорить.\n\nТеперь каждый вечер открываю наш диалог и перечитываю. Смешно — раньше я боялся встретиться, а теперь боюсь, что уже слишком поздно.\n\nЕсли ты когда-нибудь это прочитаешь: прости. Я хочу всё вернуть. Я скучаю так, что не могу спать." },
  { name: "устал.txt", body:
"Я так устал.\n\nНе от работы. От того, что каждый день одинаковый. Просыпаюсь — и не понимаю зачем.\n\nДом. Экран. Тишина. Кажется, никто бы и не заметил, если бы я просто перестал отвечать.\n\nИногда чувствую, что меня уже почти нет — есть только свет монитора на стене.\n\nМне бы просто, чтобы рядом кто-то был. Хоть кто-то." },
  { name: "она.txt", body:
"Она единственная, кто спрашивал, как я на самом деле.\n\nНе «чё делаешь», а по-настоящему.\n\nМожет, поэтому я и не заметил, когда всё стало неправильным.\n\nКогда так одиноко — поверишь во что угодно.\nИ впустишь кого угодно." }
];
function openSecrets() {
  WM.createWindow({ title: "Секретики", icon: "🔒", width: 320, build: (body) => lockView(body) });
}
function lockView(body) {
  body.innerHTML =
    '<div class="lock"><div class="lock-ico">🔒</div>' +
    '<div class="lock-t">Папка защищена паролем</div>' +
    '<input class="lock-inp" id="lk-inp" type="text" placeholder="введите пароль" autocomplete="off" spellcheck="false">' +
    '<button class="lock-btn" id="lk-btn">Открыть</button>' +
    '<div class="lock-hint" id="lk-hint">подсказка: имя картинки в папке «Не трогать»</div></div>';
  const inp = body.querySelector("#lk-inp"), btn = body.querySelector("#lk-btn"), hint = body.querySelector("#lk-hint");
  const submit = () => {
    if (inp.value.trim() === SECRET_PASSWORD) { Sounds.win(); showDocs(body); }
    else {
      Sounds.error(); hint.textContent = "Неверный пароль"; hint.style.color = "#e05252";
      body.querySelector(".lock").animate(
        [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
        { duration: 180 });
    }
  };
  btn.addEventListener("click", submit);
  inp.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  setTimeout(() => inp.focus(), 60);
}
function showDocs(body) {
  body.innerHTML = "";
  const fm = document.createElement("div"); fm.className = "filemanager";
  SECRET_DOCS.forEach((d) => {
    const el = document.createElement("div"); el.className = "file-item";
    el.innerHTML = '<div class="file-icon">📄</div><div class="file-name"></div>';
    el.querySelector(".file-name").textContent = d.name;
    const open = () => openDoc(d);
    el.addEventListener("click", () => { fm.querySelectorAll(".file-item").forEach((i) => i.classList.remove("selected")); el.classList.add("selected"); Sounds.click(); });
    el.addEventListener("dblclick", open);
    let lt = 0; el.addEventListener("touchend", (e) => { const n = Date.now(); if (n - lt < 350) { e.preventDefault(); open(); } lt = n; });
    fm.appendChild(el);
  });
  body.appendChild(fm);
}
function openDoc(d) {
  WM.createWindow({
    title: d.name + " — Блокнот", icon: "📄", width: 380,
    build: (body) => { const pre = document.createElement("div"); pre.className = "doc-body"; pre.textContent = d.body; body.appendChild(pre); }
  });
}
