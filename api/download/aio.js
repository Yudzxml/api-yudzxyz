const axios = require('axios');
const cheerio = require('cheerio');
const FormData = require('form-data');

const aio = {
  baseUrl: "https://steptodown.com/",
  apiEndpoint: "https://steptodown.com/wp-json/aio-dl/video-data/",
  headers: {
    'accept': '*/*',
    'user-agent': 'Mozilla/5.0 (Node.js script)'
  },

  getToken: async () => {
    try {
      const { data } = await axios.get(aio.baseUrl, { headers: aio.headers });
      const $ = cheerio.load(data);
      const token = $("#token").val();
      if (!token) throw new Error("Token tidak ditemukan di halaman");
      return token;
    } catch (error) {
      throw new Error(`Gagal ambil token: ${error.message}`);
    }
  },

  request: async (url) => {
    if (!url) {
      return { status: false, error: "URL tidak boleh kosong" };
    }

    try {
      const token = await aio.getToken();

      const form = new FormData();
      form.append('url', url);
      form.append('token', token);

      const headers = {
        ...form.getHeaders(),
        ...aio.headers
      };

      const { data } = await axios.post(aio.apiEndpoint, form, { headers });
      return { status: true, data };
    } catch (error) {
      return { status: false, error: `Request gagal: ${error.message}` };
    }
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ status: false, error: 'Parameter url wajib diisi.' });
  }

  const result = await aio.request(url);

  if (result.status) {
    res.status(200).json({
      status: 200,
      author: "Yudzxml",
      result: result.data
    });
  } else {
    res.status(500).json({
      status: false,
      error: result.error
    });
  }
};