const axios = require("axios");

const SUPPORTED_AUDIO_FORMATS = ["mp3", "m4a", "webm", "aac", "flac", "ogg", "wav"];

const SUPPORTED_VIDEO_QUALITIES = {
    low: "360",
    medium: "480",
    hd: "720",
    fullHd: "1080",
    hdHigh: "1440",
    ultraHd: "4k",
};

// Generate API key sekali saat server start
function generateSimilarString() {
    const hexChars = '0123456789abcdef';
    const nonHexChars = 'gjkmnpqrstuvwxyz';
    const allChars = hexChars + nonHexChars;

    let str = '';

    for (let i = 0; i < 16; i++) {
        str += hexChars[Math.floor(Math.random() * hexChars.length)];
    }

    const transitionPattern = [
        { chars: hexChars, length: 1 },
        { chars: nonHexChars, length: 3 },
        { chars: allChars, length: 4 },
        { chars: hexChars, length: 2 }
    ];

    transitionPattern.forEach(section => {
        for (let i = 0; i < section.length; i++) {
            str += section.chars[Math.floor(Math.random() * section.chars.length)];
        }
    });

    const lastPart = () => {
        let part = hexChars.substr(Math.floor(Math.random() * 6), 1);
        part += Math.floor(Math.random() * 10);
        part += Array(4).fill(Math.floor(Math.random() * 10)).join('');
        part += Array(4).fill(part[part.length - 1]).join('');
        return part;
    };

    str += lastPart().substr(0, 16);

    return str.substr(0, 32);
}

const ApiKeys = generateSimilarString();

const MAX_RETRY = 5;
const RETRY_DELAY_MS = 3000;

const ytdl = {
    request: async (url, format, quality) => {
        try {
            if (SUPPORTED_AUDIO_FORMATS.includes(format)) {
                const { data } = await axios.get(
                    `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${url}`
                );
                return data;
            } else if (SUPPORTED_VIDEO_QUALITIES[quality]) {
                const { data } = await axios.get(
                    `https://p.oceansaver.in/ajax/download.php?copyright=0&format=${SUPPORTED_VIDEO_QUALITIES[quality]}&url=${url}&api=${ApiKeys}`
                );
                return data;
            } else {
                console.error(`Invalid format or quality.`);
                return null;
            }
        } catch (error) {
            console.error(`Error (request): ${error.message}`);
            return null;
        }
    },

    convert: async (taskId) => {
        try {
            const { data } = await axios.get(
                `https://p.oceansaver.in/ajax/progress.php?id=${taskId}`
            );
            return data;
        } catch (error) {
            console.error(`Error (convert): ${error.message}`);
            return null;
        }
    },

    repeatRequest: async (taskId) => {
        while (true) {
            const response = await ytdl.convert(taskId);
            if (response && response.download_url) {
                return { videoLinks: response.download_url };
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    },

    requestWithRetry: async (url, format, quality) => {
        for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
            const response = await ytdl.request(url, format, quality);
            if (response && response.id) {
                return response;
            }
            console.log(`Request attempt ${attempt} failed, retrying in ${RETRY_DELAY_MS / 1000}s...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
        return null;
    }
};

module.exports = async (req, res) => {
    const { method } = req;
    if (method === 'GET') {
        const { url, format, quality } = req.query;

        if (!url) {
            return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'URL tidak valid.' });
        }

        if (format && !SUPPORTED_AUDIO_FORMATS.includes(format.toLowerCase()) &&
            !Object.keys(SUPPORTED_VIDEO_QUALITIES).includes(quality)) {
            return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'Format atau kualitas tidak valid.' });
        }

        try {
            // Request dengan retry sampai dapat task id
            const downloadResponse = await ytdl.requestWithRetry(url, format?.toLowerCase(), quality);

            if (!downloadResponse) {
                return res.status(404).json({ status: 404, author: 'Yudzxml', error: 'Link unduhan tidak ditemukan setelah beberapa kali percobaan.' });
            }

            // Tunggu sampai file siap di-download
            const downloadLink = await ytdl.repeatRequest(downloadResponse.id);

            return res.status(200).json({
                status: 200,
                author: 'Yudzxml',
                data: {
                    videoInfo: downloadResponse,
                    downloadLink
                }
            });

        } catch (err) {
            return res.status(500).json({ status: 500, author: 'Yudzxml', error: err.message });
        }

    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ status: 405, author: 'Yudzxml', error: `Method ${method} Not Allowed` });
    }
};