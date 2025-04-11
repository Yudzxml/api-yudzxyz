const axios = require("axios");

const EMBED = "https://www.youtube.com/oembed?type=json&url=URLNYA";
const DOWNLOAD = "https://p.oceansaver.in/ajax/download.php";
const FORMAT = [
  "mp3",
  "m4a",
  "360",
  "480",
  "720",
  "1080",
  "4k",
  "8k",
  "webm_audio",
  "aac",
  "flac",
  "opus",
  "wav"
];

class YTDL {
  constructor() {
    this.link = "";
  }

  async Info(link) {
    this.link = link;
    const res = await axios({
      url: EMBED.replace("URLNYA", link),
      method: "GET",
      responseType: "json"
    });

    return res.data;
  }

  async Dl(reso) {
    let response = {};

    if (!FORMAT.includes(reso)) {
      return console.log("[ ERROR ] Format tidak ada!");
    }
    const res = await axios({
      url: DOWNLOAD,
      method: "GET",
      responseType: "json",
      params: {
        button: "1",
        start: "1",
        end: "1",
        format: reso,
        iframe_source: "https://www.y2down.app",
        url: this.link
      }
    });
    
    while (true) {
      const wit = await axios({
        url: res.data.progress_url,
        method: "GET",
        responseType: "json",
      });
      console.log("[ DOWNLOAD ] " + wit.data.text);

      if (wit.data.progress > 999 && wit.data.success == 1) {
        response = wit.data;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 5_000)); // Jeda 5 detik
    }

    return response;
  }
}

// Middleware untuk API
module.exports = async (req, res) => {
  const { method } = req;
  if (method === 'GET') {
    const { url, format } = req.query; // Mengambil parameter dari query string
    if (!url) {
      return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'URL tidak valid. Pastikan URL Yang diberikan Benar!!' });
    }

    // Validasi format
    const validFormats = FORMAT; // Use the FORMAT array defined in YTDL
    if (format && !validFormats.includes(format.toLowerCase())) {
      return res.status(400).json({ status: 400, author: 'Yudzxml', error: `Format tidak valid. Pilih salah satu dari: ${validFormats.join(', ')}` });
    }

    const ytdl = new YTDL();

    try {
      // Fetch video info
      const videoInfo = await ytdl.Info(url);
      // Download video in specified format or default to mp3
      const downloadResponse = await ytdl.Dl(format ? format.toLowerCase() : 'mp3');
      
      // Combine video info and download response
      return res.status(200).json({
        status: 200,
        author: 'Yudzxml',
        data: {
          videoInfo,
          downloadResponse
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