const axios = require("axios");

async function get2FAToken(code) {
  try {
    const url = `https://2fa.live/tok/${code}`;
    const response = await axios.get(url, {
      headers: {
        "Accept": "*/*",
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    return response.data.token;
  } catch (error) {
    console.error("Gagal mengambil token:", error.message);
    throw new Error("Tidak bisa mengambil token 2FA");
  }
}


module.exports = async (req, res) => {
  const { method } = req;

  if (method === "GET") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: 400,
        author: "Yudzxml",
        error: 'Parameter "id" wajib diisi.'
      });
    }

    try {
      const token = await get2FAToken(id);
      return res.status(200).json({
        status: 200,
        author: "Yudzxml",
        id,
        token
      });
    } catch (err) {
      return res.status(500).json({
        status: 500,
        author: "Yudzxml",
        error: err.message
      });
    }

  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
};