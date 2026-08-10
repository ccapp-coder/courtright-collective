/**
 * buildAdvisorContext(account_id, purpose) -> compact, relevant memory bundle.
 *
 * This is the retrieval step. Every reasoning function calls it first. It is the difference
 * between an advisor that knows the business and a chatbot, and it is also the single lever
 * that controls token cost, so it is deliberately stingy:
 *
 *   - only the memory categories that matter for this purpose
 *   - only observations from the recency window
 *   - only the last handful of outcomes
 *   - only modules that are toggled ON, each trimmed to a few items
 *   - the whole bundle capped by character budget, lowest value slice dropped first
 *
 * Think "study the file before the meeting", not "read the filing cabinet out loud".
 */

import { CONFIG } from '../../../config/index.js';
import { summarizeOutcomes } from '../memory/outcomes.js';

/**
 * Category weighting per purpose. A fact's score is weight * confidence, plus a keyword
 * bonus when the purpose carries a question. Facts below the floor never reach a prompt.
 */
export const PURPOSE_PROFILES = Object.freeze({
  daily_rundown: {
    categories: { goals: 1.0, operations: 0.9, clients: 0.85, preferences: 0.8, seasonality: 0.7, services: 0.6, pricing: 0.6, business: 0.6, voice: 0.5, general: 0.4 },
    includeObservations: true,
    includeOutcomes: true,
    moduleScope: 'all',
  },
  ask: {
    categories: { business: 0.9, services: 0.9, pricing: 0.85, clients: 0.85, goals: 0.85, operations: 0.8, preferences: 0.8, seasonality: 0.7, voice: 0.6, general: 0.5 },
    includeObservations: true,
    includeOutcomes: true,
    moduleScope: 'all',
  },
  low_hanging_fruit: {
    categories: { operations: 1.0, clients: 0.95, pricing: 0.85, goals: 0.8, preferences: 0.8, services: 0.7, seasonality: 0.6, business: 0.5, voice: 0.3, general: 0.3 },
    includeObservations: true,
    includeOutcomes: true,
    moduleScope: 'all',
  },
  pitch: {
    categories: { services: 1.0, pricing: 1.0, clients: 0.95, voice: 0.9, preferences: 0.8, business: 0.7, operations: 0.6, goals: 0.5, seasonality: 0.5, general: 0.3 },
    includeObservations: true,
    includeOutcomes: false,
    moduleScope: 'client',
  },
  weekly_review: {
    categories: { goals: 1.0, operations: 0.9, seasonality: 0.85, clients: 0.8, pricing: 0.75, business: 0.7, preferences: 0.6, services: 0.6, voice: 0.4, general: 0.4 },
    includeObservations: true,
    includeOutcomes: true,
    moduleScope: 'all',
  },
});

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'my', 'me', 'i', 'to', 'for', 'of', 'and', 'or',
  'what', 'who', 'how', 'should', 'do', 'does', 'this', 'that', 'it', 'on', 'in', 'with',
  'can', 'you', 'be', 'am', 'have', 'has', 'get', 'got', 'next', 'now', 'about',
]);

