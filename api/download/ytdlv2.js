

const keepv = {
    tools: {
        generateHex: (length = 10, config = { prefix: "" }) => {
            const charSet = "0123456789abcdef"
            const charSetArr = charSet.split("")
            const getRandom = (array) => array[Math.floor(Math.random() * array.length)]

            const randomString = Array.from({ length }, _ => getRandom(charSetArr)).join("")
            return config.prefix + randomString
        },
        generateTokenValidTo: () => (Date.now() + (1000 * 60 * 20)).toString().substring(0, 10), //currentime + 20 minutes (in second not ms) // 1753289143
        mintaJson: async (description, url, options) => {
            try {
                const response = await fetch(url, options)
                if (!response.ok) throw Error(`${response.status} ${response.statusText}\n${await response.text() || '(empty content)'}`)
                const json = await response.json()
                return json
            } catch (err) {
                throw Error(`gagal mintaJson ${description} -> ${err.message}`)
            }
        },
        validateString: (description, theVariable) => {
            if (typeof (theVariable) !== "string" || theVariable?.trim()?.length === 0) {
                throw Error(`variabel ${description} harus string dan gak boleh kosong`)
            }
        },
        delay: async (ms) => new Promise(re => setTimeout(re, ms)),
        handleFormat: (desireFormat) => {
            const validParam = ["audio", "240p", "360p", "480p", "720p", "1080p", "best_video"]
            if (!validParam.includes(desireFormat)) throw Error(`${desireFormat} is invalid format. just pick one of these: ${validParam.join(", ")}`)
            let result
            result = desireFormat.match(/^(\d+)p/)?.[1]
            if (!result) {
                desireFormat === validParam[0] ? result = desireFormat : result = "10000"
            }
            return result
        }

    },
    konstanta: {
        origin: "https://keepv.id",
        baseHeaders: {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-GB,en;q=0.9,en-US;q=0.8",
            "cache-control": "no-cache",
            "connection": "keep-alive",
            "host": "keepv.id",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Microsoft Edge\";v=\"138\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "upgrade-insecure-requests": "1",
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0"
        }
    },

    async getCookieAndRedirectUrl(origin, baseHeaders) {
        // origin tuh artinya url base yang buat kita fetch yah, fetch option ya option fetch buat lampirin headers.
        // kita cuma get request disini dapetin kuki
        try {
            const headers = {
                ...baseHeaders
            }
            const r = await fetch(origin, { headers })
            if (!r.ok) throw Error(`${r.status} ${r.statusText}\n${await r.text() || `(kosong respond nyah)`}`)
            const h = r.headers
            const cookies = h.getSetCookie()
            const cookie = cookies?.[0]?.split("; ")?.[0]
            if (!cookie) throw Error(`lah kocak kuki nya kagak ada >:o`)
            return { cookie, urlRedirect: r.url } //PHPSESSID=d6i4kv3gjeqnuk6huhu5gsklp6 kayak gitu kira" cookie nyah, terus url nya origin + path kayak origin/62 gitu
        } catch (error) {
            throw Error(`function getCookie gagal. ${error.message}`)
        }
    },
    async validateCookie(resultGetCookieAndRedirectUrl, origin, youtubeUrl, baseHeaders, format) {
        // lu dapet kuki belum tentu bisa di pakek, jadi lu musti bikin request ke sini dengan lampirin kuki yang lu dapet biar bisa di pakek
        // ada 2 endpoint buat validate kuki. karena ini fokus nya buat download mp3 jadi gw pakek endpoint yang buat download mp3 ajah
        const { cookie, urlRedirect } = resultGetCookieAndRedirectUrl
        const headers = {
            cookie,
            referer: urlRedirect,
            ...baseHeaders
        }

        const pathname = format === "audio" ? "button" : "vidbutton"
        const url = `${origin}/${pathname}/?url=${youtubeUrl}`
        const r = await fetch(url, { headers })
        if (!r.ok) throw Error(`${r.status} ${r.statusText}\n${await r.text() || `(respond nya kosong :v)`}`)
        return { cookie, referer: url }
    },
    async convert(resultValidateCookie, origin, youtubeUrl, baseHeaders, format) {

        const { cookie, referer } = resultValidateCookie
        const headers = {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            cookie,
            referer,
            origin,
            "x-requested-with": "XMLHttpRequest",
            ...baseHeaders
        }
        delete headers["upgrade-insecure-requests"]

        const payload = {
            url: youtubeUrl,
            convert: "gogogo",
            token_id: this.tools.generateHex(64, { prefix: "t_" }),
            token_validto: this.tools.generateTokenValidTo(),
        }
        if (format !== "audio") payload.height = format
        const body = new URLSearchParams(payload)
        const pathname = format === "audio" ? "convert" : "vidconvert"

        const url = `${origin}/${pathname}/`
        const result = await this.tools.mintaJson(`convert`, url, { headers, body, "method": "post" })
        if (result.error) throw Error(`gagal convert karena ada error dari server. katanya \n${result.error}`)
        if (!result.jobid) throw Error(`aneh anjir job id nya kosong >:o`)
        return result
    },
    async checkJob(resultValidateCookie, resultConvert, origin, baseHeaders, format, identifier) {

        // buat headers
        const { cookie, referer } = resultValidateCookie
        const { jobid } = resultConvert

        const headers = {
            cookie,
            referer,
            "x-requested-with": "XMLHttpRequest",
            ...baseHeaders
        }
        delete headers["upgrade-insecure-requests"]

        const usp = new URLSearchParams({
            jobid,
            time: Date.now()
        })

        const pathname = format === "audio" ? "convert" : "vidconvert"

        const url = new URL(`${origin}/${pathname}/`)
        url.search = usp



        const MAX_FETCH_ATTEMPT = 60
        const FETCH_INTERVAL = 5000 // 5 secs
        let fetchCount = 0

        let data = {}
        do {
            fetchCount++

            const r = await fetch(url, { headers })
            data = await r.json()
            if (data.dlurl) return data
            if (data.error) throw Error(`ada error saat cek job nih jsonnyah\n${JSON.stringify(data, null, 2)}`)
            let pesan = data.retry
            if (pesan.startsWith("Downloading audio data")) {
                const temp = pesan.match(/^(.+?)<(?:.+?)valuenow=\"(.+?)\"/)
                pesan = `${temp?.[1]} ${temp?.[2]}%`
            } else {
                pesan = pesan.match(/^(.+?)</)?.[1]
            }
            console.log(`${identifier} check job... ${pesan}`)
            await this.tools.delay(FETCH_INTERVAL)
        } while (fetchCount < MAX_FETCH_ATTEMPT && data.retry)
        throw Error(`mencapai batas maksimal fetch attempt`)
    },

    // main function
    async download(youtubeUrl, userFormat = "audio", owner = "Yudzxml") {

        // validate param
        this.tools.validateString(`youtube url`, youtubeUrl)
        const format = this.tools.handleFormat(userFormat)

        const identifier = this.tools.generateHex(4, { prefix: owner.trim().length ? `${owner.trim()}-` : owner.trim() })
        console.log(`[NEW TASK] ${identifier}`)

        const origin = this.konstanta.origin
        const headers = this.konstanta.baseHeaders

        console.time(`${identifier} get cookie`)
        const resultGCARU = await this.getCookieAndRedirectUrl(origin, headers)
        console.timeEnd(`${identifier} get cookie`)

        console.time(`${identifier} validate cookie`)
        const resultVC = await this.validateCookie(resultGCARU, origin, youtubeUrl, headers, format)
        console.timeEnd(`${identifier} validate cookie`)

        console.time(`${identifier} convert`)
        const resultConvert = await this.convert(resultVC, origin, youtubeUrl, headers, format)
        console.timeEnd(`${identifier} convert`)

        console.time(`${identifier} check job`)
        const result = await this.checkJob(resultVC, resultConvert, origin, headers, format, identifier)
        console.timeEnd(`${identifier} check job`)

        // ee
        const type = userFormat == "audio" ? userFormat : "video"
        return { ...result, identifier, type }
    }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET'); 
  res.setHeader('Access-Control-Allow-Headers', '*');

  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${method} Not Allowed`);
  }

  try {
    const { url, format } = req.query;

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'URL tidak valid. Pastikan URL yang diberikan benar.' });
    }

    // Format mapping
    const formatInput = (format || 'audio').toLowerCase();
    const formatMap = {
      'mp3': 'audio',
      '144': '240p', // fallback
      '240': '240p',
      '360': '360p',
      '480': '480p',
      '720': '720p',
      '1080': '1080p'
    }

    const finalFormat = formatMap[formatInput];
    if (!finalFormat) {
      return res.status(400).json({
        error: `Format tidak valid. Pilih salah satu dari: mp3, 144, 240, 360, 480, 720, 1080`
      });
    }

    const result = await keepv.download(url, finalFormat);
    return res.status(200).json({
  status: 200,
  author: "Yudzxml",
  data: result
});

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
