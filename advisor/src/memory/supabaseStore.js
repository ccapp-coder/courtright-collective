/**
 * Supabase implementation of the advisor store contract.
 *
 * Talks to PostgREST directly over fetch so this file has zero npm dependencies and runs
 * unchanged in Node, in a Cloudflare Worker, and in Deno. If the rest of Aimtogro already
 * carries @supabase/supabase-js, swapping the internals of this file for the client is a
 * mechanical change: nothing above this layer touches the transport.
 */

import { AdvisorStore, clampConfidence } from './store.js';

function qs(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

function isoDaysAgo(days, now = Date.now()) {
  return new Date(now - days * 86400000).toISOString();
}

export class SupabaseStore extends AdvisorStore {
  /**
   * @param {object} options
   * @param {string} options.url        https://xxxx.supabase.co
   * @param {string} options.key        service role key on the server, anon key plus RLS on the edge
   * @param {typeof fetch} [options.fetchImpl]
   * @param {string} [options.schema]
   */
  constructor(options) {
    super();
    if (!options || !options.url || !options.key) {
      throw new Error('SupabaseStore needs { url, key }');
    }
    this.base = `${options.url.replace(/\/$/, '')}/rest/v1`;
    this.key = options.key;
    this.schema = options.schema || 'public';
    this.fetchImpl = options.fetchImpl || globalThis.fetch.bind(globalThis);
  }

  headers(extra = {}) {
    return {
      apikey: this.key,
      Authorization: `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Accept-Profile': this.schema,
      'Content-Profile': this.schema,
      ...extra,
    };
  }

  async request(path, init = {}) {
    const res = await this.fetchImpl(`${this.base}${path}`, {
      ...init,
      headers: this.headers(init.headers),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Supabase ${init.method || 'GET'} ${path} failed: ${res.status} ${body}`);
    }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async select(table, params) {
    return (await this.request(`/${table}${qs(params)}`)) || [];
  }

  async insert(table, row, { returning = true } = {}) {
    const rows = await this.request(`/${table}`, {
      method: 'POST',
      headers: { Prefer: returning ? 'return=representation' : 'return=minimal' },
      body: JSON.stringify(row),
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  // ---------------------------------------------------------------- memory
  async listMemory(accountId, options = {}) {
    const { categories, minConfidence = 0, limit = 500, keys } = options;
    const params = {
      account_id: `eq.${accountId}`,
      confidence: `gte.${minConfidence}`,
      order: 'confidence.desc,key.asc',
      limit,
      select: '*',
    };
    if (categories && categories.length) params.category = `in.(${categories.join(',')})`;
    if (keys && keys.length) params.key = `in.(${keys.join(',')})`;
    return this.select('account_memory', params);
  }

  async getMemory(accountId, key) {
    const rows = await this.select('account_memory', {
      account_id: `eq.${accountId}`,
      key: `eq.${key}`,
      limit: 1,
    });
    return rows[0] || null;
  }

  async upsertMemory(accountId, fact) {
    const row = {
      account_id: accountId,
      key: fact.key,
      value: String(fact.value),
      category: fact.category || 'general',
      confidence: clampConfidence(fact.confidence ?? 0.6),
      source: fact.source || 'observed',
      updated_at: new Date().toISOString(),
    };
    const rows = await this.request(
      `/account_memory${qs({ on_conflict: 'account_id,key' })}`,
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(row),
      },
    );
    return Array.isArray(rows) ? rows[0] : rows;
  }

  // ---------------------------------------------------------- observations
  async addObservation(accountId, observation) {
    return this.insert('advisor_observations', {
      account_id: accountId,
      observation: observation.observation,
      module_source: observation.module_source || 'advisor',
      subject_type: observation.subject_type || null,
      subject_id: observation.subject_id || null,
      weight: clampConfidence(observation.weight ?? 0.5, 0, 1),
    });
  }

  async listObservations(accountId, options = {}) {
    const { sinceDays, limit = 100, moduleSource, subjectId } = options;
    const params = {
      account_id: `eq.${accountId}`,
      order: 'created_at.desc',
      limit,
      select: '*',
    };
    if (moduleSource) params.module_source = `eq.${moduleSource}`;
    if (subjectId) params.subject_id = `eq.${subjectId}`;
    if (sinceDays) params.created_at = `gte.${isoDaysAgo(sinceDays)}`;
    return this.select('advisor_observations', params);
  }

  // ----------------------------------------------------- advice + outcomes
  async logAdvice(accountId, entry) {
    return this.insert('advice_log', {
      account_id: accountId,
      advice_given: entry.advice_given,
      context_snapshot: entry.context_snapshot || {},
      purpose: entry.purpose || 'ask',
      subject_type: entry.subject_type || null,
      subject_id: entry.subject_id || null,
    });
  }

  async getAdvice(adviceLogId) {
    const rows = await this.select('advice_log', { id: `eq.${adviceLogId}`, limit: 1 });
    return rows[0] || null;
  }

  async listRecentAdvice(accountId, options = {}) {
    const { limit = 20, sinceDays, purpose } = options;
    const params = {
      account_id: `eq.${accountId}`,
      order: 'created_at.desc',
      limit,
      select: '*',
    };
    if (purpose) params.purpose = `eq.${purpose}`;
    if (sinceDays) params.created_at = `gte.${isoDaysAgo(sinceDays)}`;
    return this.select('advice_log', params);
  }

  async recordOutcome(adviceLogId, outcome) {
    return this.insert('advice_outcomes', {
      advice_log_id: adviceLogId,
      taken: Boolean(outcome.taken),
      result: outcome.result || null,
      helpful: outcome.helpful === undefined ? null : Boolean(outcome.helpful),
    });
  }

  async listOutcomes(accountId, options = {}) {
    const { limit = 50, sinceDays } = options;
    const params = {
      select: '*,advice_log!inner(account_id,advice_given,purpose)',
      'advice_log.account_id': `eq.${accountId}`,
      order: 'noted_at.desc',
      limit,
    };
    if (sinceDays) params.noted_at = `gte.${isoDaysAgo(sinceDays)}`;
    const rows = await this.select('advice_outcomes', params);
    return rows.map((r) => ({
      ...r,
      advice: r.advice_log ? r.advice_log.advice_given : null,
      purpose: r.advice_log ? r.advice_log.purpose : null,
    }));
  }

  // ----------------------------------------------------------------- usage
  async recordUsage(accountId, usage) {
    return this.insert('advisor_usage', {
      account_id: accountId,
      moment_type: usage.momentType,
      billed: usage.billed !== false,
      period_key: usage.periodKey,
      day_key: usage.dayKey,
    });
  }

  async countUsage(accountId, filter = {}) {
    const params = { account_id: `eq.${accountId}`, select: 'id' };
    if (filter.periodKey) params.period_key = `eq.${filter.periodKey}`;
    if (filter.dayKey) params.day_key = `eq.${filter.dayKey}`;
    if (filter.momentType) params.moment_type = `eq.${filter.momentType}`;
    if (filter.billedOnly) params.billed = 'is.true';
    const res = await this.fetchImpl(`${this.base}/advisor_usage${qs(params)}`, {
      headers: this.headers({ Prefer: 'count=exact', Range: '0-0' }),
    });
    const range = res.headers.get('content-range') || '*/0';
    return Number(range.split('/')[1]) || 0;
  }

  // --------------------------------------------------------- account state
  async listEnabledModules(accountId) {
    return this.select('account_modules', {
      account_id: `eq.${accountId}`,
      enabled: 'is.true',
      select: '*',
    });
  }

  async setModuleEnabled(accountId, moduleId, enabled, paid = true) {
    const row = {
      account_id: accountId,
      module_id: moduleId,
      enabled: Boolean(enabled),
      paid,
      ...(enabled ? { enabled_at: new Date().toISOString(), disabled_at: null } : { disabled_at: new Date().toISOString() }),
    };
    const rows = await this.request(
      `/account_modules${qs({ on_conflict: 'account_id,module_id' })}`,
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(row),
      },
    );
    return Array.isArray(rows) ? rows[0] : rows;
  }

  async getAddon(accountId, addonId) {
    const rows = await this.select('account_addons', {
      account_id: `eq.${accountId}`,
      addon_id: `eq.${addonId}`,
      limit: 1,
    });
    return rows[0] || null;
  }

  async setAddon(accountId, addonId, patch) {
    const rows = await this.request(
      `/account_addons${qs({ on_conflict: 'account_id,addon_id' })}`,
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          account_id: accountId,
          addon_id: addonId,
          ...patch,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    return Array.isArray(rows) ? rows[0] : rows;
  }
}

export default SupabaseStore;
