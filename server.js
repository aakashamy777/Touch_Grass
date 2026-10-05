const express = require('express');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/tags',
        method: 'GET'
    };

    const request = http.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            if (response.statusCode === 200) {
                try {
                    const models = JSON.parse(data).models || [];
                    const hasModel = models.some(model => model.name === 'gemma3:4b');
                    
                    if (hasModel) {
                        res.json({ status: 'ok', message: 'Ollama is running and gemma3:4b model is available.' });
                    } else {
                        res.status(404).json({ status: 'error', message: 'Ollama is running, but gemma3:4b model is missing. Please run: ollama run gemma3:4b' });
                    }
                } catch (e) {
                    res.status(500).json({ status: 'error', message: 'Error parsing Ollama response.' });
                }
            } else {
                res.status(response.statusCode).json({ status: 'error', message: `Ollama returned status code: ${response.statusCode}` });
            }
        });
    });

    request.on('error', (error) => {
        res.status(503).json({ status: 'error', message: 'Ollama is not running. Please start Ollama first.' });
    });

    request.end();
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
