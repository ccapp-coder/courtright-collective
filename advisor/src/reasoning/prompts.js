/**
 * Prompt assembly.
 *
 * Every prompt is: a short system instruction, the rendered context bundle, and a task line.
 * Nothing else. No few shot examples, no restated schema, no repeated business description.
 * That discipline is why a moment costs what it costs.
 */

import { renderContextForPrompt } from '../context/buildAdvisorContext.js';
import { rankOpportunities, moneyOnTable } from './rank.js';

const BASE_RULES = [
  'You are the owner\'s first AI employee inside Aimtogro. You have studied this business.',
  'Talk like a sharp employee who respects the owner\'s time. Short sentences. No filler, no preamble, no apologies.',
  'Only use facts from the context below. If something is not in the context, say you do not have it rather than guessing.',
  'Always name names and numbers that appear in the context. Vague advice is worthless to an owner.',
  'Every item you raise ends in one concrete action the owner can do today.',
  'Respect anything the context says the owner refuses to do.',
  'Never mention tokens, models, prompts, context, or how you work. You are an employee, not a tool.',
].join('\n');

function voiceLine(bundle) {
  const voice = (bundle.facts || []).find((f) => f.category === 'voice');
  if (!voice) return '';
  return `\nWhen you draft a message for the owner to send, match this voice: ${voice.value}`;
}

export function buildSystemPrompt(bundle) {
  return `${BASE_RULES}${voiceLine(bundle)}`;
}

function rankedBlock(bundle, limit) {
  const ranked = rankOpportunities(bundle).slice(0, limit);
  if (!ranked.length) return '';
  const lines = ranked.map(
    (item, i) =>
      `${i + 1}. [${item.moduleLabel}] ${item.title}${item.valueUsd ? ` ($${item.valueUsd})` : ''} effort:${item.effort} :: suggested action: ${item.action || 'follow up'}`,
  );
  return `\n\nRANKED BY VALUE AND EFFORT (my scoring, use it as a starting point, override it if the context says otherwise)\n${lines.join('\n')}`;
}

export function buildPrompt(purpose, bundle, options = {}) {
  const context = renderContextForPrompt(bundle);

  switch (purpose) {
    case 'daily_rundown': {
      const count = options.focusItemCount || 3;
      return `${context}${rankedBlock(bundle, count + 2)}

TASK
Write today's rundown for the owner. Open with one line on where the day stands. Then give exactly ${count} numbered focus items, best first. For each: the action, one line on why it matters, and the money attached if there is any. Close with a single line of encouragement or a pattern worth knowing. Under 200 words.`;
    }

    case 'ask': {
      return `${context}${rankedBlock(bundle, 6)}

TASK
The owner asked: "${options.question}"
Answer it directly, grounded in the account above. Lead with the answer, not the reasoning. Name specific clients, numbers and next actions. If the account does not contain what is needed to answer, say exactly what is missing. Under 180 words.`;
    }

    case 'low_hanging_fruit': {
      return `${context}${rankedBlock(bundle, 8)}

TASK
List the highest value, lowest effort actions available in this account right now, best first, at most ${options.limit || 5}. For each: the action, the client or thing it applies to, the money attached, and why it is easy. Skip anything that would take more than a few minutes. Under 200 words.`;
    }

    case 'pitch': {
      return `${context}

TASK
Recommend what to offer client ${options.clientId} next. Use their history and the services and pricing on file. Give: what to offer, why it fits them specifically, what to charge, and a short message the owner can send as is, in their voice. Under 180 words.`;
    }

    case 'weekly_review': {
      return `${context}${rankedBlock(bundle, 5)}

Money currently visible and unclaimed across the account: about $${moneyOnTable(bundle)}.

TASK
Write a plain language state of the business for the week. Cover: what moved, what slipped, where the money is stuck, and the three moves for next week. Compare against the owner's stated goal if one is on file. Talk in totals and names, not percentages nobody asked for. Under 250 words.`;
    }

    default:
      return `${context}\n\nTASK\nAnswer helpfully and briefly, using only the context above.`;
  }
}

export default { buildPrompt, buildSystemPrompt };
