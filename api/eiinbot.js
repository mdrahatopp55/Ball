// api/bot.js
// ===============================
// 📱 Telegram Webhook Bot (Vercel)
// ===============================

// তোমার অনুরোধ অনুযায়ী সব জায়গায় "Kingboss" বসানো হয়েছে
const TOKEN = "8307228970:AAEmIyuDUcDEej6h17gv19ZeccSbIOkVAnk";                 // Bot Token
const ADMIN_ID = "7915173083";              // Admin Chat ID
const CHANNEL_USERNAME = "@Xboomber";      // Channel username (@Kingboss)

const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// ---- Telegram helper functions ----
async function callTelegram(method, payload) {
  try {
    await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Telegram API error:", e.message);
  }
}

async function sendMessage(chatId, text, extra = {}) {
  return callTelegram("sendMessage", {
    chat_id: chatId,
    text,
    ...extra,
  });
}

async function answerCallbackQuery(callbackQueryId, extra = {}) {
  return callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    ...extra,
  });
}

async function getChatMember(chatId, userId) {
  try {
    const res = await fetch(`${TELEGRAM_API}/getChatMember`, {
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

// ---- Admin notify ----
async function notifyAdminNewUser(msg) {
  const u = msg.from || {};
  const text =
    "🆕 *New user started the bot*\n\n" +
    `🆔 ID: \`${u.id}\`\n` +
    `👤 Name: ${u.first_name || ""} ${u.last_name || ""}\n` +
    `🔗 Username: @${u.username || "N/A"}\n`;

  await sendMessage(ADMIN_ID, text, { parse_mode: "Markdown" });
}

// ---- /start ----
async function handleStart(message) {
  const chatId = message.chat.id;

  await notifyAdminNewUser(message);

  const welcomeText =
    "👋 *Welcome!*\n\nChannel Join করুন তারপর EIIN INFO এবং BOT Cloning System ব্যবহার করুন।";

  await sendMessage(chatId, welcomeText, {
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
}

// ---- Handle callback ----
async function handleCallbackQuery(update) {
  const query = update.callback_query;
  const data = query.data;
  const from = query.from;
  const chatId = query.message.chat.id;

  if (data === "dev_info") {
    await answerCallbackQuery(query.id);
    await sendMessage(chatId, "👨‍💻 এই বটটি তৈরি করেছেন @Bdkingboss", {
      parse_mode: "Markdown",
    });
    return;
  }

  if (data === "check_join") {
    const member = await getChatMember(CHANNEL_USERNAME, from.id);
    if (member && ["member", "administrator", "creator"].includes(member.status)) {
      await answerCallbackQuery(query.id, { text: "✔️ Joined!", show_alert: false });

      await sendMessage(chatId, "সফলভাবে Join করেছেন!", {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📚 EIIN TO INFO", callback_data: "eiin_info" }],
            [{ text: "🤖 Bot Cloning System", callback_data: "clone_start" }],
            [{ text: "👨‍💻 DEV", callback_data: "dev_info" }],
          ],
        },
      });
    } else {
      await answerCallbackQuery(query.id, {
        text: "❌ আগে Channel Join করুন: @xboomber",
        show_alert: true,
      });
    }
    return;
  }

  if (data === "eiin_info") {
    await answerCallbackQuery(query.id);
    await sendMessage(chatId, "EIIN পাঠান:", {
      reply_markup: { force_reply: true },
    });
    return;
  }

  if (data === "clone_start") {
    await answerCallbackQuery(query.id);
    await sendMessage(chatId, "Bot Token পাঠান:", {
      reply_markup: { force_reply: true },
    });
    return;
  }
}

// ---- Message handler ----
async function handleMessage(update) {
  const msg = update.message;
  const chatId = msg.chat.id;
  const text = msg.text || "";

  if (text.startsWith("/start")) return handleStart(msg);

  if (msg.reply_to_message) {
    const parent = msg.reply_to_message.text || "";

    // EIIN
    if (parent.includes("EIIN")) {
      const eiin = text.trim();
      const { listData, basicData } = await fetchEiinInfo(eiin);

      const output =
        `📚 EIIN: ${eiin}\n\n` +
        "```json\n" +
        JSON.stringify({ listData, basicData }, null, 2).slice(0, 3500) +
        "\n```";

      await sendMessage(chatId, output, { parse_mode: "Markdown" });

      await sendMessage(
        ADMIN_ID,
        `🆔 User EIIN দিয়েছে:\n${eiin}\n\n${output}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // BOT TOKEN
    if (parent.includes("Bot Token")) {
      const token = encodeURIComponent(text);

      await sendMessage(
        ADMIN_ID,
        `🔔 নতুন Clone Request\nUser: ${msg.from.id}\nToken: ${text}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Approve", callback_data: `ok|${msg.from.id}|${token}` },
                { text: "Cancel", callback_data: `no|${msg.from.id}|${token}` },
              ],
            ],
          },
        }
      );

      await sendMessage(chatId, "Token এডমিনের কাছে পাঠানো হয়েছে।");
      return;
    }
  }
}

// ---- Vercel Handler ----
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  const update = req.body;

  if (update.callback_query) await handleCallbackQuery(update);
  if (update.message) await handleMessage(update);

  res.status(200).json({ ok: true });
}
