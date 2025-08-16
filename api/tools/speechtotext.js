const axios = require('axios');
const FormData = require('form-data');

const API_KEY = 'sk_df333e857d8dc9ca783e3e6dfc4dd7a1f0023ac81e649716';

async function speechToTextFromUrl(fileUrl) {
    try {
        const responseStream = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });

        const form = new FormData();
        form.append('file', responseStream.data, { filename: 'audio.mp3' });
        form.append('model_id', 'scribe_v1');

        const response = await axios.post(
            'https://api.elevenlabs.io/v1/speech-to-text',
            form,
            {
                headers: {
                    ...form.getHeaders(),
                    'xi-api-key': API_KEY
                }
            }
        );

        return JSON.stringify(response.data.text, null, 2);

    } catch (err) {
        return JSON.stringify({ error: err.response ? err.response.data : err.message }, null, 2);
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL file harus disediakan.' });
    }

    try {
        const text = await speechToTextFromUrl(url);
        return res.status(200).json({
            status: 200,
            author: "Yudzxml",
            result: { data: { text } }
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};