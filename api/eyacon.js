export default async function handler(req, res) {
  // ===============================
  // Headers
  // ===============================
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ===============================
  // Get phone number
  // ===============================
  const phoneNumber = req.query.number || "";

  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: true,
      message: "Phone number is required",
      usage: "?number=8801957795047",
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }

  // ===============================
  // Validate phone number
  // ===============================
  if (!/^\d+$/.test(phoneNumber)) {
    return res.status(400).json({
      success: false,
      error: true,
      message: "Invalid phone number format. Only digits are allowed.",
      provided: phoneNumber,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }

  // ===============================
  // Build URL
  // ===============================
  const baseUrl = "https://api.eyecon-app.com/app/getnames.jsp";

  const params = new URLSearchParams({
    cli: phoneNumber,
    lang: "en",
    is_callerid: "true",
    is_ic: "true",
    cv: "vc_672_vn_4.2025.10.17.1932_a",
    requestApi: "okHttp",
    source: "MenifaFragment"
  });

  const fullUrl = `${baseUrl}?${params.toString()}`;

  // ===============================
  // Request headers
  // ===============================
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
    "Accept": "application/json",
    "e-auth-v": "e1",
    "e-auth": "baaa3a67-8c28-4872-9e92-36bf348b6425",
    "e-auth-c": "35",
    "e-auth-k": "PgdtSBeR0MumR7fO",
    "Accept-Charset": "UTF-8",
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8"
  };

  try {
    // ===============================
    // Fetch request
    // ===============================
    const response = await fetch(fullUrl, {
      method: "GET",
      headers
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    // ===============================
    // Success
    // ===============================
    if (response.ok) {
      return res.status(200).json({
        success: true,
        phone_number: phoneNumber,
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
      error: true,
      message: "API request failed",
      http_code: response.status,
      phone_number: phoneNumber,
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
      error: true,
      message: "Request failed",
      details: err.message,
      phone_number: phoneNumber,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }
}
