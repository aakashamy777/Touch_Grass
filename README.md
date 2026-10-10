# GrassQuest

A local-first app for the Hacktoberfest "Touch Grass" challenge.

## Why open-weight?
- **Runs offline**: Take your walk, use the app locally without relying on internet connectivity.
- **Privacy first**: No data leaves your laptop. Your photos and locations are yours.
- **Swappable model**: Designed around standard open models like `gemma3:4b` that you can easily swap out or upgrade.
- **Free to run**: No API keys or cloud service subscriptions required.

## How it works
1. **Quest Generation**: Input where you're walking, the season, and how much time you have. GrassQuest queries a local Ollama model to generate a custom 5-task scavenger hunt tailored to your local environment.
2. **Photo Verification**: Use your phone's camera (via the local web server) to snap a picture. The app passes the photo back to Gemma Vision to evaluate whether your photo matches the task criteria.
3. **Field Journal**: Once you complete your walk, the app generates a short, warm markdown journal reflecting on what you found.

## Limits
- **Look-alike species**: The model might occasionally accept look-alike species since it's a small (4b) model.
- **Small model quirks**: While `gemma3:4b` is powerful, its confidence can vary. We've added a strictness layer so it tells you when it's "not sure."

## Setup

1. **Prerequisites**:
   - Node.js installed
   - [Ollama](https://ollama.com/) installed and running locally

2. **Clone and Install**:
   ```bash
   npm install
   ```

3. **Pull the model**:
   ```bash
   ollama run gemma3:4b
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. Open your browser and go to [http://localhost:3000](http://localhost:3000)
