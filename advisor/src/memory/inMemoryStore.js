/**
 * In memory implementation of the advisor store contract.
 *
 * Used by the tests, the seeded demo account, and the static browser preview so the whole
 * advisor can be clicked through with no database and no API key. Same contract as
 * SupabaseStore, so swapping adapters changes nothing above this layer.
 */

import { AdvisorStore, clampConfidence, daysAgo } from './store.js';

let counter = 0;
function nextId(prefix) {
  counter += 1;
  return `${prefix}_${String(counter).padStart(6, '0')}`;
}

function nowIso(clock) {
  return new Date(clock ? clock() : Date.now()).toISOString();
}

export class InMemoryStore extends AdvisorStore {
  /**
   * @param {object} [options]
   * @param {() => number} [options.clock] injectable clock so tests can move time
   */
  constructor(options = {}) {
    super();
    this.clock = options.clock || (() => Date.now());
    this.tables = {
      account_memory: [],
      advisor_observations: [],
      advice_log: [],
      advice_outcomes: [],
      advisor_usage: [],
      account_modules: [],
      account_addons: [],
    };
  }

  now() {
    return new Date(this.clock());
  }

  // ---------------------------------------------------------------- memory
  async listMemory(accountId, options = {}) {
    const { categories, minConfidence = 0, limit = 500, keys } = options;
    let rows = this.tables.account_memory.filter((r) => r.account_id === accountId);
    if (categories && categories.length) rows = rows.filter((r) => categories.includes(r.category));
    if (keys && keys.length) rows = rows.filter((r) => keys.includes(r.key));
    rows = rows.filter((r) => r.confidence >= minConfidence);
    rows.sort((a, b) => b.confidence - a.confidence || (a.key < b.key ? -1 : 1));
    return rows.slice(0, limit).map((r) => ({ ...r }));
  }

  async getMemory(accountId, key) {
    const row = this.tables.account_memory.find((r) => r.account_id === accountId && r.key === key);
    return row ? { ...row } : null;
  }

  async upsertMemory(accountId, fact) {
    const existing = this.tables.account_memory.find(
      (r) => r.account_id === accountId && r.key === fact.key,
    );
    const record = {
      id: existing ? existing.id : nextId('mem'),
      account_id: accountId,
      key: fact.key,
      value: String(fact.value),
      category: fact.category || 'general',
      confidence: clampConfidence(fact.confidence ?? 0.6),
      source: fact.source || 'observed',
      created_at: existing ? existing.created_at : nowIso(this.clock),
      updated_at: nowIso(this.clock),
    };
    if (existing) Object.assign(existing, record);
    else this.tables.account_memory.push(record);
    return { ...record };
  }

  // ---------------------------------------------------------- observations
  async addObservation(accountId, observation) {
    const record = {
      id: nextId('obs'),
      account_id: accountId,
      observation: observation.observation,
      module_source: observation.module_source || 'advisor',
      subject_type: observation.subject_type || null,
      subject_id: observation.subject_id || null,
      weight: clampConfidence(observation.weight ?? 0.5, 0, 1),
      created_at: observation.created_at || nowIso(this.clock),
    };
    this.tables.advisor_observations.push(record);
    return { ...record };
  }

  async listObservations(accountId, options = {}) {
    const { sinceDays, limit = 100, moduleSource, subjectId } = options;
    let rows = this.tables.advisor_observations.filter((r) => r.account_id === accountId);
    if (moduleSource) rows = rows.filter((r) => r.module_source === moduleSource);
    if (subjectId) rows = rows.filter((r) => r.subject_id === subjectId);
    if (sinceDays) rows = rows.filter((r) => daysAgo(r.created_at, this.now()) <= sinceDays);
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return rows.slice(0, limit).map((r) => ({ ...r }));
  }

  // ----------------------------------------------------- advice + outcomes
  async logAdvice(accountId, entry) {
    const record = {
      id: nextId('adv'),
      account_id: accountId,
      advice_given: entry.advice_given,
      context_snapshot: entry.context_snapshot || {},
      purpose: entry.purpose || 'ask',
      subject_type: entry.subject_type || null,
      subject_id: entry.subject_id || null,
      created_at: entry.created_at || nowIso(this.clock),
    };
    this.tables.advice_log.push(record);
    return { ...record };
  }

