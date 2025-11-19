// api/telegram.js
export default async function handler(req, res) {
  const BOT_TOKEN = "8320008478:AAG9RgctNx7l8TKL9Wi-j56oI2enXAau5-w";   // <-- এখানে তোমার টোকেন বসাবে (লোকাল কোডে)

// যদি তুমি নিরাপদভাবে ব্যবহার করতে চাও → Vercel Environment ব্যবহার করবে:
// const BOT_TOKEN = process.env.BOT_TOKEN;

  const TG_SECRET = "rahat";  // তোমার secret

  const provided = req.query.secret;
  if (provided !== TG_SECRET) {
    return res.status(403).json({ error: "Forbidden - invalid secret" });
  }

  if (req.method !== "POST") {
    return res.status(200).send("Webhook working!");
  }

  const update = req.body;

  const sendMsg = async (chat, text) => {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text }),
    });
  };

  try {
    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";

      if (text === "/start") {
        await sendMsg(chatId, "Bot is running on Vercel!");
      } else {
        await sendMsg(chatId, `You said: ${text}`);
      }
    }
  } catch (e) {
    console.error(e);
  }

  return res.status(200).json({ ok: true });
}
