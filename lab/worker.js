/**
 * lab.courtrightco.com, the Lab door.
 *
 * One password, entered once. Signing in mints a signed token in a cookie
 * scoped to `.courtrightco.com`, and because a cookie on the parent domain is
 * sent to every subdomain beneath it, every module harness, trends, charted,
 * contact, gated, jotted, paid, solved, verifies it locally with no
 * redirect, no network call and no shared database. Their copies of
 * `lib/lab-gate.ts` recompute the HMAC below with the SAME `LAB_SECRET`.
 *
 * This Worker is deliberately standalone and self-contained: one file, no
 * assets, no bindings. Deploy it as its own Worker (named `lab`) with the
 * custom domain lab.courtrightco.com, either with `wrangler deploy` from this
 * directory or by pasting this file into the dashboard editor.
 *
 * Two secrets (`wrangler secret put`, or Settings → Variables):
 *
 *   LAB_PASSWORD  what Dillon types at lab.courtrightco.com
 *   LAB_SECRET    what signs the token. MUST equal the LAB_SECRET on every
 *                 module harness Worker, or the modules will refuse the
 *                 cookie. Rotating it signs everyone out everywhere at once,
 *                 which is the designed blast radius.
 *
 * ── Why the links carry keys right now ──────────────────────────────────────
 * The harnesses are deployed on workers.dev, not yet on their courtrightco.com
 * subdomains, because those hostnames are still served by the
 * `courtright-modules` Worker and a harness deploy with its route armed would
 * seize them. A cookie scoped to `.courtrightco.com` is not sent to a
 * workers.dev hostname, so the shared lab session cannot reach them there.
 * Each link therefore carries that module's own preview key, which is the
 * single-module door that already existed. At subdomain cutover the keys come
 * out of these URLs and the cookie does the work it was built for.
 *
 * ── What this is, and is not ────────────────────────────────────────────────
 * This keeps unfinished work out of public view. It is NOT real user
 * authentication: never put real client data behind it. The Lab test
 * database holds test data only.
 *
 * Failing closed: a missing secret, wrong password, malformed token or
 * expired timestamp all end at the password form. No branch opens by
 * accident, and unset secrets open nothing.
 */

const LAB_COOKIE = "cc_lab";
const TOKEN_VERSION = "v1";
/** Sign in once, stay in for thirty days. Token expiry and cookie age agree. */
const SESSION_SECONDS = 60 * 60 * 24 * 30;

// Display names are the CURRENT product names; the hostnames keep their
// original slugs per the rename rule (Trend still lives at trends., Listed at
// contact.), moving a subdomain is a DNS/Worker decision, not a copy edit.
//
// Gated and Paid serve their marketing page at `/` and the working module at
// `/app`. The other five serve the module at `/`. The Lab links to the module,
// never to the sales page: this side of the door is for using the thing.
const MODULES = [
  [
    "Trend",
    "https://trends-harness.tinkertapsapp.workers.dev/?k=trends-preview-8821",
    "The intelligence layer. How the business is doing, in plain language.",
  ],
  [
    "Charted",
    "https://charted-harness.tinkertapsapp.workers.dev/?k=charted-preview-8821",
    "The progress tracker. How far the people you serve have come.",
  ],
  [
    "Listed",
    "https://contact-harness.tinkertapsapp.workers.dev/?k=contact-preview-8821",
    "The CRM with no industry vocabulary. Name your own roles.",
  ],
  [
    "Gated",
    "https://gated.tinkertapsapp.workers.dev/app?key=gated-preview-8821",
    "Premium content behind a door, and the key for sale.",
  ],
  [
    "Jotted",
    "https://jotted-harness.tinkertapsapp.workers.dev/?k=jotted-preview-8821",
    "The field kit. Assess, price, sign, on a phone, on the job.",
  ],
  [
    "Paid",
    "https://paid.tinkertapsapp.workers.dev/app?key=paid-preview-8821",
    "Take card payments and see revenue with the real fee maths.",
  ],
  [
    "Solved",
    "https://solved-harness.tinkertapsapp.workers.dev/?k=solved-preview-8821",
    "The team workspace. Part document, part visual board.",
  ],
];

