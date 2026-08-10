/**
 * Transport agnostic HTTP surface for the advisor.
 *
 * The same routes serve both interfaces:
 *   - the human UI calls /api/advisor/* directly
 *   - an AI employee calls /api/advisor/tool with a tool name and input, which dispatches
 *     into the identical shared functions
 *
 * handleAdvisorRequest takes a plain object and returns a plain object so it can be mounted
 * on a Cloudflare Worker, a Node server, an Express app, or called straight from a test.
 */

import { dispatchAdvisorTool, toToolResult, ADVISOR_TOOLS } from '../tools/toolDefinitions.js';
import { AdvisorGateError } from '../gate/gate.js';
import { AdvisorCapError } from '../usage/cap.js';

const PREFIX = '/api/advisor';

/**
 * @param {ReturnType<import('../advisor.js').createAdvisor>} advisor
 * @param {object} req {method, path, body, accountId}
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleAdvisorRequest(advisor, req) {
  const method = (req.method || 'GET').toUpperCase();
  const path = (req.path || '').replace(/\/+$/, '') || PREFIX;
  const body = req.body || {};
  const accountId = req.accountId || body.account_id;

  try {
    if (!path.startsWith(PREFIX)) return { status: 404, body: { error: 'not_found' } };
    const route = path.slice(PREFIX.length) || '/';

    if (route === '/tools' && method === 'GET') {
      return { status: 200, body: { tools: ADVISOR_TOOLS } };
    }

    if (!accountId) return { status: 400, body: { error: 'account_id_required' } };

    switch (`${method} ${route}`) {
      case 'GET /home':
        return ok(await advisor.getAdvisorHome(accountId, { includeRundown: body.include_rundown !== false }));

      case 'GET /usage':
        return ok(await advisor.getUsage(accountId));

      case 'GET /snapshot':
        return ok(await advisor.getAccountSnapshot(accountId));

      case 'POST /rundown':
        return ok(await advisor.generateDailyRundown(accountId, { force: Boolean(body.force) }));

      case 'POST /ask':
        return ok(await advisor.answerAdvisorAsk(accountId, body.question));

      case 'POST /fruit':
        return ok(await advisor.findLowHangingFruit(accountId, { limit: body.limit }));

      case 'POST /pitch':
        return ok(await advisor.suggestPitch(accountId, body.client_id));

      case 'POST /weekly':
        return ok(await advisor.weeklyReview(accountId));

      case 'POST /outcome':
        return ok(
          await advisor.recordAdviceOutcome(body.advice_log_id, Boolean(body.taken), body.result, {
            helpful: body.helpful,
          }),
        );

      case 'POST /memory/refresh':
        return ok(await advisor.refreshMemory(accountId));

      case 'POST /modules':
        // Toggling a module is a platform concern. It lives here so the demo and the tests
        // can move an account between LOCKED, ACTIVE and SUSPENDED without a second service.
        await advisor.store.setModuleEnabled(accountId, body.module_id, Boolean(body.enabled), true);
        return ok(await advisor.getAdvisorHome(accountId, { includeRundown: false }));

      case 'POST /tool': {
        const result = await dispatchAdvisorTool(advisor, body.name, {
          ...(body.input || {}),
          account_id: (body.input && body.input.account_id) || accountId,
        });
        return ok(toToolResult(result));
      }

      default:
        return { status: 404, body: { error: 'not_found', route } };
    }
  } catch (err) {
    if (err instanceof AdvisorGateError || err.code === 'advisor_gated') {
      return { status: 403, body: { error: 'advisor_gated', access: err.access, message: err.message } };
    }
    if (err instanceof AdvisorCapError || err.code === 'advisor_cap_reached') {
      return { status: 429, body: { error: 'advisor_cap_reached', notice: err.notice, usage: err.usage } };
    }
    if (err.code === 'advisor_locked') {
      return { status: 402, body: { error: 'advisor_locked', detail: err.detail, message: err.message } };
    }
    return { status: 500, body: { error: 'advisor_error', message: String(err.message || err) } };
  }
}

function ok(body) {
  return { status: 200, body };
}

/**
 * Cloudflare Worker or any fetch based runtime.
 * @param {() => Promise<ReturnType<import('../advisor.js').createAdvisor>>} advisorFor
 */
export function createFetchHandler(advisorFor, options = {}) {
  return async function handle(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PREFIX)) return null;

    const accountId = options.resolveAccountId
      ? await options.resolveAccountId(request, env, ctx)
      : request.headers.get('x-account-id');

    let body = {};
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.json().catch(() => ({}));
    }

    const advisor = await advisorFor(env, ctx);
    const result = await handleAdvisorRequest(advisor, {
      method: request.method,
      path: url.pathname,
      body,
      accountId,
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: { 'content-type': 'application/json' },
    });
  };
}

export default handleAdvisorRequest;
