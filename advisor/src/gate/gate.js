/**
 * The module gate, enforced in two places.
 *
 *  1. BILLING GATE: the advisor add-on cannot be purchased or enabled while the account has
 *     zero paid modules. canPurchaseAdvisor() is what checkout calls.
 *  2. RUNTIME GATE: every advisor call verifies at least one paid module is enabled before
 *     any reasoning happens. An account that drops to zero modules is SUSPENDED, never
 *     deleted, gets a short grace window, and sees a re-unlock prompt.
 *
 * The base filing cabinet is free and never unlocks the advisor.
 */

import { CONFIG, MODULES } from '../../../config/index.js';

export const ADDON_ID = 'advisor';

export const ACCESS_STATES = Object.freeze({
  LOCKED: 'locked',            // no paid module. Sales surface.
  AVAILABLE: 'available',      // has a module, has not bought the advisor yet.
  ACTIVE: 'active',            // paid, unlocked, reasoning allowed.
  GRACE: 'grace',              // dropped to zero modules, still inside the grace window.
  SUSPENDED: 'suspended',      // dropped to zero modules, grace spent. Memory kept.
  CANCELLED: 'cancelled',      // owner cancelled the add-on. Memory kept.
});

/**
 * How many PAID modules are currently toggled on.
 * @returns {Promise<{count: number, moduleIds: string[], allEnabledIds: string[]}>}
 */
export async function countPaidModules(store, accountId, catalog = MODULES) {
  const rows = await store.listEnabledModules(accountId);
  const allEnabledIds = rows.map((r) => r.module_id);
  const moduleIds = rows
    .filter((r) => {
      const meta = catalog.byId[r.module_id];
      // Trust the catalog first. Fall back to the row's own paid flag for modules that
      // ship after this build.
      if (meta) return meta.paid === true;
      return r.paid === true;
    })
    .map((r) => r.module_id);
  return { count: moduleIds.length, moduleIds, allEnabledIds };
}

/**
 * BILLING GATE. Call this from checkout before creating the subscription line item.
 * @returns {Promise<{allowed: boolean, reason?: string, copy?: object, paidModuleCount: number}>}
 */
export async function canPurchaseAdvisor(store, accountId, options = {}) {
  const config = options.config || CONFIG;
  const catalog = options.catalog || MODULES;
  const { count } = await countPaidModules(store, accountId, catalog);
  if (count >= config.gate.requiresPaidModuleCount) {
    return { allowed: true, paidModuleCount: count };
  }
  return {
    allowed: false,
    reason: 'no_paid_module',
    paidModuleCount: count,
    copy: config.gate.lockedStateCopy,
    priceUsdMonthly: config.product.addOnPriceUsdMonthly,
  };
}

/**
 * Activate the add-on. Refuses if the billing gate is closed.
 */
export async function activateAdvisor(store, accountId, options = {}) {
  const check = await canPurchaseAdvisor(store, accountId, options);
  if (!check.allowed) {
    const err = new Error('advisor_locked: add a paid module to unlock the advisor');
    err.code = 'advisor_locked';
    err.detail = check;
    throw err;
    }
  return store.setAddon(accountId, ADDON_ID, { status: 'active', grace_until: null });
}

/**
 * RUNTIME GATE. Called at the top of every advisor entry point and by the UI to decide
 * which state to render. Has a side effect on purpose: it is what moves an account into
 * grace and then into suspension, so the state is always correct without a nightly job.
 *
 * @returns {Promise<{state: string, allowed: boolean, paidModuleCount: number,
 *   enabledModuleIds: string[], graceUntil: string|null, copy: object|null, message: string}>}
 */
