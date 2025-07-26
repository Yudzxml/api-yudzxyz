const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
    "authority": "ttsave.app",
    "accept": "application/json, text/plain, */*",
    "origin": "https://ttsave.app",
    "referer": "https://ttsave.app/en",
    "user-agent": "Postify/1.0.0",
};

class TTSAVEKrep {
    async submit(url, referer) {
        const headerx = { ...headers, referer };
        const data = {
            query: url,
            language_id: "1"
        };
        const response = await axios.post('https://ttsave.app/download', data, { headers: headerx });
        return response.data;
    }

    parse($) {
        const uniqueId = $('#unique-id').val();
        const nickname = $('h2.font-extrabold').text();
        const profilePic = $('img.rounded-full').attr('src');
        const username = $('a.font-extrabold.text-blue-400').text();
        const description = $('p.text-gray-600').text();

        const dlink = {
            nowm: $('a.w-full.text-white.font-bold').first().attr('href'),
            wm: $('a.w-full.text-white.font-bold').eq(1).attr('href'),
            audio: $('a[type="audio"]').attr('href'),
            profilePic: $('a[type="profile"]').attr('href'),
            cover: $('a[type="cover"]').attr('href')
        };

        const stats = {
            plays: '',
            likes: '',
            comments: '',
            shares: ''
        };

        $('.flex.flex-row.items-center.justify-center').each((_, element) => {
            const $el = $(element);
            const svgPath = $el.find('svg path').attr('d');
            const value = $el.find('span.text-gray-500').text().trim();

            if (svgPath?.startsWith('M10 18a8 8 0 100-16')) stats.plays = value;
            else if (svgPath?.startsWith('M3.172 5.172a4 4 0 015.656')) stats.likes = value;
            else if (svgPath?.startsWith('M18 10c0 3.866-3.582')) stats.comments = value;
            else if (svgPath?.startsWith('M17.593 3.322c1.1.128')) stats.shares = value;
        });

        const songTitle = $('.flex.flex-row.items-center.justify-center.gap-1.mt-5')
            .find('span.text-gray-500')
            .text()
            .trim();

        const slides = $('a[type="slide"]').map((i, el) => ({
            number: i + 1,
            url: $(el).attr('href')
        })).get();

        return {
            uniqueId,
            nickname,
            profilePic,
            username,
            description,
            dlink,
            stats,
            songTitle,
            slides
        };
    }

    async video(link) {
        const html = await this.submit(link, 'https://ttsave.app/en');
        const $ = cheerio.load(html);
        const result = this.parse($);
        return {
            type: 'video',
            ...result,
            videoInfo: {
                nowm: result.dlink.nowm,
                wm: result.dlink.wm
            }
        };
    }

    async mp3(link) {
        const html = await this.submit(link, 'https://ttsave.app/en/mp3');
        const $ = cheerio.load(html);
        const result = this.parse($);
        return {
            type: 'audio',
            uniqueId: result.uniqueId,
            nickname: result.nickname,
            username: result.username,
            songTitle: result.songTitle,
            description: result.description,
            stats: result.stats,
            audioUrl: result.dlink.audio,
            coverUrl: result.dlink.cover,
            profilePic: result.profilePic
        };
    }

    async slide(link) {
        const html = await this.submit(link, 'https://ttsave.app/en');
        const $ = cheerio.load(html);
        const result = this.parse($);

        if (result.slides.length === 0) {
            throw new Error('Link ini bukan slide image TikTok.');
        }

        return {
            type: 'slide',
            ...result,
            coverUrl: result.dlink.cover
        };
    }
}

async function pindl(url) {
    const tt = new TTSAVEKrep();
    try {
        const data = await tt.video(url);

        if (data.slides?.length) {
            return { status: 200, result: await tt.slide(url) };
        } else if (data.dlink.audio) {
            return { status: 200, result: await tt.mp3(url) };
        } else {
            return { status: 200, result: data };
        }
    } catch (err) {
        return {
            status: 500,
            error: true,
            message: err.message || 'Terjadi kesalahan.'
        };
    }
}

module.exports = async (req, res) => {
    console.info('New request:', req.method, req.query);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(204).end();

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
    return res.status(result.status).json({
        author: "Yudzxml",
        ...result
    });
};