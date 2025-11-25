// api/telegram.js
//
// 🇧🇩 Telegram Photo → imgbb Uploader Bot
// Join Gate + Upload History + Broadcast System + New User Notify
// Vercel serverless function (Node.js 18+)

// 🔐 তোমার আসল টোকেন/কি (তুমি যা দিয়েছিলে)
const BOT_TOKEN = "8553142117:AAFenQWAAoIXUq4p-MBYj7UAMQdVPHtgwgE";
const IMGBB_AUTH = "40f18fa6f064f082d9e818945bb7ed21ffda9ea0";

// 👉 তোমার Channel info
const CHANNEL_USERNAME = "@Rfcyberteam";              // getChatMember এর জন্য
const CHANNEL_LINK = "https://t.me/Rfcyberteam";      // Join button
const DEV_LINE = "Dev: 🇧🇩 <b>Join @Rfcyberteam On Telegram 🎯</b>";

// 👉 Broadcast ও notification এর জন্য Admin user ID (নিজের numeric Telegram ID বসাও)
const ADMIN_ID = 7915173083; // এখানে নিজের Telegram numeric ID বসাবে

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/`;

// ইন-মেমোরি upload history (per user), সব ইউজার লিস্ট (broadcast এর জন্য), এবং যারা একবার /start করেছে
const USER_UPLOADS = {};         // { userId: [ {main, direct, time, date} ] }
const USERS = new Set();         // broadcast এর জন্য সব ইউজার আইডি
const STARTED_USERS = new Set(); // যে ইউজাররা অন্তত একবার /start করেছে (admin notify একবারই যাবে)

/* ------------------------------------------------------------------
   Common Helpers
-------------------------------------------------------------------*/

// Telegram এ সাধারণ মেসেজ পাঠানো
async function sendMessage(chatId, text, extra = {}) {
  if (!chatId) return;

  try {
    await fetch(TELEGRAM_API + "sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...extra,
      }),
    });
  } catch (error) {
    console.error("sendMessage error:", error);
  }
}

// Join করার instruction + inline button
async function sendJoinGateMessage(chatId) {
  const text =
    "🚧 <b>Access Locked!</b>\n\n" +
    "এই বট ব্যবহার করার আগে আমাদের Official Channel এ Join করতে হবে। 💚\n\n" +
    "1️⃣ নিচের <b>Join Channel</b> বাটনে ক্লিক করো\n" +
    "2️⃣ Channel এ Join করার পর <b>আমি Join করে ফেলেছি</b> বাটনে চাপ দাও\n\n" +
    "তারপর তুমি Photo পাঠাতে পারবে, আর আমি imgbb লিংক দিয়ে দিবো 😎\n\n" +
    DEV_LINE;

  const reply_markup = {
    inline_keyboard: [
      [{ text: "🔔 Join Channel", url: CHANNEL_LINK }],
      [{ text: "✅ আমি Join করে ফেলেছি", callback_data: "joined_check" }],
    ],
  };

  return sendMessage(chatId, text, { reply_markup });
}

// বাংলাদেশ টাইম ফরম্যাট
function getBdTimeInfo() {
  const now = new Date();

  const time = now.toLocaleTimeString("en-US", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const [day, month, year] = dateStr.split("/");
  const date = `${day}-${month}-${year}`;

  return { time, date };
}

// User channel এ member কিনা চেক করা
async function isUserMemberOfChannel(userId) {
  try {
    const resp = await fetch(TELEGRAM_API + "getChatMember", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHANNEL_USERNAME,
        user_id: userId,
      }),
    });

    const data = await resp.json();

    if (!data.ok) {
      console.log("getChatMember failed:", data);
      return false;
    }

    const status = data.result.status; // "creator", "administrator", "member", "restricted", "left", "kicked"
    if (status === "left" || status === "kicked") return false;

    return true;
  } catch (error) {
    console.error("isUserMemberOfChannel error:", error);
    return false;
  }
}

// Callback query এর উত্তর (উপরে ছোট popup দেখানোর জন্য)
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
  try {
    await fetch(TELEGRAM_API + "answerCallbackQuery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert,
      }),
    });
  } catch (error) {
    console.error("answerCallbackQuery error:", error);
  }
}

// imgbb তে আপলোড করার ফাংশন
async function uploadToImgbbFromUrl(imageUrl) {
  const startTime = Date.now();

  if (!imageUrl) {
    return { status: false, message: "No image URL provided" };
  }

  try {
    // ১) Telegram থেকে ফাইল ডাউনলোড
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) {
      return {
        status: false,
        message: `Failed to download image: HTTP ${imgResp.status}`,
      };
    }

    const arrayBuffer = await imgResp.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "image/jpeg" });

    // ২) imgbb এ পাঠানোর জন্য FormData
    const formData = new FormData();
    formData.append("source", blob, "image.jpg");
    formData.append("type", "file");
    formData.append("action", "upload");
    formData.append("timestamp", String(Date.now()));
    formData.append("auth_token", IMGBB_AUTH);

    const imgbbResp = await fetch("https://imgbb.com/json", {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
        "User-Agent": "RfUploader/1.0",
      },
    });

    const data = await imgbbResp.json();

    if (!data || !data.image) {
      return {
        status: false,
        message: "Image data not found in imgbb response",
      };
    }

    const image = data.image;

    const urls = {
      url: image.url ?? null,
      url_viewer: image.url_viewer ?? null,
      url_viewer_preview: image.url_viewer_preview ?? null,
      url_viewer_thumb: image.url_viewer_thumb ?? null,
      image_url: image.image?.url ?? null,
      thumb_url: image.thumb?.url ?? null,
      medium_url: image.medium?.url ?? null,
      display_url: image.display_url ?? null,
      delete_url: image.delete_url ?? null,
    };

    const filteredUrls = Object.fromEntries(
      Object.entries(urls).filter(([, v]) => v)
    );

    const endTime = Date.now();
    const timeTaken = ((endTime - startTime) / 1000).toFixed(2);
    const { time, date } = getBdTimeInfo();

    return {
      status: true,
      time_taken: `${timeTaken} seconds`,
      time,
      date,
      dev: DEV_LINE,
      upload_links: filteredUrls,
    };
  } catch (error) {
    console.error("uploadToImgbbFromUrl error:", error);
    return {
      status: false,
      message: "Error while uploading to imgbb",
    };
  }
}

// ইউজারের upload history তে নতুন এন্ট্রি যোগ
function addUserUpload(userId, mainUrl, directUrl, time, date) {
  if (!userId) return;
  if (!USER_UPLOADS[userId]) USER_UPLOADS[userId] = [];

  USER_UPLOADS[userId].push({
    main: mainUrl,
    direct: directUrl,
    time,
    date,
  });

  // সর্বোচ্চ ২০টা রাখব
  if (USER_UPLOADS[userId].length > 20) {
    USER_UPLOADS[userId].shift();
  }
}

// /myuploads কমান্ডের রেপ্লাই বানানো
function formatUserUploads(userId) {
  const list = USER_UPLOADS[userId] || [];
  if (list.length === 0) {
    return (
      "📂 <b>No uploads found!</b>\n\n" +
      "তুমি এখনো কোনো Photo upload করোনি।\n" +
      "📸 প্রথমে একটা Photo পাঠাও, আমি imgbb লিংক বানিয়ে দিবো।\n\n" +
      DEV_LINE
    );
  }

  let text = "📂 <b>Your Recent Uploads (max 20)</b>\n\n";
  list.forEach((item, idx) => {
    const i = idx + 1;
    text += `#${i}\n`;
    if (item.direct) text += `🖼 <b>Direct:</b> ${item.direct}\n`;
    else if (item.main) text += `🔗 <b>Link:</b> ${item.main}\n`;
    text += `🕒 ${item.time} | 📅 ${item.date}\n\n`;
  });

  text += DEV_LINE;
  return text;
}

