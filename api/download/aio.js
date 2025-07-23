const fetch = require("node-fetch-commonjs")
const cheerio = require('cheerio');

class Dlpanda {
  origin = "https://dlpanda.com/id";
  webHeaders = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua": `"Not_A Brand";v="8", "Chromium";v="138", "Microsoft Edge";v="138"`,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": `"Windows"`,
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"
  };

  async getHtml(description, url, opts) {
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      throw new Error(`Gagal ambil HTML ${description}: ${err.message}`);
    }
  }

  async getCookieAndToken(path, regex) {
    try {
      const url = this.origin + path;
      const res = await fetch(url, { headers: this.webHeaders });
      const html = await res.text();
      const cookie = res.headers.raw()['set-cookie']?.map(v => v.split(";")[0]).join("; ") || '';
      const token = html.match(new RegExp(regex))?.[1] || null;
      return { cookie, token };
    } catch (err) {
      throw new Error(`Gagal ambil cookie/token: ${err.message}`);
    }
  }

  async facebook(url) {
    if (!url) throw new Error('URL Facebook wajib diisi.');
    const { cookie, token } = await this.getCookieAndToken(`/facebook`, `_token" value="(.+?)"`);
    const headers = { cookie, ...this.webHeaders };
    const body = new URLSearchParams({ url, _token: token });
    const api = new URL(this.origin);
    api.pathname = "/id/facebook";
    const html = await this.getHtml("facebook", api, { method: "POST", headers, body });
    return this.parseHtml(html, 'Facebook');
  }

  async twitter(url) {
    if (!url) throw new Error('URL Twitter/X wajib diisi.');
    const { cookie, token } = await this.getCookieAndToken(`/t`, `_token" value="(.+?)"`);
    const headers = { cookie, ...this.webHeaders };
    const body = new URLSearchParams({ url, _token: token });
    const api = new URL(this.origin);
    api.pathname = "/id/t";
    const html = await this.getHtml("twitter", api, { method: "POST", headers, body });
    return this.parseHtml(html, 'Twitter');
  }

  async tiktok(url) {
    if (!url) throw new Error('URL TikTok wajib diisi.');
    const { cookie, token } = await this.getCookieAndToken(``, `id="token" value="(.+?)"`);
    const headers = { cookie, ...this.webHeaders };
    const api = new URL(this.origin);
    api.search = new URLSearchParams({ url, token });
    const html = await this.getHtml("tiktok", api, { headers });
    return this.parseHtml(html, 'TikTok');
  }

  async pinterest(url) {
    if (!url) throw new Error('URL Pinterest wajib diisi.');
    const headers = { ...this.webHeaders };
    const api = new URL(this.origin);
    api.pathname = "/id/pinterest";
    api.search = new URLSearchParams({ url });
    const html = await this.getHtml("pinterest", api, { headers });
    return this.parseHtml(html, 'Pinterest');
  }

  parseHtml(html, label = "source") {
    const text = html.match(/" target="_blank"><h5>(.+?)<\/h5>/)?.[1] || `from ${label}`;
    const images = Array.from(html.matchAll(/img alt="" src="(.+?)"/gm)).map(m => m[1]);
    const audio = html.match(/downVideo\('([^ ]+)', '(?:.+?)mp3/)?.[1] || null;
    let video = html.match(/<source src="(.+?)"/)?.[1] ||
                html.match(/downVideo\('([^ ]+)', '(?:.+?)mp4/)?.[1] || null;
    if (video?.startsWith('//')) video = 'https:' + video;
    if (video?.includes('&amp;')) video = video.replaceAll('&amp;', '&');
    return { text, audio, video, images };
  }
}

// Fungsi deteksi otomatis dari URL
function detectSourceFromUrl(url) {
  if (/facebook\.com|fb\.watch/.test(url)) return 'facebook';
  if (/tiktok\.com/.test(url)) return 'tiktok';
  if (/twitter\.com|x\.com/.test(url)) return 'twitter';
  if (/pinterest\.com/.test(url)) return 'pinterest';
  return null;
}

// Handler API utama
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { method, query } = req;
  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { url } = query;
  if (!url) {
    return res.status(400).json({ status: false, error: 'Parameter "url" wajib diisi.' });
  }

  const source = detectSourceFromUrl(url);
  if (!source) {
    return res.status(400).json({ status: false, error: 'Link tidak dikenali. Harap masukkan URL dari Facebook, TikTok, Twitter/X, atau Pinterest.' });
  }

  try {
    const dlpanda = new Dlpanda();
    let result;

    switch (source) {
      case 'facebook': result = await dlpanda.facebook(url); break;
      case 'twitter': result = await dlpanda.twitter(url); break;
      case 'tiktok': result = await dlpanda.tiktok(url); break;
      case 'pinterest': result = await dlpanda.pinterest(url); break;
      default:
        return res.status(400).json({ status: false, error: 'Source tidak dikenali.' });
    }

    return res.status(200).json({
      status: true,
      author: 'Yudzxml',
      detected_source: source,
      result
    });
  } catch (err) {
    return res.status(500).json({ status: false, error: err.message });
  }
};