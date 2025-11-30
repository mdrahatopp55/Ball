// pages/api/bot.js

// ====== CONFIG ======
const BOT_TOKEN = "8364616944:AAEl_8r2tcGVsdvqN4Qb-lGNVCrj4qRiIUE";      // <-- @BotFather থেকে
const OWNER_ID = 7915173083;                   // <-- বটের মেইন Owner (numeric Telegram ID)
const WEBHOOK_SECRET = "rahat";    // <-- webhook URL এ ?secret= এর মান
const BOT_USERNAME = "Numberinforfbot";       // <-- যেমন: "KingEyeConBot" (without @)

// প্রতি রেফারে কয়টা coin/sona:
let refBonus = 10;

// Admin তালিকা (Owner + অন্যরা)
const ADMIN_IDS = new Set([OWNER_ID]);

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const REQUIRED_CHANNELS = [
  { username: "Rfcyberteam", url: "https://t.me/Rfcyberteam" },
  { username: "Hacker99top", url: "https://t.me/Hacker99top" },
  { username: "Allbotts", url: "https://t.me/Allbotts" },
  { username: "Xboomber", url: "https://t.me/Xboomber" },
];

// In-memory storage (demo, server restart হলে reset হবে)
const userStates = {};         // { chatId: "WAITING_NUMBER" | "BROADCAST_WAITING" | ... }
const subscribers = new Set(); // chat IDs for broadcast

// User data: referral + balance
// users[userId] = { id, name, username, balance, referrals: [userIds], referredBy, joinedOnce }
const users = {};

// Blocked users (only admin can block/unblock)
const blockedUsers = new Set();

// ====== UTILS ======

function isAdmin(id) {
  return ADMIN_IDS.has(id);
}

function getOrCreateUser(fromOrId) {
  const id = typeof fromOrId === "object" ? fromOrId.id : fromOrId;
  if (!users[id]) {
    users[id] = {
      id,
      name: typeof fromOrId === "object" ? fromOrId.first_name || "" : "",
      username: typeof fromOrId === "object" ? fromOrId.username || "" : "",
      balance: 0,
      referrals: [],
      referredBy: null,
      joinedOnce: false,
    };
  } else if (typeof fromOrId === "object") {
    // update name / username if changed
    users[id].name = fromOrId.first_name || users[id].name;
    users[id].username = fromOrId.username || users[id].username;
  }
  return users[id];
}

async function telegramApi(method, params) {
  const res = await fetch(`${TELEGRAM_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error("Telegram API error:", data);
  }
  return data;
}

function sendMessage(chat_id, text, extra = {}) {
  return telegramApi("sendMessage", {
    chat_id,
    text,
    parse_mode: "Markdown",
    ...extra,
  });
}

function sendChatAction(chat_id, action = "typing") {
  return telegramApi("sendChatAction", { chat_id, action });
}

function buildMainKeyboard(isAdminUser) {
  const keyboard = [
    [{ text: "📱 Number info CHECK" }],
    [{ text: "💰 My Balance" }, { text: "📜 My Refer History" }],
    [{ text: "👨‍💻 Dev contact" }],
  ];
  if (isAdminUser) {
    keyboard.push([{ text: "🛠 Admin Panel" }]);
  }
  return {
    keyboard,
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function buildStartInlineKeyboard() {
  const rows = REQUIRED_CHANNELS.map((ch) => [
    { text: `📢 @${ch.username}`, url: ch.url },
  ]);
  rows.push([{ text: "✅ I have joined all", callback_data: "VERIFY_JOIN" }]);
  return { inline_keyboard: rows };
}

// Format API response nicely
function formatNumberInfo(apiJson) {
  if (!apiJson || !apiJson.success) {
    return (
      "❌ *No data found or API error.*\n\n" +
      "Please check the number and try again."
    );
  }

  const phone = apiJson.phone_number || "Unknown";
  const first = apiJson.data && apiJson.data[0] ? apiJson.data[0] : {};
  const name = first.name || "Unknown";
  const type = first.type || "N/A";

  return (
    "🔍 *Number Info Result*\n\n" +
    `📞 *Number:* \`${phone}\`\n` +
    `👤 *Name:* ${name}\n` +
    `🏷 *Type:* ${type}\n\n` +
    "✅ Status: *Found in database*"
  );
}

