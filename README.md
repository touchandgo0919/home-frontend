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

On custom domains, the API address is derived automatically from the frontend
hostname: `home.example.com` uses `home-api.example.com`. For local development
or preview hostnames, create `config.js` from `config.example.js` and set the
fallback API URL to the deployed Worker URL.

The frontend Worker serves static assets from `dist` and returns `/config.js`
using the same hostname rule. `HOME_API_BASE_URL` remains the fallback for local
and preview environments and can be configured in Cloudflare Settings.
