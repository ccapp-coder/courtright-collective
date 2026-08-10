import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryStore } from '../src/memory/inMemoryStore.js';
import { seedAccountMemory, statedByOwner, ONBOARDING_QUESTIONS } from '../src/memory/onboarding.js';
import { runMemoryFormation, decayStaleFacts } from '../src/memory/factRules.js';
import { applyOutcome, classifyAdvice } from '../src/memory/outcomes.js';
import { createDemoAdvisor, DEMO_ONBOARDING } from '../src/demo/seed.js';

const ACCOUNT = 'acct-memory-test';

test('onboarding answers become high confidence facts', async () => {
  const store = new InMemoryStore();
  const written = await seedAccountMemory(store, ACCOUNT, DEMO_ONBOARDING);
  assert.equal(written.length, Object.keys(DEMO_ONBOARDING).length);

  const goal = await store.getMemory(ACCOUNT, 'goals.primary');
  assert.match(goal.value, /18,000/);
  assert.equal(goal.source, 'onboarding');
  assert.ok(goal.confidence >= 0.85);
});

test('every onboarding question maps to a real memory category', async () => {
  const store = new InMemoryStore();
  const answers = Object.fromEntries(ONBOARDING_QUESTIONS.map((q) => [q.key, 'x']));
  await seedAccountMemory(store, ACCOUNT, answers);
  const rows = await store.listMemory(ACCOUNT, {});
  assert.equal(rows.length, ONBOARDING_QUESTIONS.length);
  for (const row of rows) assert.ok(row.category && row.category !== 'undefined');
});

test('owner stated facts outrank observed ones', async () => {
  const store = new InMemoryStore();
  await store.upsertMemory(ACCOUNT, {
    key: 'pricing.average_ticket_usd',
    value: '210',
    category: 'pricing',
    confidence: 0.6,
    source: 'observed',
  });
  const updated = await statedByOwner(store, ACCOUNT, 'pricing.average_ticket_usd', '260', 'pricing');
  assert.equal(updated.value, '260');
  assert.equal(updated.source, 'owner_stated');
  assert.ok(updated.confidence > 0.9);

  const all = await store.listMemory(ACCOUNT, {});
  assert.equal(all.length, 1, 'upsert must sharpen a fact, not duplicate it');
});

test('rules turn module signals into facts and observations, and do not duplicate them', async () => {
  const store = new InMemoryStore();
  const snapshots = {
    booking: { module: 'booking', signals: { avgRebookDays: 28, noShowRate: 0.11 } },
    invoicing: {
      module: 'invoicing',
      signals: { latePaymentThresholdUsd: 500, lateRateAboveThreshold: 0.66, averageTicketUsd: 240 },
    },
  };

  const first = await runMemoryFormation(store, ACCOUNT, snapshots);
  assert.ok(first.facts.length >= 3);
  assert.ok(first.observations.length >= 2);

  const cadence = await store.getMemory(ACCOUNT, 'operations.rebook_cadence_days');
  assert.equal(cadence.value, '28');
  assert.equal(cadence.source, 'observed');

  const observations = await store.listObservations(ACCOUNT, {});
  assert.ok(observations.some((o) => /over \$500 tend to pay late/.test(o.observation)));

  const second = await runMemoryFormation(store, ACCOUNT, snapshots);
  assert.equal(second.observations.length, 0, 'a second run inside the dedupe window writes nothing new');
  const after = await store.listObservations(ACCOUNT, {});
  assert.equal(after.length, observations.length);
});

test('rules never spend tokens and survive a broken module snapshot', async () => {
  const store = new InMemoryStore();
  const snapshots = {
    booking: { module: 'booking', get signals() { throw new Error('module exploded'); } },
    invoicing: { module: 'invoicing', signals: { averageTicketUsd: 300 } },
  };
  const result = await runMemoryFormation(store, ACCOUNT, snapshots);
  assert.ok(result.skipped > 0);
  const ticket = await store.getMemory(ACCOUNT, 'pricing.average_ticket_usd');
  assert.equal(ticket.value, '300', 'one bad module must not stop the others');
});

test('stale observed facts decay but onboarding facts do not', async () => {
  const now = new Date('2026-08-10T12:00:00Z');
  const old = new Date('2025-01-01T12:00:00Z').toISOString();
  const store = new InMemoryStore({ clock: () => now.getTime() });

  await store.upsertMemory(ACCOUNT, { key: 'operations.x', value: '1', category: 'operations', confidence: 0.7, source: 'observed' });
  await store.upsertMemory(ACCOUNT, { key: 'goals.primary', value: 'grow', category: 'goals', confidence: 0.9, source: 'onboarding' });
  store.tables.account_memory.forEach((r) => { r.updated_at = old; });

  const decayed = await decayStaleFacts(store, ACCOUNT, { now });
  assert.equal(decayed.length, 1);
  assert.equal(decayed[0].key, 'operations.x');
  assert.ok(decayed[0].confidence < 0.7);

  const goal = await store.getMemory(ACCOUNT, 'goals.primary');
  assert.equal(goal.confidence, 0.9);
});

test('advice classification buckets the common shapes', () => {
  assert.equal(classifyAdvice('Text Mike Trent a time this week'), 'follow_up');
  assert.equal(classifyAdvice('Send Bell Contracting a payment nudge on the overdue payment'), 'collect');
  assert.equal(classifyAdvice('Post a reel about ceramic coating'), 'content');
  assert.equal(classifyAdvice('Ask Anna for a review'), 'review');
});

test('outcomes close the loop and teach the advisor what the owner ignores', async () => {
  const store = new InMemoryStore();
  let taken = 0;
  for (let i = 0; i < 4; i += 1) {
    const logged = await store.logAdvice(ACCOUNT, {
      advice_given: 'Post a reel about ceramic coating to Instagram',
      purpose: 'daily_rundown',
    });
    // eslint-disable-next-line no-await-in-loop
    const applied = await applyOutcome(store, logged.id, { taken: false, result: 'Not doing video' });
    assert.equal(applied.kind, 'content');
    taken += applied.outcome.taken ? 1 : 0;
  }
  assert.equal(taken, 0);

  const fact = await store.getMemory(ACCOUNT, 'preferences.acts_on_content');
  assert.match(fact.value, /^ignores content advice/);
  assert.equal(fact.source, 'outcome');

  const outcomes = await store.listOutcomes(ACCOUNT, {});
  assert.equal(outcomes.length, 4);
  assert.ok(outcomes[0].advice.includes('ceramic'));
});

test('the demo account seeds memory from all three paths', async () => {
  const { store, accountId } = await createDemoAdvisor();
  const facts = await store.listMemory(accountId, {});
  const bySource = facts.reduce((acc, f) => {
    acc[f.source] = (acc[f.source] || 0) + 1;
    return acc;
  }, {});
  assert.ok(bySource.onboarding >= 8, 'questionnaire');
  assert.ok(bySource.observed >= 3, 'rules watching module data');
  assert.ok(bySource.outcome >= 1, 'the feedback loop');
});
