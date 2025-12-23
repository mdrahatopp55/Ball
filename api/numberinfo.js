// ======================================
// 🤖 KING EYECON – FINAL WORKING BOT
// ======================================

// ===== CONFIG =====
const BOT_TOKEN = "8364616944:AAEl_8r2tcGVsdvqN4Qb-lGNVCrj4qRiIUE";
const OWNER_ID = 7915173083;
const BOT_USERNAME = "Numberinforfbot";
const WEBHOOK_SECRET = "rahat";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ===== FORCE JOIN CHANNELS =====
const REQUIRED_CHANNELS = [
  { username: "Rfcyberteam", url: "https://t.me/Rfcyberteam" },
  { username: "Hacker99top", url: "https://t.me/Hacker99top" },
  { username: "Allbotts", url: "https://t.me/Allbotts" },
  { username: "Xboomber", url: "https://t.me/Xboomber" },
];

// ===== SETTINGS =====
let refBonus = 10;
let isFreeMode = false;

// ===== MEMORY STORAGE =====
const users = {};
const states = {};
const admins = new Set([OWNER_ID]);
const blocked = new Set();

// ===== TELEGRAM HELPERS =====
async function tg(method, data) {
  const r = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return r.json();
}

const send = (chat_id, text, extra = {}) =>
  tg("sendMessage", {
    chat_id,
    text,
    parse_mode: "Markdown",
    ...extra,
  });

const isAdmin = (id) => admins.has(id);

// ===== USER =====
function getUser(from) {
  if (!users[from.id]) {
    users[from.id] = {
      id: from.id,
      name: from.first_name || "",
      username: from.username || "",
      balance: 0,
      referrals: [],
      joined: false,
    };
  }
  return users[from.id];
}

// ===== KEYBOARDS =====
const mainKB = (admin) => ({
  keyboard: [
    [{ text: "📱 Number info CHECK" }],
    [{ text: "💰 My Balance" }, { text: "📜 My Refer History" }],
    [{ text: "👨‍💻 Dev contact" }],
    ...(admin ? [[{ text: "🛠 Admin Panel" }]] : []),
  ],
  resize_keyboard: true,
});

const joinKB = {
  inline_keyboard: [
    ...REQUIRED_CHANNELS.map((c) => [
      { text: `📢 @${c.username}`, url: c.url },
    ]),
    [{ text: "✅ I have joined all", callback_data: "JOIN_OK" }],
  ],
};

// ===== FORMAT API RESULT =====
function formatResult(api) {
  if (!api || api.success !== true) {
    return "❌ *No data found or API error.*";
  }

  const phone = api.phone_number || "Unknown";
  const item = Array.isArray(api.data) && api.data.length ? api.data[0] : {};
  const name = item.name || "Unknown";
  const type = item.type && item.type.trim() !== "" ? item.type : "N/A";

  let credit = "";
  if (api.credit) {
    const makers = api.credit.made_by?.join(", ") || "";
    const channel = api.credit.channel || "";
    credit =
      "\n\n━━━━━━━━━━━━━━\n👑 *Credit:*\n" +
      (makers ? `• ${makers}\n` : "") +
      (channel ? `• ${channel}` : "");
  }

  return (
    "🔍 *Number Info Result*\n\n" +
    `📞 *Number:* \`${phone}\`\n` +
    `👤 *Name:* ${name}\n` +
    `🏷 *Type:* ${type}\n\n` +
    "✅ Status: *Found in database*" +
    credit
  );
}

// ===== WEBHOOK HANDLER =====
export default async function handler(req, res) {
  if (req.method !== "POST") return res.json({ ok: true });
  if (req.query.secret !== WEBHOOK_SECRET)
    return res.status(403).json({ ok: false });

  const update = req.body;
  try {
    if (update.message) await onMessage(update.message);
    if (update.callback_query) await onCallback(update.callback_query);
  } catch (e) {
    console.error("BOT ERROR:", e);
  }

  res.json({ ok: true });
}

// ===== MESSAGE HANDLER =====
async function onMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  const text = msg.text || "";
  const admin = isAdmin(from.id);
  const user = getUser(from);

  if (blocked.has(from.id) && !admin) {
    return send(chatId, "🚫 *You are blocked from using this bot.*");
  }

  // WAITING NUMBER
  if (states[chatId] === "WAIT_NUMBER") {
    delete states[chatId];

    if (!isFreeMode && !admin) {
      if (user.balance <= 0) {
        return send(
          chatId,
          "❌ *Balance 0*\n\nRefer users to earn coin:\n" +
            `https://t.me/${BOT_USERNAME}?start=${user.id}`,
          { reply_markup: mainKB(admin) }
        );
      }
      user.balance--;
    }

    return lookup(chatId, text);
  }

  // START
  if (text.startsWith("/start")) {
    const ref = text.split(" ")[1];
    if (!user.joined) {
      user.joined = true;
      if (ref && users[ref] && ref != user.id) {
        users[ref].balance += refBonus;
        users[ref].referrals.push(user.id);
      }
    }
    return send(chatId, "👑 *Join all channels first*", {
      reply_markup: joinKB,
    });
  }

  if (text === "📱 Number info CHECK") {
    states[chatId] = "WAIT_NUMBER";
    return send(chatId, "📱 *Send phone number*\nExample: `88018xxxxxxx`", {
      reply_markup: mainKB(admin),
    });
  }

  if (text === "💰 My Balance") {
    return send(
      chatId,
      "💰 *My Balance*\n\n" +
        `⭐ Coin: *${user.balance}*\n` +
        `👥 Referrals: *${user.referrals.length}*\n\n` +
        `🔗 https://t.me/${BOT_USERNAME}?start=${user.id}`,
      { reply_markup: mainKB(admin) }
    );
  }

  if (text === "📜 My Refer History") {
    const list =
      user.referrals.map((id, i) => `${i + 1}. \`${id}\``).join("\n") ||
      "No referrals yet.";
    return send(chatId, "📜 *Refer History*\n\n" + list, {
      reply_markup: mainKB(admin),
    });
  }

  if (text === "👨‍💻 Dev contact") {
    return send(
      chatId,
      "👨‍💻 *Developer Info*\n\n• @Bdkingboss\n• @Rfcyberteam",
      { reply_markup: mainKB(admin) }
    );
  }
}

// ===== CALLBACK HANDLER =====
async function onCallback(cb) {
  if (cb.data === "JOIN_OK") {
    await tg("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "✅ Verified successfully!",
    });

    await send(cb.message.chat.id, "🎉 *Welcome!*\nNow you can use the bot 👇", {
      reply_markup: mainKB(isAdmin(cb.from.id)),
    });
  }
}

// ===== NUMBER LOOKUP (FINAL FIXED) =====
async function lookup(chatId, text) {
  const number = text.replace(/\D/g, "");
  if (!number || number.length < 10) {
    return send(chatId, "⚠️ *Invalid phone number.*");
  }

  await send(chatId, "⏳ *Checking number… Please wait*");

  try {
    const res = await fetch(
      `https://ball-livid.vercel.app/api/eyacon?number=${number}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 11; Mobile Safari)",
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) throw new Error("HTTP " + res.status);

    const raw = await res.text();
    const json = JSON.parse(raw);

    await send(chatId, formatResult(json));
  } catch (e) {
    console.error("API ERROR:", e);
    await send(
      chatId,
      "❌ *API error occurred.*\nPlease try again later."
    );
  }
}
