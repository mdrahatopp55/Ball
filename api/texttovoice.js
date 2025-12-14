export default async function handler(req, res) {
  // Allow GET only
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method allowed"
    });
  }

  const text = req.query.text || "";

  if (!text) {
    return res.status(400).json({
      success: false,
      message: "Text parameter is required",
      usage: "?text=Hello world"
    });
  }

  // 🔍 Auto detect Bangla / English
  const voice = /[\u0980-\u09FF]/.test(text) ? "bn-BD" : "en-US";

  const payload = {
    engine: "Google",
    data: {
      text: text,
      voice: voice
    }
  };

  try {
    const response = await fetch("https://api.soundoftext.com/sounds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const json = await response.json();

    if (!json.id) {
      return res.status(500).json({
        success: false,
        error: "No ID returned from SoundOfText API",
        raw: json
      });
    }

    const audioUrl = `https://files.soundoftext.com/${json.id}.mp3`;

    // ✅ Final JSON response
    res.status(200).json({
      success: true,
      voice: voice,
      id: json.id,
      audio: audioUrl
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