function keywords(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function keywordBonus(haystack, words) {
  if (!words.length) return 0;
  const text = String(haystack).toLowerCase();
  let hits = 0;
  for (const w of words) if (text.includes(w)) hits += 1;
  return Math.min(0.6, hits * 0.2);
}

/**
 * @param {string} accountId
 * @param {string} purpose one of PURPOSE_PROFILES
 * @param {object} deps
 * @param {import('../memory/store.js').AdvisorStore} deps.store
 * @param {import('../modules/registry.js').ModuleRegistry} deps.registry
 * @param {string[]} deps.enabledModuleIds modules toggled ON for this account
 * @param {object} [deps.dataSource]
 * @param {string} [deps.question] free text for an ask, used for keyword relevance
 * @param {string} [deps.clientId] subject for a pitch
 * @param {Date} [deps.now]
 * @param {object} [deps.config]
 * @returns {Promise<object>} the bundle
 */
export async function buildAdvisorContext(accountId, purpose, deps) {
  const config = deps.config || CONFIG;
  const limits = config.context;
  const profile = PURPOSE_PROFILES[purpose] || PURPOSE_PROFILES.ask;
  const now = deps.now ? new Date(deps.now) : new Date();
  const words = keywords(deps.question);

  const [rawFacts, rawObservations, rawOutcomes, moduleResult] = await Promise.all([
    deps.store.listMemory(accountId, { minConfidence: limits.minConfidence, limit: 400 }),
    profile.includeObservations
      ? deps.store.listObservations(accountId, {
          sinceDays: limits.observationRecencyDays,
          limit: 120,
          subjectId: profile.moduleScope === 'client' ? deps.clientId : undefined,
        })
      : Promise.resolve([]),
    profile.includeOutcomes
      ? deps.store.listOutcomes(accountId, { sinceDays: limits.outcomeRecencyDays, limit: 40 })
      : Promise.resolve([]),
    deps.registry.collect(accountId, {
      enabledModuleIds: deps.enabledModuleIds || [],
      purpose,
      dataSource: deps.dataSource,
      now,
    }),
  ]);

  // ------------------------------------------------------------------ facts
  const scoredFacts = rawFacts
    .map((fact) => {
      const weight = profile.categories[fact.category] ?? 0.4;
      const score = weight * fact.confidence + keywordBonus(`${fact.key} ${fact.value}`, words);
      return { fact, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.maxMemoryFacts);

  const facts = scoredFacts.map(({ fact }) => ({
    key: fact.key,
    value: stripTally(fact.value),
    category: fact.category,
    confidence: Number(fact.confidence.toFixed(2)),
  }));

  // ----------------------------------------------------------- observations
  const observations = rawObservations
    .map((obs) => ({
      obs,
      score:
        (obs.weight ?? 0.5) +
        keywordBonus(obs.observation, words) +
        recencyBonus(obs.created_at, now, limits.observationRecencyDays),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limits.maxObservations)
    .map(({ obs }) => ({ text: obs.observation, from: obs.module_source }));

  // --------------------------------------------------------------- outcomes
  const outcomes = summarizeOutcomes(rawOutcomes, limits.maxOutcomes);

  // ---------------------------------------------------------------- modules
  const modules = Object.values(moduleResult.snapshots).map((s) => ({
    module: s.module,
    label: s.label,
    headline: s.headline,
    metrics: s.metrics,
    items: s.items,
  }));

  const bundle = {
    accountId,
    purpose,
    generatedAt: now.toISOString(),
    question: deps.question || undefined,
    clientId: deps.clientId || undefined,
    enabledModules: deps.enabledModuleIds || [],
    facts,
    observations,
    outcomes,
    modules,
    moduleErrors: moduleResult.errors,
    modulesSkipped: moduleResult.skipped,
  };

  return enforceBudget(bundle, limits);
}

function recencyBonus(iso, now, windowDays) {
  if (!iso) return 0;
  const age = (now.getTime() - new Date(iso).getTime()) / 86400000;
  if (age < 0) return 0.2;
  return Math.max(0, 0.25 * (1 - age / windowDays));
}

/** Preference facts carry a machine tally suffix. Humans and prompts do not need it. */
function stripTally(value) {
  return String(value).replace(/\s*\|\d+\/\d+$/, '');
}

/**
 * Hard character budget. Drops the least valuable slice first: extra outcomes, then
 * observations, then module items, then facts. The bundle always keeps at least the
 * module headlines and the top facts, so an answer is never ungrounded.
 */
export function enforceBudget(bundle, limits) {
  const size = () => JSON.stringify(bundle).length;
  const order = [
    () => bundle.outcomes.length > 2 && bundle.outcomes.pop(),
    () => bundle.observations.length > 3 && bundle.observations.pop(),
    () => {
      const fattest = bundle.modules
        .slice()
        .sort((a, b) => b.items.length - a.items.length)[0];
      return fattest && fattest.items.length > 1 && fattest.items.pop();
    },
    () => bundle.facts.length > 8 && bundle.facts.pop(),
  ];

  let guard = 0;
  while (size() > limits.maxBundleChars && guard < 500) {
    guard += 1;
    let dropped = false;
    for (const drop of order) {
      if (drop()) {
        dropped = true;
        break;
      }
    }
    if (!dropped) break;
  }
  bundle.bundleChars = size();
  return bundle;
}

/**
 * Render a bundle as the compact text block that goes into a prompt.
 * Plain lines, no JSON, because JSON costs tokens and buys nothing here.
 */
export function renderContextForPrompt(bundle) {
  const lines = [];
  lines.push('WHAT I KNOW ABOUT THIS BUSINESS');
  if (!bundle.facts.length) lines.push('- nothing on file yet');
  for (const fact of bundle.facts) lines.push(`- ${labelFor(fact.key)}: ${fact.value}`);

  if (bundle.observations.length) {
    lines.push('', 'PATTERNS I HAVE NOTICED');
    for (const obs of bundle.observations) lines.push(`- ${obs.text}`);
  }

  if (bundle.outcomes.length) {
    lines.push('', 'HOW PAST ADVICE LANDED');
    for (const outcome of bundle.outcomes) {
      lines.push(
        `- "${outcome.advice}" -> ${outcome.taken ? 'taken' : 'ignored'}${outcome.result ? `, ${outcome.result}` : ''}`,
      );
    }
  }

  lines.push('', 'LIVE STATE RIGHT NOW');
  if (!bundle.modules.length) lines.push('- no modules reporting');
  for (const mod of bundle.modules) {
    lines.push(`${mod.label}: ${mod.headline}`);
    for (const item of mod.items) {
      const money = item.valueUsd ? ` [$${item.valueUsd}]` : '';
      lines.push(`  - ${item.title}${money}${item.detail ? ` (${item.detail})` : ''}`);
    }
  }

  return lines.join('\n');
}

function labelFor(key) {
  return key.split('.').slice(1).join(' ').replace(/_/g, ' ') || key;
}

export default buildAdvisorContext;
