const express = require('express');
const app = express();
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const { getPdfData} = require('./api');

const options = {
    key: fs.readFileSync('./ssl/fullchain.pem'),
    cert: fs.readFileSync('./ssl/privkey.pem')
};

app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'https://absendo.vercel.app']
}));

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
        const { date, user_id, reason, is_excused, isFullNameEnabled } = req.body;

        const form_data = {
            date: new Date(date),
            reason,
            is_excused,
            isFullNameEnabled
        };

        const filledPdf = await getPdfData(user_id, form_data);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=filled-form.pdf');
        res.send(Buffer.from(filledPdf));
    } catch (error) {
        console.error('Error in /events:', error.message);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
});



const PORT = 3001;
https.createServer(options, app).listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
