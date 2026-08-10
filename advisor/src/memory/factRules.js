/**
 * Memory seeding, step two of three: memory that grows on its own.
 *
 * These rules watch the compact snapshots that modules return from getAdvisorContext and
 * turn repeated patterns into durable facts and observations. Pure plumbing, zero tokens.
 * A rule never calls a model. It looks at numbers and writes a sentence.
 *
 * Adding a rule is additive: append to RULES. Rules must be cheap and must be idempotent
 * within their dedupe window so a nightly run does not spam advisor_observations.
 */

import { CONFIG } from '../../../config/index.js';
import { daysAgo } from './store.js';

/** Read a signal from a module snapshot by key. */
function signal(snapshot, key) {
  if (!snapshot) return undefined;
  if (snapshot.signals && key in snapshot.signals) return snapshot.signals[key];
  if (snapshot.metrics && key in snapshot.metrics) return snapshot.metrics[key];
  return undefined;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @typedef {object} RuleResult
 * @property {Array<{key:string,value:string,category:string,confidence:number}>} [facts]
 * @property {Array<{observation:string,module_source:string,weight?:number,subject_type?:string,subject_id?:string}>} [observations]
 */

export const RULES = Object.freeze([
  {
    id: 'booking.rebook_cadence',
    module: 'booking',
    /** @returns {RuleResult} */
    run(snapshot) {
      const cadence = num(signal(snapshot, 'avgRebookDays'));
      if (cadence === null || cadence <= 0) return {};
      const weeks = Math.round(cadence / 7);
      return {
        facts: [
          {
            key: 'operations.rebook_cadence_days',
            value: String(Math.round(cadence)),
            category: 'operations',
            confidence: 0.7,
          },
        ],
        observations: [
          {
            observation: `Clients rebook about every ${weeks} weeks on average.`,
            module_source: 'booking',
            weight: 0.6,
          },
        ],
      };
    },
  },
  {
    id: 'booking.no_show_pattern',
    module: 'booking',
    run(snapshot) {
      const rate = num(signal(snapshot, 'noShowRate'));
      if (rate === null || rate < 0.08) return {};
      return {
        observations: [
          {
            observation: `No-show rate is running at ${Math.round(rate * 100)} percent, high enough to be worth a reminder change.`,
            module_source: 'booking',
            weight: 0.7,
          },
        ],
        facts: [
          {
            key: 'operations.no_show_rate',
            value: rate.toFixed(2),
            category: 'operations',
            confidence: 0.65,
          },
        ],
      };
    },
  },
  {
    id: 'invoicing.late_payment_threshold',
    module: 'invoicing',
    run(snapshot) {
      const threshold = num(signal(snapshot, 'latePaymentThresholdUsd'));
      const lateRate = num(signal(snapshot, 'lateRateAboveThreshold'));
      if (threshold === null || lateRate === null || lateRate < 0.5) return {};
      return {
        facts: [
          {
            key: 'operations.late_invoice_threshold_usd',
            value: String(Math.round(threshold)),
            category: 'operations',
            confidence: 0.65,
          },
        ],
        observations: [
          {
            observation: `Invoices over $${Math.round(threshold)} tend to pay late (${Math.round(lateRate * 100)} percent of them).`,
            module_source: 'invoicing',
            weight: 0.75,
          },
        ],
      };
    },
  },
  {
    id: 'invoicing.average_ticket',
    module: 'invoicing',
    run(snapshot) {
      const avg = num(signal(snapshot, 'averageTicketUsd'));
      if (avg === null || avg <= 0) return {};
      return {
        facts: [
          {
            key: 'pricing.average_ticket_usd',
            value: String(Math.round(avg)),
            category: 'pricing',
            confidence: 0.7,
          },
        ],
      };
    },
  },
  {
    id: 'crm.top_client',
    module: 'crm',
    run(snapshot) {
      const name = signal(snapshot, 'topClientName');
      const value = num(signal(snapshot, 'topClientValueUsd'));
      if (!name) return {};
      return {
        facts: [
          {
            key: 'clients.top_client',
            value: value ? `${name} (about $${Math.round(value)} to date)` : String(name),
            category: 'clients',
            confidence: 0.75,
          },
        ],
      };
    },
  },
  {
    id: 'crm.lead_response_gap',
    module: 'crm',
    run(snapshot) {
      const hours = num(signal(snapshot, 'medianLeadResponseHours'));
      if (hours === null || hours < 12) return {};
      return {
        observations: [
          {
            observation: `New leads wait about ${Math.round(hours)} hours for a first reply. Leads answered inside an hour close far more often.`,
            module_source: 'crm',
            weight: 0.8,
          },
        ],
      };
    },
  },
  {
    id: 'gated_content.churn_signal',
    module: 'gated_content',
    run(snapshot) {
      const churnRisk = num(signal(snapshot, 'churnRiskCount'));
      const silentDays = num(signal(snapshot, 'churnSilentDays'));
      if (churnRisk === null || churnRisk <= 0) return {};
      const detail = silentDays ? ` after about ${Math.round(silentDays)} quiet days` : '';
      return {
        observations: [
          {
            observation: `${churnRisk} members are drifting toward cancelling${detail}.`,
            module_source: 'gated_content',
            weight: 0.7,
          },
        ],
      };
    },
  },
  {
    id: 'progress.stall_point',
    module: 'progress',
    run(snapshot) {
      const stallWeek = num(signal(snapshot, 'commonStallWeek'));
      if (stallWeek === null) return {};
      return {
        facts: [
          {
            key: 'operations.common_stall_week',
            value: String(Math.round(stallWeek)),
            category: 'operations',
            confidence: 0.6,
          },
        ],
        observations: [
          {
            observation: `Clients most often stall around week ${Math.round(stallWeek)} of a program.`,
            module_source: 'progress',
            weight: 0.65,
          },
        ],
      };
    },
  },
  {
    id: 'marketing.converting_channel',
    module: 'marketing',
    run(snapshot) {
      const channel = signal(snapshot, 'topConvertingChannel');
      const booked = num(signal(snapshot, 'topChannelBookings'));
      if (!channel) return {};
      return {
        facts: [
          {
            key: 'operations.best_channel',
            value: booked ? `${channel} (${Math.round(booked)} bookings last 30 days)` : String(channel),
            category: 'operations',
            confidence: 0.65,
          },
        ],
      };
    },
  },
  {
    id: 'reviews.request_timing',
    module: 'reviews',
    run(snapshot) {
      const best = num(signal(snapshot, 'bestRequestDelayDays'));
      if (best === null) return {};
      return {
        facts: [
          {
            key: 'operations.review_request_delay_days',
            value: String(Math.round(best)),
            category: 'operations',
            confidence: 0.6,
          },
        ],
      };
    },
  },
  {
    id: 'field_capture.report_lag',
    module: 'field_capture',
    run(snapshot) {
      const lag = num(signal(snapshot, 'avgReportLagDays'));
      if (lag === null || lag < 2) return {};
      return {
        observations: [
          {
            observation: `Field reports take about ${Math.round(lag)} days to come in, which delays invoicing by the same amount.`,
            module_source: 'field_capture',
            weight: 0.7,
          },
        ],
      };
    },
  },
  {
    id: 'seasonality.month_volume',
    module: '*',
    run(snapshot, ctx) {
      const volume = num(signal(snapshot, 'monthJobCount'));
      if (volume === null || !ctx || !ctx.monthName) return {};
      return {
        facts: [
          {
            key: `seasonality.volume_${ctx.monthName.toLowerCase()}`,
            value: String(Math.round(volume)),
            category: 'seasonality',
            confidence: 0.5,
          },
        ],
      };
    },
  },
]);

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Run every applicable rule over a set of module snapshots and persist what they produce.
 * Deduped against recent observations so repeated nightly runs stay quiet.
 *
 * @param {import('./store.js').AdvisorStore} store
 * @param {string} accountId
 * @param {Record<string, object>} snapshotsByModule
 * @param {object} [options]
 * @returns {Promise<{facts: object[], observations: object[], skipped: number}>}
 */
export async function runMemoryFormation(store, accountId, snapshotsByModule, options = {}) {
  const config = options.config || CONFIG;
  const now = options.now ? new Date(options.now) : new Date();
  const dedupeDays = options.dedupeDays ?? 7;
  const ctx = { monthName: MONTHS[now.getUTCMonth()], now };

  const recent = await store.listObservations(accountId, { sinceDays: dedupeDays, limit: 200 });
  const recentText = new Set(recent.map((r) => r.observation));

  const facts = [];
  const observations = [];
  let skipped = 0;

  for (const rule of RULES) {
    const targets =
      rule.module === '*'
        ? Object.values(snapshotsByModule)
        : [snapshotsByModule[rule.module]].filter(Boolean);
    for (const snapshot of targets) {
      let result;
      try {
        result = rule.run(snapshot, ctx) || {};
      } catch (err) {
        skipped += 1;
        continue;
      }
      for (const fact of result.facts || []) {
        facts.push(
          await store.upsertMemory(accountId, {
            ...fact,
            confidence: fact.confidence ?? config.memory.observedConfidence,
            source: 'observed',
          }),
        );
      }
      for (const obs of result.observations || []) {
        if (recentText.has(obs.observation)) {
          skipped += 1;
          continue;
        }
        recentText.add(obs.observation);
        observations.push(await store.addObservation(accountId, obs));
      }
    }
  }

  return { facts, observations, skipped };
}

/**
 * Age out facts nobody has confirmed. Confidence decays instead of the row being deleted,
 * so a stale fact quietly falls below the retrieval floor rather than vanishing.
 */
export async function decayStaleFacts(store, accountId, options = {}) {
  const config = options.config || CONFIG;
  const now = options.now ? new Date(options.now) : new Date();
  const rows = await store.listMemory(accountId, { limit: 1000 });
  const decayed = [];
  for (const row of rows) {
    if (row.source === 'owner_stated' || row.source === 'onboarding') continue;
    const age = daysAgo(row.updated_at, now);
    if (age < config.memory.staleAfterDays) continue;
    const periods = Math.floor(age / config.memory.staleAfterDays);
    const next = Math.max(config.memory.confidenceFloor, row.confidence - 0.1 * periods);
    if (next === row.confidence) continue;
    decayed.push(await store.upsertMemory(accountId, { ...row, confidence: next }));
  }
  return decayed;
}

export default { RULES, runMemoryFormation, decayStaleFacts };
