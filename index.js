const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const { getPdfData} = require('./api');

const options = {
    key: fs.readFileSync('/app/ssl/privkey.pem'),
    cert: fs.readFileSync('/app/ssl/fullchain.pem')
};


app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'https://absendo.vercel.app', 'https://absendo.app', 'http://localhost:443'],
}));
app.options('*', cors());

app.get('/', (req, res) => {
    res.send(`
        <h1>Hey, you look kind of technical!</h1>
        <p>If you want, we can develop this tool further together.</p>
        <p><a href="https://github.com/notacodes/absendo" target="_blank">Check out the GitHub repo and join me!</a></p>
    `);
});
app.post('/absendo/api', async (req, res) => {
    try {
        console.log('Received POST to /events with body:', req.body);
        const { date, user_id, reason, is_excused, isFullNameEnabled, isFullSubjectEnabled, fileName } = req.body;

        const form_data = {
            date: new Date(date),
            reason,
            is_excused,
            isFullNameEnabled,
            isFullSubjectEnabled,
            fileName
        };

        const filledPdf = await getPdfData(user_id, form_data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${form_data.fileName}`);
        res.send(Buffer.from(filledPdf));
    } catch (error) {
        console.error('Error in /events:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});

const allowedOrigin = 'https://schulnetz.lu.ch';

app.get('/proxy', async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('URL query parameter is required');
    }

    try {
        if (!url.startsWith(allowedOrigin)) {
            return res.status(403).send('Forbidden: URL not allowed');
        }

        const response = await fetch(url);
        const data = await response.text();
        res.send(data);
    } catch (error) {
        res.status(500).send('Error fetching the URL');
    }
});

const PORT = 443;
https.createServer(options, app).listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
