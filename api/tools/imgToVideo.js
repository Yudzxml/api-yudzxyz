const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('fluent-ffmpeg').ffprobe;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

ffmpeg.setFfmpegPath(ffmpegPath);

const osTmpDir = '/tmp';

async function getAudioDuration(audioPath) {
    return new Promise((resolve, reject) => {
        ffprobe(audioPath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration);
        });
    });
}

async function downloadFile(url, outputPath) {
    const response = await axios({ url, method: 'GET', responseType: 'stream' });
    const writer = fs.createWriteStream(outputPath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

async function uploadFileToApi(filePath, expired) {
    const form = new FormData();
    form.append('expired', expired);
    form.append('file', fs.createReadStream(filePath));

    const response = await axios.put(
        "https://autoresbot.com/tmp-files/upload",
        form,
        {
            headers: {
                ...form.getHeaders(),
                'Referer': 'https://autoresbot.com/',
                'User-Agent': 'Mozilla/5.0'
            }
        }
    );
    return response.data;
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow all origins
    res.setHeader('Access-Control-Allow-Methods', 'GET'); // Allow GET method
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Allow specific headers
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { imageUrls, imageUrl, audioUrl } = req.body;

    if (!audioUrl) {
        return res.status(400).json({ error: 'Missing audioUrl' });
    }

    if ((!imageUrl && !Array.isArray(imageUrls)) || (imageUrls && !Array.isArray(imageUrls))) {
        return res.status(400).json({ error: 'Missing imageUrl or imageUrls array' });
    }

    const tmpDir = osTmpDir;
    const audioPath = path.join(tmpDir, 'audio.mp3');
    const outputVideo = path.join(tmpDir, 'output.mp4');

    try {
        await downloadFile(audioUrl, audioPath);
        const audioDuration = await getAudioDuration(audioPath);

        if (Array.isArray(imageUrls)) {
            // banyak gambar
            const listPath = path.join(tmpDir, 'list.txt');
            const listContent = [];

            for (let i = 0; i < imageUrls.length; i++) {
                const imgPath = path.join(tmpDir, `img${i}.jpg`);
                await downloadFile(imageUrls[i], imgPath);
                listContent.push(`file '${imgPath}'`);
                listContent.push(`duration ${audioDuration / imageUrls.length}`);
            }

            listContent.push(`file '${path.join(tmpDir, `img${imageUrls.length - 1}.jpg`)}'`);
            fs.writeFileSync(listPath, listContent.join('\n'));

            await new Promise((resolve, reject) => {
                ffmpeg()
                    .input(listPath)
                    .inputOptions('-f concat', '-safe 0')
                    .input(audioPath)
                    .outputOptions('-c:v libx264', '-pix_fmt yuv420p', '-shortest')
                    .save(outputVideo)
                    .on('end', resolve)
                    .on('error', reject);
            });

        } else {
            // satu gambar
            const imgPath = path.join(tmpDir, 'image.jpg');
            await downloadFile(imageUrl, imgPath);

            await new Promise((resolve, reject) => {
                ffmpeg(imgPath)
                    .loop(audioDuration)
                    .input(audioPath)
                    .outputOptions('-c:v libx264', '-pix_fmt yuv420p', '-shortest')
                    .save(outputVideo)
                    .on('end', resolve)
                    .on('error', reject);
            });
        }

        const uploadRes = await uploadFileToApi(outputVideo, '1hour');
        res.status(200).json({ status: 200, author: 'Yudzxml', data: uploadRes.fileUrl });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
};