// Broadcast মেসেজ পাঠানোর ফাংশন (শুধু ADMIN_ID use করতে পারবে)
async function handleBroadcast(fromId, chatId, text) {
  if (fromId !== ADMIN_ID) {
    await sendMessage(chatId, "❌ এই কমান্ড শুধু <b>Admin</b> ব্যবহার করতে পারবে।");
    return;
  }

  const parts = text.split(" ");
  if (parts.length < 2) {
    await sendMessage(
      chatId,
      "📢 ব্যবহারঃ\n<b>/broadcast তোমার মেসেজ</b>\n\nউদাহরণ:\n<code>/broadcast নতুন Update চলে এসেছে!</code>"
    );
    return;
  }

  const msg = text.substring(parts[0].length).trim();
  if (!msg) {
    await sendMessage(chatId, "❌ Broadcast message খালি রাখা যাবে না।");
    return;
  }

  if (USERS.size === 0) {
    await sendMessage(chatId, "ℹ️ এখনো কোনো ইউজার লিস্টে নেই।");
    return;
  }

  await sendMessage(
    chatId,
    `📢 Broadcast শুরু হচ্ছে...\n👥 মোট ইউজার: <b>${USERS.size}</b>`
  );

  let success = 0;
  let failed = 0;

  const tasks = [];
  for (const uid of USERS) {
    tasks.push(
      sendMessage(uid, "📢 <b>Broadcast</b>\n\n" + msg).then(
        () => {
          success++;
        },
        () => {
          failed++;
        }
      )
    );
  }

  await Promise.all(tasks);

  await sendMessage(
    chatId,
    `✅ Broadcast সম্পন্ন!\n\n📨 সফল: <b>${success}</b>\n⚠️ ব্যর্থ: <b>${failed}</b>`
  );
}

