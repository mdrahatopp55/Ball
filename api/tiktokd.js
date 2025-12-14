export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ----------------------------
  // Get TikTok URL
  // ----------------------------
  const id = req.query.id;

  if (!id) {
    return res.status(400).json({
      error: true,
      message: "Please provide TikTok URL via ?id=",
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }

  try {
    new URL(id);
  } catch {
    return res.status(400).json({
      error: true,
      message: "Invalid TikTok URL",
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }

  // ----------------------------
  // ssstik POST
  // ----------------------------
  const endpoint = "https://ssstik.io/abc?url=dl";

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 11; TECNO KG5k) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.7390.122 Mobile Safari/537.36",
    "Accept-Encoding": "gzip, deflate, br",
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "hx-trigger": "_gcaptcha_pt",
    "hx-request": "true",
    "Origin": "https://ssstik.io",
    "Referer": "https://ssstik.io/",
    "x-requested-with": "mark.via.gp",
    "Accept-Language": "en-US,en;q=0.9"
  };

  const body = new URLSearchParams({
    id,
    locale: "en",
    tt: "cmE0M1E_",
    debug: "ab=1&loc=BD&ip=103.174.151.197"
  }).toString();

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body
    });

    if (!response.ok) {
      return res.status(502).json({
        error: true,
        message: "Upstream HTTP error: " + response.status,
        credit: {
          made_by: ["@bdkingboss", "@topnormalperson"],
          channel: "https://t.me/Rfcyberteam"
        }
      });
    }

    const html = await response.text();

    // ----------------------------
    // DESCRIPTION (regex based)
    // ----------------------------
    let description = null;

    const metaMatch =
      html.match(/property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/name=["']description["'][^>]*content=["']([^"']+)["']/i);

    if (metaMatch) {
      description = metaMatch[1].trim();
    }

    if (!description) {
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      description = text.substring(0, 400) || null;
    }

    // ----------------------------
    // DOWNLOAD LINK (regex based)
    // ----------------------------
    let downloadUrl = null;

    const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
      .map(m => m[1])
      .map(href => {
        if (href.startsWith("//")) return "https:" + href;
        if (href.startsWith("http")) return href;
        if (href.startsWith("/")) return "https://ssstik.io" + href;
        return null;
      })
      .filter(Boolean);

    // priority: no watermark
    for (const link of links) {
      if (/tikcdn|tiktokcdn|ssstik|cdn/i.test(link)) {
        downloadUrl = link;
        break;
      }
    }

    if (!downloadUrl && links.length > 0) {
      downloadUrl = links[0];
    }

    // ----------------------------
    // RESPONSE
    // ----------------------------
    return res.status(200).json({
      description: description || null,
      download_url: downloadUrl || null,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: true,
      message: err.message,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });
  }
}
