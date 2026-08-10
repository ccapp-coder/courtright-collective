/**
 * Memory seeding, step three of three: the loop that makes advice improve.
 *
 * When the owner marks a piece of advice as taken or ignored and says what happened,
 * that lands in advice_outcomes and, when it is informative enough, is folded back into
 * account_memory as a preference fact. Two ignores of the same kind of suggestion is the
 * advisor learning that this owner does not work that way.
 *
 * No tokens here either. This is bookkeeping that changes what the next prompt contains.
 */

import { CONFIG } from '../../../config/index.js';
import { clampConfidence } from './store.js';

/** Coarse buckets so preference facts stay short and reusable in a prompt. */
export const ADVICE_KINDS = Object.freeze({
  follow_up: /follow.?up|check in|reach out|call |text |email /i,
  rebook: /rebook|book (them|him|her)|schedule (them|another)/i,
  collect: /invoice|past due|overdue payment|collect|chase payment/i,
  upsell: /upsell|pitch|offer them|upgrade|add on/i,
  content: /post|newsletter|campaign|content|reel|email blast/i,
  review: /review|testimonial|rating/i,
  retention: /churn|cancel|win.?back|at risk/i,
  ops: /report|photo|sign.?off|paperwork|admin/i,
});

/** Classify an advice string into a kind. Cheap regex, no model. */
export function classifyAdvice(text) {
  if (!text) return 'general';
  for (const [kind, pattern] of Object.entries(ADVICE_KINDS)) {
    if (pattern.test(text)) return kind;
  }
  return 'general';
}

/**
 * Record an outcome and fold it back into memory.
 *
 * @param {import('./store.js').AdvisorStore} store
 * @param {string} adviceLogId
 * @param {{taken: boolean, result?: string, helpful?: boolean}} outcome
 * @param {object} [options]
 */
export async function applyOutcome(store, adviceLogId, outcome, options = {}) {
  const config = options.config || CONFIG;
  const advice = await store.getAdvice(adviceLogId);
  if (!advice) throw new Error(`advice_log ${adviceLogId} not found`);

  const record = await store.recordOutcome(adviceLogId, outcome);
  const accountId = advice.account_id;
  const kind = classifyAdvice(advice.advice_given);

  // Running tally per advice kind, stored as a fact so retrieval can pick it up for free.
  const key = `preferences.acts_on_${kind}`;
  const existing = await store.getMemory(accountId, key);
  const tally = parseTally(existing && existing.value);
  if (outcome.taken) tally.taken += 1;
  else tally.ignored += 1;
  const total = tally.taken + tally.ignored;
  const rate = total ? tally.taken / total : 0;

  const value =
    total < 3
      ? `${tally.taken} of ${total} taken`
      : rate >= 0.6
        ? `acts on ${kind.replace(/_/g, ' ')} advice (${tally.taken} of ${total})`
        : rate <= 0.25
          ? `ignores ${kind.replace(/_/g, ' ')} advice (${tally.taken} of ${total}), stop leading with it`
          : `mixed on ${kind.replace(/_/g, ' ')} advice (${tally.taken} of ${total})`;

  const fact = await store.upsertMemory(accountId, {
    key,
    value: `${value} |${tally.taken}/${tally.ignored}`,
    category: 'preferences',
    confidence: clampConfidence(
      (existing ? existing.confidence : config.memory.defaultConfidence) +
        config.memory.outcomeConfidenceBoost,
      config.memory.confidenceFloor,
      config.memory.confidenceCeiling,
    ),
    source: 'outcome',
  });

  // A written result is the most valuable thing the owner can give us. Keep it verbatim.
  let observation = null;
  if (outcome.result && String(outcome.result).trim()) {
    observation = await store.addObservation(accountId, {
      observation: `Advice "${truncate(advice.advice_given, 90)}" was ${
        outcome.taken ? 'taken' : 'ignored'
      }. Owner said: ${truncate(String(outcome.result).trim(), 140)}`,
      module_source: 'advisor',
      subject_type: advice.subject_type || 'advice',
      subject_id: advice.subject_id || adviceLogId,
      weight: outcome.taken ? 0.85 : 0.7,
    });
  }

  return { outcome: record, kind, fact, observation };
}

function parseTally(value) {
  const match = value && /\|(\d+)\/(\d+)$/.exec(value);
  if (!match) return { taken: 0, ignored: 0 };
  return { taken: Number(match[1]), ignored: Number(match[2]) };
}

function truncate(text, max) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length <= max ? s : `${s.slice(0, max - 1)}...`;
}

/**
 * Human readable summary of the loop, used inside context bundles.
 * Deliberately tiny: a handful of lines, not a transcript.
 */
export function summarizeOutcomes(outcomes, limit = 5) {
  return outcomes.slice(0, limit).map((o) => ({
    advice: truncate(o.advice || '', 90),
    taken: o.taken,
    result: o.result ? truncate(o.result, 80) : null,
  }));
}

export default { applyOutcome, classifyAdvice, summarizeOutcomes, ADVICE_KINDS };
