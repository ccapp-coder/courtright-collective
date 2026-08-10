/**
 * The zero token fallback writer.
 *
 * Used whenever no model API key is configured: the test suite, the seeded demo account,
 * and the static preview of the advisor panel. It writes from the same ranked bundle the
 * real prompt would receive, so what you click through locally is structurally identical
 * to what production returns, just plainer in its wording.
 *
 * This is not a mock in the throwaway sense. It is the deterministic floor of the product:
 * if the model provider is down, the owner still gets a usable rundown.
 */

import { rankOpportunities, moneyOnTable } from './rank.js';

function factValue(bundle, key) {
  const fact = (bundle.facts || []).find((f) => f.key === key);
  return fact ? fact.value : null;
}

function firstName(text) {
  const match = /([A-Z][a-z]+)/.exec(String(text || ''));
  return match ? match[1] : null;
}

export function composeDailyRundown(bundle, options = {}) {
  const count = options.focusItemCount || 3;
  const ranked = rankOpportunities(bundle).slice(0, count);
  const goal = factValue(bundle, 'goals.primary');
  const lines = [];

  lines.push(`Here is your day. ${ranked.length ? `${ranked.length} things worth your time` : 'Nothing urgent is showing'}${goal ? `, all pointed at ${lowerFirst(goal)}` : ''}.`);
  lines.push('');

  ranked.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.action || item.title}`);
    lines.push(`   Why: ${item.title}${item.detail ? `. ${item.detail}` : ''}`);
    if (item.valueUsd) lines.push(`   Worth: about $${item.valueUsd}`);
  });

  if (!ranked.length) {
    lines.push('1. Nothing is on fire. Use the quiet hour to ask for a review from your last happy client.');
  }

  const total = moneyOnTable(bundle);
  if (total > 0) {
    lines.push('');
    lines.push(`Across everything showing today, about $${total} is sitting on the table.`);
  }

  const pattern = (bundle.observations || [])[0];
  if (pattern) {
    lines.push('');
    lines.push(`One thing I have noticed: ${pattern.text}`);
  }

  return lines.join('\n');
}

export function composeLowHangingFruit(bundle, options = {}) {
  const ranked = rankOpportunities(bundle)
    .filter((item) => item.effort !== 'high')
    .slice(0, options.limit || 5);
  if (!ranked.length) return 'Nothing easy is sitting out right now. Everything showing needs real work.';

  const lines = ['Lowest hanging fruit right now, easiest and most valuable first.', ''];
  ranked.forEach((item, index) => {
    const money = item.valueUsd ? ` (about $${item.valueUsd})` : '';
    lines.push(`${index + 1}. ${item.action || item.title}${money}`);
    lines.push(`   ${item.title}${item.detail ? `. ${item.detail}` : ''} Effort: ${item.effort}.`);
  });
  return lines.join('\n');
}

export function composeAnswer(bundle, question) {
  const ranked = rankOpportunities(bundle);
  const q = String(question || '').toLowerCase();

  if (/month|going|doing|how are we|how is business/.test(q)) {
    return composeWeeklyReview(bundle, { framing: 'month' });
  }
  if (/fruit|easiest|quick|low hanging/.test(q)) {
    return composeLowHangingFruit(bundle);
  }
  if (/who|which client|lowest hanging/.test(q)) {
    const top = ranked[0];
    if (!top) return 'Nothing is standing out in the account right now.';
    return [
      `${top.title}.`,
      top.detail ? top.detail : '',
      `Next move: ${top.action || 'reach out today'}.`,
      top.valueUsd ? `That is about $${top.valueUsd}.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  const lines = [];
  const top = ranked.slice(0, 3);
  lines.push(top.length ? 'Based on what your account looks like right now:' : 'Your account is quiet right now.');
  for (const item of top) {
    lines.push(`- ${item.action || item.title}. ${item.detail || ''}`.trim());
  }
  const goal = factValue(bundle, 'goals.primary');
  if (goal) lines.push('', `Measured against your goal (${goal}), the first one moves the needle most.`);
  return lines.join('\n');
}

export function composePitch(bundle, clientId) {
  const ranked = rankOpportunities(bundle);
  const forClient = ranked.filter((item) => item.subjectId === clientId);
  const services = factValue(bundle, 'services.offered');
  const pricing = factValue(bundle, 'pricing.typical');
  const voice = factValue(bundle, 'voice.tone');
  const name = forClient.length ? firstName(forClient[0].title) : null;

  const lines = [];
  if (forClient.length) {
    lines.push(`Pitch for ${name || 'this client'}: ${forClient[0].action || forClient[0].title}.`);
    lines.push(`Why now: ${forClient[0].detail || forClient[0].title}`);
  } else {
    lines.push(`Nothing urgent is flagged on this client, which makes it a good moment to offer them more, not to chase them.`);
  }
  if (services) lines.push(`What to offer: ${services.split(',')[0].trim()}.`);
  if (pricing) lines.push(`Price it the way you normally do: ${pricing}.`);
  if (voice) {
    lines.push('', 'Something like:', `"${voice}"`);
  }
  return lines.join('\n');
}

export function composeWeeklyReview(bundle, options = {}) {
  const framing = options.framing === 'month' ? 'month' : 'week';
  const lines = [`Where the business stands this ${framing}.`, ''];

  for (const mod of bundle.modules || []) {
    lines.push(`${mod.label}: ${mod.headline}`);
  }

  const total = moneyOnTable(bundle);
  if (total > 0) {
    lines.push('', `Money visible and unclaimed: about $${total}.`);
  }

  const goal = factValue(bundle, 'goals.primary');
  if (goal) lines.push('', `Your goal is ${goal}. The fastest path this ${framing} is collecting what is already earned and refilling open capacity.`);

  const ranked = rankOpportunities(bundle).slice(0, 3);
  if (ranked.length) {
    lines.push('', `Three moves for the ${framing}:`);
    ranked.forEach((item, i) => lines.push(`${i + 1}. ${item.action || item.title}`));
  }

  const taken = (bundle.outcomes || []).filter((o) => o.taken).length;
  if (bundle.outcomes && bundle.outcomes.length) {
    lines.push('', `You acted on ${taken} of the last ${bundle.outcomes.length} things I suggested.`);
  }

  return lines.join('\n');
}

function lowerFirst(text) {
  const s = String(text);
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export const STUB_COMPOSERS = Object.freeze({
  daily_rundown: (bundle, req) => composeDailyRundown(bundle, req),
  ask: (bundle, req) => composeAnswer(bundle, req.question),
  low_hanging_fruit: (bundle, req) => composeLowHangingFruit(bundle, req),
  pitch: (bundle, req) => composePitch(bundle, req.clientId),
  weekly_review: (bundle, req) => composeWeeklyReview(bundle, req),
});

export default STUB_COMPOSERS;
