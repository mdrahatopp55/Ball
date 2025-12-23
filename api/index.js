import fetch from "node-fetch";

export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(200).send("OK");
    }

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
        await sendText("👋 <b>স্বাগতম!</b>\n📥 Facebook, YouTube বা TikTok লিংক পাঠান।\n\n🛡 <i>Powered by: @Rfcyberteam</i>");
        return res.end();
    }

    // ===== Facebook =====
    if (/facebook.com|fb.watch/i.test(text)) {
        await sendText("⏳ <b>Facebook video processing...</b>");
        const d = await getJson(API_FB + encodeURIComponent(text));
        const video = d?.download_links?.[0];

        if (!video) {
            await sendText("❌ দুঃখিত, ভিডিওটি পাওয়া যায়নি বা সাইজ অনেক বড়।");
        } else {
            await tg("sendVideo", { 
                chat_id: chatId, 
                video: video,
                caption: "✅ <b>Facebook Video Downloaded</b>\n\n🛡 <i>Credit: @Rfcyberteam</i>",
                parse_mode: "HTML"
            });
        }
        return res.end();
    }

    // ===== YouTube =====
    if (/youtube.com|youtu.be/i.test(text)) {
        await sendText("⏳ <b>YouTube video processing...</b>");
        const d = await getJson(API_YT + encodeURIComponent(text));
        
        // আপনার দেওয়া JSON অনুযায়ী path: data.data.items
        const items = d?.data?.data?.items || d?.data?.items;
        const video = items?.find(v => v.type === "video_with_audio" && v.ext === "mp4")?.url || items?.find(v => v.type === "video_with_audio")?.url;

        if (!video) {
            await sendText("❌ YouTube ভিডিওটি বড় হওয়ার কারণে পাঠানো যাচ্ছে না।");
        } else {
            await tg("sendVideo", { 
                chat_id: chatId, 
                video: video,
                caption: `🎬 <b>YouTube Video</b>\n\n🛡 <i>Credit: @Rfcyberteam</i>`,
                parse_mode: "HTML"
            });
        }
        return res.end();
    }

    // ===== TikTok =====
    if (/tiktok.com/i.test(text)) {
        await sendText("⏳ <b>TikTok video processing...</b>");
        const d = await getJson(API_TT + encodeURIComponent(text));
        const video = d?.download_url || d?.downloadUrl;
        const title = d?.description || "TikTok Video";

        if (!video) {
            await sendText("❌ TikTok ভিডিও পাওয়া যায়নি।");
        } else {
            await tg("sendVideo", { 
                chat_id: chatId, 
                video: video,
                caption: `📱 <b>${title}</b>\n\n🛡 <i>Credit: @Rfcyberteam</i>`,
                parse_mode: "HTML"
            });
        }
        return res.end();
    }

    // ===== Fallback =====
    if (text.startsWith("http")) {
        await sendText("📎 সঠিক Facebook / YouTube / TikTok লিংক পাঠাও।");
    }
    res.end();
}