// ── Crypto helpers, must mirror the modules' lab-gate.ts ───────────────────

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

/** Compare without leaking where two strings first differ. */
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function mintToken(secret) {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  const signature = await hmac(secret, `${TOKEN_VERSION}.${expiresAt}`);
  return `${TOKEN_VERSION}.${expiresAt}.${signature}`;
}

async function verifyToken(secret, token) {
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAt, signature] = parts;
  if (version !== TOKEN_VERSION) return false;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry)) return false;
  if (expiry < Math.floor(Date.now() / 1000)) return false;
  return constantTimeEqual(signature, await hmac(secret, `${version}.${expiresAt}`));
}

function readCookie(request, name) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

// ── Pages ───────────────────────────────────────────────────────────────────

/**
 * Courtright Collective, after dark.
 *
 * Same tokens as courtrightco.com, Cormorant Garamond for display, Outfit for
 * body, copper and gold on midnight, with the palette inverted, because the
 * public site is parchment and this is the back room.
 */
const SHELL = (title, body, wide) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400&family=Outfit:wght@300;400;500;600;700&display=swap">
<style>
  :root {
    --midnight:  #0E1520;
    --ash:       #1A2030;
    --copper:    #C45C28;
    --copper-lt: #D97040;
    --gold:      #D9A030;
    --gold-lt:   #F0B840;
    --smoke:     #7A7268;
    --parchment: #F4EBD9;
    --cream:     #FAF6EF;
    --display: 'Cormorant Garamond', Georgia, serif;
    --body:    'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    color-scheme: dark;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--midnight); color: var(--parchment);
    font-family: var(--body); line-height: 1.6; -webkit-font-smoothing: antialiased;
    background-image:
      radial-gradient(60rem 40rem at 12% -10%, rgba(196,92,40,0.16), transparent 60%),
      radial-gradient(50rem 36rem at 92% 8%, rgba(217,160,48,0.10), transparent 62%);
  }
  main { width: 100%; max-width: ${wide ? "760px" : "520px"}; padding: 56px 24px; }

  .brand {
    font-family: var(--display); font-weight: 300; letter-spacing: 0.16em;
    text-transform: uppercase; font-size: 0.82rem; color: var(--smoke);
    margin: 0 0 26px; display: block; text-decoration: none;
  }
  .brand span { color: var(--copper-lt); }

  h1 {
    font-family: var(--display); font-weight: 300; font-size: 3rem; line-height: 1.05;
    letter-spacing: 0.01em; margin: 0 0 10px; color: var(--cream);
  }
  h1 em { font-style: italic; color: var(--gold); }
  p.sub { color: var(--smoke); font-size: 0.98rem; margin: 0 0 30px; max-width: 46ch; }

  form { display: flex; gap: 10px; flex-wrap: wrap; }
  input[type="password"] {
    flex: 1 1 220px; background: var(--ash); color: var(--cream);
    border: 1px solid rgba(244,235,217,0.14); border-radius: 6px;
    padding: 0.85rem 1rem; font-family: var(--body); font-size: 1rem;
  }
  input[type="password"]:focus { outline: none; border-color: var(--copper); }
  button {
    background: var(--copper); color: var(--cream); border: 0; border-radius: 6px;
    padding: 0.85rem 1.9rem; font-family: var(--body); font-weight: 600;
    font-size: 0.95rem; letter-spacing: 0.04em; cursor: pointer;
    transition: all 0.25s ease;
  }
  button:hover { background: var(--copper-lt); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(196,92,40,0.3); }

  .notice {
    color: var(--gold-lt); font-size: 0.9rem; margin: 0 0 16px;
    border-left: 2px solid var(--gold); padding-left: 12px;
  }

  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  @media (min-width: 620px) { ul { grid-template-columns: 1fr 1fr; } }
  li a {
    display: block; height: 100%; background: var(--ash);
    border: 1px solid rgba(244,235,217,0.08); border-left: 2px solid transparent;
    border-radius: 8px; padding: 1.1rem 1.25rem; text-decoration: none; color: inherit;
    transition: all 0.2s ease;
  }
  li a:hover {
    border-left-color: var(--copper); background: #1E2537; transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.28);
  }
  li b {
    display: block; font-family: var(--display); font-weight: 600;
    font-size: 1.5rem; letter-spacing: 0.01em; color: var(--cream); margin-bottom: 3px;
  }
  li span { display: block; color: var(--smoke); font-size: 0.88rem; line-height: 1.55; }

  footer {
    margin-top: 32px; padding-top: 18px; border-top: 1px solid rgba(244,235,217,0.08);
    color: var(--smoke); font-size: 0.82rem; line-height: 1.7;
  }
  footer a { color: var(--gold); text-decoration: none; border-bottom: 1px solid rgba(217,160,48,0.35); }
  footer a:hover { color: var(--gold-lt); }
