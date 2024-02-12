const YTDlpWrap = require('yt-dlp-wrap').default;
const ytDlpWrap = new YTDlpWrap('./bin/yt-dlp');
const express = require('express')
const app = express()
const port = 3000
const bodyParser = require('body-parser')
const fs = require('fs')
const getYtId = require('get-youtube-id')

app.use(bodyParser.urlencoded({ extended: true }))
const outPath = './out/output.mp4'

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/page.html')
})

app.post('/download', (req, res) => {
    const ytLink = req.body.link
    const videoId = getYtId(ytLink)
    if (fs.existsSync(outPath)) {
        fs.unlink(outPath, (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log('File is deleted.');
            }
        });
    }
    let ytDlpEventEmitter = ytDlpWrap
    .exec([
        ytLink,
        '-f',
        'best',
        '-o',
        'out/output.mp4',
    ])
    .on('progress', (progress) =>
        console.log(
            progress.percent,
            progress.totalSize,
            progress.currentSpeed,
            progress.eta
        )
    )
    .on('ytDlpEvent', (eventType, eventData) =>
        console.log(eventType, eventData)
    )
    .on('error', (error) => console.error(error))
    .on('close', () => res.redirect(`/video/${videoId}`));

    console.log(ytDlpEventEmitter.ytDlpProcess.pid);
})

app.get('/video/:id', (req, res) => {
    const videoPath = './out/output.mp4'

    if (!fs.existsSync(videoPath)) {
        return res.status(404).send('Video not found!')
    }

    const stat = fs.statSync(videoPath)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = (end - start) + 1
        const file = fs.createReadStream(videoPath, { start, end })
        const headers = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4'
        }
        res.writeHead(206, headers)
        file.pipe(res)
    } else {
        const headers = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4'
        }
        res.writeHead(200, headers)
        fs.createReadStream(videoPath).pipe(res)
    }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})