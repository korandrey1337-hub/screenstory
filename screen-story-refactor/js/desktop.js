/* ===========================================================
   DESKTOP.JS — загрузка, рабочий стол, запуск истории.
   =========================================================== */
(function () {
  const bootScreen = document.getElementById("boot-screen");
  const bootText = document.getElementById("boot-text");
  const powerBtn = document.getElementById("power-btn");
  const desktop = document.getElementById("desktop");

  const bootLines = [
    "Запуск системы...",
    "Проверка памяти ........ OK",
    "Загрузка драйверов ...... OK",
    "Подключение к сети ...... OK",
    "Добро пожаловать, Артём."
  ];

  powerBtn.addEventListener("click", () => {
    Sounds.powerOn();
    Bgm.play("assets/story/bgm1.mp3");
    powerBtn.style.display = "none";
    let i = 0;
    const timer = setInterval(() => {
      bootText.textContent = bootLines[i]; i++;
      if (i >= bootLines.length) {
        clearInterval(timer);
        setTimeout(showDesktop, 800);
      }
    }, 450);
  });

  function showDesktop() {
    bootScreen.classList.add("hidden");
    desktop.classList.remove("hidden");
    desktop.classList.add("turn-on");
    startClock();
    setTimeout(() => Story.start(), 900);   // запускаем историю
  }

  // ---- Иконки-папки (оставлены по просьбе) ----
  const icons = document.querySelectorAll("#desktop-icons .icon");
  icons.forEach((icon) => {
    icon.addEventListener("click", () => {
      icons.forEach((i) => i.classList.remove("selected"));
      icon.classList.add("selected");
      Sounds.click();
    });
    icon.addEventListener("dblclick", () => openIcon(icon));
    let lastTap = 0;
    icon.addEventListener("touchend", (e) => {
      const now = Date.now();
      if (now - lastTap < 350) { e.preventDefault(); openIcon(icon); }
      lastTap = now;
    });
  });
  desktop.addEventListener("mousedown", (e) => {
    if (e.target.id === "desktop" || e.target.id === "windows-layer")
      icons.forEach((i) => i.classList.remove("selected"));
  });

  function openIcon(icon) {
    if (icon.dataset.app === "mail") { Story.openMail(); return; }
    if (icon.dataset.app === "chat") { Story.openMessenger(); return; }
    if (icon.dataset.app === "game") { Story.openGame(); return; }
    openFolder(icon.dataset.folder);
  }

  function openFolder(folder) {
    if (folder === "music") openMusicFolder();
    else if (folder === "notouch") openNotouch();
    else if (folder === "secrets") openSecrets();
  }

  // ---- Часы ----
  function startClock() {
    const clock = document.getElementById("clock");
    function tick() {
      const d = new Date();
      clock.textContent = String(d.getHours()).padStart(2, "0") + ":" +
                          String(d.getMinutes()).padStart(2, "0");
    }
    tick(); setInterval(tick, 10000);
  }

  // ---- Пуск → Выключить ----
  const startBtn = document.querySelector(".start-btn");
  let startMenu = null;
  function closeStartMenu() { if (startMenu) { startMenu.remove(); startMenu = null; } }
  startBtn.addEventListener("click", (e) => {
    e.stopPropagation(); Sounds.click();
    if (startMenu) { closeStartMenu(); return; }
    startMenu = document.createElement("div");
    startMenu.id = "start-menu";
    startMenu.innerHTML = '<div class="start-side">SYSTEM</div>' +
      '<div class="start-items"><div class="start-item" id="sm-shutdown"><span class="ico">⏻</span> Выключить компьютер</div></div>';
    desktop.appendChild(startMenu);
    startMenu.querySelector("#sm-shutdown").addEventListener("click", (ev) => {
      ev.stopPropagation(); closeStartMenu(); shutdown();
    });
  });
  document.addEventListener("click", (e) => {
    if (startMenu && !startMenu.contains(e.target) && !startBtn.contains(e.target)) closeStartMenu();
  });

  function shutdown() {
    if (window.HORROR_LOCK) { if (window.Story && Story.scare) Story.scare("НЕ ВЫКЛЮЧАЙ МЕНЯ"); return; }
    Sounds.closeWindow(); Sounds.beep(140, 0.6, "sawtooth", 0.12);
    document.getElementById("windows-layer").innerHTML = "";
    document.getElementById("taskbar-items").innerHTML = "";
    const sd = document.createElement("div");
    sd.id = "shutdown"; sd.innerHTML = '<div class="sd-text">Завершение работы…</div>';
    document.body.appendChild(sd);
    setTimeout(() => {
      sd.innerHTML = '<div class="sd-text">Теперь питание компьютера<br>можно отключить.</div>' +
        '<div class="sd-sub">SYSTEM</div><button id="sd-on">▶ Включить снова</button>';
      sd.querySelector("#sd-on").addEventListener("click", () => location.reload());
    }, 1600);
  }
})();
