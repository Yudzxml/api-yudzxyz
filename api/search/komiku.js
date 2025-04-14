const axios = require("axios");
const cheerio = require("cheerio");
const PDFDocument = require("pdfkit");

function h2k(integer) {
    let numb = parseInt(integer);
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
    }).format(numb);
}

async function toPDF(images, opt = {}) {
    return new Promise(async (resolve, reject) => {
        if (!Array.isArray(images)) images = [images];
        const buffs = [];
        const doc = new PDFDocument({ margin: 0 });

        for (const imageUrl of images) {
            if (/.webp|.gif/.test(imageUrl)) continue;
            try {
                const { data } = await axios.get(imageUrl, { responseType: 'arraybuffer', ...opt });
                const image = doc.openImage(data);
                doc.addPage({ size: [image.width, image.height] });
                doc.image(data, 0, 0, { width: image.width, height: image.height });
            } catch (error) {
                console.error(`Error loading image: ${imageUrl}`, error);
                continue;
            }
        }
        doc.on('data', (chunk) => buffs.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffs)));
        doc.on('error', (err) => reject(err));
        doc.end();
    });
}

class Komiku {
    async latest() {
        try {
            const response = await axios.get("https://komiku.id");
            const $ = cheerio.load(response.data);
            const array = [];
            $("#Terbaru .ls4w .ls4").each((_, element) => {
                const url = "https://komiku.id/" + $(element).find("a").attr("href");
                const title = $(element).find(".ls4j h3 a").text().trim();
                const release = $(element).find(".ls4j .ls4s").text().trim().split(" ").slice(2).join(' ').trim();
                const chapter = $(element).find(".ls4j .ls24").text().trim().split("Chapter")[1].trim();
                const thumbnail = $(element).find(".lazy").attr("data-src").split("?")[0].trim();
                array.push({ title, release, chapter, thumbnail, url });
            });
            return { status: 200, author: "Yudzxml", data: array };
        } catch (error) {
            throw { status: 500, author: "Yudzxml", error: error.message };
        }
    }

    async detail(url) {
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            const result = { metadata: {}, chapter: [] };

            $("#Informasi").each((_, element) => {
                $(element).find(".inftable tr").each((_, row) => {
                    const name = $(row).find("td").eq(0).text().split(" ").join("_").toLowerCase().trim();
                    const value = $(row).find("td").eq(1).text().trim();
                    result.metadata[name] = value;
                });
                result.metadata.thumbnail = $(element).find("img").attr("src").split("?")[0].trim();
            });
            result.metadata.sinopsis = $("#Judul .desc").text().trim();
            $("#Daftar_Chapter tbody tr").each((_, element) => {
                const chapter = $(element).find(".judulseries a span").text();
                const reader = h2k(Number($(element).find(".pembaca i").text().trim()));
                const released = $(element).find(".tanggalseries").text().trim();
                const chapterUrl = "https://komiku.id/" + $(element).find(".judulseries a").attr("href");
                if (!chapter) return;
                result.chapter.push({ chapter, reader, released, url: chapterUrl });
            });
            return { status: 200, author: "Yudzxml", data: result };
        } catch (error) {
            throw { status: 500, author: "Yudzxml", error: error.message };
        }
    }

    async chapter(url) {
        try {
            const response = await axios.get(url);
            const $ = cheerio.load(response.data);
            
            // Ekstrak sumber gambar
            const images = $("#Baca_Komik img").map((_, img) => $(img).attr("src")).get();
            
            const result = {
                metadata: {},
                buffer: {}
            };
            
            // Ekstrak metadata
            $(".tbl tbody tr").each((_, row) => {
                const name = $(row).find("td").eq(0).text().split(" ").join("_").toLowerCase().trim();
                const value = $(row).find("td").eq(1).text().trim();
                result.metadata[name] = value;
            });
            
            // Konversi gambar ke PDF
            result.buffer = await toPDF(images);
            
            return {
                status: 200,
                author: "Yudzxml",
                data: result
            };
        } catch (error) {
            return {
                status: 500,
                author: "Yudzxml",
                error: error.message
            };
        }
    }

    async search(q) {
        try {
            const response = await axios.get(`https://api.komiku.id/?post_type=manga&s=${q}`);
            const $ = cheerio.load(response.data);
            const array = [];
            $(".bge").each((_, element) => {
                const title = $(element).find(".kan a h3").text().trim();
                const url = "https://komiku.id" + $(element).find(".kan a").attr("href");
                const thumbnail = $(element).find(".bgei img").attr("src").split("?")[0].trim();
                const synopsis = $(element).find(".kan p").text().trim().split(".")[1].trim();
                array.push({ title, thumbnail, synopsis, url });
            });
            return { status: 200, author: "Yudzxml", data: array };
        } catch (error) {
            throw { status: 500, author: "Yudzxml", error: error.message };
        }
    }
}

// API Handler
module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET'); // Allow GET method
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow specific headers

    const { method } = req;
    const komiku = new Komiku();

    if (method === 'GET') {
        const { action, url, query } = req.query;
        try {
            let result;
            if (action === 'latest') {
                result = await komiku.latest();
            } else if (action === 'detail') {
                if (!url) {
                    return res.status(400).json({ status: 400, author: "Yudzxml", error: 'URL tidak valid. Pastikan URL yang diberikan benar.' });
                }
                result = await komiku.detail(url);
            } else if (action === 'chapter') {
                if (!url) {
                    return res.status(400).json({ status: 400, author: "Yudzxml", error: 'URL tidak valid. Pastikan URL yang diberikan benar.' });
                }
                result = await komiku.chapter(url);
            } else if (action === 'search') {
                if (!query) {
                    return res.status(400).json({ status: 400, author: "Yudzxml", error: 'Query tidak valid. Pastikan query yang diberikan benar.' });
                }
                result = await komiku.search(query);
            } else {
                return res.status(400).json({ status: 400, author: "Yudzxml", error: 'Aksi tidak valid.' });
            }
            return res.status(result.status).json(result);
        } catch (error) {
            return res.status(500).json({ status: 500, author: "Yudzxml", error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
};