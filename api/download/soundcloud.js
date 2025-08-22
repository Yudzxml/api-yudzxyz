const qs = require('qs'); 
const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

async function getCookies() {
  const base = 'https://www.klickaud.org/en'
  const cookieJar = new tough.CookieJar();
  const client = wrapper(axios.create({ jar: cookieJar, withCredentials: true }));
  const res = await client.get(base, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    },
  });
  const cookies = await cookieJar.getCookieString(base); 
  return cookies
  }
async function getCrfToken() {
  try {
    const cokies = await getCookies()
    const response = await axios.get('https://www.klickaud.org/csrf-token-endpoint.php', {
      headers: {
        'accept': '*/*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'Cookie': cokies,
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'referer': 'https://www.klickaud.org/en'
      },
    });
    
    return { 
      csrfToken: response.data.csrf_token,
      cookies: cokies 
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error.message);
   }
 }
async function download(trackUrl) {
  const { csrfToken, cookies } = await getCrfToken();

  const body = qs.stringify({
    value: trackUrl,
    csrf_token: csrfToken,
  });

  // POST request ke download.php
  const res = await axios.post('https://www.klickaud.org/download.php', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies,
      'Referer': 'https://www.klickaud.org/en',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
  });


  const $ = cheerio.load(res.data);
    const dlDiv = $("#dlMP3");

    if (!dlDiv || dlDiv.length === 0) throw new Error("Tidak menemukan elemen download.");

    const encodedUrl = dlDiv.attr("data-src");
    const downloadUrl = Buffer.from(encodedUrl, "base64").toString("utf-8");
    const filename = dlDiv.attr("data-name");

    return { downloadUrl, filename };
  }
async function search(query) {
  try {
    const response = await axios.get(
      `https://proxy.searchsoundcloud.com/tracks?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'accept': 'application/json, text/plain, */*',
          'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
          'cache-control': 'no-cache',
          'pragma': 'no-cache',
          'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site'
        },
        referrer: 'https://searchsoundcloud.com/',
        referrerPolicy: 'strict-origin-when-cross-origin',
      }
    );

    return response.data.collection.map(track => ({
      title: track.title,
      link: track.permalink_url,
      artwork: track.artwork_url,
      duration: track.duration,
      genre: track.genre,
      streamable: track.streamable
    }));
  } catch (err) {
    return [];
  }
}

module.exports = async (req, res) => {
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

    const { download, search } = req.query;

    try {
        if (download) {
            // lakukan download
            const result = await download(download);
            return res.status(200).json({
                author: "Yudzxml",
                status: 200,
                data: result,
            });
        } else if (search) {
            // lakukan search
            const result = await search(search);
            return res.status(200).json({
                author: "Yudzxml",
                status: 200,
                data: result,
            });
        } else {
            return res.status(400).json({
                author: "Yudzxml",
                status: 400,
                error: 'Parameter "url" atau "query" wajib diisi.',
            });
        }
    } catch (err) {
        return res.status(500).json({
            author: "Yudzxml",
            status: 500,
            error: err.message || 'Internal server error',
        });
    }
};