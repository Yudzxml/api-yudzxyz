const axios = require('axios');

const formatAudio = [320, 256, 192, 128];
const formatVideo = [1080, 720, 480, 360];
const formatInput = ["audio", "video"];
function extractYoutubeId(input) {
  try {
    if (input.includes("youtube.com") || input.includes("youtu.be")) {
      let url = new URL(input);
      if (url.searchParams.get("v")) {
        return url.searchParams.get("v");
      }
      return url.pathname.split("/").pop();
    }
    return input.trim();
  } catch {
    return input.trim();
  }
}
async function delay(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}
async function auth() {
  const authRes = await axios.post('https://api.cdnframe.com/api/v5/auth', null, {
    headers: {
      accept: '*/*',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'cache-control': 'no-cache',
      pragma: 'no-cache',
      origin: 'https://clickapi.net',
      cookie: ''
    }
  });

  const token = authRes.data?.token;
  //const cookiesAuth = authRes.headers['set-cookie']?.join('; ') || cookiesMain;

  if (!token) return { success: false, step: 'auth', message: authRes.data || 'No token returned' };

  return { success: true, token };
}
async function Info(id) {
  const { token } = await auth()
  const infoRes = await axios.get(`https://api.cdnframe.com/api/v5/info/${id}`, {
    headers: {
      accept: 'application/json',
      'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      authorization: `Bearer ${token}`,
      cookie: '',
      origin: 'https://clickapi.net'
    }
  });

  return { 
  success: true, 
  token, 
  data: infoRes.data 
  }
}
async function convertVideo(videoId, quality, format) {
  const infoJson = await Info(videoId);
  let formatToken;
  if (format === "audio") {
    const audioObj = infoJson.data.formats.audio.find(a => a.quality === quality);
    if (!audioObj) throw new Error("Audio quality tidak ditemukan");
    formatToken = audioObj.token;
  } else if (format === "video") {
    const videoObj = infoJson.data.formats.video.find(v => v.quality === quality);
    if (!videoObj) throw new Error("Video quality tidak ditemukan");
    formatToken = videoObj.token;
  } else {
    throw new Error("Format harus 'audio' atau 'video'");
  }
  const res = await fetch("https://api.cdnframe.com/api/v5/convert", {
    method: "POST",
    headers: {
      "accept": 'application/json',
      "accept-language": 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      "authorization": `Bearer ${infoJson.token}`,
      "cookie": '',
      "content-type": "application/json",
      "origin": 'https://clickapi.net'
    },
    body: JSON.stringify({ token: formatToken })
  });
  const job = await res.json();
  return {
    jobId: job.jobId,
    token: infoJson.token
  }
}
async function getLinkDownload(input, quality, format) {
  const id = extractYoutubeId(input);
  const { jobId, token } = await convertVideo(id, quality, format);

  try {
    let statusData;
    while (true) {
      const url = `https://api.cdnframe.com/api/v5/status/${jobId}`;
      const response = await axios.get(url, {
        headers: {
          "accept": "application/json",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "authorization": `Bearer ${token}`,
          "content-type": "application/json",
          "origin": "https://clickapi.net"
        }
      });
      statusData = response.data;
      console.log("Cek status:", statusData.status);
      if (statusData.status === "completed" || statusData.downloadUrl) {
        break;
      }
      await delay(3000);
    }
    return {
      title: statusData.title,
      duration: statusData.duration,
      quality: statusData.quality,
      format: statusData.fileFormat,
      downloadUrl: statusData.downloadUrl
    };
  } catch (error) {
    if (error.response) {
      console.error(`HTTP error! status: ${error.response.status}`, error.response.data);
    } else {
      console.error("Status nya bre ga jelas mokad kali", error.message);
    }
    return null;
  }
}


module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 

  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { url, quality, format } = req.query; 

  if (!url) {
    return res.status(400).json({ error: 'URL tidak valid. Pastikan URL yang diberikan benar.' });
  }

  if (!format || !formatInput.includes(format.toLowerCase())) {
    return res.status(400).json({ error: `Format tidak valid. Pilih salah satu dari: ${formatInput.join(', ')}` });
  }

  const qualityNum = Number(quality);
  if (format.toLowerCase() === 'audio' && !formatAudio.includes(qualityNum)) {
    return res.status(400).json({ error: `Kualitas audio tidak valid. Pilih salah satu dari: ${formatAudio.join(', ')}` });
  }

  if (format.toLowerCase() === 'video' && !formatVideo.includes(qualityNum)) {
    return res.status(400).json({ error: `Resolusi video tidak valid. Pilih salah satu dari: ${formatVideo.join(', ')}` });
  }

  try {
    const result = await getLinkDownload(url, qualityNum, format.toLowerCase());

    if (!result) {
      return res.status(500).json({ error: 'Gagal mendapatkan link download. Coba lagi nanti.' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error di handler API:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan server', details: error.message });
  }
};