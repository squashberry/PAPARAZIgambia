{
  const cb = typeof callback !== "undefined" ? callback : null;
  const rawData =
    typeof data !== "undefined" && data != null
      ? String(data)
      : String(cb?.data || "");
  const effectiveChatId =
    typeof chatId !== "undefined" && chatId != null
      ? String(chatId)
      : String(cb?.message?.chat?.id || cb?.from?.id || "");

  const normalized = rawData.trim().toLowerCase();
  const callbackId = cb?.id ? String(cb.id) : "";

  const answer = async (text) => {
    if (!callbackId) return;
    try {
      await telegramApi(e, "answerCallbackQuery", {
        callback_query_id: callbackId,
        text: text || "",
      });
    } catch (error) {
      console.error("[PAPARAZZI Telegram] answerCallbackQuery failed", error);
    }
  };

  const send = async (text, options = undefined) => {
    try {
      return await telegramSend(e, effectiveChatId, text, options);
    } catch (error) {
      console.error("[PAPARAZZI Telegram] send failed", error);
      return null;
    }
  };

  const sendMainMenu = async () => {
    await send(
      "<b>PAPARAZZI 🇬🇲</b>\n\nChoose what you want to do.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "📰 Receive PAPARAZZI News", callback_data: "receive_news" },
            ],
            [
              { text: "✍️ New story", callback_data: "new_story" },
              { text: "🗂 My stories", callback_data: "telegram_stories" },
            ],
            [
              { text: "🗂 Story Desk", callback_data: "story_desk" },
              { text: "⚙️ Settings", callback_data: "telegram_settings" },
            ],
            [
              { text: "📖 Help", callback_data: "telegram_help" },
              { text: "🆘 Support", callback_data: "telegram_support" },
            ],
            [
              { text: "🚪 Exit", callback_data: "telegram_disconnect" },
            ],
          ],
        },
      },
    );
  };

  const sendDashboard = async (title, body) => {
    await send(
      "<b>" + title + "</b>\n\n" + body,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Open dashboard ↗",
                url: "https://squashberry.github.io/PAPARAZZIgambia/studio.html",
              },
            ],
            [
              { text: "← Main menu", callback_data: "telegram_home" },
            ],
          ],
        },
      },
    );
  };

  const dataMatches = (
    [
      "story_publish:",
      "story_stop:",
      "story_draft:",
      "story_web:",
      "story_discard:",
      "telegram_support",
      "telegram_help",
      "telegram_home",
      "main_menu",
      "new_story",
      "newstory",
      "telegram_disconnect",
      "telegram_exit",
      "exit",
      "telegram_settings",
      "settings",
      "telegram_stories",
      "my_stories",
      "stories",
      "story_desk",
      "telegram_story_desk",
      "desk",
      "receive_news",
      "telegram_receive_news",
      "receive_paparazzi_news",
    ].some((prefix) => normalized === prefix || normalized.startsWith(prefix)),
  );

  if (!dataMatches) {
    await answer();
    return new Response("ok");
  }

  await answer();

  try {
    if (
      normalized === "telegram_home" ||
      normalized === "main_menu" ||
      normalized === "menu"
    ) {
      await sendMainMenu();
      return new Response("ok");
    }

    if (
      normalized === "receive_news" ||
      normalized === "telegram_receive_news" ||
      normalized === "receive_paparazzi_news"
    ) {
      await send(
        "<b>PAPARAZZI News</b>\n\nOpen the latest stories from the PAPARAZZI newsroom.",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📰 Open PAPARAZZI News",
                  url: "https://squashberry.github.io/PAPARAZZIgambia/newsroom.html",
                },
              ],
              [
                { text: "← Main menu", callback_data: "telegram_home" },
              ],
            ],
          },
        },
      );
      return new Response("ok");
    }

    if (
      normalized === "telegram_help" ||
      normalized === "help"
    ) {
      await tgStoryHelp(e, effectiveChatId);
      return new Response("ok");
    }

    if (
      normalized === "telegram_support" ||
      normalized === "support"
    ) {
      await send(
        "<b>PAPARAZZI Support</b>\n\nTell us what happened and which button or command you used.",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "← Main menu", callback_data: "telegram_home" }],
            ],
          },
        },
      );
      return new Response("ok");
    }

    if (
      normalized === "telegram_settings" ||
      normalized === "settings"
    ) {
      await sendDashboard(
        "PAPARAZZI settings",
        "Account and contributor settings are managed from your PAPARAZZI dashboard.",
      );
      return new Response("ok");
    }

    if (
      normalized === "telegram_stories" ||
      normalized === "my_stories" ||
      normalized === "stories" ||
      normalized === "story_desk" ||
      normalized === "telegram_story_desk" ||
      normalized === "desk"
    ) {
      await sendDashboard(
        normalized === "telegram_stories" ||
          normalized === "my_stories" ||
          normalized === "stories"
          ? "My stories"
          : "Story Desk",
        "Open your PAPARAZZI dashboard to manage your drafts, published stories and contributor work.",
      );
      return new Response("ok");
    }

    if (
      normalized === "telegram_disconnect" ||
      normalized === "telegram_exit" ||
      normalized === "exit"
    ) {
      try {
        await e.DB.prepare(
          "UPDATE telegram_connections SET active=0,updated_at=? WHERE chat_id=?",
        )
          .bind(new Date().toISOString(), effectiveChatId)
          .run();
      } catch (dbError) {
        console.error("[PAPARAZZI Telegram] disconnect DB update failed", dbError);
      }

      await send(
        "Disconnected from your PAPARAZZI account. Use the website to connect again.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "← Main menu", callback_data: "telegram_home" }],
            ],
          },
        },
      );
      return new Response("ok");
    }

    if (normalized === "new_story" || normalized === "newstory") {
      let con = null;
      try {
        con = await tgStoryContributor(e, effectiveChatId);
      } catch (dbError) {
        console.error("[PAPARAZZI Telegram] contributor lookup failed", dbError);
      }

      if (!con || Number(con.is_paparazzi || 0) !== 1) {
        await send(
          "Contributor access is required. Become a PAPARAZZI contributor first.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Become a PAPARAZZI",
                    url: "https://squashberry.github.io/PAPARAZZIgambia/become-paparazzi.html",
                  },
                ],
                [{ text: "← Main menu", callback_data: "telegram_home" }],
              ],
            },
          },
        );
        return new Response("ok");
      }

      await tgStoryNew(e, effectiveChatId, con.user_id);
      await send(
        "✍️ <b>New PAPARAZZI story</b>\n\nSend your photos, then send the story text. You can also send them together.",
        { parse_mode: "HTML" },
      );
      return new Response("ok");
    }

    if (/^story_publish:/.test(normalized)) {
      const id = rawData.slice(rawData.indexOf(":") + 1).trim();
      let con = null;
      try {
        con = await tgStoryContributor(e, effectiveChatId);
      } catch (dbError) {
        console.error("[PAPARAZZI Telegram] contributor lookup failed", dbError);
      }
      if (!con || Number(con.is_paparazzi || 0) !== 1) {
        await send(
          "Contributor access is required before publishing this story.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "← Main menu", callback_data: "telegram_home" }],
              ],
            },
          },
        );
        return new Response("ok");
      }
      await tgStoryPublish(e, id, effectiveChatId, ctx);
      return new Response("ok");
    }

    if (/^story_stop:/.test(normalized)) {
      const id = rawData.slice(rawData.indexOf(":") + 1).trim();
      await e.DB.prepare(
        "UPDATE articles SET status='draft',updated_at=? WHERE id=? AND status='scheduled'",
      )
        .bind(new Date().toISOString(), id)
        .run();

      await send(
        "Publishing stopped. Your story is saved as a draft.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Continue editing on website",
                  callback_data: "story_web:" + id,
                },
              ],
            ],
          },
        },
      );
      return new Response("ok");
    }

    if (/^story_draft:/.test(normalized)) {
      const id = rawData.slice(rawData.indexOf(":") + 1).trim();
      await e.DB.prepare(
        "UPDATE articles SET status='draft',updated_at=? WHERE id=?",
      )
        .bind(new Date().toISOString(), id)
        .run();

      let title = "Story";
      try {
        const d = await e.DB.prepare(
          "SELECT title FROM articles WHERE id=?",
        )
          .bind(id)
          .first();
        title = d?.title || title;
      } catch (dbError) {
        console.error("[PAPARAZZI Telegram] draft title lookup failed", dbError);
      }

      await send(
        "Saved to draft: <b>" + tgEsc(title) + "</b>.",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Continue editing on website",
                  callback_data: "story_web:" + id,
                },
              ],
              [{ text: "← Main menu", callback_data: "telegram_home" }],
            ],
          },
        },
      );
      return new Response("ok");
    }

    if (/^story_web:/.test(normalized)) {
      const id = rawData.slice(rawData.indexOf(":") + 1).trim();
      await tgStoryWeb(e, effectiveChatId, id);
      return new Response("ok");
    }

    if (/^story_discard:/.test(normalized)) {
      const id = rawData.slice(rawData.indexOf(":") + 1).trim();
      await e.DB.prepare(
        "DELETE FROM articles WHERE id=? AND status='draft'",
      )
        .bind(id)
        .run();

      await send(
        "Discarded. The story was removed from drafts.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "✍️ New story", callback_data: "new_story" }],
              [{ text: "← Main menu", callback_data: "telegram_home" }],
            ],
          },
        },
      );
      return new Response("ok");
    }

    return new Response("ok");
  } catch (error) {
    console.error("[PAPARAZZI Telegram] callback failed", {
      data: rawData,
      chatId: effectiveChatId,
      error,
    });

    await send(
      "PAPARAZZI could not complete that action. Please try again.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "↻ Main menu", callback_data: "telegram_home" }],
          ],
        },
      },
    );

    return new Response("ok");
  }
}