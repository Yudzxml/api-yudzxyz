const axios = require('axios');
const cheerio = require('cheerio');
const { igdl, ttdl, fbdown, twitter, youtube, mediafire, capcut, gdrive, pinterest } = require('btch-downloader');

const platforms = [
  { name: 'instagram', test: url => /(?:https?:\/\/)?(?:www\.)?instagram\.com/.test(url), fn: igdl },
  { name: 'tiktok',    test: url => /(?:https?:\/\/)?(?:www\.)?tiktok\.com/.test(url),    fn: ttdl },
  { name: 'facebook',  test: url => /(?:https?:\/\/)?(?:www\.)?facebook\.com/.test(url),  fn: fbdown },
  { name: 'twitter',   test: url => /(?:https?:\/\/)?(?:www\.)?twitter\.com/.test(url),   fn: twitter },
  { name: 'youtube',   test: url => /(?:https?:\/\/)?(?:www\.)?youtu(?:be)?\./.test(url), fn: youtube },
  { name: 'mediafire', test: url => /(?:https?:\/\/)?(?:www\.)?mediafire\.com/.test(url), fn: mediafire },
  { name: 'capcut',    test: url => /(?:https?:\/\/)?(?:www\.)?capcut\.com/.test(url),    fn: capcut },
  { name: 'gdrive',    test: url => /(?:https?:\/\/)?(?:www\.)?drive\.google\.com/.test(url), fn: gdrive },
  { name: 'pinterest', test: url => /(?:https?:\/\/)?(?:www\.)?(?:pin\.it|pinterest\.com)/.test(url), fn: pinterest }
];

async function downloadFromPlatform(url) {
  const platform = platforms.find(p => p.test(url));
  if (!platform) {
    throw new Error(`Unsupported platform for URL: ${url}`);
  }
  return { platform: platform.name, data: await platform.fn(url) };
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
    return res.status(405).json({ status: 405, error: `Method ${req.method} Not Allowed` });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ status: 400, error: 'Parameter "url" wajib diisi.' });
  }

  try {
    const result = await downloadFromPlatform(url);
    console.info('Download successful:', result.platform);

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

    return res.status(500).json({ status: 500, error: message });
  }
};
