const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

require('dotenv').config(); // Load environment variables
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Optimization: Keep-Alive Agent to reuse SSL connections to Google
const httpsAgent = new https.Agent({ keepAlive: true });
const apiClient = axios.create({ httpsAgent });

// Initialize Gemini (if key exists)
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

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

// Unicode Transliteration Proxy Endpoint (Strict AI Mode)
app.post('/api/unicode', async (req, res) => {
    let { text } = req.body;

    if (!text) {
        return res.json({ result: '' });
    }

    if (!model) {
        return res.status(500).json({ error: 'AI Model not initialized (Check API Key)' });
    }

    try {
        // Enhanced System Prompt for "Nepanglish"
        // We use few-shot prompting to teach the model the specific mapping rules.
        const systemPrompt = `
        You are a smart Nepali Transliteration engine. Your goal is to convert Romanized Nepali (Nepanglish) into formal Nepali Unicode.
        
        RULES:
        1. Context is King: Understand the sentence meaning.
        2. Handle "Social Media" spelling variations smartly.
        3. Output ONLY the Nepali text. No explanations.

        SPECIFIC MAPPINGS (Few-Shot Examples):
        - Input: "timi k gardai xau" -> Output: "तिमी के गर्दै छौ" (Note: 'xau' -> 'छौ', 'k' -> 'के')
        - Input: "ma xa" -> Output: "म छ" 
        - Input: "ramro xa" -> Output: "राम्रो छ" (Note: 'xa' -> 'छ')
        - Input: "malaai xha" -> Output: "मलाई छ" (Note: 'xha' -> 'छ')
        - Input: "khana khayau?" -> Output: "खाना खायौ?"
        - Input: "mero nam milan ho" -> Output: "मेरो नाम मिलन हो"
        - Input: "tapai ko ghar kaha ho" -> Output: "तपाईंको घर कहाँ हो"
        - Input: "cha" -> Output: "छ" (As per user preference)

        INPUT TO CONVERT: "${text}"
        `;

        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const textResponse = response.text().trim();

        return res.json({ result: textResponse });

    } catch (error) {
        console.error('Gemini AI Error:', error.message);
        return res.status(500).json({ error: 'AI Generation Failed', details: error.message });
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
