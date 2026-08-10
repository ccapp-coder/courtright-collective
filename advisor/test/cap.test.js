import test from 'node:test';
import assert from 'node:assert/strict';

import { InMemoryStore } from '../src/memory/inMemoryStore.js';
import { getUsageSnapshot, checkMoment, recordMoment } from '../src/usage/cap.js';
import { estimateMonthlyCost, marginReport } from '../src/usage/margin.js';
import { loadAdvisorConfig, CONFIG } from '../../config/index.js';
import { createDemoAdvisor } from '../src/demo/seed.js';

const ACCOUNT = 'acct-cap-test';

/** A tiny pool so the ceiling behaviour is testable without 300 calls. */
function tinyPoolConfig(pool = 5) {
  return loadAdvisorConfig({ ADVISOR_MONTHLY_ASK_POOL: String(pool) });
}

test('usage is measured in advisory moments, never in tokens', async () => {
  const store = new InMemoryStore();
  const usage = await getUsageSnapshot(store, ACCOUNT);
  assert.equal(usage.unit, 'advisory_moments');
  assert.equal(usage.pool, CONFIG.cap.monthlyAskPool);
  assert.equal(usage.asksUsed, 0);
  assert.ok(!('tokens' in usage));
});

test('the first daily rundown each day is included and never draws from the pool', async () => {
  const now = new Date('2026-08-10T08:00:00Z');
  const store = new InMemoryStore({ clock: () => now.getTime() });

  const first = await checkMoment(store, ACCOUNT, 'daily_rundown', { now });
  assert.equal(first.allowed, true);
  assert.equal(first.billed, false);
  await recordMoment(store, ACCOUNT, 'daily_rundown', { billed: false, now });

  const second = await checkMoment(store, ACCOUNT, 'daily_rundown', { now });
  assert.equal(second.allowed, true);
  assert.equal(second.billed, true, 'a second rundown in the same day costs an ask');

  const usage = await getUsageSnapshot(store, ACCOUNT, { now });
  assert.equal(usage.asksUsed, 0);
  assert.equal(usage.rundownsToday, 1);
});

test('the soft ceiling appears before the pool runs out and carries the upsell', async () => {
  const config = tinyPoolConfig(5);
  const now = new Date('2026-08-10T08:00:00Z');
  const store = new InMemoryStore({ clock: () => now.getTime() });

  for (let i = 0; i < 4; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await recordMoment(store, ACCOUNT, 'ask', { billed: true, now, config });
  }

  const usage = await getUsageSnapshot(store, ACCOUNT, { now, config });
  assert.equal(usage.asksUsed, 4);
  assert.equal(usage.softCeiling, true);
  assert.equal(usage.hardStopped, false);
  assert.equal(usage.notice.level, 'soft');
  assert.match(usage.notice.body, /4 of 5/, 'the note speaks in asks, not tokens');
  assert.ok(usage.notice.upgradeTiers.length === 3, 'the cap doubles as the path to 1/3/7 employees');
});

test('the pool stops at the ceiling and the daily rundown keeps arriving', async () => {
  const config = tinyPoolConfig(2);
  const now = new Date('2026-08-10T08:00:00Z');
  const store = new InMemoryStore({ clock: () => now.getTime() });

  await recordMoment(store, ACCOUNT, 'ask', { billed: true, now, config });
  await recordMoment(store, ACCOUNT, 'ask', { billed: true, now, config });

  const blocked = await checkMoment(store, ACCOUNT, 'ask', { now, config });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'ask_pool_exhausted');
  assert.equal(blocked.notice.level, 'hard');

  const rundown = await checkMoment(store, ACCOUNT, 'daily_rundown', { now, config });
  assert.equal(rundown.allowed, true, 'the included daily rundown survives an exhausted pool');
  assert.equal(rundown.billed, false);
});

test('the pool resets with the month', async () => {
  const config = tinyPoolConfig(3);
  const august = new Date('2026-08-31T08:00:00Z');
  const september = new Date('2026-09-01T08:00:00Z');
  const store = new InMemoryStore({ clock: () => august.getTime() });

  await recordMoment(store, ACCOUNT, 'ask', { billed: true, now: august, config });
  await recordMoment(store, ACCOUNT, 'ask', { billed: true, now: august, config });
  assert.equal((await getUsageSnapshot(store, ACCOUNT, { now: august, config })).asksUsed, 2);
  assert.equal((await getUsageSnapshot(store, ACCOUNT, { now: september, config })).asksUsed, 0);
});

test('a failed reasoning call does not cost the owner an ask', async () => {
  const { advisor, accountId } = await createDemoAdvisor({
    model: {
      provider: 'broken',
      model: 'broken',
      complete: async () => {
        throw new Error('model provider is down');
      },
    },
  });

  const before = (await advisor.getUsage(accountId)).asksUsed;
  await assert.rejects(() => advisor.findLowHangingFruit(accountId), /model provider is down/);
  const after = (await advisor.getUsage(accountId)).asksUsed;
  assert.equal(after, before);
});

test('an ask that runs is metered exactly once', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const before = (await advisor.getUsage(accountId)).asksUsed;
  await advisor.answerAdvisorAsk(accountId, 'who is my lowest hanging fruit');
  const after = (await advisor.getUsage(accountId)).asksUsed;
  assert.equal(after, before + 1);
});

test('the margin holds at the cap with the configured rates', () => {
  const report = marginReport();
  assert.ok(report.heavy.marginPercent > 85, `heavy user margin was ${report.heavy.marginPercent}`);
  assert.ok(report.typical.marginPercent > 95, `typical user margin was ${report.typical.marginPercent}`);
  assert.ok(report.heavy.totalUsd < CONFIG.product.addOnPriceUsdMonthly * 0.15);

  const doubled = estimateMonthlyCost(
    { rundowns: 30, asks: 300 },
    { ...CONFIG, costs: { ...CONFIG.costs, inputPerMillionUsd: 6, outputPerMillionUsd: 30 } },
  );
  assert.ok(doubled.marginPercent > 80, 'the shape barely moves even at double the rates');
});
