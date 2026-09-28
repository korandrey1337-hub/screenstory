/* ===========================================================
   MOBILE.JS — стабильный viewport и best-effort landscape mode.
   В Telegram/iOS нельзя гарантированно заставить экран повернуться,
   поэтому делаем две вещи: пробуем lock("landscape") после жеста и
   держим CSS-переменные в реальном размере visualViewport.
   =========================================================== */
(function () {
  const root = document.documentElement;
  let portraitDismissed = false;
  let rotateHint = null;

  function viewport() {
    const vv = window.visualViewport;
    return {
      w: Math.round(vv ? vv.width : window.innerWidth),
      h: Math.round(vv ? vv.height : window.innerHeight)
    };
  }

  function isMobileSize(w, h) {
    return Math.min(w, h) <= 760 || (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  }

  function updateViewport() {
    const vp = viewport();
    const mobile = isMobileSize(vp.w, vp.h);
    const portrait = mobile && vp.h > vp.w;

    root.style.setProperty("--app-width", vp.w + "px");
    root.style.setProperty("--app-height", vp.h + "px");
    root.classList.toggle("is-mobile", mobile);
    root.classList.toggle("phone-portrait", portrait);
    root.classList.toggle("phone-landscape", mobile && vp.w >= vp.h);
    root.classList.toggle("show-rotate", portrait && !portraitDismissed);
    root.classList.toggle("portrait-dismissed", portraitDismissed);
    window.dispatchEvent(new Event("screenstory:viewportchange"));
  }

  async function requestLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock("landscape");
    } catch (e) {}
    updateViewport();
  }

  function ensureRotateHint() {
    if (rotateHint) return;
    rotateHint = document.createElement("div");
    rotateHint.id = "rotate-hint";
    rotateHint.innerHTML =
      '<div class="rh-mark">↻</div>' +
      '<div class="rh-title">Поверни экран</div>' +
      '<div class="rh-sub">Так окно не съест чат.</div>' +
      '<div class="rh-actions">' +
        '<button id="rh-lock">Повернуть</button>' +
        '<button id="rh-dismiss">Играть так</button>' +
      '</div>';
    document.body.appendChild(rotateHint);

    rotateHint.querySelector("#rh-lock").addEventListener("click", requestLandscape);
    rotateHint.querySelector("#rh-dismiss").addEventListener("click", () => {
      portraitDismissed = true;
      updateViewport();
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    ensureRotateHint();
    updateViewport();
  });
  window.addEventListener("resize", updateViewport);
  window.addEventListener("orientationchange", () => setTimeout(updateViewport, 250));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateViewport);
    window.visualViewport.addEventListener("scroll", updateViewport);
  }
  document.addEventListener("click", requestLandscape, { once: true });
})();
