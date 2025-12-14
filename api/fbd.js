export default async function handler(req, res) {
  // ===============================
  // Headers
  // ===============================
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ===============================
  // CONFIG
  // ===============================
  const processUrl = "https://getmyfb.com/process";
  const cookie = "__cflb=04dToeZfC9vebXjRcJCMjjSQh5PprejqtPXNb6mGi7";

  // ===============================
  // Get ID (GET or POST)
  // ===============================
  const id = req.query.id || req.body?.id;

  if (!id) {
    return res.status(400).json({
      success: false,
      error_message: 'Parameter "id" is required',
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }

  // ===============================
  // POST DATA
  // ===============================
  const postData = new URLSearchParams({
    id: id,
    locale: "en"
  }).toString();

  // ===============================
  // Request headers
  // ===============================
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 11; TECNO KG5k Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.98 Mobile Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "Origin": "https://getmyfb.com",
    "Referer": "https://getmyfb.com/",
    "X-Requested-With": "XMLHttpRequest",
    "Cookie": cookie
  };

  try {
    // ===============================
    // Fetch request
    // ===============================
    const response = await fetch(processUrl, {
      method: "POST",
      headers,
      body: postData
    });

    const html = await response.text();

    // ===============================
    // Extract href links
    // ===============================
    const links = [];
    const regex = /href="([^"]+)"/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      links.push(match[1]);
    }

    // ===============================
    // No links found
    // ===============================
    if (links.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No download links found",
        raw: html,
        credit: {
          made_by: ["@bdkingboss", "@topnormalperson"],
          channel: "https://t.me/Rfcyberteam"
        }
      });
    }

    // ===============================
    // Success response
    // ===============================
    return res.status(200).json({
      success: true,
      download_links: links,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });

  } catch (error) {
    // ===============================
    // Fetch error
    // ===============================
    return res.status(500).json({
      success: false,
      error_message: error.message,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }
}
