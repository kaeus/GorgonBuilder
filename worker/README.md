# gorgon-proxy (Cloudflare Worker)

CORS proxy for `gorgonexplorer.com/api/build/<id>`. Spoofs browser `Referer`/`User-Agent` so the upstream doesn't 403, and re-emits the response with `Access-Control-Allow-Origin: *` so the GorgonBuilder web app can fetch it directly.

## Deploy (one-time)

```sh
cd worker
npm install
npx wrangler login        # browser OAuth to Cloudflare
npx wrangler deploy
```

First deploy will prompt you to pick a `workers.dev` subdomain (e.g. `kaeus`). The worker will then live at:

```
https://gorgon-proxy.<your-subdomain>.workers.dev
```

Copy that URL and add it to the client:

- **Local dev**: in the repo root's `.env.local`, add
  ```
  VITE_GE_PROXY=https://gorgon-proxy.<your-subdomain>.workers.dev
  ```
- **Production (GitHub Actions)**: add a repo secret `VITE_GE_PROXY` with the same value, and reference it in `.github/workflows/deploy.yml` under the `Build` step's `env:` block.

## Usage

```
GET https://gorgon-proxy.<subdomain>.workers.dev/?id=1234
GET https://gorgon-proxy.<subdomain>.workers.dev/1234
```

Returns the exact GorgonExplorer envelope (JSON). Errors come back as `{ error, detail }` with appropriate HTTP status.

## Local dev

```sh
npx wrangler dev
```

Serves at `http://localhost:8787`. You can point `VITE_GE_PROXY` at this during development if you prefer the worker path over the existing Vite proxy/allorigins fallback.

## Free tier limits

Cloudflare Workers free plan: 100k requests/day, 10ms CPU per request. Well beyond anything this project will generate.
