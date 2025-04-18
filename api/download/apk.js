const axios = require('axios');
const fetch = require('node-fetch-commonjs');

const APIs = {
  1: "https://apkcombo.com",
  2: "apk-dl.com",
  3: "https://apk.support",
  4: "https://apps.evozi.com/apk-downloader",
  5: "http://ws75.aptoide.com/api/7",
  6: "https://cafebazaar.ir",
};

const Proxy = (url) =>
  url
    ? `https://translate.google.com/translate?sl=en&tl=fr&hl=en&u=${encodeURIComponent(url)}&client=webapp`
    : "";
const api = (ID, path = "/", query = {}) =>
  (ID in APIs ? APIs[ID] : ID) +
  path +
  (query
    ? "?" +
      new URLSearchParams(
        Object.entries({
          ...query,
        }),
      )
    : "");

const tools = {
  APIs,
  Proxy,
  api,
};

let aptoide = {
  search: async function (args) {
    let res = await fetch(
      tools.api(5, "/apps/search", {
        query: args,
        limit: 1000,
      }),
    );

    let ress = {};
    res = await res.json();
    ress = res.datalist.list.map((v) => {
      return {
        name: v.name,
        id: v.package,
      };
    });
    return ress;
  },
  download: async function (id) {
    let res = await fetch(
      tools.api(5, "/apps/search", {
        query: id,
        limit: 1,
      }),
    );

    res = await res.json();
    return {
      img: res.datalist.list[0].icon,
      developer: res.datalist.list[0].store.name,
      appname: res.datalist.list[0].name,
      link: res.datalist.list[0].file.path,
    };
  },
};

module.exports = async (req, res) => {
    const { method } = req;
    
    if (method === 'GET') {
        const { search, download } = req.query; 
        
        if (search) {
            if (!search) {
                return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'Query tidak valid. Pastikan query yang diberikan benar!' });
            }

            try {
                const searchData = await aptoide.search(search); // Menggunakan aptoide.search
                return res.status(200).json(searchData);
            } catch (err) {
                return res.status(500).json({ status: 500, author: 'Yudzxml', error: err.message });
            }
        } else if (download) {
            if (!download) {
                return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'URL tidak valid. Pastikan URL yang diberikan benar!' });
            }

            try {
                const downloadData = await aptoide.download(download); // Menggunakan aptoide.download
                return res.status(200).json({ status: 200, author: 'Yudzxml', data: downloadData });
            } catch (err) {
                return res.status(500).json({ status: 500, author: 'Yudzxml', error: err.message });
            }
        } else {
            return res.status(400).json({ status: 400, author: 'Yudzxml', error: 'Parameter tidak valid. Gunakan "search" atau "download".' });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
};