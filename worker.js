/**
 * courtrightco.com — static site plus the Lab door.
 *
 * Static assets keep serving exactly as before: Cloudflare serves any path
 * that matches a file in this repo without invoking this Worker. Only paths
 * with no matching asset land here, and this Worker cares about exactly one
 * of them: /lab.
 *
 * ── The Lab ─────────────────────────────────────────────────────────────────
 * One password, entered once. Signing in mints a signed token in a cookie
 * scoped to `.courtrightco.com`, and because a cookie on the parent domain is
 * sent to every subdomain beneath it, every module harness — trends, charted,
 * contact, gated, jotted, paid, solved — verifies it locally with no
 * redirect, no network call and no shared database. Their copies of
 * `lib/lab-gate.ts` recompute the HMAC below with the SAME `LAB_SECRET`.
 *
 * That means two secrets live on this Worker (`wrangler secret put`, or the
 * dashboard's Settings → Variables):
 *
 *   LAB_PASSWORD  what Dillon types at /lab
 *   LAB_SECRET    what signs the token. MUST equal the LAB_SECRET on every
 *                 module harness Worker, or the modules will refuse the
 *                 cookie. Rotating it signs everyone out everywhere at once,
 *                 which is the designed blast radius.
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

// Display names are the CURRENT product names; the URLs keep their original
// subdomains per the rename rule (Trend still lives at trends., Listed at
// contact.) — moving a subdomain is a DNS/Worker decision, not a copy edit.
const MODULES = [
  ["Trend", "https://trends.courtrightco.com", "The intelligence layer — how the business is doing, in plain language."],
  ["Charted", "https://charted.courtrightco.com", "The progress tracker — how far the people you serve have come."],
  ["Listed", "https://contact.courtrightco.com", "The CRM with no industry vocabulary — name your own roles."],
  ["Gated", "https://gated.courtrightco.com", "Premium content behind a door, and the key for sale."],
  ["Jotted", "https://jotted.courtrightco.com", "The field kit — assess, price, sign, on a phone, on the job."],
  ["Paid", "https://paid.courtrightco.com", "Take card payments and see revenue with the real fee maths."],
  ["Solved", "https://solved.courtrightco.com", "The team workspace — part document, part visual board."],
];

// ── Crypto helpers — must mirror the modules' lab-gate.ts ───────────────────

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
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

const SHELL = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #0f1216; color: #eef1f4;
         font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { width: 100%; max-width: 560px; padding: 40px 24px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p.sub { color: #93a0ad; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
  form { display: flex; gap: 10px; }
  input[type="password"] { flex: 1; background: #171c22; color: #eef1f4; border: 1px solid #242c35;
         border-radius: 8px; padding: 10px 12px; font-size: 15px; }
  button { background: #b06a2c; color: #14100b; border: 0; border-radius: 8px; padding: 10px 18px;
         font-size: 14px; font-weight: 600; cursor: pointer; }
  .notice { color: #e0a25e; font-size: 13px; margin: 0 0 14px; }
  ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  li a { display: block; background: #171c22; border: 1px solid #242c35; border-radius: 10px;
         padding: 14px 16px; text-decoration: none; color: inherit; }
  li a:hover { border-color: #3a4552; }
  li b { display: block; font-size: 15px; margin-bottom: 2px; }
  li span { color: #93a0ad; font-size: 13px; line-height: 1.5; }
  footer { margin-top: 22px; color: #5d6a76; font-size: 12px; line-height: 1.6; }
  footer a { color: #93a0ad; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;

function passwordPage(notice) {
  return SHELL(
    "The Lab",
    `<h1>The Lab</h1>
     <p class="sub">One password opens every module. Nothing here is public.</p>
     ${notice ? `<p class="notice">${notice}</p>` : ""}
     <form method="post" action="/lab">
       <input type="password" name="password" autocomplete="current-password" autofocus aria-label="Lab password">
       <button type="submit">Enter</button>
     </form>`,
  );
}

function hubPage() {
  const items = MODULES.map(
    ([name, url, blurb]) => `<li><a href="${url}"><b>${name}</b><span>${blurb}</span></a></li>`,
  ).join("");
  return SHELL(
    "The Lab",
    `<h1>The Lab</h1>
     <p class="sub">Signed in. The cookie covers every subdomain below — click freely, no more passwords.</p>
     <ul>${items}</ul>
     <footer>
       Test data only — this side of the door is never real client data.
       Each module also has its own single-module share key for handing one
       module to one person. <a href="/lab/out">Sign out</a>
     </footer>`,
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

    if (url.pathname === "/lab") {
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
              location: "/lab",
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

    if (url.pathname === "/lab/out") {
      return new Response(null, {
        status: 303,
        headers: {
          location: "/lab",
          "set-cookie": labCookie("", 0),
          "cache-control": "no-store",
        },
      });
    }

    // Everything else is the ordinary static site. Paths that match a file
    // never reach this Worker at all; this fallback covers the ones that
    // don't, so 404s behave exactly as they did before the Lab existed.
    return env.ASSETS.fetch(request);
  },
};
