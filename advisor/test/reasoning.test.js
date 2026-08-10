import test from 'node:test';
import assert from 'node:assert/strict';

import { createDemoAdvisor } from '../src/demo/seed.js';
import { rankOpportunities, effortOf } from '../src/reasoning/rank.js';
import { buildPrompt, buildSystemPrompt } from '../src/reasoning/prompts.js';
import { buildAdvisorContext } from '../src/context/buildAdvisorContext.js';
import { ModuleRegistry, registerEnabledModules } from '../src/modules/registry.js';
import { PROVIDERS } from '../src/modules/providers/index.js';
import { MODULES } from '../../config/index.js';

/** Records what the reasoning layer would have sent to a real model. */
function recordingModel(reply = 'ok') {
  const calls = [];
  return {
    calls,
    provider: 'recording',
    model: 'recording',
    async complete(request) {
      calls.push(request);
      return { text: reply, provider: 'recording', model: 'recording', usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}

test('generateDailyRundown returns a short prioritized brief', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const result = await advisor.generateDailyRundown(accountId);

  assert.ok(result.text.length > 60);
  assert.ok(result.adviceLogId, 'every piece of advice is logged so an outcome can be attached');
  assert.equal(result.billed, false, 'the daily rundown is included');
  assert.match(result.text, /1\./);
  assert.match(result.text, /Harbor Fleet|Bell Contracting|Mike Trent|Grant Holloway|Delaney/);
});

test('the daily rundown is generated once a day and reused after that', async () => {
  const { advisor, accountId } = await createDemoAdvisor({ model: recordingModel('brief') });
  const first = await advisor.generateDailyRundown(accountId);
  const second = await advisor.generateDailyRundown(accountId);
  assert.equal(second.cached, true);
  assert.equal(second.adviceLogId, first.adviceLogId);
  assert.equal(advisor.model.calls.length, 1, 'asking twice must not reason twice');

  const forced = await advisor.generateDailyRundown(accountId, { force: true });
  assert.notEqual(forced.adviceLogId, first.adviceLogId);
  assert.equal(advisor.model.calls.length, 2);
});

test('answerAdvisorAsk answers on the account, not in general', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const result = await advisor.answerAdvisorAsk(accountId, 'who is my lowest hanging fruit');
  assert.ok(result.text.length > 40);
  assert.equal(result.purpose, 'ask');
  assert.ok(result.items.length > 0);
  assert.ok(result.items[0].subjectId, 'the answer carries the thing it is about');
});

test('answerAdvisorAsk requires a question', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  await assert.rejects(() => advisor.answerAdvisorAsk(accountId, '   '), /question is required/);
});

test('findLowHangingFruit ranks easy money first and skips heavy work', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const result = await advisor.findLowHangingFruit(accountId);
  assert.match(result.text, /\$/);
  assert.ok(!/Effort: high/.test(result.text));
});

test('suggestPitch is grounded in that client and priced from memory', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const result = await advisor.suggestPitch(accountId, 'c1');
  assert.match(result.text, /Interior \$180|maintenance plan/);
  assert.match(result.text, /Hey Mike/, 'the pitch borrows the owner\'s own voice');
  assert.equal(result.purpose, 'pitch');
});

test('suggestPitch requires a client', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  await assert.rejects(() => advisor.suggestPitch(accountId, ''), /client_id is required/);
});

test('weeklyReview covers every enabled module and the stated goal', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const result = await advisor.weeklyReview(accountId);
  for (const label of ['CRM', 'Booking', 'Invoicing', 'Reviews']) {
    assert.ok(result.text.includes(label), `weekly review should mention ${label}`);
  }
  assert.match(result.text, /18,000/, 'it measures against the goal on file');
});

test('recordAdviceOutcome closes the loop and changes what comes next', async () => {
  const { advisor, store, accountId } = await createDemoAdvisor();
  const rundown = await advisor.generateDailyRundown(accountId);
  const applied = await advisor.recordAdviceOutcome(rundown.adviceLogId, true, 'Collected $1450 from Bell');
  assert.equal(applied.outcome.taken, true);
  assert.ok(applied.fact.key.startsWith('preferences.acts_on_'));

  const outcomes = await store.listOutcomes(accountId, {});
  assert.ok(outcomes.length >= 3);
});

