/**
 * The common contract between the advisor and every module.
 *
 * Each module exposes exactly ONE read function:
 *
 *     getAdvisorContext(account_id, options) -> compact summary of that module's current state
 *
 * The advisor never contains bespoke per module code. It asks the registry which modules are
 * on for this account, calls their providers, normalizes what comes back, and moves on.
 *
 * Rules enforced here:
 *  - A module must REGISTER its provider when it is enabled on an account.
 *  - The advisor NEVER calls a provider for a module that is toggled off.
 *  - Every snapshot is trimmed to the limits in config/advisor.config.json before it is
 *    allowed anywhere near a prompt. That trim is the token cost lever.
 *  - One capability, two interfaces: getAdvisorContext is an ordinary shared function and is
 *    also exposed as an AI tool (see advisor/src/tools/toolDefinitions.js).
 */

import { CONFIG, MODULES } from '../../../config/index.js';

/**
 * @typedef {object} ModuleSnapshotItem
 * @property {string} id
 * @property {string} title       one line, already short
 * @property {string} [detail]    one line of why it matters
 * @property {number} [valueUsd]  money attached to the item, if any
 * @property {number} [urgency]   0..1, provider's own read on how hot this is
 * @property {string} [subjectType] client | invoice | booking | member | job
 * @property {string} [subjectId]
 * @property {string} [action]    the single next action a human would take
 */

/**
 * @typedef {object} ModuleSnapshot
 * @property {string} module
 * @property {string} label
 * @property {string} headline              one sentence a human could read out loud
 * @property {Record<string, number|string>} [metrics]
 * @property {ModuleSnapshotItem[]} [items]
 * @property {Record<string, number|string>} [signals]  numbers the memory rules watch
 * @property {string} [generatedAt]
 */

export class ModuleRegistry {
  constructor(options = {}) {
    this.config = options.config || CONFIG;
    this.catalog = options.catalog || MODULES;
    /** @type {Map<string, {moduleId: string, provider: Function, meta: object}>} */
    this.providers = new Map();
  }

  /**
   * Called by a module when it is enabled on an account.
   * @param {string} moduleId
   * @param {(accountId: string, options: object) => Promise<ModuleSnapshot>} provider
   */
  register(moduleId, provider, meta = {}) {
    if (typeof provider !== 'function') {
      throw new Error(`getAdvisorContext provider for ${moduleId} must be a function`);
    }
    const known = this.catalog.byId[moduleId];
    if (!known && !meta.allowUnknown) {
      throw new Error(`unknown module ${moduleId}, add it to config/modules.config.json first`);
    }
    this.providers.set(moduleId, { moduleId, provider, meta: { ...known, ...meta } });
    return this;
  }

  unregister(moduleId) {
    this.providers.delete(moduleId);
    return this;
  }

  has(moduleId) {
    return this.providers.has(moduleId);
  }

  list() {
    return [...this.providers.keys()];
  }

  /**
   * Collect snapshots from the enabled modules only.
   *
   * @param {string} accountId
   * @param {object} options
   * @param {string[]} options.enabledModuleIds modules toggled ON for this account
   * @param {string} [options.purpose] passed through so a module can bias what it returns
   * @param {object} [options.dataSource] injected per module data access
   * @param {Date} [options.now]
   * @returns {Promise<{snapshots: Record<string, ModuleSnapshot>, skipped: string[], errors: object[]}>}
   */
  async collect(accountId, options = {}) {
    const enabled = options.enabledModuleIds || [];
    const limits = this.config.context;
    const snapshots = {};
    const skipped = [];
    const errors = [];

    const targets = enabled.slice(0, limits.maxModules);
    if (enabled.length > limits.maxModules) {
      skipped.push(...enabled.slice(limits.maxModules));
    }

    const results = await Promise.all(
      targets.map(async (moduleId) => {
        const entry = this.providers.get(moduleId);
        if (!entry) return { moduleId, missing: true };
        try {
          const raw = await entry.provider(accountId, {
            purpose: options.purpose,
            now: options.now || new Date(),
            data: options.dataSource ? options.dataSource[moduleId] : undefined,
            limits,
          });
          return { moduleId, raw, meta: entry.meta };
        } catch (err) {
          return { moduleId, error: err };
        }
      }),
    );

    for (const result of results) {
      if (result.missing) {
        skipped.push(result.moduleId);
        continue;
      }
      if (result.error) {
        // A module that is down must never take the advisor down with it.
        errors.push({ module: result.moduleId, message: String(result.error.message || result.error) });
        continue;
      }
      if (!result.raw) {
        skipped.push(result.moduleId);
        continue;
      }
      snapshots[result.moduleId] = normalizeSnapshot(result.raw, result.moduleId, limits, result.meta);
    }

    return { snapshots, skipped, errors };
  }
}

/** Trim one snapshot down to the configured limits. This is where the margin is protected. */
export function normalizeSnapshot(raw, moduleId, limits, meta = {}) {
  const cap = (text, max) => {
    if (text === undefined || text === null) return undefined;
    const s = String(text).replace(/\s+/g, ' ').trim();
    return s.length <= max ? s : `${s.slice(0, max - 1)}...`;
  };

  const items = (raw.items || [])
    .slice()
    .sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0) || (b.valueUsd ?? 0) - (a.valueUsd ?? 0))
    .slice(0, limits.maxItemsPerModule)
    .map((item, index) => ({
      id: item.id || `${moduleId}_${index}`,
      title: cap(item.title, limits.maxCharsPerItem),
      detail: cap(item.detail, limits.maxCharsPerItem),
      valueUsd: typeof item.valueUsd === 'number' ? Math.round(item.valueUsd) : undefined,
      urgency: typeof item.urgency === 'number' ? Number(item.urgency.toFixed(2)) : undefined,
      subjectType: item.subjectType,
      subjectId: item.subjectId,
      action: cap(item.action, limits.maxCharsPerItem),
    }));

  return {
    module: moduleId,
    label: raw.label || meta.name || moduleId,
    headline: cap(raw.headline, limits.maxCharsPerItem * 2) || '',
    metrics: raw.metrics || {},
    items,
    signals: raw.signals || {},
    generatedAt: raw.generatedAt || new Date().toISOString(),
  };
}

/**
 * Convenience used by the platform when it boots an account session: register the providers
 * for the modules this account has toggled on, and nothing else.
 *
 * @param {ModuleRegistry} registry
 * @param {string[]} enabledModuleIds
 * @param {Record<string, Function>} providerMap moduleId -> getAdvisorContext
 */
export function registerEnabledModules(registry, enabledModuleIds, providerMap) {
  for (const moduleId of enabledModuleIds) {
    const provider = providerMap[moduleId];
    if (!provider) continue;
    registry.register(moduleId, provider);
  }
  return registry;
}

export default ModuleRegistry;
