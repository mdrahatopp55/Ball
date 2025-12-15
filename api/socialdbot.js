// ===============================
// 📱 RF CYBER TEAM FB + YT + TikTok Downloader Bot (JS)
// ===============================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("OK");
  }

  const BOT_TOKEN = "8224663500:AAESgArrjCUQSR59orT4RFDoEyCepoyoGSU";

  // 🔁 UPDATED APIs
  const API_FB = "https://ball-livid.vercel.app/api/fbd?id=";
  const API_YT = "https://ball-livid.vercel.app/api/ytd?url=";
  const API_TT = "https://ball-livid.vercel.app/api/tiktokd?id=";

  const message = req.body?.message?.text || "";
  const chatId = req.body?.message?.chat?.id;

  if (!chatId) return res.end();

  // ========= Helpers =========
  const sendMessage = async (text, disablePreview = false) => {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: disablePreview
      })
    });
  };

  const sendVideo = async (videoUrl, caption = "") => {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        video: videoUrl,
        caption,
        parse_mode: "HTML"
      })
    });
    return r.ok;
  };

  const fetchJson = async (url) => {
    try {
      const r = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });
      return await r.json();
    } catch {
      return null;
    }
  };

  const text = message.trim();

  // ========= /start =========
  if (text === "/start") {
    await sendMessage(
      "👋 হ্যালো! আমি <b>Facebook, YouTube & TikTok Video Downloader Bot</b> 🎥\n\n" +
      "📎 একটি ভিডিও লিংক পাঠান"
    );
    return res.end();
  }

  // ========= Facebook =========
  if (/facebook\.com/i.test(text)) {
    await sendMessage("⏳ Facebook ভিডিও প্রস্তুত করা হচ্ছে...", true);

    const data = await fetchJson(API_FB + encodeURIComponent(text));

    if (!data?.download_links?.length) {
      await sendMessage("❌ Facebook ভিডিও পাওয়া যায়নি");
      return res.end();
    }

    const [p360, p720, p1080] = data.download_links;

    let caption = "🎬 Facebook Video (360p)\n\n";
    if (p720) caption += `🔹 <a href="${p720}">720p</a>\n`;
    if (p1080) caption += `🔹 <a href="${p1080}">1080p</a>`;

    const ok = await sendVideo(p360, caption);
    if (!ok) {
      await sendMessage(
        `<a href="${p360}">360p</a>\n` +
        (p720 ? `<a href="${p720}">720p</a>\n` : "") +
        (p1080 ? `<a href="${p1080}">1080p</a>` : "")
      );
    }
    return res.end();
  }

  // ========= YouTube =========
  if (/youtu\.be|youtube\.com/i.test(text)) {
    await sendMessage("⏳ YouTube ভিডিও প্রস্তুত করা হচ্ছে...", true);

    const data = await fetchJson(API_YT + encodeURIComponent(text));
    const items = data?.data?.items || [];

    const videos = {};
    for (const v of items) {
      if (v.type === "video_with_audio") {
        videos[v.height] = v.url;
      }
    }

    if (!Object.keys(videos).length) {
      await sendMessage("❌ YouTube ভিডিও পাওয়া যায়নি");
      return res.end();
    }

    const first = videos[360] || Object.values(videos)[0];

    let caption = "🎬 YouTube Video\n\n";
    if (videos[720]) caption += `🔹 <a href="${videos[720]}">720p</a>\n`;
    if (videos[1080]) caption += `🔹 <a href="${videos[1080]}">1080p</a>`;

    const ok = await sendVideo(first, caption);
    if (!ok) {
      let txt = "⬇️ Download Links\n\n";
      for (const h in videos) {
        txt += `<a href="${videos[h]}">${h}p</a>\n`;
      }
      await sendMessage(txt);
    }
    return res.end();
  }

  // ========= TikTok =========
  if (/tiktok\.com/i.test(text)) {
    await sendMessage("⏳ TikTok ভিডিও প্রস্তুত করা হচ্ছে...", true);

    const data = await fetchJson(API_TT + encodeURIComponent(text));
    const url = data?.download_url || data?.downloadUrl;

    if (!url) {
      await sendMessage("❌ TikTok ভিডিও পাওয়া যায়নি");
      return res.end();
    }

    const desc = (data.description || "").slice(0, 800);

    const caption =
      "🎬 TikTok Video\n\n" +
      (desc ? `<b>Description:</b>\n${desc}\n\n` : "") +
      `🔗 <a href="${url}">Download</a>`;

    const ok = await sendVideo(url, caption);
    if (!ok) {
      await sendMessage(`<a href="${url}">Download TikTok Video</a>`);
    }
    return res.end();
  }

  // ========= Invalid =========
  await sendMessage("📎 একটি সঠিক Facebook / YouTube / TikTok লিংক পাঠান");
  res.end();
                                 }
