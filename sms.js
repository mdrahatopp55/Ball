// api/send.js
export default async function handler(req, res) {
  // phone query param or JSON body (POST) থেকে নেবে
  const phone = req.query.phone ?? (req.method === "POST" && req.body && req.body.phone);

  if (!phone) {
    return res.status(400).json({ error: "phone parameter missing. Use ?phone=88018xxxx or send JSON { phone: '88018xxxx' }" });
  }

  // নিরাপদভাবে encode করে URL বানানো
  const encodedPhone = encodeURIComponent(phone);
  const url = `https://openportal.net/api/pin3/?msisdn=${encodedPhone}&ip=59.152.17.168&pi=socialbot&lang=bn&click_id=w567h5ptu3c05s8ejdci8k44&carrier=&country=BD&alternateP=0&prev_subs=`;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; TECNO KG5k Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.7444.102 Mobile Safari/537.36",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "sec-ch-ua-platform": "\"Android\"",
    "sec-ch-ua": "\"Chromium\";v=\"142\", \"Android WebView\";v=\"142\", \"Not_A Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?1",
    "x-requested-with": "mark.via.gp",
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://openportal.net/8461b2/socialbot/bd/?devicemodel=Spark%208C&carrier=&region=Barisal&brand=Tecno&browser=Chromium%20Mobile&u=track.prisetracker.com&isp=S.m.%20Zakir%20Hossain%20Ta%20Eurotelbd%20Online%20ltd.&ts=7dc5a96c-a6d3-4ccb-a8b1-29a7d59e908e&country=BD&click_id=w567h5ptu3c05s8ejdci8k44&partner=5830&creative=&lang=en",
    "accept-language": "en-US,en;q=0.9",
    // Cookie গুলো fetch এ header হিসেবে পাঠাতে হবে
    "Cookie": "_sm=ODgwMTg3MzM5NzM3Nw==",
  };

  try {
    // Node 18+ / Vercel runtime এ global fetch ব্যবহার করা যাবে
    const resp = await fetch(url, {
      method: "GET",
      headers,
    });

    // এখানে HTTP error handle করা optional
    const text = await resp.text();

    // যদি তুমি raw response 그대로 পাঠাতে চাও:
    res.status(resp.status).send(text);

    // অথবা JSON হিসেবে পাঠাতে চাও:
    // res.status(resp.status).json({ status: resp.status, body: text });
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
