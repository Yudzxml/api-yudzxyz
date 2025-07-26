const axios = require('axios');
const cheerio = require('cheerio');

async function getListKota() {
    try {
        const { data } = await axios.get('https://raw.githubusercontent.com/Yudzxml/UploaderV2/main/tmp/kota.json');
        if (!Array.isArray(data)) throw new Error("Data kota tidak valid.");
        return data;
    } catch (err) {
        throw new Error("Tidak dapat mengambil daftar kota.");
    }
}

async function getJadwalSholat(namaKota) {
    const daftarKota = await getListKota();
    const kotaObj = daftarKota.find(k => k.kota.toLowerCase() === namaKota.toLowerCase());
    if (!kotaObj) throw new Error(`Kota "${namaKota}" tidak ditemukan.`);

    let response;
    try {
        response = await axios.get(`https://jadwalsholat.org/jadwal-sholat/monthly.php?id=${kotaObj.id}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
    } catch {
        throw new Error("Gagal mengambil halaman jadwal.");
    }

    const $ = cheerio.load(response.data);
    const periode = $('h2.h2_edit').first().text().trim() || "Periode tidak ditemukan";
    const headers = [];
    $('tr.table_header td').each((_, el) => {
        const header = $(el).text().replace(/\n/g, '').trim();
        if (header) headers.push(header);
    });

    const row = $('tr.table_highlight');
    const jadwal = {};
    row.find('td').each((i, el) => {
        const value = $(el).text().trim();
        const label = headers[i];
        if (label) jadwal[label] = value;
    });

    if (!Object.keys(jadwal).length) throw new Error("Struktur jadwal tidak ditemukan atau berubah.");

    return {
        status: 200,
        author: "Yudzxml",
        kota: kotaObj.kota,
        periode,
        jadwal
    };
}

module.exports = async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "GET") {
        return res.status(405).json({
            author: "Yudzxml",
            status: 405,
            error: `Method ${req.method} tidak diperbolehkan.`
        });
    }

    const { kota } = req.query;
    if (!kota) {
        return res.status(400).json({
            author: "Yudzxml",
            status: 400,
            error: "Parameter 'kota' wajib diisi."
        });
    }

    try {
        const result = await getJadwalSholat(kota);
        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({
            author: "Yudzxml",
            status: 500,
            error: err.message || "Terjadi kesalahan saat memproses permintaan."
        });
    }
};