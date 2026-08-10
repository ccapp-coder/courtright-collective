/**
 * Scheduling. Cheap plumbing, one reasoning moment per account per day.
 *
 * Run this once an hour from a cron and it fires the rundown for the accounts whose local
 * morning it currently is. Accounts that are locked or suspended are skipped before any
 * reasoning happens, so a paused account costs nothing to keep scheduled.
 *
 * The nightly memory refresh runs from here too. It never spends tokens, and it runs even
 * for suspended accounts so a returning owner comes back to a sharper advisor.
 */

import { CONFIG } from '../../../config/index.js';
import { evaluateAdvisorAccess } from '../gate/gate.js';

/**
 * @param {object} deps
 * @param {(accountId: string) => Promise<ReturnType<import('../advisor.js').createAdvisor>>} deps.advisorFor
 * @param {import('../memory/store.js').AdvisorStore} deps.store
 * @param {string[]} accountIds
 * @param {object} [options] {now, hour, config, logger}
 */
export async function runDailyRundowns(deps, accountIds, options = {}) {
  const config = options.config || CONFIG;
  const now = options.now ? new Date(options.now) : new Date();
  const log = options.logger || (() => {});
  const results = { sent: [], skipped: [], failed: [] };

  for (const accountId of accountIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const access = await evaluateAdvisorAccess(deps.store, accountId, { config, now });
      if (!access.allowed) {
        results.skipped.push({ accountId, reason: access.state });
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const advisor = await deps.advisorFor(accountId);
      // eslint-disable-next-line no-await-in-loop
      const rundown = await advisor.generateDailyRundown(accountId, { now });
      results.sent.push({ accountId, adviceLogId: rundown.adviceLogId, cached: Boolean(rundown.cached) });
      log(`rundown ${accountId} ${rundown.cached ? 'cached' : 'generated'}`);
    } catch (err) {
      results.failed.push({ accountId, message: String(err.message || err) });
    }
  }

  return results;
}

/**
 * The nightly pass that grows memory from module data. No model calls, so this can run for
 * every account every night without thinking about cost.
 */
export async function runMemoryRefresh(deps, accountIds, options = {}) {
  const results = { refreshed: [], failed: [] };
  for (const accountId of accountIds) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const advisor = await deps.advisorFor(accountId);
      // eslint-disable-next-line no-await-in-loop
      const result = await advisor.refreshMemory(accountId, options);
      results.refreshed.push({
        accountId,
        facts: result.facts.length,
        observations: result.observations.length,
      });
    } catch (err) {
      results.failed.push({ accountId, message: String(err.message || err) });
    }
  }
  return results;
}

/** The cron expression the platform should register, straight from config. */
export function rundownSchedule(config = CONFIG) {
  return {
    cron: config.rundown.scheduleCron,
    timezoneFallback: config.rundown.timezoneFallback,
  };
}

export default { runDailyRundowns, runMemoryRefresh, rundownSchedule };
