const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");

async function pindl(link) {
    const result = {
        status: 200,
        data: {
            author: "Yudzxml",
            platform: "Pinterest",
            source: link,
            type: "video",
            video_url: ""
        }
    };

    try {
        const form = new FormData();
        form.append("url", link);

        const response = await axios({
            method: "POST",
            url: "https://pinterestvideodownloader.com/download.php",
            headers: {
                ...form.getHeaders(),
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                Origin: "https://pinterestvideodownloader.com",
                Referer: "https://pinterestvideodownloader.com/id/",
            },
            data: form,
        });

        const $ = cheerio.load(response.data);
        const videoElement = $("video").first();
        const videoUrl = videoElement.attr("src");

        if (!videoUrl) {
            result.status = 404;
            result.data.video_url = null;
            result.data.error = "Video tidak ditemukan di halaman.";
        } else {
            result.data.video_url = videoUrl;
        }

    } catch (err) {
        console.error("Terjadi kesalahan saat mengunduh:", err.message);
        result.status = 500;
        result.data.error = "Gagal mengambil data dari server Pinterest.";
    }

    return result;
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