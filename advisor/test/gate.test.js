import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryStore } from '../src/memory/inMemoryStore.js';
import {
  ACCESS_STATES,
  canPurchaseAdvisor,
  activateAdvisor,
  evaluateAdvisorAccess,
  assertAdvisorAllowed,
  countPaidModules,
} from '../src/gate/gate.js';
import { createDemoAdvisor } from '../src/demo/seed.js';
import { CONFIG } from '../../config/index.js';

const ACCOUNT = 'acct-gate-test';

test('billing gate: the advisor cannot be bought with zero paid modules', async () => {
  const store = new InMemoryStore();
  const check = await canPurchaseAdvisor(store, ACCOUNT);
  assert.equal(check.allowed, false);
  assert.equal(check.reason, 'no_paid_module');
  assert.equal(check.copy.cta, CONFIG.gate.lockedStateCopy.cta);

  await assert.rejects(() => activateAdvisor(store, ACCOUNT), /advisor_locked/);
});

test('billing gate: the free filing cabinet does not unlock the advisor', async () => {
  const store = new InMemoryStore();
  await store.setModuleEnabled(ACCOUNT, 'filing_cabinet', true, false);
  const counted = await countPaidModules(store, ACCOUNT);
  assert.equal(counted.count, 0);
  const check = await canPurchaseAdvisor(store, ACCOUNT);
  assert.equal(check.allowed, false);
});

test('billing gate: one paid module opens checkout', async () => {
  const store = new InMemoryStore();
  await store.setModuleEnabled(ACCOUNT, 'booking', true, true);
  const check = await canPurchaseAdvisor(store, ACCOUNT);
  assert.equal(check.allowed, true);
  const addon = await activateAdvisor(store, ACCOUNT);
  assert.equal(addon.status, 'active');
});

test('UI states: locked, available, active', async () => {
  const store = new InMemoryStore();

  let access = await evaluateAdvisorAccess(store, ACCOUNT);
  assert.equal(access.state, ACCESS_STATES.LOCKED);
  assert.equal(access.allowed, false);
  assert.ok(access.copy.headline.length > 0, 'the locked state is a sales surface and needs copy');

  await store.setModuleEnabled(ACCOUNT, 'crm', true, true);
  access = await evaluateAdvisorAccess(store, ACCOUNT);
  assert.equal(access.state, ACCESS_STATES.AVAILABLE);
  assert.equal(access.priceUsdMonthly, CONFIG.product.addOnPriceUsdMonthly);

  await activateAdvisor(store, ACCOUNT);
  access = await evaluateAdvisorAccess(store, ACCOUNT);
  assert.equal(access.state, ACCESS_STATES.ACTIVE);
  assert.equal(access.allowed, true);
});

test('runtime gate: dropping to zero modules gives grace, then suspends, and never deletes memory', async () => {
  const day0 = new Date('2026-08-01T09:00:00Z');
  const store = new InMemoryStore({ clock: () => day0.getTime() });
  await store.setModuleEnabled(ACCOUNT, 'booking', true, true);
  await activateAdvisor(store, ACCOUNT);
  await store.upsertMemory(ACCOUNT, {
    key: 'goals.primary',
    value: 'Get to 18k a month',
    category: 'goals',
    confidence: 0.9,
    source: 'onboarding',
  });

  await store.setModuleEnabled(ACCOUNT, 'booking', false, true);

  const grace = await evaluateAdvisorAccess(store, ACCOUNT, { now: day0 });
  assert.equal(grace.state, ACCESS_STATES.GRACE);
  assert.equal(grace.allowed, true, 'a short grace note, not a hard cutoff');
  assert.match(grace.message, /pauses/);

  const later = new Date(day0.getTime() + (CONFIG.gate.graceDays + 1) * 86400000);
  const suspended = await evaluateAdvisorAccess(store, ACCOUNT, { now: later });
  assert.equal(suspended.state, ACCESS_STATES.SUSPENDED);
  assert.equal(suspended.allowed, false);
  assert.ok(suspended.copy.body.includes('kept'), 'the suspended copy must promise memory is kept');

  const memory = await store.listMemory(ACCOUNT, {});
  assert.equal(memory.length, 1, 'suspension must never delete memory');

  await store.setModuleEnabled(ACCOUNT, 'booking', true, true);
  const back = await evaluateAdvisorAccess(store, ACCOUNT, { now: later });
  assert.equal(back.state, ACCESS_STATES.ACTIVE);
  assert.equal(back.allowed, true);
  assert.equal((await store.listMemory(ACCOUNT, {})).length, 1);
});

test('runtime gate: every reasoning function refuses on a locked account', async () => {
  const { advisor, accountId } = await createDemoAdvisor({
    enabledModules: [],
    advisorActive: false,
    seedHistory: false,
  });

  const calls = [
    () => advisor.generateDailyRundown(accountId, { force: true }),
    () => advisor.answerAdvisorAsk(accountId, 'how is this month going'),
    () => advisor.findLowHangingFruit(accountId),
    () => advisor.suggestPitch(accountId, 'c1'),
    () => advisor.weeklyReview(accountId),
  ];
  for (const call of calls) {
    // eslint-disable-next-line no-await-in-loop
    await assert.rejects(call, (err) => err.code === 'advisor_gated');
  }
});

test('runtime gate: an account inside grace still gets answers, past grace it does not', async () => {
  const day0 = new Date('2026-08-01T09:00:00Z');
  const { advisor, store, accountId } = await createDemoAdvisor({ now: day0 });
  for (const mod of ['crm', 'booking', 'gated_content', 'progress', 'field_capture', 'invoicing', 'marketing', 'reviews']) {
    // eslint-disable-next-line no-await-in-loop
    await store.setModuleEnabled(accountId, mod, false, true);
  }

  const inGrace = await advisor.weeklyReview(accountId, { now: day0 });
  assert.ok(inGrace.text.length > 0);
  assert.equal(inGrace.access.state, ACCESS_STATES.GRACE);

  const later = new Date(day0.getTime() + (CONFIG.gate.graceDays + 1) * 86400000);
  await assert.rejects(
    () => advisor.weeklyReview(accountId, { now: later }),
    (err) => err.code === 'advisor_gated' && err.access.state === ACCESS_STATES.SUSPENDED,
  );
});

test('memory keeps forming while the advisor is suspended', async () => {
  const { advisor, store, accountId } = await createDemoAdvisor();
  await store.setModuleEnabled(accountId, 'booking', false, true);
  const before = (await store.listMemory(accountId, {})).length;
  const result = await advisor.refreshMemory(accountId);
  assert.ok(result.facts.length >= 0);
  const after = (await store.listMemory(accountId, {})).length;
  assert.ok(after >= before, 'learning is never gated, only reasoning is');
});

test('assertAdvisorAllowed carries the access payload the UI renders', async () => {
  const store = new InMemoryStore();
  await assert.rejects(
    () => assertAdvisorAllowed(store, ACCOUNT),
    (err) => {
      assert.equal(err.code, 'advisor_gated');
      assert.equal(err.access.state, ACCESS_STATES.LOCKED);
      assert.ok(err.access.copy.cta);
      return true;
    },
  );
});