</style>
</head>
<body><main>${body}</main></body>
</html>`;

function passwordPage(notice) {
  return SHELL(
    "The Lab | Courtright Collective",
    `<span class="brand">Courtright <span>Collective</span></span>
     <h1>The <em>Lab</em></h1>
     <p class="sub">One password opens every module. Nothing here is public.</p>
     ${notice ? `<p class="notice">${notice}</p>` : ""}
     <form method="post" action="/">
       <input type="password" name="password" autocomplete="current-password" autofocus aria-label="Lab password">
       <button type="submit">Enter</button>
     </form>`,
    false,
  );
}

function hubPage() {
  const items = MODULES.map(
    ([name, url, blurb]) =>
      `<li><a href="${url}"><b>${name}</b><span>${blurb}</span></a></li>`,
  ).join("");
  return SHELL(
    "The Lab | Courtright Collective",
    `<span class="brand">Courtright <span>Collective</span></span>
     <h1>The <em>Lab</em></h1>
     <p class="sub">Seven modules, one door. Each link opens the working module,
     not its sales page.</p>
     <ul>${items}</ul>
     <footer>
       Test data only. This side of the door is never real client data.
       These are the lab deploys on workers.dev, and each link carries its own
       module key; at subdomain cutover they become plain courtrightco.com
       hostnames and the shared cookie takes over. <a href="/out">Sign out</a>
     </footer>`,
    true,
  );
}

const HTML_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

function labCookie(value, maxAge) {
  return (
    `${LAB_COOKIE}=${value}; Domain=.courtrightco.com; Path=/; Max-Age=${maxAge}; ` +
    `HttpOnly; Secure; SameSite=Lax`
  );
}

// ── The Worker ──────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      if (request.method === "POST") {
        // Wrong password and missing config look identical from outside:
        // the form again, with the same line. No oracle for probing.
        const form = await request.formData().catch(() => null);
        const attempt = form?.get("password");

        if (
          env.LAB_PASSWORD &&
          env.LAB_SECRET &&
          typeof attempt === "string" &&
          constantTimeEqual(attempt, env.LAB_PASSWORD)
        ) {
          const token = await mintToken(env.LAB_SECRET);
          return new Response(null, {
            status: 303,
            headers: {
              location: "/",
              "set-cookie": labCookie(token, SESSION_SECONDS),
              "cache-control": "no-store",
            },
          });
        }

        return new Response(passwordPage("That was not it."), {
          status: 401,
          headers: HTML_HEADERS,
        });
      }

      const signedIn = await verifyToken(
        env.LAB_SECRET,
        readCookie(request, LAB_COOKIE),
      );
      return new Response(signedIn ? hubPage() : passwordPage(""), {
        headers: HTML_HEADERS,
      });
    }

    if (url.pathname === "/out") {
      return new Response(null, {
        status: 303,
        headers: {
          location: "/",
          "set-cookie": labCookie("", 0),
          "cache-control": "no-store",
        },
      });
    }

    // There is exactly one page here. Everything else, robots.txt included,
    // goes home rather than 404ing into curiosity.
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { "content-type": "text/plain", "cache-control": "no-store" },
      });
    }

    return Response.redirect(new URL("/", url.origin).toString(), 302);
  },
};