/* ------------------------------------------------------------------
   Main Webhook Handler
-------------------------------------------------------------------*/

export default async function handler(req, res) {
  // শুধু Telegram এর POST Webhook হ্যান্ডল করব
  if (req.method !== "POST") {
    return res.status(200).send("Telegram Bot is running 🚀");
  }

  const update = req.body;
  if (!update) {
    return res.status(200).send("No update");
  }

  /* 🔹 1) Callback Query (Join চেক বাটন) হ্যান্ডল */
  if (update.callback_query) {
    const callback = update.callback_query;
    const data = callback.data;
    const from = callback.from;
    const chatId = callback.message?.chat?.id;
    const callbackId = callback.id;

    // এই ইউজারকেও ইউজার লিস্টে রাখি (broadcast এর জন্য)
    if (from?.id) USERS.add(from.id);

    if (data === "joined_check") {
      const isMember = await isUserMemberOfChannel(from.id);

      if (isMember) {
        await answerCallbackQuery(
          callbackId,
          "✅ ধন্যবাদ! তুমি আমাদের Channel এ Join করেছো 🎉",
          false
        );

        await sendMessage(
          chatId,
          "✅ <b>Verified!</b>\n\n" +
            "তুমি এখন বট ব্যবহার করতে পারবে।\n" +
            "📸 এখন থেকে যে কোনো Photo পাঠালে আমি imgbb লিংক বানিয়ে দিবো 😎\n\n" +
            "ℹ️ কমান্ডগুলো দেখতে /help লিখো।\n\n" +
            DEV_LINE
        );
      } else {
        await answerCallbackQuery(
          callbackId,
          "❌ এখনো Channel এ Join করোনি!",
          true
        );

        await sendJoinGateMessage(chatId);
      }
    }

    return res.status(200).send("OK");
  }

  /* 🔹 2) Normal Message (text / photo) হ্যান্ডল */
  const message = update.message || update.edited_message || null;
  const chatId = message?.chat?.id;
  const text = message?.text || "";
  const photos = message?.photo || [];
  const from = message?.from || {};
  const fromId = from.id;

  if (!chatId) {
    return res.status(200).send("No chat id");
  }

  // ইউজারকে global set এ রাখি (broadcast এর জন্য)
  if (fromId) USERS.add(fromId);

  // ইউজার member কিনা অনেক জায়গাতেই লাগবে
  const isMember = await isUserMemberOfChannel(fromId);

  // /start কমান্ড → সুন্দর welcome + join buttons + নতুন ইউজার হলে admin notify
  if (text === "/start") {
    // নতুন ইউজার হলে admin কে নোটিফিকেশন পাঠাই (একবারই)
    if (!STARTED_USERS.has(fromId) && fromId !== ADMIN_ID) {
      STARTED_USERS.add(fromId);

      const fullName = [from.first_name, from.last_name]
        .filter(Boolean)
        .join(" ");
      const username = from.username ? `@${from.username}` : "N/A";

      const { time, date } = getBdTimeInfo();

      const notifyText =
        "🆕 <b>New User Started Bot</b>\n\n" +
        `🧑 Name: <b>${fullName || "Unknown"}</b>\n` +
        `🔖 Username: <b>${username}</b>\n` +
        `🆔 ID: <code>${fromId}</code>\n` +
        `🕒 Time: ${time}\n` +
        `📅 Date: ${date}\n\n` +
        "📢 Bot: Imgbb Uploader\n" +
        DEV_LINE;

      await sendMessage(ADMIN_ID, notifyText);
    }

    const welcome =
      "👋 <b>Welcome to Imgbb Uploader Bot!</b>\n\n" +
      "এই বট দিয়ে তুমি তোমার Telegram Photo কে imgbb লিংকে কনভার্ট করতে পারবে।\n\n" +
      "📌 Main Features:\n" +
      "• Photo → imgbb Direct Link\n" +
      "• /myuploads → তোমার আপলোড করা Photo গুলোর লিস্ট\n" +
      "• /broadcast → Admin এর জন্য broadcast system\n" +
      "• New user notify → Admin এর ইনবক্সে\n" +
      "• Join Gate → শুধু Channel member রাই ইউজ করতে পারবে\n\n" +
      DEV_LINE;

    await sendMessage(chatId, welcome);

    if (!isMember) {
      await sendJoinGateMessage(chatId);
    } else {
      await sendMessage(
        chatId,
        "✅ তুমি ইতিমধ্যেই Channel এ Join করা!\n\n" +
          "📸 এখন Photo পাঠাও, আমি লিংক বানিয়ে দিবো 😎\n\n" +
          "ℹ️ কমান্ডগুলোর জন্য /help ব্যবহার করো।"
      );
    }

    return res.status(200).send("OK");
  }

  // /help কমান্ড
  if (text === "/help") {
    const helpText =
      "📖 <b>Bot Commands</b>\n\n" +
      "• /start – বট চালু + basic info\n" +
      "• /help – এই হেল্প মেনু\n" +
      "• /myuploads – তোমার আপলোড করা Photo গুলোর লিস্ট (max 20)\n" +
      "• /dev – Dev / Channel / Support info\n" +
      "• /broadcast Text – (Admin only) সব ইউজারকে মেসেজ পাঠাও\n\n" +
      "💡 শুধু Photo পাঠালেই আমি imgbb লিংক বানিয়ে দিবো।\n\n" +
      DEV_LINE;
    await sendMessage(chatId, helpText);
    return res.status(200).send("OK");
  }

  // /dev কমান্ড
  if (text === "/dev") {
    const devText =
      "👨‍💻 <b>Developer Info</b>\n\n" +
      "🇧🇩 Name: Kingboss\n" +
      "📢 Channel: <b>@Rfcyberteam</b>\n" +
      "🔗 Link: " + CHANNEL_LINK + "\n\n" +
      "এই বট Mod / Custom Feature লাগলে contact করো 😉\n\n" +
      DEV_LINE;
    await sendMessage(chatId, devText);
    return res.status(200).send("OK");
  }

  // /myuploads কমান্ড
  if (text === "/myuploads") {
    if (!isMember) {
      await sendJoinGateMessage(chatId);
      return res.status(200).send("OK");
    }

    const uploadsText = formatUserUploads(fromId);
    await sendMessage(chatId, uploadsText);
    return res.status(200).send("OK");
  }

  // /broadcast কমান্ড (Admin only)
  if (text.startsWith("/broadcast")) {
    await handleBroadcast(fromId, chatId, text);
    return res.status(200).send("OK");
  }

  // Photo এলে → প্রথমে membership check
  if (Array.isArray(photos) && photos.length > 0) {
    if (!isMember) {
      await sendJoinGateMessage(chatId);
      return res.status(200).send("OK");
    }

    try {
      // সব থেকে বড় সাইজের photo
      const largestPhoto = photos[photos.length - 1];
      const fileId = largestPhoto.file_id;

      // Telegram থেকে file_path
      const fileInfoResp = await fetch(
        `${TELEGRAM_API}getFile?file_id=${fileId}`
      );
      const fileInfo = await fileInfoResp.json();

      if (!fileInfo.ok) {
        await sendMessage(
          chatId,
          "❌ <b>File info নিতে সমস্যা হয়েছে।</b>\n" +
            "🔁 একটু পরে আবার চেষ্টা করো।\n\n" +
            DEV_LINE
        );
        return res.status(200).send("OK");
      }

      const filePath = fileInfo.result.file_path;
      const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

      // imgbb তে upload করি
      const uploadResult = await uploadToImgbbFromUrl(fileUrl);

      if (!uploadResult.status) {
        await sendMessage(
          chatId,
          "❌ <b>Upload Failed</b>\n" +
            "🔎 Details: " +
            (uploadResult.message || "Unknown error") +
            "\n\n" +
            DEV_LINE
        );
        return res.status(200).send("OK");
      }

      const links = uploadResult.upload_links;
      let reply = "✅ <b>Image Uploaded Successfully!</b>\n\n";

      if (links.url) reply += "🔗 <b>Main:</b> " + links.url + "\n";
      if (links.image_url) reply += "🖼 <b>Direct:</b> " + links.image_url + "\n";
      if (links.url_viewer) reply += "👁 <b>Viewer:</b> " + links.url_viewer + "\n";
      if (links.thumb_url) reply += "🧩 <b>Thumb:</b> " + links.thumb_url + "\n";
      if (links.delete_url) reply += "🗑 <b>Delete:</b> " + links.delete_url + "\n";

      reply +=
        "\n⏱ <b>Time:</b> " +
        uploadResult.time_taken +
        "\n🕒 <b>BD Time:</b> " +
        uploadResult.time +
        "\n📅 <b>Date:</b> " +
        uploadResult.date +
        "\n\n" +
        uploadResult.dev;

      // history তে save করি
      const mainUrl = links.url || links.image_url || null;
      const directUrl = links.image_url || links.url || null;
      addUserUpload(fromId, mainUrl, directUrl, uploadResult.time, uploadResult.date);

      await sendMessage(chatId, reply);
    } catch (error) {
      console.error("photo handler error:", error);
      await sendMessage(
        chatId,
        "❌ <b>কিছু একটা গণ্ডগোল হয়েছে।</b>\n🔁 পরে আবার চেষ্টা করো প্লিজ।\n\n" +
          DEV_LINE
      );
    }

    return res.status(200).send("OK");
  }

  // অন্য যে কোনো text মেসেজের জন্য – হেল্প + join gate
  if (!isMember) {
    await sendJoinGateMessage(chatId);
  } else {
    const helpText =
      "📸 শুধু <b>Photo</b> পাঠাও, আমি imgbb লিংকে কনভার্ট করে দিবো!\n\n" +
      "ℹ️ কমান্ডগুলো দেখতে /help ব্যবহার করো।\n\n" +
      DEV_LINE;
    await sendMessage(chatId, helpText);
  }

  return res.status(200).send("OK");
}
