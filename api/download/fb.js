const cheerio = require("cheerio");
const axios = require("axios");

// Fungsi untuk ambil data dari getmyfb.com
async function Facebook(url) {
    try {
        const { data } = await axios.post(
            "https://getmyfb.com/process",
            `id=${encodeURIComponent(url)}&locale=id`,
            {
                headers: {
                    "HX-Request": "true",
                    "HX-Trigger": "form",
                    "HX-Target": "target",
                    "HX-Current-URL": "https://getmyfb.com/id",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
                    Referer: "https://getmyfb.com/id",
                },
            }
        );

        const $ = cheerio.load(data);

        const caption = $(".results-item-text").first().text().trim();
        const imageUrl = $(".results-item-image").attr("src");
        const media = [];

        $(".results-list li").each((i, el) => {
            const link = $(el).find("a").attr("href");
            if (link) {
                media.push(link);
            }
        });

        return {
            metadata: {
                title: caption,
                image: imageUrl,
            },
            media,
        };
    } catch (err) {
        throw new Error("Gagal mengambil data dari getmyfb.com");
    }
}

// API handler
module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    const { method } = req;

    if (method !== "GET") {
        res.setHeader("Allow", ["GET"]);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }

    const { url } = req.query;

    if (!url || !url.startsWith("http")) {
        return res.status(400).json({ error: "Parameter ?url= diperlukan dan harus berupa link valid." });
    }

    try {
        const result = await Facebook(url);
        if (!result.media.length) {
            return res.status(404).json({
          status: 404,
          author: "Yudzxml",
          error: "Gagal menemukan media video." });
        }
        return res.status(200).json({
          status: 200,
          author: "Yudzxml",
          data: result
        });
    } catch (err) {
        return res.status(500).json({ status: 500,
          author: "Yudzxml",
          error: err.message });
    }
};