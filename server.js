const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Optimization: Keep-Alive Agent to reuse SSL connections to Google
const httpsAgent = new https.Agent({ keepAlive: true });
const apiClient = axios.create({ httpsAgent });

// Enable CORS for all origins (modify for production security if needed)
app.use(cors());
app.use(express.json());

// Serve static files (Frontend)
app.use(express.static(path.join(__dirname, '.')));

// Proxy Endpoint
app.post('/api/transliterate', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.json({ result: '' });
    }

    try {
        // Google Translate API (GTX)
        const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ne&dt=t&q=${encodeURIComponent(text)}`;

        const response = await apiClient.get(googleUrl);

        // Response format: [[["Translated Text", "Original Text", ...], ...], ...]
        if (response.data && response.data[0]) {
            // Join all segments (in case of multiple sentences)
            const result = response.data[0].map(segment => segment[0]).join('');
            return res.json({ result });
        } else {
            return res.status(500).json({ error: 'Failed to fetch from Google' });
        }
    } catch (error) {
        console.error('Proxy Error:', error.message);
        return res.status(500).json({ error: 'Server Error', details: error.message });
    }
});

// Unicode Transliteration Proxy Endpoint (Input Tools)
app.post('/api/unicode', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.json({ result: '' });
    }

    try {
        const inputToolsUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ne-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`;

        const response = await apiClient.get(inputToolsUrl);

        // Response format: ["SUCCESS", [["namaste", ["नमस्ते", "नमस्ते!", ...], ...]]]
        if (response.data && response.data[1] && response.data[1][0] && response.data[1][0][1]) {
            const result = response.data[1][0][1][0]; // First suggestion
            return res.json({ result });
        } else {
            return res.status(500).json({ error: 'Failed to fetch from Google Input Tools' });
        }
    } catch (error) {
        console.error('Unicode Proxy Error:', error.message);
        return res.status(500).json({ error: 'Server Error', details: error.message });
    }
});

// TTS Proxy Endpoint
app.get('/api/tts', async (req, res) => {
    const { text } = req.query;

    if (!text) {
        return res.status(400).send('Missing text parameter');
    }

    try {
        // client=tw-ob is commonly used for this, but if blocked, we might need a different one.
        // For now, proxing it server-side often bypasses the browser-based CORS/Referrer blocks.
        const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ne&client=tw-ob&q=${encodeURIComponent(text)}`;

        const response = await apiClient.get(googleTtsUrl, {
            responseType: 'stream'
        });

        res.set('Content-Type', 'audio/mpeg');
        response.data.pipe(res);

    } catch (error) {
        console.error('TTS Proxy Error:', error.message);
        res.status(500).send('Error fetching audio');
    }
});

// Fallback to serving the specific requested file if it exists, otherwise index.html
app.get('*', (req, res) => {
    // Check if the request is for a file that exists
    const filePath = path.join(__dirname, req.path);
    if (req.path !== '/' && require('fs').existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        // Default to index.html for root
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
