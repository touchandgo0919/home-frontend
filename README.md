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

For the production custom domain, run `../scripts/deploy-frontend.sh` from the
parent repository so the Aliyun static copy is updated in the same release.

On custom domains, the API address is derived from the frontend hostname:
`home.example.com` uses `home-api.example.com`. This keeps requests on the
domain's accessible entrypoint when `workers.dev` is unreachable. For local
development or preview hostnames, set `HOME_API_BASE_URL` to the backend Worker.

The frontend Worker serves static assets from `dist` and returns `/config.js`
using the same hostname rule. `HOME_API_BASE_URL` is the fallback for local and
preview environments and can be configured in Cloudflare Settings.
