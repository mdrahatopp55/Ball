// api/bot.js
// ===============================
// 📱 Telegram Webhook Bot (Vercel) with Clone System (Manual setWebhook link)
// ===============================

const MAIN_BOT_TOKEN = "8307228970:AAEmIyuDUcDEej6h17gv19ZeccSbIOkVAnk"; // Main bot token
const ADMIN_ID = "7915173083"; // Admin Chat ID
const CHANNEL_USERNAME = "@Xboomber"; // Channel username

// ---- Helper: get bot token from URL (?token=...) or fallback main ----
function getBotTokenFromReq(req) {
  const q = req.query || {};
  if (typeof q.token === "string" && q.token.length > 20) {
    return q.token;
  }

  // NEXT/Edge safety: try URL parsing too
  try {
    if (req.url) {
      const u = new URL(req.url, `https://${req.headers.host}`);
      const token = u.searchParams.get("token");
      if (token && token.length > 20) return token;
    }
  } catch (e) {}

  return MAIN_BOT_TOKEN;
}

function getTelegramApi(token) {
  return `https://api.telegram.org/bot${token}`;
}

// ---- Telegram helper functions ----
async function callTelegram(token, method, payload) {
  try {
    await fetch(`${getTelegramApi(token)}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Telegram API error:", e.message);
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

// ---- EIIN API helper ----
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

// ---- Admin notify ----
async function notifyAdminNewUser(token, msg) {
  const u = msg.from || {};
  const text =
    "🆕 *New user started the bot*\n\n" +
    `🆔 ID: \`${u.id}\`\n` +
    `👤 Name: ${u.first_name || ""} ${u.last_name || ""}\n` +
    `🔗 Username: @${u.username || "N/A"}\n`;

  await sendMessage(token, ADMIN_ID, text, { parse_mode: "Markdown" });
}

// ---- /start ----
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

// ---- Handle callback ----
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
    // শুধুমাত্র Admin ই এগুলো ব্যবহার করতে পারবে
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

    // host/proto থেকে webhook URL বানাবো (manual set-এর জন্য)
    const host =
      req.headers["x-forwarded-host"] ||
      req.headers["host"] ||
      "your-vercel-domain.vercel.app";
    const proto = req.headers["x-forwarded-proto"] || "https";

    const webhookUrl =
      `${proto}://${host}/api/bot?token=` + encodeURIComponent(rawToken);
    const setWebhookUrl =
      `https://api.telegram.org/bot${rawToken}/setWebhook?url=` +
      encodeURIComponent(webhookUrl);

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
        text: "✅ Clone approve হয়েছে (manual webhook)",
        show_alert: false,
      });

      // Admin-এর জন্য ডিটেইল
      await sendMessage(
        botToken,
        ADMIN_ID,
        "✅ *Clone Approved*\n\n" +
          `👤 User: \`${targetUserId}\`\n` +
          `🔑 Token: \`${rawToken}\`\n\n` +
          "👇 এই লিংকে ক্লিক করলে ওই Bot এর webhook সেট হবে:\n" +
          setWebhookUrl,
        { parse_mode: "Markdown" }
      );

      // User-এর জন্য ইনস্ট্রাকশন
      await sendMessage(
        botToken,
        targetUserId,
        "✅ *আপনার Bot Clone Approved!*\n\n" +
          "👉 এখন নিচের লিংকে ক্লিক করে আপনার নতুন Bot এ webhook সেট করুন:\n\n" +
          setWebhookUrl +
          "\n\nতারপর আপনার নতুন Bot এ গিয়ে `/start` পাঠান এবং বট ব্যবহার শুরু করুন।",
        { parse_mode: "Markdown" }
      );

      return;
    }
  }
}

// ---- Message handler ----
async function handleMessage(botToken, update) {
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // ---- Commands ----
  if (text.startsWith("/start")) return handleStart(botToken, msg);

  if (text === "/menu") {
    await sendMessage(botToken, chatId, "📲 *Main Menu খুলে দেওয়া হয়েছে*", {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    });
    return;
  }

  // ---- Reply Keyboard button handling ----
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

  // ---- Force Reply Handling (EIIN / TOKEN) ----
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

  // Fallback: unknown text
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

// ---- Vercel Handler ----
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const botToken = getBotTokenFromReq(req);
  const update = req.body;

  if (update.callback_query)
    await handleCallbackQuery(botToken, update, req);
  if (update.message) await handleMessage(botToken, update);

  res.status(200).json({ ok: true });
}
