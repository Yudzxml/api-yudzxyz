/**
 * Perbaikan:
 * - Menempatkan penjelasan di dalam komentar (/* … *​/) atau komentar satu baris (// …)
 * - Memastikan semua `console.log`, `throw new Error`, dan `.end()` menggunakan template literal dengan benar
 */

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
  { name: 'instagram', test: url => /instagram\.com/.test(url), fn: igdl },
  { name: 'tiktok',    test: url => /tiktok\.com/.test(url),    fn: ttdl },
  { name: 'facebook',  test: url => /facebook\.com/.test(url),  fn: fbdown },
  { name: 'twitter',   test: url => /twitter\.com/.test(url),   fn: twitter },
  { name: 'youtube',   test: url => /youtu.?be/.test(url),      fn: youtube },
  { name: 'mediafire', test: url => /mediafire\.com/.test(url), fn: mediafire },
  { name: 'capcut',    test: url => /capcut\.com/.test(url),    fn: capcut },
  { name: 'gdrive',    test: url => /drive\.google\.com/.test(url), fn: gdrive },
  { name: 'pinterest', test: url => /(pin\.(it|terest\.com))/.test(url), fn: pinterest }
];

async function handleDownload(url) {
  console.log('[DOWNLOAD] Received URL:', url);
  const platform = platforms.find(p => p.test(url));
  if (!platform) {
    console.warn('[DOWNLOAD] Unsupported URL platform:', url);
    throw new Error(`Platform tidak dikenali untuk URL: ${url}`);
  }

  console.log(`[DOWNLOAD] Detected platform: ${platform.name}`);
  const raw = await platform.fn(url);
  console.log(`[DOWNLOAD] Raw data from ${platform.name}:`, raw);
  return { platform: platform.name, ...raw };
}

module.exports = async (req, res) => {
  console.log('=== New Request ===');
  console.log('Method:', req.method);
  console.log('Query:', req.query);

  // Allow CORS untuk semua origin dan hanya metode GET
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'GET') {
    console.warn('[WARN] Unsupported method:', req.method);
    res.setHeader('Allow', ['GET']);
    return res
      .status(405)
      .end(`Method ${req.method} Not Allowed`);
  }

  const { url } = req.query;
  if (!url) {
    console.warn('[WARN] Missing url parameter');
    return res
      .status(400)
      .json({ status: 400, error: 'Parameter url wajib diisi.' });
  }

  try {
    const result = await handleDownload(url);
    console.log('[SUCCESS] Download result:', result);
    return res
      .status(200)
      .json({ status: 200, author: 'Yudzxml', ...result });
  } catch (err) {
    console.error('[ERROR]', err.stack || err.message);
    const is404 = /404/.test(err.message);
    const message = is404
      ? 'Konten tidak ditemukan (404). Mungkin URL-nya sudah lari.'
      : `Terjadi kesalahan: ${err.message}`;
    return res
      .status(500)
      .json({ status: 500, error: message });
  }
};