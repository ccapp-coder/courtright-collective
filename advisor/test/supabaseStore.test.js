/**
 * The Supabase adapter is exercised against a fake fetch so the query shapes are covered
 * without a database. It satisfies the same contract as the in memory store, which is what
 * lets the reasoning layer stay unaware of which one it is talking to.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { SupabaseStore } from '../src/memory/supabaseStore.js';
import { AdvisorStore } from '../src/memory/store.js';
import { InMemoryStore } from '../src/memory/inMemoryStore.js';

function fakeSupabase(responses = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const method = init.method || 'GET';
    const path = decodeURIComponent(String(url).replace('https://demo.supabase.co/rest/v1', ''));
    calls.push({ method, path, headers: init.headers, body: init.body ? JSON.parse(init.body) : null });
    const body = responses[`${method} ${path.split('?')[0]}`] ?? [];
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
      json: async () => body,
      headers: { get: () => '0-0/7' },
    };
  };
  return { calls, store: new SupabaseStore({ url: 'https://demo.supabase.co', key: 'service-key', fetchImpl }) };
}

test('both adapters implement the same contract', () => {
  const contract = Object.getOwnPropertyNames(AdvisorStore.prototype).filter((k) => k !== 'constructor');
  for (const method of contract) {
    assert.equal(typeof SupabaseStore.prototype[method], 'function', `SupabaseStore is missing ${method}`);
    assert.equal(typeof InMemoryStore.prototype[method], 'function', `InMemoryStore is missing ${method}`);
  }
  assert.ok(contract.length >= 15);
});

test('the adapter refuses to start without credentials', () => {
  assert.throws(() => new SupabaseStore({}), /needs \{ url, key \}/);
});

test('memory reads filter by account, category and confidence floor', async () => {
  const { store, calls } = fakeSupabase();
  await store.listMemory('a1', { categories: ['goals', 'pricing'], minConfidence: 0.35, limit: 25 });
  const call = calls[0];
  assert.equal(call.method, 'GET');
  assert.match(call.path, /^\/account_memory\?/);
  assert.match(call.path, /account_id=eq\.a1/);
  assert.match(call.path, /confidence=gte\.0\.35/);
  assert.match(call.path, /category=in\.\(goals,pricing\)/);
  assert.match(call.path, /order=confidence\.desc/);
});

test('memory writes upsert on (account_id, key) so a fact sharpens instead of duplicating', async () => {
  const { store, calls } = fakeSupabase();
  await store.upsertMemory('a1', { key: 'goals.primary', value: 'grow', category: 'goals', confidence: 0.9, source: 'onboarding' });
  const call = calls[0];
  assert.equal(call.method, 'POST');
  assert.match(call.path, /on_conflict=account_id,key/);
  assert.match(call.headers.Prefer, /resolution=merge-duplicates/);
  assert.equal(call.body.value, 'grow');
});

test('outcomes join back to advice and stay scoped to the account', async () => {
  const { store, calls } = fakeSupabase();
  await store.listOutcomes('a1', { sinceDays: 90, limit: 8 });
  assert.match(calls[0].path, /advice_log!inner\(account_id,advice_given,purpose\)/);
  assert.match(calls[0].path, /advice_log\.account_id=eq\.a1/);
});

test('usage counting uses an exact count header rather than pulling rows', async () => {
  const { store, calls } = fakeSupabase();
  const count = await store.countUsage('a1', { periodKey: '2026-08', billedOnly: true });
  assert.equal(count, 7);
  assert.match(calls[0].headers.Prefer, /count=exact/);
  assert.match(calls[0].path, /period_key=eq\.2026-08/);
  assert.match(calls[0].path, /billed=is\.true/);
});

test('only enabled modules come back from the module query', async () => {
  const { store, calls } = fakeSupabase();
  await store.listEnabledModules('a1');
  assert.match(calls[0].path, /enabled=is\.true/);
});

test('a failed request fails loudly with the status attached', async () => {
  const store = new SupabaseStore({
    url: 'https://demo.supabase.co',
    key: 'k',
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => 'no' }),
  });
  await assert.rejects(() => store.listMemory('a1', {}), /401/);
});
