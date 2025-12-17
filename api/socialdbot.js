import fetch from "node-fetch";

export default async function handler(req, res) {
  // Telegram only
  if (req.method !== "POST") return res.status(200).end("OK");

  // ===== CONFIG =====
  const BOT_TOKEN = process.env.BOT_TOKEN || "PUT_YOUR_BOT_TOKEN_HERE";

  const API_FB = "https://ball-livid.vercel.app/api/fbd?id=";
  const API_YT = "https://ball-livid.vercel.app/api/ytd?url=";
  const API_TT = "https://ball-livid.vercel.app/api/tiktokd?id=";

  const update = req.body;
  const msg = update?.message || update?.edited_message;
  const text = msg?.text?.trim() || "";
  const chatId = msg?.chat?.id;

  if (!chatId) return res.end();

  // ===== Telegram helper =====
  const tg = (method, data) =>
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

  const sendText = (t) =>
    tg("sendMessage", {
      chat_id: chatId,
      text: t,
      parse_mode: "HTML",
      disable_web_page_preview: true
    });

  const getJson = async (url) => {
    try {
      const r = await fetch(url);
      return await r.json();
    } catch {
      return null;
    }
  };

  // ===== START =====
  if (text === "/start") {
    await sendText("👋 লিংক পাঠাও\n📥 Facebook / YouTube / TikTok");
    return res.end();
  }

  // ===== Facebook =====
  if (/facebook\.com/i.test(text)) {
    const d = await getJson(API_FB + encodeURIComponent(text));
    const video = d?.download_links?.[0];
    if (!video) return sendText("❌ Facebook video পাওয়া যায়নি");
    await tg("sendVideo", { chat_id: chatId, video });
    return res.end();
  }

  // ===== YouTube =====
  if (/youtube\.com|youtu\.be/i.test(text)) {
    const d = await getJson(API_YT + encodeURIComponent(text));
    const video =
      d?.data?.items?.find(v => v.type === "video_with_audio")?.url;
    if (!video) return sendText("❌ YouTube video পাওয়া যায়নি");
    await tg("sendVideo", { chat_id: chatId, video });
    return res.end();
  }

  // ===== TikTok =====
  if (/tiktok\.com/i.test(text)) {
    const d = await getJson(API_TT + encodeURIComponent(text));
    const video = d?.download_url || d?.downloadUrl;
    if (!video) return sendText("❌ TikTok video পাওয়া যায়নি");
    await tg("sendVideo", { chat_id: chatId, video });
    return res.end();
  }

  // ===== FALLBACK =====
  await sendText("📎 সঠিক Facebook / YouTube / TikTok লিংক পাঠাও");
  res.end();
}
