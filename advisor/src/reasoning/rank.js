/**
 * Deterministic ranking over a context bundle.
 *
 * The model writes the words. This file decides what is worth talking about, for three
 * reasons: it is free, it is stable across runs, and it lets the advisor honour what the
 * owner has actually acted on in the past without asking a model to remember that.
 */

import { classifyAdvice } from '../memory/outcomes.js';

/** Modules whose items tend to be money already earned score higher by default. */
const MODULE_WEIGHT = Object.freeze({
  invoicing: 1.15,
  booking: 1.1,
  crm: 1.05,
  field_capture: 1.0,
  gated_content: 0.95,
  reviews: 0.9,
  progress: 0.95,
  marketing: 0.85,
});

/** Rough effort read from the action verb. Low effort plus high value is the fruit. */
const LOW_EFFORT = /(text|send|call|reply|ask|confirm|nudge|thank|offer)/i;
const HIGH_EFFORT = /(build|set up|write a|redesign|migrate|rebuild|plan)/i;

export function effortOf(item) {
  const text = `${item.action || ''} ${item.title || ''}`;
  if (HIGH_EFFORT.test(text)) return 'high';
  if (LOW_EFFORT.test(text)) return 'low';
  return 'medium';
}

const EFFORT_MULTIPLIER = { low: 1.25, medium: 1.0, high: 0.7 };

/**
 * Preference multipliers learned from advice_outcomes, read straight off the facts in the
 * bundle. If the owner ignores follow-up advice five times running, follow-up advice stops
 * leading the rundown. No model call involved.
 */
export function preferenceMultipliers(bundle) {
  const out = {};
  for (const fact of bundle.facts || []) {
    const match = /^preferences\.acts_on_(\w+)$/.exec(fact.key);
    if (!match) continue;
    const kind = match[1];
    if (/^ignores/.test(fact.value)) out[kind] = 0.6;
    else if (/^acts on/.test(fact.value)) out[kind] = 1.25;
    else out[kind] = 1.0;
  }
  return out;
}

/**
 * @param {object} bundle from buildAdvisorContext
 * @param {object} [options]
 * @returns {Array<object>} items sorted best first, each with score, effort, module
 */
export function rankOpportunities(bundle, options = {}) {
  const prefs = preferenceMultipliers(bundle);
  const values = [];
  for (const mod of bundle.modules || []) {
    for (const item of mod.items || []) values.push(item.valueUsd || 0);
  }
  const maxValue = Math.max(1, ...values);

  const ranked = [];
  for (const mod of bundle.modules || []) {
    for (const item of mod.items || []) {
      const urgency = typeof item.urgency === 'number' ? item.urgency : 0.4;
      const valueScore = (item.valueUsd || 0) / maxValue;
      const effort = effortOf(item);
      const kind = classifyAdvice(`${item.action || ''} ${item.title || ''}`);
      const score =
        (urgency * 0.55 + valueScore * 0.45) *
        (MODULE_WEIGHT[mod.module] || 1) *
        EFFORT_MULTIPLIER[effort] *
        (prefs[kind] || 1);
      ranked.push({
        ...item,
        module: mod.module,
        moduleLabel: mod.label,
        effort,
        kind,
        score: Number(score.toFixed(4)),
      });
    }
  }

  ranked.sort((a, b) => b.score - a.score);

  // Spread across modules so a rundown does not become three invoices in a row.
  if (options.diversify !== false) {
    const seen = new Map();
    const spread = [];
    const overflow = [];
    for (const item of ranked) {
      const count = seen.get(item.module) || 0;
      if (count < (options.perModule || 2)) {
        seen.set(item.module, count + 1);
        spread.push(item);
      } else {
        overflow.push(item);
      }
    }
    return [...spread, ...overflow];
  }

  return ranked;
}

/** Total money visibly sitting on the table across every enabled module. */
export function moneyOnTable(bundle) {
  let total = 0;
  for (const mod of bundle.modules || []) {
    for (const item of mod.items || []) total += item.valueUsd || 0;
  }
  return Math.round(total);
}

export default { rankOpportunities, effortOf, preferenceMultipliers, moneyOnTable };
