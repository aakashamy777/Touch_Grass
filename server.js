const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON bodies with a 10mb limit
app.use(express.json({ limit: '10mb' }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Helper to call Ollama
function callOllama(path, method, postData) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: '127.0.0.1',
            port: 11434,
            path: path,
            method: method,
            headers: postData ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            } : {}
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({ statusCode: res.statusCode, data });
            });
        });

        req.on('error', (e) => reject(e));

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const response = await callOllama('/api/tags', 'GET');
        
        if (response.statusCode === 200) {
            const models = JSON.parse(response.data).models || [];
            const hasModel = models.some(model => model.name === 'gemma3:4b');
            
            if (hasModel) {
                res.json({ status: 'ok', message: 'Ollama is running and gemma3:4b model is available.' });
            } else {
                res.status(404).json({ status: 'error', message: 'Ollama is running, but gemma3:4b model is missing. Please run: ollama run gemma3:4b' });
            }
        } else {
            res.status(response.statusCode).json({ status: 'error', message: `Ollama returned status code: ${response.statusCode}` });
        }
    } catch (e) {
        res.status(503).json({ status: 'error', message: 'Ollama is not running. Please start Ollama first.' });
    }
});

// Quest generation endpoint
app.post('/api/quest', async (req, res) => {
    const { area, season, minutes } = req.body;

    // Validate inputs
    if (!area || typeof area !== 'string' || area.trim() === '') {
        return res.status(400).json({ error: 'Invalid or missing area.' });
    }
    if (!season || typeof season !== 'string' || season.trim() === '') {
        return res.status(400).json({ error: 'Invalid or missing season.' });
    }
    const mins = parseInt(minutes, 10);
    if (isNaN(mins) || mins < 10 || mins > 120) {
        return res.status(400).json({ error: 'Minutes must be a number between 10 and 120.' });
    }

    const prompt = `Write a scavenger hunt for a short outdoor walk in a ${area} during ${season}, doable in ${mins} minutes.
Return ONLY JSON with this exact format:
{
  "title": "A fun title for the quest",
  "tasks": [
    {"id": 1, "text": "Task description", "hint": "A helpful hint"}
  ]
}
Generate exactly 5 tasks. EVERY task MUST be something the user can PHOTOGRAPH (e.g., a specific leaf shape, bark texture, a flower, a bird or insect, a stone, a puddle reflection). DO NOT include tasks about sounds, smells, or feelings.
CRITICAL: Tasks must be about things that realistically exist in the given area and season. If you are unsure what grows there, use generic things (a leaf with a pointed tip, rough bark, a small insect, a puddle, a flower). No tasks that need special equipment or going into unsafe places. Do not include markdown formatting or extra text, just the raw JSON object.`;

    const postData = JSON.stringify({
        model: 'gemma3:4b',
        prompt: prompt,
        stream: false,
        format: 'json'
    });

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const response = await callOllama('/api/generate', 'POST', postData);
            
            if (response.statusCode === 200) {
                const jsonResponse = JSON.parse(response.data);
                const questData = JSON.parse(jsonResponse.response);
                
                // Validate quest JSON structure
                if (questData && questData.title && Array.isArray(questData.tasks) && questData.tasks.length === 5) {
                    return res.json(questData);
                }
            }
        } catch (e) {
            console.error(`Attempt ${attempts} failed for quest generation:`, e.message);
        }
    }

    return res.status(500).json({ error: 'Failed to generate a valid quest. Please try again.' });
});

// Photo checking endpoint
app.post('/api/check', async (req, res) => {
    let { taskText, imageBase64 } = req.body;

    if (!taskText || typeof taskText !== 'string' || taskText.trim() === '') {
        return res.status(400).json({ error: 'Invalid or missing task text.' });
    }
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Invalid or missing image data.' });
    }

    // Strip data: prefix if present
    if (imageBase64.startsWith('data:image/')) {
        const parts = imageBase64.split(',');
        if (parts.length === 2) {
            imageBase64 = parts[1];
        }
    }

    // Validate size (~5MB max base64 size is roughly 7,000,000 chars)
    if (imageBase64.length > 7000000) {
        return res.status(400).json({ error: 'Image is too large. Max size is ~5MB.' });
    }

    const prompt = `Look at this photo. What is the main subject? Does it satisfy this task: "${taskText}"?
Be strict about species-specific tasks. If the photo clearly shows what the task asks, set matchesTask to true. If it only looks similar or you cannot tell, set matchesTask to false and say what you see.
Return ONLY JSON with this exact format:
{
  "identified": "What you see in the photo",
  "matchesTask": true,
  "confidence": "high",
  "note": "One friendly sentence explaining why it matches or not."
}
For confidence, use exactly "high", "medium", or "low". Do not include markdown formatting or extra text, just the raw JSON object.`;

    const postData = JSON.stringify({
        model: 'gemma3:4b',
        prompt: prompt,
        images: [imageBase64],
        stream: false,
        format: 'json'
    });

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            const response = await callOllama('/api/generate', 'POST', postData);
            
            if (response.statusCode === 200) {
                const jsonResponse = JSON.parse(response.data);
                const checkData = JSON.parse(jsonResponse.response);
                
                // Validate response JSON structure
                if (checkData && typeof checkData.identified === 'string' && typeof checkData.matchesTask === 'boolean' && typeof checkData.note === 'string') {
                    return res.json(checkData);
                }
            }
        } catch (e) {
            console.error(`Attempt ${attempts} failed for photo checking:`, e.message);
        }
    }

    return res.status(500).json({ error: 'Failed to check the photo. Please try again.' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
