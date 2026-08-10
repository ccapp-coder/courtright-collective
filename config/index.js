/**
 * Config loader for the Aimtogro AI Advisor.
 *
 * Rules:
 *  - Nothing in advisor/src reads a literal price, cap, or model name. It comes from here.
 *  - JSON files are the source of truth. Env vars override at runtime so a deploy can change
 *    the ask pool or the model without a code change.
 *  - Works in Node and in the browser (plain ESM, JSON import attributes, no build step).
 */

import advisorConfig from './advisor.config.json' with { type: 'json' };
import modulesConfig from './modules.config.json' with { type: 'json' };

const ENV_OVERRIDES = [
  ['ADVISOR_PRICE_USD', 'product.addOnPriceUsdMonthly', 'number'],
  ['ADVISOR_MONTHLY_ASK_POOL', 'cap.monthlyAskPool', 'number'],
  ['ADVISOR_DAILY_RUNDOWNS', 'cap.includedDailyRundownsPerDay', 'number'],
  ['ADVISOR_SOFT_CEILING_PERCENT', 'cap.softCeilingAtPercent', 'number'],
  ['ADVISOR_REQUIRED_MODULES', 'gate.requiresPaidModuleCount', 'number'],
  ['ADVISOR_GRACE_DAYS', 'gate.graceDays', 'number'],
  ['ADVISOR_MODEL_PROVIDER', 'model.provider', 'string'],
  ['ADVISOR_REASONING_MODEL', 'model.reasoningModel', 'string'],
  ['ADVISOR_LIGHT_MODEL', 'model.lightModel', 'string'],
  ['ADVISOR_MAX_BUNDLE_CHARS', 'context.maxBundleChars', 'number'],
  ['ADVISOR_MAX_MEMORY_FACTS', 'context.maxMemoryFacts', 'number'],
  ['ADVISOR_MAX_ITEMS_PER_MODULE', 'context.maxItemsPerModule', 'number'],
];

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let node = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (typeof node[parts[i]] !== 'object' || node[parts[i]] === null) node[parts[i]] = {};
    node = node[parts[i]];
  }
  node[parts[parts.length - 1]] = value;
}

function readEnv(env) {
  if (env) return env;
  if (typeof process !== 'undefined' && process.env) return process.env;
  return {};
}

/**
 * @param {object} [env] optional env bag (Cloudflare Workers pass one in, Node uses process.env)
 * @returns {object} the resolved advisor config
 */
export function loadAdvisorConfig(env) {
  const source = readEnv(env);
  const resolved = deepClone(advisorConfig);
  for (const [envVar, path, kind] of ENV_OVERRIDES) {
    const raw = source[envVar];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = kind === 'number' ? Number(raw) : String(raw);
    if (kind === 'number' && Number.isNaN(value)) continue;
    setPath(resolved, path, value);
  }
  return Object.freeze(resolved);
}

/**
 * @returns {object} the module catalog, with a convenience lookup by id
 */
export function loadModuleCatalog() {
  const resolved = deepClone(modulesConfig);
  resolved.byId = Object.fromEntries(resolved.modules.map((m) => [m.id, m]));
  resolved.paidModuleIds = resolved.modules.filter((m) => m.paid).map((m) => m.id);
  return Object.freeze(resolved);
}

/** Convenience singletons for the common case. */
export const CONFIG = loadAdvisorConfig();
export const MODULES = loadModuleCatalog();

export default { loadAdvisorConfig, loadModuleCatalog, CONFIG, MODULES };
