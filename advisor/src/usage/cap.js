/**
 * The cap. Measured in ADVISORY MOMENTS, never in tokens.
 *
 * An owner should never see the word token. They see "you have used 212 of your 300 asks
 * this month", which is a number a human can reason about, and which happens to track cost
 * almost exactly because every moment is one bounded reasoning call on a bounded context
 * bundle.
 *
 *  - one daily rundown per day is included and never counted
 *  - everything else draws from the monthly ask pool
 *  - at 80 percent of the pool a gentle note appears offering the AI Employee tier
 *  - the pool is a soft product boundary and a hard cost boundary at the same time
 */

import { CONFIG } from '../../../config/index.js';
import { periodKey, dayKey } from '../memory/store.js';

export const MOMENT_COST = Object.freeze({
  daily_rundown: 0, // first of the day, see checkMoment
  ask: 1,
  low_hanging_fruit: 1,
  pitch: 1,
  weekly_review: 1,
});

function interpolate(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    values[key] === undefined ? `{${key}}` : String(values[key]),
  );
}

/**
 * Current usage for the account, in the units the owner sees.
 */
export async function getUsageSnapshot(store, accountId, options = {}) {
  const config = options.config || CONFIG;
  const now = options.now ? new Date(options.now) : new Date();
  const pk = periodKey(now);
  const dk = dayKey(now);

  const [asksUsed, rundownsToday] = await Promise.all([
    store.countUsage(accountId, { periodKey: pk, billedOnly: true }),
    store.countUsage(accountId, { dayKey: dk, momentType: 'daily_rundown' }),
  ]);

  const pool = config.cap.monthlyAskPool;
  const remaining = Math.max(0, pool - asksUsed);
  const percent = pool > 0 ? asksUsed / pool : 0;
  const softCeiling = percent >= config.cap.softCeilingAtPercent;
  const hardStopped = config.cap.hardStopAtPool && asksUsed >= pool;

  let notice = null;
  if (hardStopped) {
    notice = {
      level: 'hard',
      ...renderCopy(config.cap.hardStopCopy, { used: asksUsed, pool, remaining }),
      upgradeTiers: config.employeeTiers,
    };
  } else if (softCeiling) {
    notice = {
      level: 'soft',
      ...renderCopy(config.cap.softCeilingCopy, { used: asksUsed, pool, remaining }),
      upgradeTiers: config.employeeTiers,
    };
  }

  return {
    periodKey: pk,
    dayKey: dk,
    unit: config.cap.unit,
    asksUsed,
    pool,
    remaining,
    percent: Number(percent.toFixed(3)),
    rundownsToday,
    includedDailyRundowns: config.cap.includedDailyRundownsPerDay,
    softCeiling,
    hardStopped,
    notice,
  };
}

function renderCopy(copy, values) {
  return {
    headline: interpolate(copy.headline, values),
    body: interpolate(copy.body, values),
    cta: copy.cta,
  };
}

/**
 * Decide whether a moment may run, and whether it draws from the pool.
 * Called before the reasoning happens so a blocked moment costs nothing.
 *
 * @returns {Promise<{allowed: boolean, billed: boolean, usage: object, notice: object|null, reason?: string}>}
 */
export async function checkMoment(store, accountId, momentType, options = {}) {
  const config = options.config || CONFIG;
  const usage = await getUsageSnapshot(store, accountId, options);

  if (momentType === 'daily_rundown') {
    const included = usage.rundownsToday < config.cap.includedDailyRundownsPerDay;
    if (included) {
      return { allowed: true, billed: false, usage, notice: usage.notice };
    }
    if (!config.cap.extraRundownCostsAnAsk) {
      return { allowed: true, billed: false, usage, notice: usage.notice };
    }
    // Extra rundowns behave like an ask from here.
  }

  if (usage.hardStopped) {
    return {
      allowed: false,
      billed: false,
      usage,
      notice: usage.notice,
      reason: 'ask_pool_exhausted',
    };
  }

  return { allowed: true, billed: true, usage, notice: usage.notice };
}

/**
 * Record a moment that actually ran. Recorded AFTER the reasoning call succeeds so a
 * failed call never costs the owner an ask.
 */
export async function recordMoment(store, accountId, momentType, options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  await store.recordUsage(accountId, {
    momentType,
    billed: options.billed !== false,
    periodKey: periodKey(now),
    dayKey: dayKey(now),
  });
  return getUsageSnapshot(store, accountId, options);
}

/** Raised when the pool is spent. Carries the upsell payload the UI renders. */
export class AdvisorCapError extends Error {
  constructor(check) {
    super(check.notice ? check.notice.headline : 'advisory ask pool used up');
    this.name = 'AdvisorCapError';
    this.code = 'advisor_cap_reached';
    this.usage = check.usage;
    this.notice = check.notice;
  }
}

export default { getUsageSnapshot, checkMoment, recordMoment, AdvisorCapError, MOMENT_COST };
