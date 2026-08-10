/**
 * One capability, two interfaces.
 *
 * These tests exist to catch the drift the architecture rule is there to prevent: a
 * capability that only the human UI can reach, or only an AI employee can reach. Both sides
 * must land on the same function.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createDemoAdvisor } from '../src/demo/seed.js';
import { ADVISOR_TOOLS, dispatchAdvisorTool, toToolResult } from '../src/tools/toolDefinitions.js';
import { handleAdvisorRequest } from '../src/http/router.js';

const HUMAN_FUNCTIONS = [
  'generateDailyRundown',
  'answerAdvisorAsk',
  'findLowHangingFruit',
  'suggestPitch',
  'weeklyReview',
  'recordAdviceOutcome',
];

const TOOL_FOR_FUNCTION = {
  generateDailyRundown: 'generate_daily_rundown',
  answerAdvisorAsk: 'answer_advisor_ask',
  findLowHangingFruit: 'find_low_hanging_fruit',
  suggestPitch: 'suggest_pitch',
  weeklyReview: 'weekly_review',
  recordAdviceOutcome: 'record_advice_outcome',
};

test('every shared reasoning function exists and is exposed as an AI tool', async () => {
  const { advisor } = await createDemoAdvisor();
  const toolNames = ADVISOR_TOOLS.map((t) => t.name);
  for (const fn of HUMAN_FUNCTIONS) {
    assert.equal(typeof advisor[fn], 'function', `${fn} must exist as a shared function`);
    assert.ok(toolNames.includes(TOOL_FOR_FUNCTION[fn]), `${fn} must also be an AI tool`);
  }
});

test('no tool exists that the human UI cannot also reach', () => {
  const reachable = new Set([...Object.values(TOOL_FOR_FUNCTION), 'get_advisor_context']);
  for (const tool of ADVISOR_TOOLS) {
    assert.ok(reachable.has(tool.name), `${tool.name} has no human side`);
  }
});

test('tool schemas are complete enough for a model to call them', () => {
  for (const tool of ADVISOR_TOOLS) {
    assert.ok(tool.description.length > 30, `${tool.name} needs a real description`);
    assert.equal(tool.input_schema.type, 'object');
    assert.ok(Array.isArray(tool.input_schema.required));
    for (const key of tool.input_schema.required) {
      assert.ok(tool.input_schema.properties[key], `${tool.name} requires ${key} but does not describe it`);
    }
  }
});

test('the AI tool path and the human path produce the same answer', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const human = await advisor.findLowHangingFruit(accountId);
  const viaTool = await dispatchAdvisorTool(advisor, 'find_low_hanging_fruit', { account_id: accountId });
  assert.equal(viaTool.text, human.text, 'same code path, same words');
  assert.notEqual(viaTool.adviceLogId, human.adviceLogId, 'but each is logged as its own moment');
});

test('an AI employee spends the same advisory moments as the owner does', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const before = (await advisor.getUsage(accountId)).asksUsed;
  await dispatchAdvisorTool(advisor, 'answer_advisor_ask', {
    account_id: accountId,
    question: 'where is my money stuck',
  });
  const after = (await advisor.getUsage(accountId)).asksUsed;
  assert.equal(after, before + 1);
});

test('reading module context through the tool is free', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const before = (await advisor.getUsage(accountId)).asksUsed;
  const snapshot = await dispatchAdvisorTool(advisor, 'get_advisor_context', { account_id: accountId });
  const after = (await advisor.getUsage(accountId)).asksUsed;
  assert.equal(after, before, 'reading state costs nothing, only reasoning does');
  assert.equal(Object.keys(snapshot.snapshots).length, 8);
});

test('tool results stay small so an employee context window survives', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const result = toToolResult(await advisor.findLowHangingFruit(accountId));
  assert.ok(JSON.stringify(result).length < 4000);
  assert.ok(result.advice_log_id);
  assert.ok(result.items.length > 0);
  assert.equal(result.items[0].value_usd !== undefined, true);
});

test('unknown tools fail loudly', async () => {
  const { advisor } = await createDemoAdvisor();
  await assert.rejects(() => dispatchAdvisorTool(advisor, 'delete_everything', {}), /unknown advisor tool/);
});

// ---------------------------------------------------------------- HTTP surface

test('the HTTP surface serves the human UI', async () => {
  const { advisor, accountId } = await createDemoAdvisor();

  const home = await handleAdvisorRequest(advisor, { method: 'GET', path: '/api/advisor/home', accountId });
  assert.equal(home.status, 200);
  assert.equal(home.body.state, 'active');
  assert.ok(home.body.rundown.text.length > 0);
  assert.equal(home.body.catalog.length, 8);

  const ask = await handleAdvisorRequest(advisor, {
    method: 'POST',
    path: '/api/advisor/ask',
    accountId,
    body: { question: 'how is this month going' },
  });
  assert.equal(ask.status, 200);
  assert.ok(ask.body.adviceLogId);

  const outcome = await handleAdvisorRequest(advisor, {
    method: 'POST',
    path: '/api/advisor/outcome',
    accountId,
    body: { advice_log_id: ask.body.adviceLogId, taken: true, result: 'chased two invoices' },
  });
  assert.equal(outcome.status, 200);
  assert.equal(outcome.body.outcome.taken, true);
});

test('the HTTP surface serves an AI employee through the same routes', async () => {
  const { advisor, accountId } = await createDemoAdvisor();
  const res = await handleAdvisorRequest(advisor, {
    method: 'POST',
    path: '/api/advisor/tool',
    accountId,
    body: { name: 'weekly_review', input: { account_id: accountId } },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.text.includes('CRM'));
});

test('the gate and the cap surface as real HTTP statuses', async () => {
  const locked = await createDemoAdvisor({ enabledModules: [], advisorActive: false, seedHistory: false });
  const gated = await handleAdvisorRequest(locked.advisor, {
    method: 'POST',
    path: '/api/advisor/fruit',
    accountId: locked.accountId,
  });
  assert.equal(gated.status, 403);
  assert.equal(gated.body.error, 'advisor_gated');
  assert.equal(gated.body.access.state, 'locked');

  const { loadAdvisorConfig } = await import('../../config/index.js');
  const { createAdvisor } = await import('../src/advisor.js');
  const capped = await createDemoAdvisor();
  const tight = createAdvisor({
    store: capped.store,
    dataSource: capped.dataSource,
    model: capped.advisor.model,
    config: loadAdvisorConfig({ ADVISOR_MONTHLY_ASK_POOL: '1' }),
  });
  await tight.answerAdvisorAsk(capped.accountId, 'first one');
  const res = await handleAdvisorRequest(tight, {
    method: 'POST',
    path: '/api/advisor/ask',
    accountId: capped.accountId,
    body: { question: 'second one' },
  });
  assert.equal(res.status, 429);
  assert.equal(res.body.error, 'advisor_cap_reached');
  assert.ok(res.body.notice.cta);
});

test('toggling a module moves the account between states over HTTP', async () => {
  const { advisor, accountId } = await createDemoAdvisor({ enabledModules: ['booking'] });

  let res = await handleAdvisorRequest(advisor, {
    method: 'POST',
    path: '/api/advisor/modules',
    accountId,
    body: { module_id: 'booking', enabled: false },
  });
  assert.equal(res.status, 200);
  assert.ok(['grace', 'suspended'].includes(res.body.state));

  res = await handleAdvisorRequest(advisor, {
    method: 'POST',
    path: '/api/advisor/modules',
    accountId,
    body: { module_id: 'crm', enabled: true },
  });
  assert.equal(res.body.state, 'active');
});

test('the tool catalog is discoverable without an account', async () => {
  const { advisor } = await createDemoAdvisor();
  const res = await handleAdvisorRequest(advisor, { method: 'GET', path: '/api/advisor/tools' });
  assert.equal(res.status, 200);
  assert.equal(res.body.tools.length, ADVISOR_TOOLS.length);
});
