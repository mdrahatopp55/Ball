export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  const email = req.query.email;

  if (!email) {
    return res.status(400).json({
      error: true,
      message: "Email parameter is required",
      usage: "?email=test@gmail.com"
    });
  }

  try {
    const response = await fetch(
      "https://aimusic-api.topmediai.com/musicful/v1/user/send_email_code",
      {
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 11)",
          "Accept": "application/json, text/plain, */*",
          "Content-Type": "application/json",
          "Origin": "https://www.musicful.ai",
          "Referer": "https://www.musicful.ai/",
          "Cookie":
            "acw_tc=ac11000117656513439214678e794ba028cc8356091ef20206b605f968d18b"
        },
        body: JSON.stringify({ email })
      }
    );

    const text = await response.text();
    res.status(200).send(text);

  } catch (err) {
    res.status(500).json({
      error: true,
      message: err.message
    });
  }
}
