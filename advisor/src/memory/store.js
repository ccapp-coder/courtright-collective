/**
 * The store contract every advisor persistence adapter implements.
 *
 * Two adapters ship with this repo:
 *   - InMemoryStore   (advisor/src/memory/inMemoryStore.js)  tests, demo, static preview
 *   - SupabaseStore   (advisor/src/memory/supabaseStore.js)  production, PostgREST over fetch
 *
 * Nothing above this layer knows which one it is talking to. That is what lets the same
 * reasoning functions run in a test, in the browser demo, and in production.
 *
 * All methods are async. All methods are cheap plumbing: no model calls happen in a store.
 */

/**
 * @typedef {object} MemoryFact
 * @property {string} key
 * @property {string} value
 * @property {string} category
 * @property {number} confidence  0..1
 * @property {string} source      onboarding | observed | outcome | owner_stated | imported
 * @property {string} [updated_at]
 */

/**
 * @typedef {object} Observation
 * @property {string} observation
 * @property {string} module_source
 * @property {string} [subject_type]
 * @property {string} [subject_id]
 * @property {number} [weight]
 * @property {string} [created_at]
 */

/**
 * @typedef {object} AdviceRecord
 * @property {string} id
 * @property {string} account_id
 * @property {string} advice_given
 * @property {object} context_snapshot
 * @property {string} purpose
 * @property {string} [subject_type]
 * @property {string} [subject_id]
 * @property {string} created_at
 */

export const MEMORY_CATEGORIES = Object.freeze([
  'business',
  'services',
  'pricing',
  'clients',
  'seasonality',
  'preferences',
  'voice',
  'goals',
  'operations',
  'general',
]);

export const MEMORY_SOURCES = Object.freeze([
  'onboarding',
  'observed',
  'outcome',
  'owner_stated',
  'imported',
]);

export const MOMENT_TYPES = Object.freeze([
  'daily_rundown',
  'ask',
  'low_hanging_fruit',
  'pitch',
  'weekly_review',
]);

/** Period key used by the monthly ask pool. */
export function periodKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Day key used by the one-free-rundown-per-day rule. */
export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
}

export function daysAgo(iso, now = new Date()) {
  if (!iso) return Number.POSITIVE_INFINITY;
  return (new Date(now).getTime() - new Date(iso).getTime()) / 86400000;
}

export function clampConfidence(value, floor = 0.1, ceiling = 0.98) {
  if (typeof value !== 'number' || Number.isNaN(value)) return floor;
  return Math.min(ceiling, Math.max(floor, value));
}

/**
 * Base class documenting the contract. Adapters extend it so a missing method
 * fails loudly at the seam instead of silently returning undefined.
 */
export class AdvisorStore {
  // memory
  async listMemory() { throw new Error('listMemory not implemented'); }
  async upsertMemory() { throw new Error('upsertMemory not implemented'); }
  async getMemory() { throw new Error('getMemory not implemented'); }

  // observations
  async listObservations() { throw new Error('listObservations not implemented'); }
  async addObservation() { throw new Error('addObservation not implemented'); }

  // advice and outcomes
  async logAdvice() { throw new Error('logAdvice not implemented'); }
  async getAdvice() { throw new Error('getAdvice not implemented'); }
  async listRecentAdvice() { throw new Error('listRecentAdvice not implemented'); }
  async recordOutcome() { throw new Error('recordOutcome not implemented'); }
  async listOutcomes() { throw new Error('listOutcomes not implemented'); }

  // usage
  async recordUsage() { throw new Error('recordUsage not implemented'); }
  async countUsage() { throw new Error('countUsage not implemented'); }

  // account state
  async listEnabledModules() { throw new Error('listEnabledModules not implemented'); }
  async setModuleEnabled() { throw new Error('setModuleEnabled not implemented'); }
  async getAddon() { throw new Error('getAddon not implemented'); }
  async setAddon() { throw new Error('setAddon not implemented'); }
}

export default AdvisorStore;
