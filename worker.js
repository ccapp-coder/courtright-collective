/**
 * courtrightco.com.
 *
 * The static marketing site, plus one private surface at /lab: a password door
 * that mints a session cookie scoped to `.courtrightco.com`, which every module
 * subdomain beneath it receives and verifies on its own with the same secret.
 *
 * Everything that is not /lab is handed straight back to the assets binding, so
 * the public site behaves exactly as it did before this worker existed. If both
 * secrets are unset, /lab answers 503 and nothing else changes at all.
 *
 * Secrets required on this worker:
 *   LAB_PASSWORD  the password typed into the door
 *   LAB_SECRET    HMAC key, byte-identical on every module worker
 */

const COOKIE_NAME = "cc_lab";
const COOKIE_DOMAIN = ".courtrightco.com";
const TTL_SECONDS = 60 * 60 * 12;
const TOKEN_VERSION = "v1";

/**
 * The lab index.
 *
 * `state` is written by hand and is the honest current state, not a guess. A
 * module whose harness is not deployed opens its public page instead, which is
 * better than a link that times out.
 */
const MODULES = [
  { name: "Trends", host: "trends.courtrightco.com", blurb: "Business analytics, goals, alerts, the Analyst tier.", ready: false },
  { name: "Contact", host: "contact.courtrightco.com", blurb: "Generic CRM. Contacts, pipeline, tasks, notes.", ready: false },
  { name: "Gated", host: "gated.courtrightco.com", blurb: "Gated content and memberships.", ready: false },
  { name: "Jotted", host: "jotted.courtrightco.com", blurb: "Field kit. Assessments, photos, quotes, signature.", ready: false },
  { name: "Charted", host: "charted.courtrightco.com", blurb: "Client progress tracking and a client portal.", ready: false },
  { name: "Solved", host: "solved.courtrightco.com", blurb: "Team workspace. Canvas, comments, timeline.", ready: false },
  { name: "Paid", host: "paid.courtrightco.com", blurb: "Payments. Stripe Connect, subscriptions, receipts.", ready: false },
];

/* ------------------------------------------------------------------ crypto */

function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(signature));
}

/** Compare without leaking where two strings first differ. */
function constantTimeEquals(a, b) {
  const ab = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i += 1) diff |= ab[i] ^ bb[i];
  return diff === 0;
}

async function mintToken(secret, ttlSeconds) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = TOKEN_VERSION + "." + expiresAt;
  return payload + "." + (await hmac(secret, payload));
}