  async getAdvice(adviceLogId) {
    const row = this.tables.advice_log.find((r) => r.id === adviceLogId);
    return row ? { ...row } : null;
  }

  async listRecentAdvice(accountId, options = {}) {
    const { limit = 20, sinceDays, purpose } = options;
    let rows = this.tables.advice_log.filter((r) => r.account_id === accountId);
    if (purpose) rows = rows.filter((r) => r.purpose === purpose);
    if (sinceDays) rows = rows.filter((r) => daysAgo(r.created_at, this.now()) <= sinceDays);
    rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return rows.slice(0, limit).map((r) => ({ ...r }));
  }

  async recordOutcome(adviceLogId, outcome) {
    const record = {
      id: nextId('out'),
      advice_log_id: adviceLogId,
      taken: Boolean(outcome.taken),
      result: outcome.result || null,
      helpful: outcome.helpful === undefined ? null : Boolean(outcome.helpful),
      noted_at: nowIso(this.clock),
    };
    this.tables.advice_outcomes.push(record);
    return { ...record };
  }

  async listOutcomes(accountId, options = {}) {
    const { limit = 50, sinceDays } = options;
    const adviceById = new Map(
      this.tables.advice_log.filter((a) => a.account_id === accountId).map((a) => [a.id, a]),
    );
    let rows = this.tables.advice_outcomes.filter((o) => adviceById.has(o.advice_log_id));
    if (sinceDays) rows = rows.filter((r) => daysAgo(r.noted_at, this.now()) <= sinceDays);
    rows.sort((a, b) => (a.noted_at < b.noted_at ? 1 : -1));
    return rows.slice(0, limit).map((o) => ({
      ...o,
      advice: adviceById.get(o.advice_log_id).advice_given,
      purpose: adviceById.get(o.advice_log_id).purpose,
    }));
  }

  // ----------------------------------------------------------------- usage
  async recordUsage(accountId, usage) {
    const record = {
      id: nextId('use'),
      account_id: accountId,
      moment_type: usage.momentType,
      billed: usage.billed !== false,
      period_key: usage.periodKey,
      day_key: usage.dayKey,
      created_at: nowIso(this.clock),
    };
    this.tables.advisor_usage.push(record);
    return { ...record };
  }

  async countUsage(accountId, filter = {}) {
    const { periodKey: pk, dayKey: dk, momentType, billedOnly } = filter;
    return this.tables.advisor_usage.filter((r) => {
      if (r.account_id !== accountId) return false;
      if (pk && r.period_key !== pk) return false;
      if (dk && r.day_key !== dk) return false;
      if (momentType && r.moment_type !== momentType) return false;
      if (billedOnly && !r.billed) return false;
      return true;
    }).length;
  }

  // --------------------------------------------------------- account state
  async listEnabledModules(accountId) {
    return this.tables.account_modules
      .filter((r) => r.account_id === accountId && r.enabled)
      .map((r) => ({ ...r }));
  }

  async setModuleEnabled(accountId, moduleId, enabled, paid = true) {
    let row = this.tables.account_modules.find(
      (r) => r.account_id === accountId && r.module_id === moduleId,
    );
    if (!row) {
      row = {
        account_id: accountId,
        module_id: moduleId,
        enabled: false,
        paid,
        enabled_at: nowIso(this.clock),
        disabled_at: null,
      };
      this.tables.account_modules.push(row);
    }
    row.enabled = Boolean(enabled);
    row.paid = paid;
    if (enabled) {
      row.enabled_at = nowIso(this.clock);
      row.disabled_at = null;
    } else {
      row.disabled_at = nowIso(this.clock);
    }
    return { ...row };
  }

  async getAddon(accountId, addonId) {
    const row = this.tables.account_addons.find(
      (r) => r.account_id === accountId && r.addon_id === addonId,
    );
    return row ? { ...row } : null;
  }

  async setAddon(accountId, addonId, patch) {
    let row = this.tables.account_addons.find(
      (r) => r.account_id === accountId && r.addon_id === addonId,
    );
    if (!row) {
      row = {
        account_id: accountId,
        addon_id: addonId,
        status: 'active',
        grace_until: null,
        activated_at: nowIso(this.clock),
        updated_at: nowIso(this.clock),
      };
      this.tables.account_addons.push(row);
    }
    Object.assign(row, patch, { updated_at: nowIso(this.clock) });
    return { ...row };
  }
}

export default InMemoryStore;
