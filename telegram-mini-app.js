(function () {
  "use strict";

  var tg = window.Telegram && window.Telegram.WebApp;
  if (!tg) return;

  document.documentElement.classList.add("telegram-mini-app");
  document.body.classList.add("telegram-mini-app");

  try {
    tg.ready();
    tg.expand();

    var theme = tg.themeParams || {};
    var root = document.documentElement;
    if (theme.bg_color) root.style.setProperty("--tg-bg", theme.bg_color);
    if (theme.text_color) root.style.setProperty("--tg-text", theme.text_color);
    if (theme.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", theme.secondary_bg_color);
    if (theme.button_color) root.style.setProperty("--tg-button", theme.button_color);
    if (theme.button_text_color) root.style.setProperty("--tg-button-text", theme.button_text_color);

    if (tg.isVersionAtLeast && tg.isVersionAtLeast("6.1")) {
      tg.BackButton.onClick(function () {
        if (window.history.length > 1) window.history.back();
        else tg.close();
      });

      window.addEventListener("popstate", function () {
        if (window.history.length > 1) tg.BackButton.show();
        else tg.BackButton.hide();
      });

      if (window.history.length > 1) tg.BackButton.show();
    }

    if (tg.onEvent) {
      tg.onEvent("themeChanged", function () {
        var p = tg.themeParams || {};
        if (p.bg_color) root.style.setProperty("--tg-bg", p.bg_color);
        if (p.text_color) root.style.setProperty("--tg-text", p.text_color);
        if (p.secondary_bg_color) root.style.setProperty("--tg-secondary-bg", p.secondary_bg_color);
      });
    }

    window.PAPARAZZI_TELEGRAM = {
      enabled: true,
      initData: tg.initData || "",
      user: tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null,
      startParam: tg.initDataUnsafe && tg.initDataUnsafe.start_param ? tg.initDataUnsafe.start_param : "",
      close: function () { tg.close(); },
      showPopup: function (params) { return tg.showPopup(params); }
    };
  } catch (error) {
    console.warn("PAPARAZZI Telegram Mini App init failed", error);
  }
})();