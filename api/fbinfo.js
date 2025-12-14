export const config = {
  runtime: "nodejs"
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=UTF-8");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // ----------------------------
  // Helper functions
  // ----------------------------
  const jsonResponse = (data, code = 200) => {
    res.status(code).json(data);
  };

  const randomIP = () =>
    `${rand(1, 255)}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;

  function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  const randomUserAgent = () => {
    const uas = [
      "Mozilla/5.0 (Linux; Android 10; SM-A107F) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/121 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_2) AppleWebKit/605.1.15 Mobile/15E148",
      "Mozilla/5.0 (Linux; Android 12; Redmi Note 9) AppleWebKit/537.36 Chrome/132 Mobile Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 Version/16.4 Safari/605.1.15"
    ];
    return uas[Math.floor(Math.random() * uas.length)];
  };

  const randomReferer = () => {
    const refs = [
      "https://www.google.com/",
      "https://m.facebook.com/",
      "https://www.youtube.com/",
      "https://www.bing.com/",
      "https://www.instagram.com/"
    ];
    return refs[Math.floor(Math.random() * refs.length)];
  };

  // ----------------------------
  // Input
  // ----------------------------
  let username = (req.query.username || "").trim();

  if (!username) {
    return jsonResponse({
      status: false,
      code: 400,
      message: "Parameter 'username' is required!",
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    }, 400);
  }

  if (/^\d+$/.test(username)) {
    username = `https://www.facebook.com/profile.php?id=${username}`;
  }

  // ----------------------------
  // Build request
  // ----------------------------
  const apiUrl =
    "https://www.fbprofileviewer.com/api/profile?username=" +
    encodeURIComponent(username);

  const ip = randomIP();
  const ua = randomUserAgent();
  const ref = randomReferer();

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": ua,
        "X-Forwarded-For": ip,
        "Client-IP": ip,
        "Referer": ref,
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return jsonResponse({
        status: true,
        requested_username: username,
        random_ip: ip,
        random_user_agent: ua,
        random_referer: ref,
        raw_response: text,
        credit: {
          made_by: ["@bdkingboss", "@topnormalperson"],
          channel: "https://t.me/Rfcyberteam"
        }
      });
    }

    // ----------------------------
    // Handle rate limit
    // ----------------------------
    if (data?.success === false && data?.error) {
      if (/too many requests/i.test(data.error)) {
        return jsonResponse({
          status: false,
          code: 429,
          message: data.error,
          retry_after: data.retryAfter || "unknown",
          patreon_link: data.patreonLink || null,
          requested_username: username,
          credit: {
            made_by: ["@bdkingboss", "@topnormalperson"],
            channel: "https://t.me/Rfcyberteam"
          }
        }, 429);
      }

      return jsonResponse({
        status: false,
        code: 502,
        message: data.error,
        requested_username: username,
        credit: {
          made_by: ["@bdkingboss", "@topnormalperson"],
          channel: "https://t.me/Rfcyberteam"
        }
      }, 502);
    }

    // ----------------------------
    // Success
    // ----------------------------
    return jsonResponse({
      status: true,
      requested_username: username,
      random_ip: ip,
      random_user_agent: ua,
      random_referer: ref,
      data,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    });

  } catch (err) {
    return jsonResponse({
      status: false,
      code: 500,
      message: err.message,
      credit: {
        made_by: ["@bdkingboss", "@topnormalperson"],
        channel: "https://t.me/Rfcyberteam"
      }
    }, 500);
  }
}
