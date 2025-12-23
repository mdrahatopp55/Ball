// ===============================
// 🤖 KING EYECON TELEGRAM BOT
// ===============================

// ====== CONFIG (ALL SET) ======
const BOT_TOKEN = "8364616944:AAEl_8r2tcGVsdvqN4Qb-lGNVCrj4qRiIUE";
const OWNER_ID = 7915173083;
const BOT_USERNAME = "Numberinforfbot";
const WEBHOOK_SECRET = "rahat";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const REQUIRED_CHANNELS = [
  { username: "Rfcyberteam", url: "https://t.me/Rfcyberteam" },
  { username: "Hacker99top", url: "https://t.me/Hacker99top" },
  { username: "Allbotts", url: "https://t.me/Allbotts" },
  { username: "Xboomber", url: "https://t.me/Xboomber" },
];

// ===== SETTINGS =====
let refBonus = 10;
const joinBonus = 2;
let isFreeMode = false;

// ===== STORAGE (IN-MEMORY) =====
const users = {};
const userStates = {};
const subscribers = new Set();
const blockedUsers = new Set();
const ADMIN_IDS = new Set([OWNER_ID]);

// ===== UTILS =====
const isAdmin = (id) => ADMIN_IDS.has(id);

function getOrCreateUser(from) {
  if (!users[from.id]) {
    users[from.id] = {
      id: from.id,
      name: from.first_name || "",
      username: from.username || "",
      balance: 0,
      referrals: [],
      referredBy: null,
      joinedOnce: false,
      joinBonusClaimed: false,
    };
  }
  return users[from.id];
}

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

// ===== KEYBOARDS =====
const mainKeyboard = (admin) => ({
  keyboard: [
    [{ text: "📱 Number info CHECK" }],
    [{ text: "💰 My Balance" }, { text: "📜 My Refer History" }],
    [{ text: "👨‍💻 Dev contact" }],
    ...(admin ? [[{ text: "🛠 Admin Panel" }]] : []),
  ],
  resize_keyboard: true,
});

const joinKeyboard = {
  inline_keyboard: [
    ...REQUIRED_CHANNELS.map((c) => [
      { text: `📢 @${c.username}`, url: c.url },
    ]),
    [{ text: "✅ I have joined all", callback_data: "VERIFY_JOIN" }],
  ],
};

// ===== FORMAT API RESULT =====
function formatNumberInfo(api) {
  if (!api || api.success !== true) {
    return "❌ *No data found or API error.*";
  }

  const item = api.data?.[0] || {};
  return (
    "🔍 *Number Info Result*\n\n" +
    `📞 *Number:* \`${api.phone_number}\`\n` +
    `👤 *Name:* ${item.name || "Unknown"}\n` +
    `🏷 *Type:* ${item.type || "N/A"}\n\n` +
    "━━━━━━━━━━━━━━\n" +
    "👑 *Credit:*\n" +
    "• @bdkingboss\n" +
    "• @topnormalperson\n" +
    "• https://t.me/Rfcyberteam"
  );
}

// ===== WEBHOOK HANDLER =====
export default async function handler(req, res) {
  if (req.method !== "POST") return res.json({ ok: true });
  if (req.query.secret !== WEBHOOK_SECRET)
    return res.status(403).json({ ok: false });

  const u = req.body;
  try {
    if (u.message) await onMessage(u.message);
    if (u.callback_query) await onCallback(u.callback_query);
  } catch (e) {
    console.error(e);
  }
  res.json({ ok: true });
}

// ===== MESSAGE HANDLER =====
async function onMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  const text = msg.text || "";
  const admin = isAdmin(from.id);
  const user = getOrCreateUser(from);

  subscribers.add(chatId);

  if (blockedUsers.has(from.id) && !admin) {
    return send(chatId, "🚫 *You are blocked from using this bot.*");
  }

  // WAITING NUMBER
  if (userStates[chatId] === "WAITING_NUMBER") {
    delete userStates[chatId];

    if (!isFreeMode && !admin) {
      if (user.balance <= 0) {
        return send(
          chatId,
          "❌ *Balance 0*\n\nRefer users to earn coin.\n\n" +
            `🔗 https://t.me/${BOT_USERNAME}?start=${user.id}`,
          { reply_markup: mainKeyboard(admin) }
        );
      }
      user.balance--;
    }

    return lookupNumber(chatId, text);
  }

  // START
  if (text.startsWith("/start")) {
    const ref = text.split(" ")[1];
    if (!user.joinedOnce) {
      user.joinedOnce = true;
      if (ref && ref != from.id && users[ref]) {
        users[ref].balance += refBonus;
        users[ref].referrals.push(from.id);
      }
    }
    return send(chatId, "👑 *Join all channels first*", {
      reply_markup: joinKeyboard,
    });
  }

  if (text === "📱 Number info CHECK") {
    userStates[chatId] = "WAITING_NUMBER";
    return send(chatId, "📱 *Send phone number*\nExample: `88018xxxxxxx`", {
      reply_markup: mainKeyboard(admin),
    });
  }

  if (text === "💰 My Balance") {
    return send(
      chatId,
      "💰 *My Balance*\n\n" +
        `⭐ Coin: *${user.balance}*\n` +
        `👥 Referrals: *${user.referrals.length}*\n\n` +
        `🔗 https://t.me/${BOT_USERNAME}?start=${user.id}`,
      { reply_markup: mainKeyboard(admin) }
    );
  }

  if (text === "📜 My Refer History") {
    const list =
      user.referrals.map((id, i) => `${i + 1}. \`${id}\``).join("\n") ||
      "No referrals yet.";
    return send(chatId, "📜 *Refer History*\n\n" + list, {
      reply_markup: mainKeyboard(admin),
    });
  }

  if (text === "👨‍💻 Dev contact") {
    return send(
      chatId,
      "👨‍💻 *Developer Info*\n\n• @Bdkingboss\n• @Rfcyberteam",
      { reply_markup: mainKeyboard(admin) }
    );
  }
}

// ===== CALLBACK =====
async function onCallback(cb) {
  if (cb.data === "VERIFY_JOIN") {
    await tg("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "✅ Verified!",
    });
    await send(cb.message.chat.id, "🎉 *Welcome!*\nNow you can use the bot 👇", {
      reply_markup: mainKeyboard(isAdmin(cb.from.id)),
    });
  }
}

// ===== NUMBER LOOKUP =====
async function lookupNumber(chatId, text) {
  const number = text.replace(/\D/g, "");
  if (number.length < 10) {
    return send(chatId, "⚠️ Invalid number.");
  }

  await send(chatId, "⏳ Checking number...");
  try {
    const r = await fetch(
      `https://ball-livid.vercel.app/api/eyacon?number=${number}`
    );
    const j = await r.json();
    await send(chatId, formatNumberInfo(j));
  } catch {
    await send(chatId, "❌ API error.");
  }
}
