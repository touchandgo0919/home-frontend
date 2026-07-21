# home-frontend

Frontend static site for the home project.

## Cloudflare Pages

Build the static site:

```bash
npm run build
```

Deploy to Cloudflare Pages:

```bash
HOME_API_BASE_URL=https://home-backend.<your-account>.workers.dev npm run deploy
```

For local development against a deployed backend, create `config.js` from
`config.example.js` and set `API_BASE_URL` to the Worker URL.

In the Cloudflare dashboard, set the Pages build output directory to `dist`.
If this frontend is deployed from the parent `home-design` repository instead,
use `home-frontend/dist`.
