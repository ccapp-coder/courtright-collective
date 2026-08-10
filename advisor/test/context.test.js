import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryStore } from '../src/memory/inMemoryStore.js';
import { ModuleRegistry, registerEnabledModules, normalizeSnapshot } from '../src/modules/registry.js';
import { PROVIDERS } from '../src/modules/providers/index.js';
import { buildAdvisorContext, renderContextForPrompt } from '../src/context/buildAdvisorContext.js';
import { seedAccountMemory } from '../src/memory/onboarding.js';
import { createDemoAdvisor, demoDataSource, DEMO_ONBOARDING } from '../src/demo/seed.js';
import { CONFIG, MODULES } from '../../config/index.js';

const ACCOUNT = 'acct-context-test';

async function fixture(enabled = ['crm', 'booking', 'invoicing']) {
  const store = new InMemoryStore();
  await seedAccountMemory(store, ACCOUNT, DEMO_ONBOARDING);
  const registry = new ModuleRegistry();
  registerEnabledModules(registry, enabled, PROVIDERS);
  return { store, registry, dataSource: demoDataSource(), enabled };
}

test('every module in the catalog ships a getAdvisorContext provider', () => {
  for (const mod of MODULES.modules) {
    assert.equal(typeof PROVIDERS[mod.id], 'function', `${mod.id} must register a provider`);
  }
  assert.equal(Object.keys(PROVIDERS).length, MODULES.modules.length);
});

test('a provider returns a tight snapshot in the common shape', async () => {
  const data = demoDataSource();
  for (const mod of MODULES.modules) {
    // eslint-disable-next-line no-await-in-loop
    const raw = await PROVIDERS[mod.id](ACCOUNT, { data: data[mod.id], now: new Date() });
    const snapshot = normalizeSnapshot(raw, mod.id, CONFIG.context);
    assert.equal(snapshot.module, mod.id);
    assert.ok(snapshot.headline.length > 0, `${mod.id} needs a headline`);
    assert.ok(snapshot.items.length <= CONFIG.context.maxItemsPerModule);
    for (const item of snapshot.items) {
      assert.ok(item.title.length <= CONFIG.context.maxCharsPerItem);
    }
  }
});

test('the advisor never queries a module that is toggled off', async () => {
  const { store, dataSource } = await fixture();
  const registry = new ModuleRegistry();
  const called = [];
  registerEnabledModules(
    registry,
    ['crm', 'booking', 'invoicing', 'reviews'],
    Object.fromEntries(
      Object.entries(PROVIDERS).map(([id, fn]) => [
        id,
        (accountId, options) => {
          called.push(id);
          return fn(accountId, options);
        },
      ]),
    ),
  );

  await buildAdvisorContext(ACCOUNT, 'daily_rundown', {
    store,
    registry,
    enabledModuleIds: ['crm', 'booking'],
    dataSource,
  });

  assert.deepEqual(called.sort(), ['booking', 'crm']);
});

test('a module that throws does not take the advisor down', async () => {
  const { store, dataSource } = await fixture();
  const registry = new ModuleRegistry();
  registry.register('crm', () => {
    throw new Error('crm is down');
  });
  registry.register('invoicing', PROVIDERS.invoicing);

  const bundle = await buildAdvisorContext(ACCOUNT, 'daily_rundown', {
    store,
    registry,
    enabledModuleIds: ['crm', 'invoicing'],
    dataSource,
  });

  assert.equal(bundle.modules.length, 1);
  assert.equal(bundle.modules[0].module, 'invoicing');
  assert.equal(bundle.moduleErrors.length, 1);
  assert.match(bundle.moduleErrors[0].message, /crm is down/);
});

test('the bundle stays inside its character budget with every module on', async () => {
  const { advisor, store, accountId, dataSource } = await createDemoAdvisor();
  const registry = new ModuleRegistry();
  registerEnabledModules(registry, MODULES.modules.map((m) => m.id), PROVIDERS);

  const bundle = await buildAdvisorContext(accountId, 'daily_rundown', {
    store,
    registry,
    enabledModuleIds: MODULES.modules.map((m) => m.id),
    dataSource,
  });

  assert.ok(bundle.bundleChars <= CONFIG.context.maxBundleChars, `bundle was ${bundle.bundleChars}`);
  assert.ok(bundle.facts.length <= CONFIG.context.maxMemoryFacts);
  assert.ok(bundle.observations.length <= CONFIG.context.maxObservations);
  assert.ok(bundle.facts.length >= 8, 'the budget must never starve the bundle of facts');
  assert.ok(bundle.modules.length === 8);
  assert.ok(advisor);
});

test('purpose changes what is retrieved', async () => {
  const { store, registry, dataSource, enabled } = await fixture();
  const deps = { store, registry, enabledModuleIds: enabled, dataSource };

  const pitch = await buildAdvisorContext(ACCOUNT, 'pitch', { ...deps, clientId: 'c1' });
  const review = await buildAdvisorContext(ACCOUNT, 'weekly_review', deps);

  const pitchKeys = pitch.facts.slice(0, 5).map((f) => f.key);
  const reviewKeys = review.facts.slice(0, 5).map((f) => f.key);
  assert.notDeepEqual(pitchKeys, reviewKeys, 'a pitch and a weekly review should not study the same page');
  assert.ok(pitchKeys.some((k) => k.startsWith('services.') || k.startsWith('pricing.')));
  assert.ok(reviewKeys.some((k) => k.startsWith('goals.') || k.startsWith('seasonality.')));
});

test('a question pulls the relevant facts to the front', async () => {
  const { store, registry, dataSource, enabled } = await fixture();
  const bundle = await buildAdvisorContext(ACCOUNT, 'ask', {
    store,
    registry,
    enabledModuleIds: enabled,
    dataSource,
    question: 'what should I charge for a ceramic coating',
  });
  const top = bundle.facts.slice(0, 4).map((f) => f.key);
  assert.ok(top.includes('pricing.typical') || top.includes('services.offered'));
});

test('the rendered prompt block is plain text and carries names and numbers', async () => {
  const { store, registry, dataSource, enabled } = await fixture();
  const bundle = await buildAdvisorContext(ACCOUNT, 'daily_rundown', {
    store,
    registry,
    enabledModuleIds: enabled,
    dataSource,
  });
  const text = renderContextForPrompt(bundle);
  assert.match(text, /WHAT I KNOW ABOUT THIS BUSINESS/);
  assert.match(text, /LIVE STATE RIGHT NOW/);
  assert.match(text, /Bell Contracting/);
  assert.ok(!text.includes('{'), 'the prompt block must not be JSON');
});
