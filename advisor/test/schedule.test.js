import test from 'node:test';
import assert from 'node:assert/strict';

import { runDailyRundowns, runMemoryRefresh, rundownSchedule } from '../src/schedule/dailyRundownJob.js';
import { createDemoAdvisor } from '../src/demo/seed.js';
import { CONFIG } from '../../config/index.js';

test('the scheduled rundown runs for active accounts and skips paused ones', async () => {
  const active = await createDemoAdvisor();
  const locked = await createDemoAdvisor({ enabledModules: [], advisorActive: false, seedHistory: false });

  const deps = {
    store: active.store,
    advisorFor: async () => active.advisor,
  };
  const result = await runDailyRundowns(deps, [active.accountId], { now: active.now });
  assert.equal(result.sent.length, 1);
  assert.equal(result.failed.length, 0);

  const lockedResult = await runDailyRundowns(
    { store: locked.store, advisorFor: async () => locked.advisor },
    [locked.accountId],
    { now: locked.now },
  );
  assert.equal(lockedResult.sent.length, 0);
  assert.equal(lockedResult.skipped[0].reason, 'locked');
});

test('running the schedule twice in a day does not reason twice', async () => {
  const { advisor, store, accountId, now } = await createDemoAdvisor();
  const deps = { store, advisorFor: async () => advisor };
  await runDailyRundowns(deps, [accountId], { now });
  const second = await runDailyRundowns(deps, [accountId], { now });
  assert.equal(second.sent[0].cached, true);

  const usage = await advisor.getUsage(accountId, { now });
  assert.equal(usage.asksUsed, 0, 'the included rundown never draws from the pool');
});

test('the nightly memory refresh is free and runs for every account', async () => {
  const { advisor, store, accountId } = await createDemoAdvisor();
  const before = await advisor.getUsage(accountId);
  const result = await runMemoryRefresh({ store, advisorFor: async () => advisor }, [accountId]);
  const after = await advisor.getUsage(accountId);
  assert.equal(after.asksUsed, before.asksUsed, 'learning costs nothing');
  assert.equal(result.refreshed.length, 1);
  assert.equal(result.failed.length, 0);
});

test('the schedule comes from config, not from code', () => {
  const schedule = rundownSchedule();
  assert.equal(schedule.cron, CONFIG.rundown.scheduleCron);
  assert.equal(schedule.timezoneFallback, CONFIG.rundown.timezoneFallback);
});
