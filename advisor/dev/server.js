/**
 * Local dev server so the advisor can be clicked through immediately.
 *
 *   node advisor/dev/server.js
 *   open http://localhost:8787/aimtogro/dashboard.html
 *
 * Serves the repo as static files and mounts the advisor API at /api/advisor against a
 * single seeded demo account that lives for the life of the process. With no
 * ANTHROPIC_API_KEY set it runs on the stub writer and costs nothing. Set the key and it
 * makes real calls with the model named in config/advisor.config.json.
 */

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDemoAdvisor } from '../src/demo/seed.js';
import { handleAdvisorRequest } from '../src/http/router.js';
import { CONFIG } from '../../config/index.js';

const ROOT = normalize(join(fileURLToPath(new URL('.', import.meta.url)), '..', '..'));
const PORT = Number(process.env.PORT || 8787);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

const hasKey = Boolean(process.env[CONFIG.model.apiKeyEnvVar]);
const { advisor, accountId } = await createDemoAdvisor({
  provider: hasKey ? CONFIG.model.provider : 'stub',
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/advisor')) {
    let body = {};
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = await readJson(req);
    }
    const result = await handleAdvisorRequest(advisor, {
      method: req.method,
      path: url.pathname,
      body,
      accountId: req.headers['x-account-id'] || accountId,
    });
    res.writeHead(result.status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(result.body));
    return;
  }

  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const filePath = normalize(join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) {
      res.writeHead(302, { location: `${pathname.replace(/\/$/, '')}/index.html` }).end();
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, { 'content-type': TYPES[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
  }
});

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

server.listen(PORT, () => {
  process.stdout.write(
    [
      `Aimtogro advisor dev server on http://localhost:${PORT}`,
      `  dashboard: http://localhost:${PORT}/aimtogro/dashboard.html`,
      `  api:       http://localhost:${PORT}/api/advisor/home`,
      `  account:   ${accountId}`,
      `  model:     ${hasKey ? CONFIG.model.reasoningModel : 'stub (no API key set, zero cost)'}`,
      '',
    ].join('\n'),
  );
});
