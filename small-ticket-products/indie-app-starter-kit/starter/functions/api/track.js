/**
 * Cloudflare Pages Function, POST /api/track
 *
 * A working example of a serverless endpoint. Pages picks this up
 * automatically from the functions/ directory. No config, no build.
 *
 * Exporting onRequest handles every method in one place, so a GET
 * gets a clear 405 instead of a mystery. Pages also supports
 * onRequestPost / onRequestGet if you prefer one export per method.
 *
 * Right now it validates the payload and returns 204. Swap the
 * "do something with it" block for a real destination when you have
 * one: a KV namespace, a D1 table, or a fetch to your analytics tool.
 */
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Body must be JSON' }, 400);
  }

  const { event, props = {}, ts } = payload || {};
  if (typeof event !== 'string' || !event.trim()) {
    return json({ error: 'event is required' }, 400);
  }
  if (event.length > 64) {
    return json({ error: 'event name too long' }, 400);
  }

  const record = {
    event: event.trim(),
    props,
    ts: Number(ts) || Date.now(),
    country: request.headers.get('cf-ipcountry') || 'unknown',
    // Do not log IP addresses or user agents unless your privacy
    // policy says you do, and unless you genuinely need them.
  };

  // ── Do something with it ──────────────────────────────────
  // With a KV namespace bound as EVENTS in your Pages settings:
  //
  //   await env.EVENTS.put(`${record.ts}-${crypto.randomUUID()}`,
  //                        JSON.stringify(record),
  //                        { expirationTtl: 60 * 60 * 24 * 90 });
  //
  // Or forward it to whatever tool you already use.
  console.log('event', record);

  // 204 keeps the response tiny. sendBeacon does not read the body anyway.
  return new Response(null, { status: 204 });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
