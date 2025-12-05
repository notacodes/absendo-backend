const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { getPdfData, getUserCount, getTimeSaved} = require('./api');


app.use(express.json());

const whitelist = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://absendo.app'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            console.warn('CORS: missing Origin header');
            return callback(null, false);
        }
        if (whitelist.includes(origin)) return callback(null, true);
        console.warn('CORS: origin not allowed:', origin);
        return callback(null, false);
    }
}));
app.options('*', cors());

const allowedFrontends = new Set(whitelist);
function restrictToFrontend(req, res, next) {
    const origin = req.get('origin');
    const ip = req.ip || req.connection && req.connection.remoteAddress || 'unknown';
    const referer = req.get('referer') || req.get('referrer') || 'none';

    if (!origin || !allowedFrontends.has(origin)) {
        console.warn('Blocked request from origin:', origin, 'ip:', ip, 'referer:', referer, 'path:', req.path);
        return res.status(403).json({
            warning: 'Forbidden: invalid origin',
            origin: origin || null,
            ip,
            referer
        });
    }

    if (process.env.FRONTEND_API_KEY) {
        const apiKey = req.get('x-api-key');
        if (!apiKey || apiKey !== process.env.FRONTEND_API_KEY) {
            console.warn('Blocked request with invalid api key from origin:', origin, 'ip:', ip);
            return res.status(403).json({
                warning: 'Forbidden: invalid api key',
                origin,
                ip
            });
        }
    }

    next();
}

app.get('/', (req, res) => {
    res.send(`
        <h1>Hey, you look kind of technical!</h1>
        <p>If you want, we can develop this tool further together.</p>
        <p><a href="https://github.com/notacodes/absendo" target="_blank">Check out the GitHub repo and join me!</a></p>
    `);
});
app.post('/absendo/api', restrictToFrontend, async (req, res) => {
    //Wird eigentlich nicht mehr gebraucht --> E2EE
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

app.get('/proxy', restrictToFrontend, async (req, res) => {
    const url = req.query.url;
    if (!url) {
        return res.status(400).send('URL query parameter is required');
    }

    try {
        const parsed = new URL(url);
        if (parsed.origin !== allowedOrigin) {
            return res.status(403).send('Forbidden: URL not allowed');
        }

        const response = await fetch(parsed.toString());
        const data = await response.text();
        res.send(data);
    } catch (error) {
        console.error('Error in /proxy:', error);
        res.status(500).send('Error fetching the URL');
    }
});

app.get('/stats/user-count', restrictToFrontend, async (req, res) => {
    const userCount = await getUserCount()
    res.json({userCount: userCount});
});

app.get('/stats/time-saved', restrictToFrontend, async (req, res) => {
    const timeSaved = await getTimeSaved()
    res.json({timeSaved: timeSaved});
});

const PORT = 8443;
http.createServer(app).listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
