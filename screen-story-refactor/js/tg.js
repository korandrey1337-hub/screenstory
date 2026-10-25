/* ===========================================================
   TG.JS — интеграция с Telegram Mini App (WebApp SDK).
   Работает только внутри Telegram; вне его молча игнорируется.
   =========================================================== */
(function () {
  let applied = false;
  const SDK_URL = "https://telegram.org/js/telegram-web-app.js";
  let progressSent = false;

  function applyTelegram(tg) {
    if (!tg || applied) return;
    applied = true;

    tg.ready();
    tg.expand();

    function goFullscreen() {
      try {
        if (tg.isVersionAtLeast && tg.isVersionAtLeast("8.0") && tg.requestFullscreen) {
          tg.requestFullscreen();
        }
      } catch (e) {}
    }
    goFullscreen();
    // некоторые клиенты разрешают фуллскрин только после жеста — пробуем по первому тапу
    document.addEventListener("click", goFullscreen, { once: true });

    if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    if (tg.setHeaderColor) tg.setHeaderColor("#000080");
    if (tg.setBackgroundColor) tg.setBackgroundColor("#2a2350");
    document.documentElement.classList.add("in-telegram");
  }

  function sendGameProgress(event, progress) {
    if (window.Hub?.inHub) return false;
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg || !tg.sendData || progressSent) return false;
    const payload = {
      type: "screen_story_progress",
      event: event || "progress",
      progress: Math.max(0, Math.min(100, Number(progress) || 0)),
      version: "screen-story-v1",
      ts: Date.now()
    };
    try {
      tg.sendData(JSON.stringify(payload));
      progressSent = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  window.ScreenStoryTG = {
    sendGameProgress,
    sendComplete: () => sendGameProgress("complete", 100)
  };

  function hasTelegramLaunchParams() {
    return /(?:^|[?#&])tgWebApp[A-Za-z]+=/i.test(location.href);
  }

  function loadSdk() {
    if (document.querySelector('script[src="' + SDK_URL + '"]')) return;
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => applyTelegram(window.Telegram && window.Telegram.WebApp);
    document.head.appendChild(script);
  }

  try {
    applyTelegram(window.Telegram && window.Telegram.WebApp);
    if (applied) return;
    if (!hasTelegramLaunchParams()) return;

    loadSdk();

    let tries = 0;
    const waitForSdk = setInterval(() => {
      applyTelegram(window.Telegram && window.Telegram.WebApp);
      if (applied || ++tries > 20) clearInterval(waitForSdk);
    }, 150);
  } catch (e) { /* не в Telegram — обычный сайт */ }

})();
