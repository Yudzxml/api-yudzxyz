const {
  igdl,
  ttdl,
  fbdown,
  twitter,
  youtube,
  mediafire,
  capcut,
  gdrive,
  pinterest
} = require('btch-downloader');

const platforms = [
  { name: 'instagram',  test: url => /instagram\.com/.test(url),       fn: igdl },
  { name: 'tiktok',     test: url => /tiktok\.com/.test(url),         fn: ttdl },
  { name: 'facebook',   test: url => /facebook\.com/.test(url),       fn: fbdown },
  { name: 'twitter',    test: url => /twitter\.com/.test(url),        fn: twitter },
  { name: 'youtube',    test: url => /youtu\.?be/.test(url),          fn: youtube },
  { name: 'mediafire',  test: url => /mediafire\.com/.test(url),      fn: mediafire },
  { name: 'capcut',     test: url => /capcut\.com/.test(url),         fn: capcut },
  { name: 'gdrive',     test: url => /drive\.google\.com/.test(url),  fn: gdrive },
  { name: 'pinterest',  test: url => /(pin\.(it|terest\.com))/.test(url), fn: pinterest },
];

async function handleDownload(url) {
  console.log('[DOWNLOAD] Received URL:', url);

  const platform = platforms.find(p => p.test(url));
  if (!platform) {
    console.log('[DOWNLOAD] Platform not found for URL:', url);
    throw new Error(`Platform tidak dikenali untuk URL: ${url}`);
  }

  console.log(`[DOWNLOAD] Detected platform: ${platform.name}`);
  const data = await platform.fn(url);
  console.log(`[DOWNLOAD] Raw data received from ${platform.name}:`, data);

  return { platform: platform.name, ...data };
}

module.exports = async (req, res) => {
  console.log('--- New Request ---');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { method } = req;
  if (method !== 'GET') {
    console.warn(`[WARN] Unsupported method: ${method}`);
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { url } = req.query;
  if (!url) {
    console.warn('[WARN] Missing `url` parameter');
    return res
      .status(400)
      .json({ error: 'Parameter `url` wajib diisi.' });
  }

  try {
    const result = await handleDownload(url);
    console.log('[SUCCESS] Download result:', result);

    return res.status(200).json({
      status: 200,
      author: 'Yudzxml',
      platform: result.platform,
      data: {
        title:      result.title      || 'Title not found',
        thumbnail:  result.thumbnail  || 'Thumbnail not found',
        downloadUrls: result.links    || result.downloadUrls || []
      }
    });
  } catch (err) {
    console.error('[ERROR] ', err.stack || err.message);
    return res.status(500).json({
      status: 500,
      error: err.message.includes('404')
        ? 'Konten tidak ditemukan (404). Mungkin URL-nya sudah lari.'
        : `Terjadi kesalahan: ${err.message}`
    });
  }
};