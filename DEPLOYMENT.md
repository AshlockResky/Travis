# Deployment

This repository includes deployment configs for Render and Heroku.

Render (recommended)
- A sample `render.yaml` is included to create a web service named `laen-server`.
- On Render, set the environment variables `OPENAI_API_KEY` and `SERVER_API_KEY` in the service's Environment section.

Heroku
- A `Procfile` is included with `web: npm start`.
- On Heroku, set config vars `OPENAI_API_KEY` and `SERVER_API_KEY`.
