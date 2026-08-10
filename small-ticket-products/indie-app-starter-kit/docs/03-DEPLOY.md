# Deploy

Live on your own domain in about ten minutes, for free.

## Option A: Cloudflare Pages (recommended)

Free tier includes unlimited bandwidth, a global CDN, automatic HTTPS, preview deployments per branch, and serverless functions. The `_headers`, `_redirects`, and `functions/` files in this kit are already set up for it.

### Deploy from GitHub, the setup you want long term

1. Push `starter/` to a GitHub repository
2. Cloudflare dashboard, **Workers & Pages**, **Create**, **Pages**, **Connect to Git**
3. Pick the repo
4. Build settings:
   - **Framework preset:** None
   - **Build command:** leave it empty
   - **Build output directory:** `/` (or `starter` if you kept the folder structure)
5. **Save and Deploy**

Every push to your main branch deploys automatically. Every pull request gets its own preview URL. That is the whole CI setup and it took four minutes.

### Deploy straight from your machine, for a quick test

```bash
npx wrangler pages deploy starter --project-name=yourapp
```

### Custom domain

1. In your Pages project, **Custom domains**, **Set up a domain**
2. Enter your domain
3. If the domain is already on Cloudflare, DNS is created for you
4. If it is not, add the CNAME they give you at your registrar

HTTPS is automatic and takes a few minutes to provision.

## Option B: Netlify

Same idea. `_headers` and `_redirects` work identically. Pages Functions do not, so `functions/api/track.js` would need porting to `netlify/functions/`.

1. Netlify, **Add new site**, **Import an existing project**
2. Build command empty, publish directory `starter`
3. Deploy

## Option C: GitHub Pages

Works, with two caveats worth knowing before you pick it.

1. No serverless functions. Delete `functions/` or ignore it
2. If you deploy to `username.github.io/repo/` rather than a custom domain, every absolute path in the app breaks

To fix the paths for a subdirectory deploy, change these to relative paths:

- `index.html`: `/app.css` to `app.css`, `/app.js` to `app.js`, `/manifest.webmanifest` to `manifest.webmanifest`, icon paths
- `app.js`: `navigator.serviceWorker.register('/sw.js')` to `'sw.js'`
- `sw.js`: every entry in `SHELL`
- `manifest.webmanifest`: `start_url`, `scope`, icon paths

Honestly, use a custom domain on Cloudflare Pages instead. It is free and it avoids all of this.

## Before every deploy

- [ ] **Bump `CACHE_VERSION` in `sw.js`.** If you forget this, returning users get the old cached files and your fix does not reach them. This is the single most common "why is my change not live" cause
- [ ] Test with the network disabled, does it still open
- [ ] Test in a private window, which is a first-time visitor with no storage
- [ ] Check the console for errors on a fresh load
- [ ] Check the share preview by pasting the URL into a chat

## After deploying

- [ ] Open the live URL on a real phone
- [ ] Add it to your home screen, does the icon look right and does it open standalone
- [ ] Turn on airplane mode and open it again, does it still work
- [ ] Check that `/api/track` responds (a GET should return a clean 405, which proves the function deployed)

## Headers and caching

`_headers` ships with sane defaults:

- Security headers on everything
- `no-cache` on `index.html` and `sw.js`, so updates land immediately
- A week of caching on icons

**Why `sw.js` must not be cached long.** The service worker is what controls caching for everything else. If the browser caches the old worker, you cannot ship a cache fix. Keep it `no-cache`, always.

If you later fingerprint your assets (`app.a1b2c3.css`), you can cache those forever and drop the `no-cache` on everything except the shell and the worker.

## Environment variables and secrets

For Pages Functions, set them in the dashboard under **Settings**, **Environment variables**. They arrive as `env.YOUR_KEY` in the function's context.

**Never put a secret in `app.js`.** Anything in client-side code is public, including a key you "hid" in a variable. If a call needs a secret, it goes through a Pages Function.

## Custom domain email, DNS, the works

Out of scope for this doc, but the short version: your domain's DNS can point web traffic at Pages and mail at a separate provider without conflict. Web uses CNAME or A records, mail uses MX. They do not interfere.

## Rolling back

Cloudflare Pages keeps every deployment. Dashboard, **Deployments**, find the good one, **Rollback**. Live in seconds.

Which is the other reason to deploy from Git: every deployment is tied to a commit, so a rollback is obvious rather than archaeological.