// Check membership (simple version)
async function isUserJoinedAllChannels(userId) {
  try {
    for (const ch of REQUIRED_CHANNELS) {
      const res = await telegramApi("getChatMember", {
        chat_id: `@${ch.username}`,
        user_id: userId,
      });
      if (
        !res.ok ||
        !res.result ||
        ["left", "kicked"].includes(res.result.status)
      ) {
        return false;
      }
    }
    return true;
  } catch (e) {
    console.error("Membership check error:", e);
    // যদি error হয়, safe side এ not joined ধরি
    return false;
  }
}

// ====== MAIN HANDLER (Vercel) ======
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const secret = req.query.secret;
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return res.status(403).json({ ok: false, error: "Forbidden" });
  }

  const update = req.body;

  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallback(update.callback_query);
    }
  } catch (err) {
    console.error("Update handling error:", err);
  }

  res.status(200).json({ ok: true });
}

// ====== MESSAGE HANDLER ======
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  const fromId = from.id;
  const text = msg.text || "";
  const isPrivate = msg.chat.type === "private";
  const isAdminUser = isAdmin(fromId);

  const user = getOrCreateUser(from);

  // Save chat for broadcast
  subscribers.add(chatId);

  // 🚫 Block check: blocked হলে শুধু ছোট মেসেজ, তারপর ignore
  if (blockedUsers.has(fromId) && !isAdminUser) {
    // চাইলে একবার reply, নাহলে একেবারে silent রাখতে পারো
    await sendMessage(
      chatId,
      "🚫 *Sir, আপনি এই বট ব্যবহারের জন্য block আছেন.*\nIf you think this is a mistake, contact support."
    );
    return;
  }

  // STATE MACHINE
  const state = userStates[chatId];

  if (state === "WAITING_NUMBER" && text) {
    delete userStates[chatId];

    // 🔐 Admin হলে কয়েন চেক না করলেও হবে ( চাইলে এই অংশ বাদ দিতে পারো )
    if (!isAdminUser) {
      if (!user.balance || user.balance <= 0) {
        const referLink = `https://t.me/${BOT_USERNAME}?start=${user.id}`;

        await sendMessage(
          chatId,
          "❌ *Your balance is 0 coin!*\n\n" +
            "আপনি এই মুহূর্তে Number info ব্যবহার করতে পারবেন না।\n" 
            "প্রথমে রেফার করে coin নিন তারপর আবার চেষ্টা করুন।\n\n" +
            "🔗 *Your Refer Link:*\n" +
            `\`${referLink}\`\n\n` +
            `প্রতি সফল রেফারে আপনি *${refBonus} coin* পাবেন 🎁`,
          { reply_markup: buildMainKeyboard(isAdminUser) }
        );

        // ❌ এখান থেকে সরাসরি return, তাই API কল হবে না
        return;
      }

      // ✅ কয়েন আছে, তাই ১ coin কেটে দাও
      user.balance -= 1;
      if (user.balance < 0) user.balance = 0;
    }

    // ✅ এখন API call হবে, কারণ balance ছিল
    await handleNumberLookup(chatId, text);
    return;
  }

  if (state === "BROADCAST_WAITING" && isAdminUser) {
    delete userStates[chatId];
    await broadcastMessage(text);
    await sendMessage(chatId, "✅ Broadcast sent to all users.");
    return;
  }

  // NORMAL FLOW
  if (text.startsWith("/start")) {
    const parts = text.split(" ");
    const refParam = parts[1]; // /start <ref>
    await handleStart(msg, refParam);
    return;
  }

  // USER BUTTONS
  if (text === "📱 Number info CHECK") {
    await askForNumber(chatId, isAdminUser);
    return;
  }

  if (text === "👨‍💻 Dev contact") {
    await showDevInfo(chatId, isAdminUser);
    return;
  }

  if (text === "💰 My Balance") {
    await showBalance(chatId, user, isAdminUser);
    return;
  }

  if (text === "📜 My Refer History") {
    await showReferHistory(chatId, user, isAdminUser);
    return;
  }

  if (text === "🛠 Admin Panel" && isAdminUser) {
    await showAdminPanel(chatId);
    return;
  }

  // ====== ADMIN COMMANDS (TEXT) ======
  if (isAdminUser && text.startsWith("/setbonus")) {
    const parts = text.split(" ");
    const val = parseInt(parts[1], 10);
    if (isNaN(val) || val < 0) {
      await sendMessage(chatId, "⚠️ Usage: `/setbonus 15`", {
        reply_markup: buildMainKeyboard(isAdminUser),
      });
    } else {
      refBonus = val;
      await sendMessage(
        chatId,
        `✅ Sir, per refer bonus updated to *${refBonus} coin*`,
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
    }
    return;
  }

  if (isAdminUser && text.startsWith("/addcoin")) {
    // /addcoin userId amount
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    const amount = parseInt(parts[2], 10);
    if (!userId || isNaN(amount)) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/addcoin 123456789 50`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    const u = getOrCreateUser(userId);
    u.balance += amount;
    await sendMessage(
      chatId,
      `✅ Sir, added *${amount} coin* to \`${userId}\`\nCurrent balance: *${u.balance}*`,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text.startsWith("/removecoin")) {
    // /removecoin userId amount
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    const amount = parseInt(parts[2], 10);
    if (!userId || isNaN(amount)) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/removecoin 123456789 10`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    const u = getOrCreateUser(userId);
    u.balance -= amount;
    if (u.balance < 0) u.balance = 0;
    await sendMessage(
      chatId,
      `✅ Sir, removed *${amount} coin* from \`${userId}\`\nCurrent balance: *${u.balance}*`,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text.startsWith("/setcoin")) {
    // /setcoin userId amount
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    const amount = parseInt(parts[2], 10);
    if (!userId || isNaN(amount)) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/setcoin 123456789 100`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    const u = getOrCreateUser(userId);
    u.balance = amount;
    await sendMessage(
      chatId,
      `✅ Sir, set balance for \`${userId}\` to *${u.balance} coin*`,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text.startsWith("/uinfo")) {
    // /uinfo userId
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/uinfo 123456789`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    const u = getOrCreateUser(userId);
    const refCount = u.referrals.length;
    const listPreview = u.referrals
      .slice(0, 5)
      .map((id, i) => `${i + 1}. \`${id}\``)
      .join("\n") || "None";

    const txt =
      "👁‍🗨 *User Info*\n\n" +
      `🆔 ID: \`${u.id}\`\n` +
      `👤 Name: ${u.name || "Unknown"}\n` +
      `🔗 Username: ${u.username ? "@" + u.username : "N/A"}\n\n` +
      `💰 Balance: *${u.balance} coin*\n` +
      `👥 Referrals: *${refCount}*\n\n` +
      "First 5 referrals:\n" +
      listPreview;

    await sendMessage(chatId, txt, {
      reply_markup: buildMainKeyboard(isAdminUser),
    });
    return;
  }

  // ===== BLOCK / UNBLOCK USERS (ADMIN ONLY) =====
  if (isAdminUser && text.startsWith("/block")) {
    // /block userId
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/block 123456789`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    if (userId === OWNER_ID || ADMIN_IDS.has(userId)) {
      await sendMessage(
        chatId,
        "⚠️ Sir, admin/owner কে block করা যাবে না!",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    blockedUsers.add(userId);
    await sendMessage(
      chatId,
      `🚫 Sir, user \`${userId}\` এখন থেকে *BLOCKED*`,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text.startsWith("/unblock")) {
    // /unblock userId
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/unblock 123456789`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    blockedUsers.delete(userId);
    await sendMessage(
      chatId,
      `✅ Sir, user \`${userId}\` এখন *UNBLOCKED*`,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text === "/blocked") {
    if (!blockedUsers.size) {
      await sendMessage(
        chatId,
        "✅ Sir, বর্তমানে *কেউই blocked না*.",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    const list = Array.from(blockedUsers)
      .map((id) => `• \`${id}\``)
      .join("\n");
    await sendMessage(
      chatId,
      "🚫 *Blocked Users (ID)*:\n\n" + list,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  // ===== ALL USERS LIST (ADMIN ONLY) =====
  if (isAdminUser && text === "/allusers") {
    const ids = Object.keys(users);
    if (!ids.length) {
      await sendMessage(
        chatId,
        "📂 Sir, এখনো কোনো user data নেই.",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    const preview = ids.slice(0, 50).map((id, i) => {
      const u = users[id];
      const name = u.name || "Unknown";
      return `${i + 1}. \`${id}\` — ${name}`;
    });
    let txt =
      `👥 *All Users List (ID)*\n\nTotal saved users: *${ids.length}*\n\n` +
      preview.join("\n");
    if (ids.length > 50) {
      txt += `\n\n...and *${ids.length - 50}* more users.`;
    }
    await sendMessage(chatId, txt, {
      reply_markup: buildMainKeyboard(isAdminUser),
    });
    return;
  }

  // ADD / REMOVE ADMIN (Owner only)
  if (fromId === OWNER_ID && text.startsWith("/addadmin")) {
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/addadmin 123456789`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    ADMIN_IDS.add(userId);
    await sendMessage(
      chatId,
      `✅ Sir, added admin: \`${userId}\``,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (fromId === OWNER_ID && text.startsWith("/removeadmin")) {
    const parts = text.split(" ");
    const userId = parseInt(parts[1], 10);
    if (!userId) {
      await sendMessage(
        chatId,
        "⚠️ Usage: `/removeadmin 123456789`",
        { reply_markup: buildMainKeyboard(isAdminUser) }
      );
      return;
    }
    if (userId === OWNER_ID) {
      await sendMessage(chatId, "⚠️ Owner কে remove করা যাবে না!", {
        reply_markup: buildMainKeyboard(isAdminUser),
      });
      return;
    }
    ADMIN_IDS.delete(userId);
    await sendMessage(
      chatId,
      `✅ Sir, removed admin: \`${userId}\``,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text === "/admins") {
    const list = Array.from(ADMIN_IDS)
      .map((id) => `• \`${id}\``)
      .join("\n");
    await sendMessage(
      chatId,
      "👮‍♂️ *Admin List:*\n\n" + list,
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  if (isAdminUser && text === "/users") {
    await sendMessage(chatId, `👥 Total chats (subscribers): *${subscribers.size}*`, {
      reply_markup: buildMainKeyboard(isAdminUser),
    });
    return;
  }

  if (isAdminUser && text === "/panel") {
    await showAdminPanel(chatId);
    return;
  }

  if (isAdminUser && text.startsWith("/broadcast")) {
    await askBroadcastText(chatId);
    return;
  }

  // Fallback – private chat help
  if (isPrivate) {
    await sendMessage(
      chatId,
      "🤖 *King EyeCon System*\n\n" +
        "Use the buttons below:\n\n" +
        "• 📱 *Number info CHECK* – Search number info\n" +
        "• 💰 *My Balance* – See your sona & referrals\n" +
        "• 📜 *My Refer History* – See who joined by your link\n" +
        "• 👨‍💻 *Dev contact* – Developer info",
      {
        reply_markup: buildMainKeyboard(isAdminUser),
      }
    );
  }
}

// ====== CALLBACK HANDLER ======
async function handleCallback(cb) {
  const data = cb.data;
  const chatId = cb.message.chat.id;
  const userId = cb.from.id;
  const isAdminUser = isAdmin(userId);

  if (data === "VERIFY_JOIN") {
    const ok = await isUserJoinedAllChannels(userId);
    if (ok) {
      await telegramApi("answerCallbackQuery", {
        callback_query_id: cb.id,
        text: "✅ All channels joined! Welcome.",
        show_alert: false,
      });

      const user = getOrCreateUser(cb.from);
      await sendMessage(
        chatId,
        `🎉 *Welcome, ${user.name || "User"}!*\n\nYou have joined all required channels.\nNow you can use the menu below 👇`,
        {
          reply_markup: buildMainKeyboard(isAdminUser),
        }
      );
    } else {
      await telegramApi("answerCallbackQuery", {
        callback_query_id: cb.id,
        text: "❌ You must join all channels first.",
        show_alert: true,
      });
    }
  } else if (data === "PANEL_BROADCAST") {
    if (isAdminUser) {
      await askBroadcastText(chatId);
      await telegramApi("answerCallbackQuery", {
        callback_query_id: cb.id,
        text: "✉️ Send the broadcast text now.",
        show_alert: false,
      });
    }
  } else if (data === "PANEL_USERS") {
    if (isAdminUser) {
      await sendMessage(
        chatId,
        `👥 Total chats (subscribers): *${subscribers.size}*`,
      );
      await telegramApi("answerCallbackQuery", {
        callback_query_id: cb.id,
        text: "📊 User count updated.",
        show_alert: false,
      });
    }
  }
}

// ====== FLOW FUNCTIONS ======
async function handleStart(msg, refParam) {
  const chatId = msg.chat.id;
  const from = msg.from;
  const userId = from.id;
  const isPrivate = msg.chat.type === "private";
  const isAdminUser = isAdmin(userId);

  const user = getOrCreateUser(from);

  const isFirstTime = !user.joinedOnce;

  // Referral process (only first time)
  if (isFirstTime) {
    user.joinedOnce = true;

    if (refParam) {
      const refId = parseInt(refParam, 10);
      if (refId && refId !== userId) {
        const refUser = getOrCreateUser(refId);
        if (!user.referredBy) {
          user.referredBy = refId;
          refUser.balance += refBonus;
          refUser.referrals.push(userId);

          // Notify referrer
          try {
            await sendMessage(
              refId,
              `🎁 *New Referral!* \n\n` +
                `👤 *User:* ${user.name || "New user"}\n` +
                `💰 You earned *${refBonus} coin*.\n\n` +
                `📊 Current balance: *${refUser.balance} coin*`
            );
          } catch (e) {
            console.error("Failed to notify referrer:", e);
          }
        }
      }
    }

    // 🔔 New user notification to all admins
    const adminText =
      "🔔 *New User Started Bot*\n\n" +
      `🆔 ID: \`${user.id}\`\n` +
      `👤 Name: ${user.name || "Unknown"}\n` +
      `🔗 Username: ${user.username ? "@" + user.username : "N/A"}\n\n` +
      "Sir, নতুন user বট স্টার্ট করেছে ✅";

    for (const adminId of ADMIN_IDS) {
      try {
        await sendMessage(adminId, adminText);
      } catch (e) {
        console.error("Failed to notify admin:", e);
      }
    }
  }

  const channelText =
    "👑 *Welcome to King EyeCon Bot*\n\n" +
    "Before using the bot you *must join* the channels below:\n\n" +
    REQUIRED_CHANNELS.map((ch, i) => `${i + 1}. @${ch.username}`).join("\n") +
    "\n\nAfter joining, press: *✅ I have joined all*";

  if (isPrivate) {
    await sendMessage(chatId, channelText, {
      reply_markup: buildStartInlineKeyboard(),
    });
  } else {
    // In groups: short intro
    await sendMessage(
      chatId,
      "🤖 *King EyeCon Bot is active here!*\n" +
        "Use `📱 Number info CHECK` from private chat for full features.",
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
  }
}

async function askForNumber(chatId, isAdminUser) {
  userStates[chatId] = "WAITING_NUMBER";
  await sendMessage(
    chatId,
    "📱 *Send the phone number now*\n\nExample:\n`8801957795047`\n\nOnly digits, no spaces.",
    {
      reply_markup: buildMainKeyboard(isAdminUser),
    }
  );
}

async function handleNumberLookup(chatId, text) {
  const raw = text.replace(/[^\d]/g, ""); // keep only digits
  if (!raw || raw.length < 10) {
    await sendMessage(
      chatId,
      "⚠️ Please send a *valid phone number*.\nExample: `8801957795047`"
    );
    return;
  }

  await sendMessage(chatId, "⏳ *Checking number… Please wait*");
  await sendChatAction(chatId, "typing");

  try {
    const apiUrl = `https://rfcyberteam.online/king/eyecon.php?number=${raw}`;
    const res = await fetch(apiUrl);
    const json = await res.json();

    const formatted = formatNumberInfo(json);
    await sendMessage(chatId, formatted);
  } catch (err) {
    console.error("Number lookup error:", err);
    await sendMessage(
      chatId,
      "❌ *API error occurred.*\nPlease try again later."
    );
  }
}

async function showDevInfo(chatId, isAdminUser) {
  const text =
    "👨‍💻 *Developer Info*\n\n" +
    "• Dev contact: @Bdkingboss\n" +
    "• System: @Rfcyberteam\n" +
    "• API by: @Allbotts\n\n" +
    "⭐ For premium & custom features, contact the dev.";
  await sendMessage(chatId, text, {
    reply_markup: buildMainKeyboard(isAdminUser),
  });
}

async function showBalance(chatId, user, isAdminUser) {
  const referLink = `https://t.me/${BOT_USERNAME}?start=${user.id}`;

  const text =
    "💰 *My Balance Panel*\n\n" +
    `👤 *Name:* ${user.name || "Unknown"}\n` +
    `🆔 *ID:* \`${user.id}\`\n\n` +
    `⭐ *Sona Balance:* *${user.balance}*\n` +
    `👥 *Total Referrals:* *${user.referrals.length}*\n\n` +
    "🔗 *Your Refer Link:*\n" +
    `\`${referLink}\`\n\n` +
    "📌 Share this link with friends.\n" +
    `Every successful join = *${refBonus} coin* 🎁`;

  await sendMessage(chatId, text, {
    reply_markup: buildMainKeyboard(isAdminUser),
  });
}

async function showReferHistory(chatId, user, isAdminUser) {
  if (!user.referrals.length) {
    await sendMessage(
      chatId,
      "📜 *Your Refer History*\n\n" +
        "You have no referrals yet 😿\n\n" +
        "Share your link from *💰 My Balance* to start earning!",
      { reply_markup: buildMainKeyboard(isAdminUser) }
    );
    return;
  }

  const list = user.referrals
    .map((uid, i) => {
      const u = users[uid] || {};
      const name = u.name || "Unknown User";
      const uname = u.username ? ` (@${u.username})` : "";
      return `${i + 1}. ${name}${uname} — \`${uid}\``;
    })
    .join("\n");

  const text =
    "📜 *Your Refer History*\n\n" +
    list +
    "\n\n" +
    `👥 Total: *${user.referrals.length}* referrals\n` +
    `⭐ Earned: *${user.referrals.length * refBonus} coin* (approx)\n\n` +
    "Keep sharing your refer link for more rewards! 🚀";

  await sendMessage(chatId, text, {
    reply_markup: buildMainKeyboard(isAdminUser),
  });
}

async function showAdminPanel(chatId) {
  const text =
    "🛠 *Admin Panel (Sir)*\n\n" +
    "📊 *Full Control Commands:*\n\n" +
    "• `/users` — total chats\n" +
    "• `/allusers` — show all users list\n" +
    "• `/admins` — admin list\n" +
    "• `/blocked` — blocked users list\n" +
    "• `/setbonus 15` — per refer bonus set\n" +
    "• `/uinfo 123456789` — user info (balance + refer)\n" +
    "• `/addcoin 123456789 50` — add coin\n" +
    "• `/removecoin 123456789 10` — remove coin\n" +
    "• `/setcoin 123456789 100` — set exact balance\n" +
    "• `/block 123456789` — block user\n" +
    "• `/unblock 123456789` — unblock user\n" +
    "• `/broadcast` — start broadcast mode\n\n" +
    "👑 *Owner only:*\n" +
    "• `/addadmin 123456789`\n" +
    "• `/removeadmin 123456789`\n\n" +
    "Use the inline buttons for quick stats 👇";

  const keyboard = {
    inline_keyboard: [
      [{ text: "👥 Total Users", callback_data: "PANEL_USERS" }],
      [{ text: "📢 Broadcast", callback_data: "PANEL_BROADCAST" }],
    ],
  };

  await sendMessage(chatId, text, { reply_markup: keyboard });
}

async function askBroadcastText(chatId) {
  userStates[chatId] = "BROADCAST_WAITING";
  await sendMessage(
    chatId,
    "✉️ *Broadcast Mode*\n\nSir, send the message you want to broadcast to all users."
  );
}

async function broadcastMessage(text) {
  for (const chatId of subscribers) {
    try {
      await sendMessage(chatId, `📢 *Broadcast*\n\n${text}`);
    } catch (e) {
      console.error("Broadcast error to", chatId, e);
    }
  }
}
