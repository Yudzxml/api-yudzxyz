/**
BASE: KOMIKU.ORG 
AUTHOR: YUDZXML STORE 77
MESSAGE: DILARANG DI PERJUALBELIKAN 100% FREE
CREATE: 14 - 08 - 2025
**/

const axios = require("axios");
const cheerio = require("cheerio");

class Komiku {
    constructor() {
        this.baseUrl = "https://api.komiku.org";
    }
    async latest() {
        try {
            const response = await axios.get("https://komiku.org");
            const $ = cheerio.load(response.data);
            const array = [];
            $("#Terbaru .ls4w .ls4").each((_, element) => {
                const url = "https://komiku.org/" + $(element).find("a").attr("href");
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
     async search(q) {
        try {
            const response = await axios.get(`${this.baseUrl}/?post_type=manga&s=${q}`);
            const $ = cheerio.load(response.data);
            const array = [];
            $(".bge").each((_, element) => {
                const title = $(element).find(".kan a h3").text().trim();
                const url = "https://komiku.org" + $(element).find(".kan a").attr("href");
                const thumbnail = $(element).find(".bgei img").attr("src").split("?")[0].trim();
                array.push({ title, thumbnail, url });
            });
            return { status: 200, author: "Yudzxml", data: array };
        } catch (error) {
            throw { status: 500, author: "Yudzxml", error: error.message };
        }
    }
    
    async populer(page = 1) {
    const url = `${this.baseUrl}/other/hot/page/${page}/`;

    try {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        const results = [];

        $(".bge").each((_, el) => {
            const title = $(el).find(".kan h3").text().trim();
            const link = $(el).find(".kan a").attr("href");
            const image = $(el).find(".bgei img").attr("src");
            const genre = $(el).find(".tpe1_inf b").text().trim();
            const genreDetail = $(el).find(".tpe1_inf").text().replace(genre, "").trim();
            const description = $(el).find("p").text().trim();
            const awalChapter = $(el).find(".new1").first().find("a span").last().text().trim();
            const terbaruChapter = $(el).find(".new1").last().find("a span").last().text().trim();

            results.push({
                title,
                link: link?.startsWith("http") ? link : `https://komiku.org${link}`,
                image,
                genre,
                genreDetail,
                description,
                chapter: {
                    awal: awalChapter,
                    terbaru: terbaruChapter
                }
            });
        });

        return {
            status: true,
            author: 'Yudzxml',
            page,
            results
        };

    } catch (error) {
        return {
            status: false,
            author: 'Yudzxml',
            message: "Gagal Ambil data wak mungkin webnya lgi bobok",
            error: error.message,
            page,
            results: []
        };
    }
}

    async detail(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const title = $('#Judul h1 span[itemprop="name"]').text().trim();
        const title_id = $('#Judul p.j2').text().trim();
        const description = $('#Judul p[itemprop="description"]').text().trim();

        const sinopsis_lengkap = $('#Sinopsis p').text().trim();
        const ringkasan = [];
        $('#Sinopsis h3:contains("Ringkasan")')
            .nextUntil('h2, h3')
            .each((_, el) => {
                const text = $(el).text().trim();
                if (text) ringkasan.push(text);
            });

        const image = $('#Informasi img[itemprop="image"]').attr('src');
        const infoRaw = {};
        $('#Informasi table.inftable tr').each((_, el) => {
            const key = $(el).find('td').first().text().trim();
            const value = $(el).find('td').last().text().trim();
            infoRaw[key] = value;
        });

        const genres = [];
        $('#Informasi ul.genre li.genre span[itemprop="genre"]').each((_, el) => {
            genres.push($(el).text().trim());
        });

        const baseUrl = new URL(url).origin;
        const chapters = [];
        $('#Daftar_Chapter tbody tr').each((_, el) => {
            const linkEl = $(el).find('td.judulseries a');
            if (linkEl.length > 0) {
                const relativeLink = linkEl.attr('href');
                chapters.push({
                    title: linkEl.find('span').text().trim(),
                    link: relativeLink.startsWith('http') ? relativeLink : baseUrl + relativeLink,
                    views: $(el).find('td.pembaca i').text().trim(),
                    date: $(el).find('td.tanggalseries').text().trim()
                });
            }
        });

        return {
            status: true,
            author: 'Yudzxml',
            data: {
                title,
                title_id,
                description,
                sinopsis_lengkap,
                ringkasan,
                image,
                info: {
                    jenis: infoRaw['Jenis Komik'] || null,
                    konsep: infoRaw['Konsep Cerita'] || null,
                    pengarang: infoRaw['Pengarang'] || null,
                    status: infoRaw['Status'] || null,
                    umur_pembaca: infoRaw['Umur Pembaca'] || null,
                    cara_baca: infoRaw['Cara Baca'] || null,
                    genres
                },
                chapters
            }
        };

    } catch (err) {
        return {
            status: false,
            author: "Yudzxml",
            message: "kaga dapet detailnya bre coba ganti link atau coba lagi",
            error: err.message,
            data: null
        };
    }
}

    async chapter(url) {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);

        const chapterTitle = $("#Judul h1").text().trim();
        const mangaTitle = $("#Judul p a b").first().text().trim();
        const releaseDate = $('tbody[data-test="informasi"] tr').eq(1).find("td").eq(1).text().trim();
        const readingDirection = $('tbody[data-test="informasi"] tr').eq(2).find("td").eq(1).text().trim();

        const images = [];
        $("#Baca_Komik img[itemprop='image']").each((_, el) => {
            images.push($(el).attr("src"));
        });

        return {
            status: true,
            author: "Yudzxml",
            data: {
                chapter_title: chapterTitle,
                manga_title: mangaTitle,
                release_date: releaseDate,
                reading_direction: readingDirection,
                images
            }
        };

    } catch (error) {
        return {
            status: false,
            author: "Yudzxml",
            message: "Chapternya kaga ada bree, coba lagi nanti",
            error: error.message,
            data: null
        };
    }
}

    async searchByGenre(genre = 'action', page = 1) {
    const url = `${this.baseUrl}/genre/${genre}/page/${page}/`;
    const availableGenres = [
    "action", "adult", "adventure", "comedy", "cooking", "crime", "demons",
    "drama", "ecchi", "fantasy", "game", "gender-bender", "ghosts", "gore",
    "harem", "historical", "horror", "isekai", "josei", "magic", "manga",
    "martial-arts", "mature", "mecha", "medical", "military", "monsters",
    "music", "mystery", "one-shot", "police", "psychological",
    "reincarnation", "romance", "school", "school-life", "sci-fi", "seinen",
    "shoujo", "shoujo-ai", "shounen", "shounen-ai", "slice-of-life", "sport",
    "sports", "super-power", "supernatural", "thriller", "tragedy",
    "villainess", "yuri"
];

if (!availableGenres.includes(genre)) {
    return {
        status: false,
        author: "Yudzxml",
        message: "Genre yang lu masukin salah njir, pilih yang bener kocak",
        error: "Genre invalid",
        genre_provided: genre,
        available_genres: availableGenres,
        page,
        results: []
    };
}

    try {
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const mangaList = [];

        $('.bge').each((_, el) => {
            const title = $(el).find('.kan h3').text().trim();
            const link = $(el).find('.bgei a').attr('href');
            const image = $(el).find('.bgei img').attr('src');
            const type = $(el).find('.tpe1_inf b').text().trim();
            const genreText = $(el).find('.tpe1_inf').contents()
                .filter(function() { return this.type === 'text'; })
                .text().trim();
            const views = $(el).find('.judul2').text().trim();
            const description = $(el).find('.kan p').text().trim();
            const chapterAwal = $(el).find('.new1').first().find('span').last().text().trim();
            const chapterTerbaru = $(el).find('.new1').last().find('span').last().text().trim();

            mangaList.push({
                title,
                link,
                image,
                type,
                genre: genreText,
                views,
                description,
                chapter_awal: chapterAwal,
                chapter_terbaru: chapterTerbaru
            });
        });

        return {
            status: true,
            author: "Yudzxml",
            page,
            results: mangaList
        };

    } catch (error) {
        return {
            status: false,
            author: "Yudzxml",
            message: "gagal njir mungkin websitenye lgi bobok",
            error: error.message,
            page,
            results: []
        };
    }
}
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const { method } = req;
    const komiku = new Komiku();

    if (method === 'GET') {
        const { action, url, query, genre, page } = req.query;
        try {
            let result;
            switch(action) {
                case 'latest':
                    result = await komiku.latest();
                    break;
                case 'detail':
                    if (!url) return res.status(400).json({ status: 400, author: "Yudzxml", error: 'URL tidak valid.' });
                    result = await komiku.detail(url);
                    break;
                case 'chapter':
                    if (!url) return res.status(400).json({ status: 400, author: "Yudzxml", error: 'URL tidak valid.' });
                    result = await komiku.chapter(url);
                    break;
                case 'search':
                    if (!query) return res.status(400).json({ status: 400, author: "Yudzxml", error: 'Query tidak valid.' });
                    result = await komiku.search(query);
                    break;
                case 'populer':
                    result = await komiku.populer(page ? parseInt(page) : 1);
                    break;
                case 'genre':
                    result = await komiku.searchByGenre(genre || 'action', page ? parseInt(page) : 1);
                    break;
                default:
                    return res.status(400).json({ status: 400, author: "Yudzxml", error: 'Aksi tidak valid.' });
            }
            return res.status(result.status ? 200 : 500).json(result);
        } catch (error) {
            return res.status(500).json({ status: 500, author: "Yudzxml", error: error.message });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
};