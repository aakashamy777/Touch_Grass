# GrassQuest

A local-first app for the Hacktoberfest "Touch Grass" challenge.

## Prerequisites

1. Node.js installed
2. [Ollama](https://ollama.com/) installed and running locally
3. The `gemma3:4b` model pulled in Ollama

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Pull the required model if you haven't already:
   ```bash
   ollama run gemma3:4b
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and go to [http://localhost:3000](http://localhost:3000)
