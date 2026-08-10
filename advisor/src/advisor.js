/**
 * The advisor reasoning layer.
 *
 * Six shared functions. Each one is a normal function the human UI calls, and each one is
 * also exposed verbatim as an AI tool (advisor/src/tools/toolDefinitions.js) so the paid AI
 * employees call the exact same code path. One capability, two interfaces. There is no
 * human only version and no AI only version of anything in here.
 *
 * Every function follows the same six steps:
 *   1. runtime gate      at least one paid module enabled, or refuse and say why
 *   2. cap check         is this advisory moment included, billed, or blocked
 *   3. retrieval         buildAdvisorContext assembles the tight relevant bundle
 *   4. reasoning         the ONLY step that spends tokens
 *   5. log               advice_log with the context snapshot that produced it
 *   6. meter             record the moment, only after the reasoning succeeded
 */

import { CONFIG, MODULES } from '../../config/index.js';
import { buildAdvisorContext } from './context/buildAdvisorContext.js';
import { ModuleRegistry, registerEnabledModules } from './modules/registry.js';
import { PROVIDERS } from './modules/providers/index.js';
import { createModelClient } from './reasoning/modelClient.js';
import { buildPrompt, buildSystemPrompt } from './reasoning/prompts.js';
import { rankOpportunities } from './reasoning/rank.js';
import { assertAdvisorAllowed, evaluateAdvisorAccess } from './gate/gate.js';
import { checkMoment, recordMoment, getUsageSnapshot, AdvisorCapError } from './usage/cap.js';
import { applyOutcome } from './memory/outcomes.js';
import { runMemoryFormation } from './memory/factRules.js';
import { dayKey } from './memory/store.js';

/**
 * @param {object} deps
 * @param {import('./memory/store.js').AdvisorStore} deps.store
 * @param {ModuleRegistry} [deps.registry]
 * @param {object} [deps.providers]   moduleId -> getAdvisorContext, defaults to the shipped eight
 * @param {object} [deps.dataSource]  moduleId -> raw data handed to that module's provider
 * @param {object} [deps.model]       model client, defaults to createModelClient()
 * @param {object} [deps.config]
 * @param {() => Date} [deps.clock]
 */