export async function evaluateAdvisorAccess(store, accountId, options = {}) {
  const config = options.config || CONFIG;
  const catalog = options.catalog || MODULES;
  const now = options.now ? new Date(options.now) : new Date();
  const required = config.gate.requiresPaidModuleCount;

  const { count, moduleIds } = await countPaidModules(store, accountId, catalog);
  const addon = await store.getAddon(accountId, ADDON_ID);
  const hasModules = count >= required;

  const base = {
    paidModuleCount: count,
    enabledModuleIds: moduleIds,
    priceUsdMonthly: config.product.addOnPriceUsdMonthly,
  };

  // Never purchased, or cancelled outright.
  if (!addon || addon.status === 'cancelled') {
    if (!hasModules) {
      return {
        ...base,
        state: ACCESS_STATES.LOCKED,
        allowed: false,
        graceUntil: null,
        copy: config.gate.lockedStateCopy,
        message: 'Add any paid module to unlock the advisor.',
      };
    }
    return {
      ...base,
      state: ACCESS_STATES.AVAILABLE,
      allowed: false,
      graceUntil: null,
      copy: null,
      message: `The advisor is available on this account for $${config.product.addOnPriceUsdMonthly} a month.`,
    };
  }

  // Suspended already. Turning a module back on brings it straight back.
  if (addon.status === 'suspended') {
    if (hasModules) {
      await store.setAddon(accountId, ADDON_ID, { status: 'active', grace_until: null });
      return {
        ...base,
        state: ACCESS_STATES.ACTIVE,
        allowed: true,
        graceUntil: null,
        copy: null,
        message: 'Advisor is back on. Everything it learned is still here.',
      };
    }
    return {
      ...base,
      state: ACCESS_STATES.SUSPENDED,
      allowed: false,
      graceUntil: addon.grace_until || null,
      copy: config.gate.suspendedStateCopy,
      message: 'Advisor is paused until a paid module is active. Memory is kept.',
    };
  }

  // Active add-on with modules. The happy path.
  if (hasModules) {
    if (addon.grace_until) {
      await store.setAddon(accountId, ADDON_ID, { grace_until: null });
    }
    return {
      ...base,
      state: ACCESS_STATES.ACTIVE,
      allowed: true,
      graceUntil: null,
      copy: null,
      message: '',
    };
  }

  // Active add-on, zero modules. Open a grace window, then suspend.
  if (!config.gate.suspendOnZeroModules) {
    return { ...base, state: ACCESS_STATES.ACTIVE, allowed: true, graceUntil: null, copy: null, message: '' };
  }

  let graceUntil = addon.grace_until ? new Date(addon.grace_until) : null;
  if (!graceUntil) {
    graceUntil = new Date(now.getTime() + config.gate.graceDays * 86400000);
    await store.setAddon(accountId, ADDON_ID, { grace_until: graceUntil.toISOString() });
  }

  if (now < graceUntil) {
    const daysLeft = Math.max(1, Math.ceil((graceUntil - now) / 86400000));
    return {
      ...base,
      state: ACCESS_STATES.GRACE,
      allowed: true,
      graceUntil: graceUntil.toISOString(),
      copy: config.gate.suspendedStateCopy,
      message: `No paid modules are active. The advisor keeps working for ${daysLeft} more ${daysLeft === 1 ? 'day' : 'days'}, then it pauses. Nothing it learned is deleted.`,
    };
  }

  await store.setAddon(accountId, ADDON_ID, { status: 'suspended' });
  return {
    ...base,
    state: ACCESS_STATES.SUSPENDED,
    allowed: false,
    graceUntil: graceUntil.toISOString(),
    copy: config.gate.suspendedStateCopy,
    message: 'Advisor is paused until a paid module is active. Memory is kept.',
  };
}

/** Thrown by the runtime gate so callers can render the right state without string matching. */
export class AdvisorGateError extends Error {
  constructor(access) {
    super(access.message || 'advisor is not available on this account');
    this.name = 'AdvisorGateError';
    this.code = 'advisor_gated';
    this.access = access;
  }
}

/** Assert the runtime gate. Every reasoning function calls this before it thinks. */
export async function assertAdvisorAllowed(store, accountId, options = {}) {
  const access = await evaluateAdvisorAccess(store, accountId, options);
  if (!access.allowed) throw new AdvisorGateError(access);
  return access;
}

export default {
  ADDON_ID,
  ACCESS_STATES,
  countPaidModules,
  canPurchaseAdvisor,
  activateAdvisor,
  evaluateAdvisorAccess,
  assertAdvisorAllowed,
  AdvisorGateError,
};