async function verifyToken(secret, token) {
  if (!secret || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const version = parts[0];
  const expiresAt = parts[1];
  const signature = parts[2];
  if (version !== TOKEN_VERSION) return false;
  const expiry = Number(expiresAt);
  if (!Number.isFinite(expiry)) return false;
  if (expiry < Math.floor(Date.now() / 1000)) return false;
  return constantTimeEquals(signature, await hmac(secret, version + "." + expiresAt));
}

/* ----------------------------------------------------------------- cookies */

function readCookie(request, name) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

function sessionCookie(token, maxAgeSeconds) {
  return [
    COOKIE_NAME + "=" + token,
    "Domain=" + COOKIE_DOMAIN,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=" + maxAgeSeconds,
  ].join("; ");
}

/* -------------------------------------------------------------------- html */

const PAGE_CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #10161b; color: #e7edf2; padding: 32px;
    font: 400 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  .card { width: 100%; max-width: 620px; }
  h1 { font-size: 1.35rem; font-weight: 650; margin: 0 0 6px; letter-spacing: -.01em; }
  p.sub { margin: 0 0 26px; color: #93a1ad; font-size: .92rem; }
  form.door { display: flex; gap: 10px; flex-wrap: wrap; }
  input[type=password] {
    flex: 1 1 240px; padding: 11px 13px; border-radius: 4px; border: 1px solid #2f3a44;
    background: #171f26; color: inherit; font: inherit; font-size: .95rem;
  }
  input[type=password]:focus-visible { outline: 2px solid #54b6c0; outline-offset: 1px; border-color: #54b6c0; }
  form.door button {
    padding: 11px 20px; border-radius: 4px; border: 1px solid #54b6c0; background: #54b6c0;
    color: #08171a; font: inherit; font-weight: 600; font-size: .95rem; cursor: pointer;
  }
  form.door button:hover { background: #6ec6ce; }
  button:focus-visible { outline: 2px solid #e7edf2; outline-offset: 2px; }
  .err { margin: 14px 0 0; color: #e08279; font-size: .88rem; }
  ul.mods { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  ul.mods li { border: 1px solid #2a333c; border-radius: 4px; background: #171f26; }
  ul.mods a { display: flex; flex-direction: column; gap: 3px; padding: 14px 16px; text-decoration: none; color: inherit; }
  ul.mods a:hover { border-color: #54b6c0; background: #1c252d; }
  ul.mods a:focus-visible { outline: 2px solid #54b6c0; outline-offset: -2px; }
  .row { display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
  .nm { font-weight: 650; }
  .st { font-size: .72rem; color: #8794a0; white-space: nowrap; }
  .bl { font-size: .86rem; color: #93a1ad; }
  .foot { margin-top: 24px; display: flex; justify-content: space-between; gap: 12px; align-items: center; font-size: .82rem; color: #77848f; }
  .foot button { background: none; border: none; color: #93a1ad; padding: 0; font: inherit; font-size: .82rem; text-decoration: underline; cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

function htmlResponse(body, status) {
  return new Response(body, {
    status: status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
    },
  });
}

function shell(inner) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex, nofollow, noarchive">' +
    "<title>Lab</title><style>" + PAGE_CSS + "</style></head><body>" +
    '<main class="card">' + inner + "</main></body></html>";
}

function loginPage(showError) {
  return shell(
    "<h1>Courtright Lab</h1>" +
    '<p class="sub">Private. Modules under test.</p>' +
    '<form class="door" method="post" action="/lab">' +
    '<input type="password" name="password" autocomplete="current-password" aria-label="Password" autofocus required>' +
    '<button type="submit">Enter</button></form>' +
    (showError ? '<p class="err">That password did not match. Try again.</p>' : ""),
  );
}

function indexPage() {
  const items = MODULES.map(function (m) {
    const href = "https://" + m.host + "/";
    const state = m.ready ? "harness live" : "public page only";
    return '<li><a href="' + href + '">' +
      '<span class="row"><span class="nm">' + m.name + '</span>' +
      '<span class="st">' + state + "</span></span>" +
      '<span class="bl">' + m.blurb + "</span></a></li>";
  }).join("");

  return shell(
    "<h1>Courtright Lab</h1>" +
    '<p class="sub">Your session is good on every courtrightco.com module for the next 12 hours.</p>' +
    '<ul class="mods">' + items + "</ul>" +
    '<div class="foot"><span>A module whose harness is not deployed opens its public page.</span>' +
    '<form method="post" action="/lab/signout"><button type="submit">Sign out</button></form></div>',
  );
}

/* ------------------------------------------------------------------ router */

async function handleLab(request, env, url) {
  // Fails closed. An unconfigured door opens nothing, and says so plainly
  // rather than pretending the path does not exist, because the person hitting
  // it is the owner.
  if (!env.LAB_SECRET || !env.LAB_PASSWORD) {
    return htmlResponse(
      shell("<h1>Courtright Lab</h1><p class=\"sub\">The lab is not configured yet. Set LAB_PASSWORD and LAB_SECRET on this worker.</p>"),
      503,
    );
  }

  if (url.pathname === "/lab/signout") {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
    }
    const headers = new Headers({ location: "/lab" });
    headers.append("set-cookie", sessionCookie("", 0));
    return new Response(null, { status: 303, headers: headers });
  }

  if (request.method === "POST") {
    const form = await request.formData();
    const supplied = String(form.get("password") || "");
    if (!constantTimeEquals(supplied, env.LAB_PASSWORD)) {
      return htmlResponse(loginPage(true), 401);
    }
    const token = await mintToken(env.LAB_SECRET, TTL_SECONDS);
    const headers = new Headers({ location: "/lab" });
    headers.append("set-cookie", sessionCookie(token, TTL_SECONDS));
    return new Response(null, { status: 303, headers: headers });
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const valid = await verifyToken(env.LAB_SECRET, readCookie(request, COOKIE_NAME));
    return htmlResponse(valid ? indexPage() : loginPage(false), 200);
  }

  return new Response("Method not allowed", { status: 405, headers: { allow: "GET, POST" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/lab" || url.pathname === "/lab/signout") {
      return handleLab(request, env, url);
    }

    // Everything else is the site exactly as it was.
    return env.ASSETS.fetch(request);
  },
};