export function createAdvisor(deps) {
  const config = deps.config || CONFIG;
  const catalog = deps.catalog || MODULES;
  const store = deps.store;
  const providers = deps.providers || PROVIDERS;
  const registry = deps.registry || new ModuleRegistry({ config, catalog });
  const model = deps.model || createModelClient({ config, env: deps.env });
  const clock = deps.clock || (() => new Date());

  if (!store) throw new Error('createAdvisor needs a store');

  /** Register providers for exactly the modules this account has toggled on. */
  async function prepare(accountId, options = {}) {
    const now = options.now ? new Date(options.now) : clock();
    const access =
      options.access || (await assertAdvisorAllowed(store, accountId, { config, catalog, now }));
    registry.providers.clear();
    registerEnabledModules(registry, access.enabledModuleIds, providers);
    return access;
  }

  /**
   * Shared spine for every reasoning moment.
   */
  async function runMoment(accountId, purpose, options = {}) {
    const now = options.now ? new Date(options.now) : clock();
    const access = await prepare(accountId, { ...options, now });

    const momentType = purpose;
    const check = await checkMoment(store, accountId, momentType, { config, now });
    if (!check.allowed) throw new AdvisorCapError(check);

    const bundle = await buildAdvisorContext(accountId, purpose, {
      store,
      registry,
      enabledModuleIds: access.enabledModuleIds,
      dataSource: deps.dataSource,
      question: options.question,
      clientId: options.clientId,
      now,
      config,
    });

    const completion = await model.complete({
      system: buildSystemPrompt(bundle),
      prompt: buildPrompt(purpose, bundle, options),
      purpose,
      bundle,
      question: options.question,
      clientId: options.clientId,
      focusItemCount: options.focusItemCount,
      limit: options.limit,
    });

    const logged = await store.logAdvice(accountId, {
      advice_given: completion.text,
      context_snapshot: snapshotFor(bundle),
      purpose,
      subject_type: options.clientId ? 'client' : null,
      subject_id: options.clientId || null,
    });

    const usage = await recordMoment(store, accountId, momentType, {
      billed: check.billed,
      config,
      now,
    });

    return {
      text: completion.text,
      adviceLogId: logged.id,
      purpose,
      access,
      usage,
      notice: usage.notice,
      billed: check.billed,
      meta: {
        provider: completion.provider,
        model: completion.model,
        tokens: completion.usage,
        bundleChars: bundle.bundleChars,
        facts: bundle.facts.length,
        observations: bundle.observations.length,
        modules: bundle.modules.map((m) => m.module),
        moduleErrors: bundle.moduleErrors,
        generatedAt: now.toISOString(),
      },
      items: rankOpportunities(bundle).slice(0, 6),
    };
  }

  /** Keep the stored snapshot small. It is for auditing advice, not for replaying it. */
  function snapshotFor(bundle) {
    return {
      generatedAt: bundle.generatedAt,
      purpose: bundle.purpose,
      question: bundle.question,
      facts: bundle.facts.map((f) => `${f.key}=${f.value}`),
      observations: bundle.observations.map((o) => o.text),
      modules: bundle.modules.map((m) => ({ module: m.module, headline: m.headline, metrics: m.metrics })),
      bundleChars: bundle.bundleChars,
    };
  }

  const api = {
    store,
    registry,
    model,
    config,

    // ------------------------------------------------------------ reasoning
    /**
     * generateDailyRundown(account_id) -> short prioritized brief for today.
     * The first one each day is included and never draws from the ask pool. Asking twice
     * returns the same brief unless force is set, which is both cheaper and less confusing.
     */
    async generateDailyRundown(accountId, options = {}) {
      const now = options.now ? new Date(options.now) : clock();
      if (!options.force) {
        const today = dayKey(now);
        const recent = await store.listRecentAdvice(accountId, { purpose: 'daily_rundown', limit: 5 });
        const cached = recent.find((r) => dayKey(new Date(r.created_at)) === today);
        if (cached) {
          const access = await evaluateAdvisorAccess(store, accountId, { config, catalog, now });
          const usage = await getUsageSnapshot(store, accountId, { config, now });
          return {
            text: cached.advice_given,
            adviceLogId: cached.id,
            purpose: 'daily_rundown',
            access,
            usage,
            notice: usage.notice,
            billed: false,
            cached: true,
            meta: { generatedAt: cached.created_at, cached: true },
            items: [],
          };
        }
      }
      return runMoment(accountId, 'daily_rundown', {
        ...options,
        focusItemCount: options.focusItemCount || config.rundown.focusItemCount,
      });
    },

    /** answerAdvisorAsk(account_id, question) -> grounded answer to an on demand question. */
    async answerAdvisorAsk(accountId, question, options = {}) {
      if (!question || !String(question).trim()) throw new Error('question is required');
      return runMoment(accountId, 'ask', { ...options, question: String(question).trim() });
    },

    /** findLowHangingFruit(account_id) -> ranked easy, high value actions right now. */
    async findLowHangingFruit(accountId, options = {}) {
      return runMoment(accountId, 'low_hanging_fruit', { ...options, limit: options.limit || 5 });
    },

    /** suggestPitch(account_id, client_id) -> what to offer this specific client next. */
    async suggestPitch(accountId, clientId, options = {}) {
      if (!clientId) throw new Error('client_id is required');
      return runMoment(accountId, 'pitch', { ...options, clientId });
    },

    /** weeklyReview(account_id) -> natural language state of the business. */
    async weeklyReview(accountId, options = {}) {
      return runMoment(accountId, 'weekly_review', options);
    },

    /**
     * recordAdviceOutcome(advice_log_id, taken, result) -> closes the learning loop.
     * Free. Never gated, never metered: we want as much of this as we can get.
     */
    async recordAdviceOutcome(adviceLogId, taken, result, options = {}) {
      return applyOutcome(
        store,
        adviceLogId,
        { taken, result, helpful: options.helpful },
        { config },
      );
    },

    // ----------------------------------------------------------- supporting
    /**
     * Everything the advisor home panel needs in one call: which state to render, today's
     * rundown if it exists, usage, and the module headlines behind the ask box.
     */
    async getAdvisorHome(accountId, options = {}) {
      const now = options.now ? new Date(options.now) : clock();
      const access = await evaluateAdvisorAccess(store, accountId, { config, catalog, now });
      const usage = access.state === 'locked' || access.state === 'available'
        ? null
        : await getUsageSnapshot(store, accountId, { config, now });

      const home = {
        state: access.state,
        access,
        usage,
        price: config.product.addOnPriceUsdMonthly,
        product: config.product,
        catalog: catalog.modules.map((m) => ({
          id: m.id,
          name: m.name,
          priceUsdMonthly: m.priceUsdMonthly,
          advisorSummary: m.advisorSummary,
          enabled: access.enabledModuleIds.includes(m.id),
        })),
        rundown: null,
        suggestedAsks: SUGGESTED_ASKS,
      };

      if (!access.allowed) return home;

      if (options.includeRundown !== false) {
        home.rundown = await api.generateDailyRundown(accountId, { now });
        home.usage = home.rundown.usage;
      }
      return home;
    },

    /**
     * Nightly plumbing. Reads every enabled module once and lets the rules write facts and
     * observations. Cheap: no model involved. Run it on a schedule per account.
     */
    async refreshMemory(accountId, options = {}) {
      const now = options.now ? new Date(options.now) : clock();
      const access = await evaluateAdvisorAccess(store, accountId, { config, catalog, now });
      // Memory keeps forming even while the advisor is suspended, so a returning account
      // comes back sharper than it left. Only reasoning is gated, never learning.
      registry.providers.clear();
      registerEnabledModules(registry, access.enabledModuleIds, providers);
      const collected = await registry.collect(accountId, {
        enabledModuleIds: access.enabledModuleIds,
        purpose: 'memory',
        dataSource: deps.dataSource,
        now,
      });
      return runMemoryFormation(store, accountId, collected.snapshots, { config, now });
    },

    /** Raw module snapshots. Shared function, also an AI tool. Never spends tokens. */
    async getAccountSnapshot(accountId, options = {}) {
      const now = options.now ? new Date(options.now) : clock();
      const access = await evaluateAdvisorAccess(store, accountId, { config, catalog, now });
      registry.providers.clear();
      registerEnabledModules(registry, access.enabledModuleIds, providers);
      const collected = await registry.collect(accountId, {
        enabledModuleIds: access.enabledModuleIds,
        purpose: options.purpose || 'ask',
        dataSource: deps.dataSource,
        now,
      });
      return { access, ...collected };
    },

    /** Usage without side effects, for the meter in the panel header. */
    async getUsage(accountId, options = {}) {
      return getUsageSnapshot(store, accountId, { config, now: options.now ? new Date(options.now) : clock() });
    },
  };

  return api;
}

export const SUGGESTED_ASKS = Object.freeze([
  'Who is my lowest hanging fruit right now?',
  'How is this month going?',
  'What should I do first today?',
  'Who is about to leave and how do I keep them?',
  'Where is my money stuck?',
]);

export default createAdvisor;
