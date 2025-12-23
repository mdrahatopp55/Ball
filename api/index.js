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
        await sendText("👋 <b>স্বাগতম!</b>\n📥 Facebook, YouTube বা TikTok ভিডিওর লিংক পাঠান।\n\n🛡 <i>Powered by: @Rfcyberteam</i>");
        return res.end();
    }

    // ===== Facebook Download =====
    if (/facebook.com|fb.watch/i.test(text)) {
        await sendText("⏳ <b>Facebook ভিডিও প্রসেস হচ্ছে...</b>");
        const d = await getJson(API_FB + encodeURIComponent(text));
        const videoUrl = d?.download_links?.[0]; // ১ম লিংকটি নেওয়া হচ্ছে

        if (!videoUrl) {
            return sendText("❌ দুঃখিত, ফেসবুক ভিডিওটি পাওয়া যায়নি বা ফাইলটি অনেক বড়।");
        }

        await tg("sendVideo", {
            chat_id: chatId,
            video: videoUrl,
            caption: "✅ <b>Facebook Video Downloaded</b>\n\n🛡 <i>Credit: @Rfcyberteam</i>",
            parse_mode: "HTML"
        });
        return res.end();
    }

    // ===== YouTube Download =====
    if (/youtube.com|youtu.be/i.test(text)) {
        await sendText("⏳ <b>YouTube ভিডিও প্রসেস হচ্ছে...</b>");
        const d = await getJson(API_YT + encodeURIComponent(text));
        
        // আপনার JSON স্ট্রাকচার অনুযায়ী video_with_audio ফিল্টার করা
        const items = d?.data?.data?.items || d?.data?.items || [];
        const videoObj = items.find(v => v.type === "video_with_audio" && v.ext === "mp4") || 
                         items.find(v => v.type === "video_with_audio");
        
        if (!videoObj?.url) {
            return sendText("❌ ইউটিউব ভিডিওর সরাসরি ফাইল পাওয়া যায়নি (হয়তো ফাইল সাইজ ২০ মেগাবাইটের বেশি)।");
        }

        await tg("sendVideo", {
            chat_id: chatId,
            video: videoObj.url,
            caption: "🎬 <b>YouTube Video Downloader</b>\n\n🛡 <i>Credit: @Rfcyberteam</i>",
            parse_mode: "HTML"
        });
        return res.end();
    }

    // ===== TikTok Download =====
    if (/tiktok.com/i.test(text)) {
        await sendText("⏳ <b>TikTok ভিডিও প্রসেস হচ্ছে...</b>");
        const d = await getJson(API_TT + encodeURIComponent(text));
        const videoUrl = d?.download_url || d?.downloadUrl;
        const description = d?.description || "TikTok Video";

        if (!videoUrl) {
            return sendText("❌ টিকটক ভিডিওটি পাওয়া যায়নি।");
        }

        await tg("sendVideo", {
            chat_id: chatId,
            video: videoUrl,
            caption: `📱 <b>${description}</b>\n\n🛡 <i>Credit: @Rfcyberteam</i>`,
            parse_mode: "HTML"
        });
        return res.end();
    }

    // ===== Fallback (অন্য কিছু পাঠালে) =====
    if (text.startsWith("http")) {
        await sendText("📎 অনুগ্রহ করে সঠিক Facebook, YouTube বা TikTok লিংক পাঠান।");
    }
    
    res.end();
}
