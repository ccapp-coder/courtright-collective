/**
 * Transports for the advisor panel.
 *
 *   createHttpTransport   production. Calls /api/advisor/* on the Aimtogro backend.
 *   createLocalTransport  the seeded demo. Runs the real advisor service in the browser
 *                         against the in memory store and the zero token stub writer, so
 *                         the panel can be clicked through with no backend and no API key.
 *
 * Both satisfy the same interface, which is why the panel never knows the difference.
 */

const BASE = '/api/advisor';

export function createHttpTransport(options = {}) {
  const base = options.base || BASE;
  const headers = { 'content-type': 'application/json' };
  if (options.accountId) headers['x-account-id'] = options.accountId;

  async function call(method, path, body) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      credentials: options.credentials || 'same-origin',
      body: method === 'GET' ? undefined : JSON.stringify(body || {}),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(payload.message || payload.error || `request failed: ${res.status}`);
      err.status = res.status;
      err.body = payload;
      throw err;
    }
    return payload;
  }

  return {
    home: () => call('GET', '/home'),
    rundown: (force) => call('POST', '/rundown', { force: Boolean(force) }),
    ask: (question) => call('POST', '/ask', { question }),
    fruit: (limit) => call('POST', '/fruit', { limit }),
    pitch: (clientId) => call('POST', '/pitch', { client_id: clientId }),
    weekly: () => call('POST', '/weekly'),
    outcome: (adviceLogId, taken, result, helpful) =>
      call('POST', '/outcome', { advice_log_id: adviceLogId, taken, result, helpful }),
    setModule: options.allowModuleToggle
      ? (moduleId, enabled) => call('POST', '/modules', { module_id: moduleId, enabled })
      : undefined,
  };
}

/**
 * The demo transport. Imports the same service the server runs.
 * @param {object} [options] {enabledModules, advisorActive}
 */
export async function createLocalTransport(options = {}) {
  const [{ createDemoAdvisor }, { handleAdvisorRequest }] = await Promise.all([
    import('../../advisor/src/demo/seed.js'),
    import('../../advisor/src/http/router.js'),
  ]);

  const { advisor, accountId } = await createDemoAdvisor({
    enabledModules: options.enabledModules,
    advisorActive: options.advisorActive,
  });

  async function call(method, path, body) {
    const res = await handleAdvisorRequest(advisor, { method, path: `${BASE}${path}`, body, accountId });
    if (res.status >= 400) {
      const err = new Error(res.body.message || res.body.error);
      err.status = res.status;
      err.body = res.body;
      throw err;
    }
    return res.body;
  }

  return {
    accountId,
    advisor,
    home: () => call('GET', '/home'),
    rundown: (force) => call('POST', '/rundown', { force: Boolean(force) }),
    ask: (question) => call('POST', '/ask', { question }),
    fruit: (limit) => call('POST', '/fruit', { limit }),
    pitch: (clientId) => call('POST', '/pitch', { client_id: clientId }),
    weekly: () => call('POST', '/weekly'),
    outcome: (adviceLogId, taken, result, helpful) =>
      call('POST', '/outcome', { advice_log_id: adviceLogId, taken, result, helpful }),
    setModule: (moduleId, enabled) => call('POST', '/modules', { module_id: moduleId, enabled }),
  };
}

export default { createHttpTransport, createLocalTransport };
