import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("OK");

  // ===== CONFIG =====
  const BOT_TOKEN = "8224663500:AAESgArrjCUQSR59orT4RFDoEyCepoyoGSU";

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

  const sendVideoSafe = async (videoUrl, caption) => {
    // প্রথমে ভিডিও হিসেবে পাঠানোর চেষ্টা
    const r = await tg("sendVideo", {
      chat_id: chatId,
      video: videoUrl,
      caption,
      parse_mode: "HTML"
    });

    const j = await r.json();

    // ভিডিও সাইজ বড় হলে fallback → document
    if (!j.ok) {
      await tg("sendDocument", {
        chat_id: chatId,
        document: videoUrl,
        caption,
        parse_mode: "HTML"
      });
    }
  };

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
    await sendText(
      "👋 <b>Welcome</b>\n\n📥 Facebook / YouTube / TikTok লিংক পাঠাও\n🎬 ভিডিও + টাইটেল + ক্রেডিট সহ পাবো"
    );
    return res.end();
  }

  // ===== FACEBOOK =====
  if (/facebook\.com|fb\.watch/i.test(text)) {
    await sendText("⏳ <b>Facebook video processing...</b>");

    const d = await getJson(API_FB + encodeURIComponent(text));
    const video = d?.download_links?.[0];

    if (!video) {
      await sendText("❌ Facebook ভিডিও পাওয়া যায়নি");
      return res.end();
    }

    const caption =
      "🎥 <b>Facebook Video</b>\n\n" +
      "📡 <b>Source:</b> Facebook\n\n" +
      "👑 <b>Credit:</b>\n" +
      "• @bdkingboss\n" +
      "• @topnormalperson\n" +
      "🔗 https://t.me/Rfcyberteam";

    await sendVideoSafe(video, caption);
    return res.end();
  }

  // ===== YOUTUBE =====
  if (/youtube\.com|youtu\.be/i.test(text)) {
    await sendText("⏳ <b>YouTube video processing...</b>");

    const d = await getJson(API_YT + encodeURIComponent(text));
    const info = d?.data?.data;

    const videoItem = info?.items?.find(
      (v) => v.type === "video_with_audio" && v.ext === "mp4"
    );

    if (!videoItem?.url) {
      await sendText("❌ YouTube ভিডিও পাওয়া যায়নি");
      return res.end();
    }

    const caption =
      "🎬 <b>YouTube Video</b>\n\n" +
      `⏱ <b>Duration:</b> ${info.duration}s\n\n` +
      "👑 <b>Credit:</b>\n" +
      "• @bdkingboss\n" +
      "• @topnormalperson\n" +
      "🔗 https://t.me/Rfcyberteam";

    await sendVideoSafe(videoItem.url, caption);
    return res.end();
  }

  // ===== TIKTOK =====
  if (/tiktok\.com/i.test(text)) {
    await sendText("⏳ <b>TikTok video processing...</b>");

    const d = await getJson(API_TT + encodeURIComponent(text));
    const video = d?.download_url;

    if (!video) {
      await sendText("❌ TikTok ভিডিও পাওয়া যায়নি");
      return res.end();
    }

    const caption =
      "🎵 <b>TikTok Video</b>\n\n" +
      `${d.description || ""}\n\n` +
      "👑 <b>Credit:</b>\n" +
      "• @bdkingboss\n" +
      "• @topnormalperson\n" +
      "🔗 https://t.me/Rfcyberteam";

    await sendVideoSafe(video, caption);
    return res.end();
  }

  // ===== FALLBACK =====
  await sendText("📎 সঠিক Facebook / YouTube / TikTok লিংক পাঠাও");
  res.end();
}