test('advice the owner keeps ignoring stops leading the rundown', async () => {
  const { advisor, store, accountId } = await createDemoAdvisor({ seedHistory: false });

  const before = rankOpportunities(await bundleFor(store, accountId));
  const contentIndexBefore = before.findIndex((i) => i.kind === 'content');

  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const logged = await store.logAdvice(accountId, {
      advice_given: 'Send a campaign post to the list',
      purpose: 'daily_rundown',
    });
    // eslint-disable-next-line no-await-in-loop
    await advisor.recordAdviceOutcome(logged.id, false, 'not doing that');
  }

  const after = rankOpportunities(await bundleFor(store, accountId));
  const contentIndexAfter = after.findIndex((i) => i.kind === 'content');
  if (contentIndexBefore >= 0) {
    assert.ok(
      contentIndexAfter >= contentIndexBefore,
      'ignored advice kinds must sink, never rise',
    );
  }
  const contentItems = after.filter((i) => i.kind === 'content');
  const beforeItems = before.filter((i) => i.kind === 'content');
  if (contentItems.length && beforeItems.length) {
    assert.ok(contentItems[0].score < beforeItems[0].score);
  }
});

async function bundleFor(store, accountId) {
  const registry = new ModuleRegistry();
  registerEnabledModules(registry, MODULES.modules.map((m) => m.id), PROVIDERS);
  const { demoDataSource } = await import('../src/demo/seed.js');
  return buildAdvisorContext(accountId, 'daily_rundown', {
    store,
    registry,
    enabledModuleIds: MODULES.modules.map((m) => m.id),
    dataSource: demoDataSource(),
  });
}

test('effort is read from the action, not guessed by a model', () => {
  assert.equal(effortOf({ action: 'Text Mike a time this week' }), 'low');
  assert.equal(effortOf({ action: 'Rebuild the booking flow' }), 'high');
  assert.equal(effortOf({ action: 'Review the numbers' }), 'medium');
});

test('every reasoning moment calls retrieval first and sends a bounded prompt', async () => {
  const model = recordingModel('fine');
  const { advisor, accountId } = await createDemoAdvisor({ model });

  await advisor.generateDailyRundown(accountId, { force: true });
  await advisor.answerAdvisorAsk(accountId, 'how is this month going');
  await advisor.findLowHangingFruit(accountId);
  await advisor.suggestPitch(accountId, 'c1');
  await advisor.weeklyReview(accountId);

  assert.equal(model.calls.length, 5);
  for (const call of model.calls) {
    assert.ok(call.system.includes('first AI employee'), 'system prompt is shared');
    assert.match(call.prompt, /WHAT I KNOW ABOUT THIS BUSINESS/, 'grounded in retrieved memory');
    assert.match(call.prompt, /TASK/);
    assert.ok(call.prompt.length < 14000, `prompt was ${call.prompt.length} chars`);
    assert.ok(call.bundle.facts.length > 0);
  }
});

test('prompts never leak machine internals to the owner', async () => {
  const { store, accountId } = await createDemoAdvisor();
  const bundle = await bundleFor(store, accountId);
  const system = buildSystemPrompt(bundle);
  assert.match(system, /Never mention tokens, models, prompts/);

  const prompt = buildPrompt('daily_rundown', bundle, { focusItemCount: 3 });
  assert.ok(!prompt.includes('confidence'), 'confidence scores are for retrieval, not for the owner');
});

test('the advisor reasons across the whole account, not just one module', async () => {
  const model = recordingModel('fine');
  const { advisor, accountId } = await createDemoAdvisor({ model });
  await advisor.findLowHangingFruit(accountId);
  const modules = model.calls[0].bundle.modules.map((m) => m.module);
  assert.equal(modules.length, 8, 'horizontal by default');
});
