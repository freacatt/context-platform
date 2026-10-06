# Deployment

The app is two parts:

- **Backend**: Convex (database, server functions, auth), deployed with the Convex CLI.
- **Frontend**: a static Vite build (`dist/`) that any static host can serve (Cloudflare Pages, Vercel, Netlify, …).

## 1. Create a production Convex deployment

```bash
cd app
npx convex login          # once; links the project to your Convex account
npx convex deploy         # pushes schema + functions to the production deployment
```

`convex deploy` prints the production URL (`https://<name>.convex.cloud`).

## 2. Configure auth on production

Convex Auth signs sessions with a key pair stored as deployment environment variables. Generate them for production, with `SITE_URL` set to the frontend's public URL:

```bash
SITE_URL=https://app.example.com npm run setup:auth -- --prod
```

Re-running it rotates the keys and signs everyone out.

### AI (optional)

Each user adds their own OpenRouter key on the Settings page. To give every user a shared key instead, set it on the deployment (users' own keys still win):

```bash
npx convex env set OPENROUTER_API_KEY sk-or-v1-... --prod
```

### Migrating old pyramids

Pyramids from the hand-filled block-grid version no longer match the schema, so the first deploy fails on a deployment that has them. Deploy once with `schemaValidation: false` as the second argument of `defineSchema` in `convex/schema.ts`, run `npx convex run pyramidMigrations:legacyToDrafts --prod` (each becomes a draft of its root question, the problem statement becomes its context), then deploy again with validation on.

## 3. Build and host the frontend

Build with the production Convex URL baked in:

```bash
VITE_CONVEX_URL=https://<name>.convex.cloud npm run build
```

Upload `dist/` to your static host and configure a single-page-app fallback (all paths → `index.html`).

**Cloudflare Pages:** build command `npm run build`, output directory `app/dist`, root directory `app`, environment variable `VITE_CONVEX_URL`. Add a `public/_redirects` file containing `/* /index.html 200` for client-side routing.

A one-step alternative that deploys the backend and builds the frontend with the right URL:

```bash
npx convex deploy --cmd 'npm run build'
```

## Checklist

- `npm run check` passes.
- `SITE_URL`, `JWT_PRIVATE_KEY` and `JWKS` are set on the production deployment (`npx convex env list --prod`).
- The host serves `index.html` for unknown paths.
