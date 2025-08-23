const axios = require("axios");
const qs = require("qs");
const cheerio = require("cheerio");

async function searchLirik(query) {
  try {
    const payload = qs.stringify({
      query,
      btn_search_submit: ""
    });

    const response = await axios.post(
      "https://lirik-lagu.net/search_filter",
      payload,
      {
        headers: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Content-Type": "application/x-www-form-urlencoded",
          "Referer": "https://lirik-lagu.net/"
        },
        withCredentials: true
      }
    );

    const $ = cheerio.load(response.data);
    const firstEl = $(".card-body.list_main.text-left").first();

    if (!firstEl.length) return null;

    const title = firstEl.find(".title-list a").text().trim();
    const link = "https://lirik-lagu.net" + firstEl.find(".title-list a").attr("href");
    const artist = firstEl.find(".artis a").first().text().trim();
    const snippet = firstEl.find(".related-post").text().replace(/Read »/g, "").trim();

    return { title, link, artist, snippet };
  } catch (error) {
    console.error("Error fetching lyrics search:", error.message);
    return null;
  }
}

async function lyric(query) {
  const { title, link, artist } = await searchLirik(query);
  try {
    const { data: html } = await axios.get(link, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        'sec-ch-ua': '"Chromium";v="139", "Not;A=Brand";v="99"',
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
      },
      referrer: 'https://lirik-lagu.net',
      referrerPolicy: 'strict-origin-when-cross-origin',
      withCredentials: true,
    });

    const $ = cheerio.load(html);
    let lyrics = $('#lirik_lagu').clone()
      .children('div, script, style').remove().end().text();
    lyrics = lyrics
      .replace(/\r\n|\r/g, '\n')
      .replace(/\n{2,}/g, '\n\n')
      .trim();

    return {
      status: 200,
      title,
      artist,
      lyrics
    };
  } catch (error) {
    console.error('Error fetching page:', error);
    return { status: 500, error: 'Failed to fetch lyrics' };
  }
}

module.exports = async (req, res) => {
    console.info('New request:', req.method, req.query);

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

    const { query } = req.query;
    if (!query) {
        return res.status(400).json({
            author: "Yudzxml",
            status: 400,
            error: 'Parameter "query" wajib diisi.',
        });
    }

    const result = await lyric(query);
    return res.status(result.status).json({
        author: "Yudzxml",
        ...result
    });
};