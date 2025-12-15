import fetch from "node-fetch";

export default async function handler(req, res) {

  // ========= 1️⃣ ROOT PAGE (ONE PAGE) =========
  if (req.method === "GET") {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>RF CYBER TEAM BOT</title>
  <style>
    body {
      background:#0f172a;
      color:#e5e7eb;
      font-family: Arial;
      display:flex;
      justify-content:center;
      align-items:center;
      height:100vh;
      margin:0;
    }
    .box {
      background:#020617;
      padding:30px;
      border-radius:12px;
      text-align:center;
      max-width:400px;
    }
    a {
      color:#38bdf8;
      text-decoration:none;
      font-weight:bold;
    }
  </style>
</head>
<body>
  <div class="box">
    <h2>🤖 RF CYBER TEAM</h2>
    <p>Facebook / YouTube / TikTok Downloader Bot</p>
    <p>Status: <b>ONLINE ✅</b></p>
    <p>Webhook URL:</p>
    <p><code>/api/socialdbot</code></p>
    <p><a href="https://t.me/your_bot_username">Open Telegram Bot</a></p>
  </div>
</body>
</html>
    `);
  }

  // ========= 2️⃣ TELEGRAM WEBHOOK =========
  if (req.method !== "POST") return res.end();

  const BOT_TOKEN = "8224663500:AAESgArrjCUQSR59orT4RFDoEyCepoyoGSU";

  const API_FB = "https://ball-livid.vercel.app/api/fbd?id=";
  const API_YT = "https://ball-livid.vercel.app/api/ytd?url=";
  const API_TT = "https://ball-livid.vercel.app/api/tiktokd?id=";

  const update = req.body;
  const msg = update.message || update.edited_message;
  const text = msg?.text?.trim() || "";
  const chatId = msg?.chat?.id;

  if (!chatId) return res.end();

  const tg = (method, data) =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

  const send = (t) => tg("sendMessage", {
    chat_id: chatId,
    text: t,
    parse_mode: "HTML",
    disable_web_page_preview: true
  });

  const getJson = async (u) => {
    try {
      const r = await fetch(u);
      return await r.json();
    } catch {
      return null;
    }
  };

  if (text === "/start") {
    await send("👋 লিংক পাঠাও\n📥 Facebook / YouTube / TikTok");
    return res.end();
  }

  if (/facebook\.com/i.test(text)) {
    const d = await getJson(API_FB + encodeURIComponent(text));
    const v = d?.download_links?.[0];
    if (!v) return send("❌ Facebook video পাওয়া যায়নি");
    await tg("sendVideo", { chat_id: chatId, video: v });
    return res.end();
  }

  if (/youtube\.com|youtu\.be/i.test(text)) {
    const d = await getJson(API_YT + encodeURIComponent(text));
    const v = d?.data?.items?.find(x => x.type === "video_with_audio")?.url;
    if (!v) return send("❌ YouTube video পাওয়া যায়নি");
    await tg("sendVideo", { chat_id: chatId, video: v });
    return res.end();
  }

  if (/tiktok\.com/i.test(text)) {
    const d = await getJson(API_TT + encodeURIComponent(text));
    const v = d?.download_url || d?.downloadUrl;
    if (!v) return send("❌ TikTok video পাওয়া যায়নি");
    await tg("sendVideo", { chat_id: chatId, video: v });
    return res.end();
  }

  await send("📎 সঠিক লিংক পাঠাও");
  res.end();
}
