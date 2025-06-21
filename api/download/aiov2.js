const axios = require('axios');
const cheerio = require('cheerio');
const mime = require('mime-types');
const {
  igdl,
  ttdl,
  fbdown,
  twitter,
  youtube,
  mediafire,
  capcut,
  gdrive,
  pinterest,
} = require('btch-downloader');

const platforms = [
  { name: 'instagram', test: url => /(?:https?:\/\/)?(?:www\.)?instagram\.com/.test(url), fn: igdl },
  { name: 'tiktok',    test: url => /(?:https?:\/\/)?(?:www\.)?tiktok\.com/.test(url),    fn: ttdl },
  { name: 'facebook',  test: url => /(?:https?:\/\/)?(?:www\.)?facebook\.com/.test(url),  fn: fbdown },
  { name: 'twitter',   test: url => /(?:https?:\/\/)?(?:www\.)?twitter\.com/.test(url),   fn: twitter },
  { name: 'youtube',   test: url => /(?:https?:\/\/)?(?:www\.)?youtu(?:be)?\./.test(url), fn: youtube },
  { name: 'mediafire', test: url => /(?:https?:\/\/)?(?:www\.)?mediafire\.com/.test(url), fn: mediafire },
  { name: 'capcut',    test: url => /(?:https?:\/\/)?(?:www\.)?capcut\.com/.test(url),    fn: capcut },
  { name: 'gdrive',    test: url => /(?:https?:\/\/)?(?:www\.)?drive\.google\.com/.test(url), fn: gdrive },
  { name: 'pinterest', test: url => /(?:https?:\/\/)?(?:www\.)?(?:pin\.it|pinterest\.com)/.test(url), fn: pinterest },
];

async function downloadFromPlatform(url) {
  const platform = platforms.find(p => p.test(url));
  if (!platform) {
    throw new Error(`Unsupported platform for URL: ${url}`);
  }
  return {
    platform: platform.name,
    data: await platform.fn(url)
  };
}

// Contoh fungsi untuk menguji HEAD request dan ekstraksi type dari Content-Disposition
async function detectTypeFromDisposition(url) {
  try {
    const response = await axios.head(url);
    const cd = response.headers['content-disposition'] || '';
    console.log('Content-Disposition:', cd);

    let filename = '';
    const match = cd.match(/filename\*?=(?:UTF-8''|)["']?([^"';\n]+)["']?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }

    console.log('Filename:', filename);
    const mimeType = mime.lookup(filename) || 'other';
    console.log('Detected type:', mimeType);
    return mimeType;
  } catch (err) {
    console.error('HEAD request failed:', err.message);
    return 'other';
  }
}

module.exports = async (req, res) => {
  console.info('New request:', req.method, req.query);

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({
      status: 405,
      error: `Method ${req.method} Not Allowed`,
    });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({
      status: 400,
      error: 'Parameter "url" wajib diisi.',
    });
  }

  try {
    const result = await downloadFromPlatform(url);
    console.info('Download successful:', result.platform);

    if (Array.isArray(result.data)) {
      const enriched = await Promise.all(result.data.map(async item => {
        let type = 'other';
        try {
          // Gunakan fungsi detectTypeFromDisposition untuk ambil type
          const mimeType = await detectTypeFromDisposition(item.url);
          if (mimeType.startsWith('image/')) type = 'image';
          else if (mimeType.startsWith('video/')) type = 'video';
        } catch (err) {
          console.warn(`Failed to detect type for ${item.url}:`, err.message);
        }
        return { ...item, type };
      }));
      result.data = enriched;
    }

    return res.status(200).json({
      status: 200,
      author: 'Yudzxml',
      result
    });

  } catch (err) {
    console.error('Download error:', err);
    const message = /404/.test(err.message)
      ? 'Konten tidak ditemukan (404). Mungkin URL-nya sudah tidak tersedia.'
      : `Terjadi kesalahan: ${err.message}`;

    return res.status(500).json({
      status: 500,
      error: message,
    });
  }
};