// ======================================
// 🤖 KING EYECON – FULL TELEGRAM BOT
// ======================================

// ===== CONFIG =====
const BOT_TOKEN = "8364616944:AAEl_8r2tcGVsdvqN4Qb-lGNVCrj4qRiIUE";
const OWNER_ID = 7915173083;
const BOT_USERNAME = "Numberinforfbot";
const WEBHOOK_SECRET = "rahat";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ===== CHANNEL FORCE JOIN =====
const REQUIRED_CHANNELS = [
  { username: "Rfcyberteam", url: "https://t.me/Rfcyberteam" },
  { username: "Hacker99top", url: "https://t.me/Hacker99top" },
  { username: "Allbotts", url: "https://t.me/Allbotts" },
  { username: "Xboomber", url: "https://t.me/Xboomber" },
];

// ===== SYSTEM SETTINGS =====
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
function formatResult(j) {
  if (!j || j.success !== true) return "❌ *No data found.*";

  const d = j.data?.[0] || {};
  return (
    "🔍 *Number Info Result*\n\n" +
    `📞 *Number:* \`${j.phone_number}\`\n` +
    `👤 *Name:* ${d.name || "Unknown"}\n` +
    `🏷 *Type:* ${d.type || "N/A"}\n\n` +
    "━━━━━━━━━━━━━━\n" +
    "👑 *Credit:*\n" +
    "• @bdkingboss\n" +
    "• @topnormalperson\n" +
    "• https://t.me/Rfcyberteam"
  );
}

// ===== WEBHOOK =====
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
  const user = getUser(from);

  if (blocked.has(from.id) && !admin)
    return send(chatId, "🚫 *You are blocked.*");

  // WAIT NUMBER
  if (states[chatId] === "WAIT_NUMBER") {
    delete states[chatId];

    if (!isFreeMode && !admin) {
      if (user.balance <= 0)
        return send(
          chatId,
          "❌ *Balance 0*\n\nRefer users to earn coin:\n" +
            `https://t.me/${BOT_USERNAME}?start=${user.id}`,
          { reply_markup: mainKB(admin) }
        );
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
      `💰 *Balance:* ${user.balance}\n👥 *Referrals:* ${user.referrals.length}\n\n🔗 https://t.me/${BOT_USERNAME}?start=${user.id}`,
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
      "👨‍💻 *Developer Info*\n• @Bdkingboss\n• @Rfcyberteam",
      { reply_markup: mainKB(admin) }
    );
  }
}

// ===== CALLBACK =====
async function onCallback(cb) {
  if (cb.data === "JOIN_OK") {
    await tg("answerCallbackQuery", {
      callback_query_id: cb.id,
      text: "✅ Verified!",
    });
    await send(cb.message.chat.id, "🎉 *Welcome!*\nUse menu 👇", {
      reply_markup: mainKB(isAdmin(cb.from.id)),
    });
  }
}

// ===== NUMBER LOOKUP (FIXED) =====
async function lookup(chatId, text) {
  const num = text.replace(/\D/g, "");
  if (num.length < 10) return send(chatId, "⚠️ Invalid number.");

  await send(chatId, "⏳ *Checking number…*");

  try {
    const r = await fetch(
      `https://ball-livid.vercel.app/api/eyacon?number=${num}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 11; Mobile Safari)",
          Accept: "application/json",
        },
      }
    );

    if (!r.ok) throw new Error("HTTP " + r.status);

    const textData = await r.text();
    const json = JSON.parse(textData);

    await send(chatId, formatResult(json));
  } catch (e) {
    console.error("API ERROR:", e);
    await send(
      chatId,
      "❌ *API error occurred.*\nPlease try again later."
    );
  }
}
