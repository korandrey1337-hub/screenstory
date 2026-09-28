/* ===========================================================
   WINDOWS.JS — менеджер окон.
   Создание, перетаскивание, закрытие, фокус, панель задач.
   =========================================================== */

const WM = (function () {
  let zCounter = 100;
  let openCount = 0;
  const layer = () => document.getElementById("windows-layer");
  const taskbarItems = () => document.getElementById("taskbar-items");
  const MIN_WIDTH = 240;

  function viewport() {
    const desktop = document.getElementById("desktop");
    if (desktop && !desktop.classList.contains("hidden")) {
      const rect = desktop.getBoundingClientRect();
      return {
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      };
    }
    const vv = window.visualViewport;
    const innerW = window.innerWidth;
    const innerH = window.innerHeight;
    return {
      w: Math.round(vv ? Math.min(innerW, vv.width) : innerW),
      h: Math.round(vv ? Math.min(innerH, vv.height) : innerH),
      left: 0,
      top: 0
    };
  }

  function fitWidth(width) {
    const vp = viewport();
    return Math.min(width || 300, Math.max(MIN_WIDTH, vp.w - 12));
  }

  function clampWindow(win) {
    const vp = viewport();
    const rect = win.getBoundingClientRect();
    const localLeft = rect.left - vp.left;
    const localTop = rect.top - vp.top;
    const maxX = Math.max(6, vp.w - rect.width - 6);
    const maxY = Math.max(0, vp.h - rect.height - 40);
    const nextX = Math.max(6, Math.min(localLeft, maxX));
    const nextY = Math.max(0, Math.min(localTop, maxY));
    win.style.left = nextX + "px";
    win.style.top = nextY + "px";
  }

  function relayoutWindows() {
    document.querySelectorAll(".window").forEach(clampWindow);
  }

  /**
   * Создать окно.
   * opts = {
   *   title, icon, bodyClass, width, x, y,
   *   build(bodyEl, win)  — наполнение тела окна,
   *   onClose()           — колбэк при закрытии
   * }
   * Возвращает DOM-элемент окна.
   */
  function createWindow(opts) {
    Sounds.openFolder();
    const win = document.createElement("div");
    win.className = "window" + (opts.bodyClass ? " " + opts.bodyClass : "");
    win.style.width = fitWidth(opts.width) + "px";

    // Позиция — со смещением, чтобы окна не накладывались идеально
    const vp = viewport();
    const offset = (openCount % 6) * 26;
    const x = Math.max(6, Math.min(opts.x != null ? opts.x : 80 + offset, Math.max(6, vp.w - fitWidth(opts.width) - 6)));
    const y = Math.max(0, Math.min(opts.y != null ? opts.y : 60 + offset, Math.max(0, vp.h - 60)));
    win.style.left = x + "px";
    win.style.top = y + "px";
    win.style.zIndex = ++zCounter;
    openCount++;

    // Заголовок
    const titlebar = document.createElement("div");
    titlebar.className = "window-titlebar";
    titlebar.innerHTML =
      '<span class="window-title">' +
      '<span class="window-title-icon">' + (opts.icon || "🗔") + "</span>" +
      '<span class="window-title-text"></span></span>';
    titlebar.querySelector(".window-title-text").textContent = opts.title || "Окно";

    const controls = document.createElement("div");
    controls.className = "window-controls";
    const closeBtn = document.createElement("div");
    closeBtn.className = "win-btn";
    closeBtn.textContent = "✕";
    controls.appendChild(closeBtn);
    titlebar.appendChild(controls);
    win.appendChild(titlebar);

    // Тело
    const body = document.createElement("div");
    body.className = "window-body";
    win.appendChild(body);

    layer().appendChild(win);

    // Наполнение
    if (typeof opts.build === "function") opts.build(body, win);
    clampWindow(win);
    requestAnimationFrame(() => clampWindow(win));
    setTimeout(() => clampWindow(win), 120);
    setTimeout(() => clampWindow(win), 500);
    setTimeout(() => clampWindow(win), 1000);

    // Элемент панели задач
    const tItem = document.createElement("div");
    tItem.className = "taskbar-item active";
    tItem.textContent = opts.title || "Окно";
    taskbarItems().appendChild(tItem);
    tItem.addEventListener("click", () => focus(win));

    // Фокус
    function focus(w) {
      document.querySelectorAll(".window").forEach((el) => el.classList.add("inactive"));
      document.querySelectorAll(".taskbar-item").forEach((el) => el.classList.remove("active"));
      w.classList.remove("inactive");
      w.style.zIndex = ++zCounter;
      tItem.classList.add("active");
    }
    win.addEventListener("mousedown", () => focus(win), true);
    focus(win);

    // Закрытие
    function close() {
      Sounds.closeWindow();
      win.classList.add("closing");
      if (typeof opts.onClose === "function") opts.onClose();
      setTimeout(() => {
        win.remove();
        tItem.remove();
      }, 150);
    }
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      Sounds.click();
      close();
    });
    win._close = close;

    // Перетаскивание
    makeDraggable(win, titlebar);

    return win;
  }

  // Перетаскивание окна за заголовок (мышь + тач)
  function makeDraggable(win, handle) {
    let startX, startY, origX, origY, dragging = false;

    function down(e) {
      // Не таскаем при клике по кнопке закрытия
      if (e.target.closest(".win-btn")) return;
      dragging = true;
      const p = point(e);
      startX = p.x; startY = p.y;
      const rect = win.getBoundingClientRect();
      const vp = viewport();
      origX = rect.left - vp.left; origY = rect.top - vp.top;
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      document.addEventListener("touchmove", move, { passive: false });
      document.addEventListener("touchend", up);
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      const p = point(e);
      let nx = origX + (p.x - startX);
      let ny = origY + (p.y - startY);
      // Не уезжаем выше экрана и под панель задач
      const vp = viewport();
      const maxY = Math.max(0, vp.h - win.offsetHeight - 40);
      nx = Math.max(-win.offsetWidth + 60, Math.min(nx, vp.w - 40));
      ny = Math.max(0, Math.min(ny, maxY));
      win.style.left = nx + "px";
      win.style.top = ny + "px";
      if (e.cancelable) e.preventDefault();
    }
    function up() {
      dragging = false;
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", up);
    }
    function point(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    handle.addEventListener("mousedown", down);
    handle.addEventListener("touchstart", down, { passive: false });
  }

  window.addEventListener("resize", relayoutWindows);
  window.addEventListener("orientationchange", () => setTimeout(relayoutWindows, 250));
  window.addEventListener("screenstory:viewportchange", relayoutWindows);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", relayoutWindows);

  return { createWindow };
})();
