// /api/youtube.js
export default async function handler(req, res) {
  try {
    // 🔹 GET বা POST থেকে url নেওয়া
    const videoUrl =
      req.method === "POST"
        ? req.body?.url
        : req.query?.url;

    if (!videoUrl) {
      return res.status(400).json({
        success: false,
        message: "❌ url parameter missing"
      });
    }

    const API_URL = "https://www.clipto.com/api/youtube";

    const payload = {
      url: videoUrl,     // ✅ parameter থেকে
      format: "mp4",
      quality: "720p",
      merge: true
    };

    const cliptoRes = await fetch(API_URL, {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": "https://www.clipto.com",
        "Referer":
          "https://www.clipto.com/media-downloader/youtube-downloader"
      },
      body: JSON.stringify(payload)
    });

    const data = await cliptoRes.json();

    return res.status(200).json({
      success: true,
      input_url: videoUrl,
      response: data
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
