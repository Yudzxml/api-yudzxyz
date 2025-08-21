const cheerio = require("cheerio");

async function pindl(pinUrl) {
  try {
    const initRes = await fetch("https://www.expertstool.com/download-pinterest-video/");
    const setCookie = initRes.headers.get("set-cookie");
    if (!setCookie) throw new Error("Cookie tidak ditemukan.");

    const response = await fetch("https://www.expertstool.com/download-pinterest-video/", {
      method: "POST",
      headers: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": setCookie,
        "Referer": "https://www.expertstool.com/download-pinterest-video/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Linux"',
      },
      body: new URLSearchParams({ url: pinUrl })
    });

    if (!response.ok) throw new Error("Gagal mendapatkan respon dari API.");

    const html = await response.text();
    const $ = cheerio.load(html);
    const downloadLink = $("a[download]").attr("href") || "";

    return { 
      status: 200,
      author: "Yudzxml", 
      data: { 
      url: downloadLink 
      }
    };
  } catch (error) {
    console.error("Gagal fetch.", error.message);
    return null;
  }
}

module.exports = async (req, res) => {
    console.info('New request:', req.method, req.query);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // Method validasi
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return res.status(405).json({
            author: "Yudzxml",
            status: 405,
            error: `Method ${req.method} Not Allowed`,
        });
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({
            author: "Yudzxml",
            status: 400,
            error: 'Parameter "url" wajib diisi.',
        });
    }

    const result = await pindl(url);
    return res.status(result.status).json(result);
};