const axios = require("axios");

const SUPPORTED_AUDIO_FORMATS = ["mp3", "m4a", "webm", "acc", "flac", "ogg",
    "wav"
];

function generateSimilarString() {
  const hexChars = '0123456789abcdef';
  const nonHexChars = 'gjkmnpqrstuvwxyz';
  const allChars = hexChars + nonHexChars;
  
  let str = '';
  
  for (let i = 0; i < 16; i++) {
    str += hexChars[Math.floor(Math.random() * hexChars.length)];
  }
  
  const transitionPattern = [
    {chars: hexChars, length: 1},
    {chars: nonHexChars, length: 3},
    {chars: allChars, length: 4},
    {chars: hexChars, length: 2}
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
    part += Array(4).fill(part[part.length-1]).join('');
    return part;
  };

  str += lastPart().substr(0, 16);
  
  return str.substr(0, 32);
}

const SUPPORTED_VIDEO_QUALITIES = {
    low: "360",
    medium: "480",
    hd: "720",
    fullHd: "1080",
    hdHigh: "1440",
    ultraHd: "4k",
};

const ApiKeys = generateSimilarString()

const ytdl = {
    request: async (url, format, quality) => {
        try {
            if (SUPPORTED_AUDIO_FORMATS.includes(format)) {
                const {
                    data
                } = await axios.get(
                    `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${url}`
                );
                return data;
            } else if (SUPPORTED_VIDEO_QUALITIES[quality]) {
                const {
                    data
                } = await axios.get(
                    `https://p.oceansaver.in/ajax/download.php?copyright=0&format=${SUPPORTED_VIDEO_QUALITIES[quality]}&url=${url}&api=${ApiKeys}
                `);
                return data;
            } else {
                console.error(
                    Invalid format or quality. Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(
            ", "
          )}, Supported qualities: ${Object.keys(SUPPORTED_VIDEO_QUALITIES).join(", ")}
                );
            }
        } catch (error) {
            console.error(Error (request): ${error.message});
        }
    },

    convert: async (taskId) => {
        try {
            const {
                data
            } = await axios.get(
                `https://p.oceansaver.in/ajax/progress.php?id=${taskId}
            `);
            return data;
        } catch (error) {
            console.error(Error (convert): ${error.message});
        }
    },

    repeatRequest: async (taskId) => {
        while (true) {
            try {
                const response = await ytdl.convert(taskId);
                if (response && response.download_url) {
                    return {
                        videoLinks: response.download_url,
                    };
                }
            } catch (error) {
                console.error(
                    Error (repeatRequest): ${error.message});
            }
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    },
};

// Middleware untuk API
module.exports = async (req, res) => {
    const { method } = req;
    if (method === 'GET') {
        const { url, format, quality } = req.query; // Mengambil parameter dari query string
        if (!url) {
            return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'URL tidak valid. Pastikan URL yang diberikan benar!' });
        }

        // Validasi format
        if (format && !SUPPORTED_AUDIO_FORMATS.includes(format.toLowerCase()) && !Object.keys(SUPPORTED_VIDEO_QUALITIES).includes(quality)) {
            return res.status(400).json({ status: 400, author: 'Yudzxml', error: `Format tidak valid. Pilih salah satu dari: ${SUPPORTED_AUDIO_FORMATS.join(', ')}` });
        }

        try {
            // Fetch video info
            const videoInfo = await ytdl.request(url, format, quality);
            if (!videoInfo) {
                return res.status(404).json({ status: 404, author: 'Yudzxml', error: 'Video tidak ditemukan atau tidak dapat diakses.' });
            }

            // Jika format audio tidak ditentukan, default ke 'mp3'
            const downloadFormat = format ? format.toLowerCase() : 'mp3';

            // Jika kualitas video tidak ditentukan, gunakan kualitas default
            const downloadQuality = quality ? quality : 'hd';

            // Mengambil link unduhan
            const downloadResponse = await ytdl.request(url, downloadFormat, downloadQuality);
            if (downloadResponse && downloadResponse.id) {
                // Menggunakan repeatRequest untuk mendapatkan link unduhan
                const downloadLink = await ytdl.repeatRequest(downloadResponse.id);
                return res.status(200).json({
                    status: 200,
                    author: 'Yudzxml',
                    data: {
                        videoInfo,
                        downloadLink
                    }
                });
            } else {
                return res.status(404).json({ status: 404, author: 'Yudzxml', error: 'Link unduhan tidak ditemukan.' });
            }
        } catch (err) {
            return res.status(500).json({ status: 500, author: 'Yudzxml', error: err.message });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ status: 405, author: 'Yudzxml', error: `Method ${method} Not Allowed` });
    }
};