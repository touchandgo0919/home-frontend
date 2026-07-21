# home-frontend

Frontend static site for the home project.

## Cloudflare Pages

Build the static site:

```bash
npm run build
```

Deploy to Cloudflare Workers:

```bash
HOME_API_BASE_URL=https://home-backend.<your-account>.workers.dev npm run deploy
```

For local development against a deployed backend, create `config.js` from
`config.example.js` and set `API_BASE_URL` to the Worker URL.

The frontend Worker serves static assets from `dist` and returns `/config.js`
from the `HOME_API_BASE_URL` runtime variable. After this Worker script is
deployed, Cloudflare allows adding `HOME_API_BASE_URL` in Settings.
