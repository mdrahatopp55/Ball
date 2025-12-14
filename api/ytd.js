export default async function handler(req, res) {
  // ===============================
  // Headers
  // ===============================
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ===============================
  // Get URL parameter
  // ===============================
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: "Missing 'url' parameter",
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }

  // ===============================
  // Encode URL
  // ===============================
  const encodedUrl = encodeURIComponent(url);

  // API endpoint
  const apiUrl = `https://api.vidfly.ai/api/media/youtube/download?url=${encodedUrl}`;

  // ===============================
  // Request headers
  // ===============================
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 11; TECNO KG5k Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.122 Mobile Safari/537.36",
    "Accept-Encoding": "gzip, deflate, br",
    "x-app-version": "1.0.0",
    "x-app-name": "vidfly-web",
    "content-type": "application/json",
    "origin": "https://vidfly.ai",
    "referer": "https://vidfly.ai/",
    "accept-language": "en-US,en;q=0.9"
  };

  try {
    // ===============================
    // Fetch request
    // ===============================
    const response = await fetch(apiUrl, {
      method: "GET",
      headers
    });

    const text = await response.text();

    // ===============================
    // Try JSON parse
    // ===============================
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw_response: text };
    }

    // ===============================
    // Success
    // ===============================
    if (response.ok) {
      return res.status(200).json({
        success: true,
        data,
        credit: {
          made_by: ["@bdkingboss", "@topnormalperson"],
          channel: "https://t.me/Rfcyberteam"
        }
      });
    }

    // ===============================
    // API Error
    // ===============================
    return res.status(response.status).json({
      success: false,
      error: "API request failed",
      http_code: response.status,
      response: data,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });

  } catch (err) {
    // ===============================
    // Fetch Error
    // ===============================
    return res.status(500).json({
      success: false,
      error: err.message,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }
}
