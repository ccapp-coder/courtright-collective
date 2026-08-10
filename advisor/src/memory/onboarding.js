/**
 * Memory seeding, step one of three.
 *
 * A short questionnaire at onboarding gives the advisor a starting file on the business.
 * Ten questions, none of them required, all of them cheap. No tokens are spent here:
 * answers are written straight into account_memory as high confidence facts.
 */

import { CONFIG } from '../../../config/index.js';

/**
 * The questionnaire. `key` is the account_memory key the answer lands on, so the whole
 * onboarding flow is data driven and a new question is a one line change.
 */
export const ONBOARDING_QUESTIONS = Object.freeze([
  {
    key: 'business.type',
    category: 'business',
    prompt: 'What kind of business is this?',
    placeholder: 'Mobile detailing, two vans, Nashville',
  },
  {
    key: 'services.offered',
    category: 'services',
    prompt: 'What do you sell? List your main services or products.',
    placeholder: 'Interior detail, ceramic coat, monthly maintenance plan',
  },
  {
    key: 'pricing.typical',
    category: 'pricing',
    prompt: 'What do those usually run?',
    placeholder: 'Interior $180, ceramic $900, maintenance $99/mo',
  },
  {
    key: 'clients.best_customer',
    category: 'clients',
    prompt: 'Describe your best customer. Who do you want more of?',
    placeholder: 'Repeat fleet accounts, 3 or more vehicles, pays on time',
  },
  {
    key: 'goals.primary',
    category: 'goals',
    prompt: 'What is the one number you want to move in the next six months?',
    placeholder: 'Get to $18k a month with the same crew',
  },
  {
    key: 'seasonality.busy',
    category: 'seasonality',
    prompt: 'When are you busiest, and when is it dead?',
    placeholder: 'Busy March through June, dead in January',
  },
  {
    key: 'operations.capacity',
    category: 'operations',
    prompt: 'How much work can you actually take on in a week?',
    placeholder: 'About 22 jobs a week across two vans',
  },
  {
    key: 'preferences.workstyle',
    category: 'preferences',
    prompt: 'How do you like to work? Anything the advisor should never suggest?',
    placeholder: 'No weekend jobs. Never cold call. I hate discounting.',
  },
  {
    key: 'voice.tone',
    category: 'voice',
    prompt: 'How do you talk to clients? Paste a message you have actually sent.',
    placeholder: 'Hey Mike, truck is looking good. Want me to grab it same time next month?',
  },
  {
    key: 'business.differentiator',
    category: 'business',
    prompt: 'Why do people pick you over the guy down the street?',
    placeholder: 'We come to them and we are never late',
  },
]);

/**
 * Write questionnaire answers into account memory.
 *
 * @param {import('./store.js').AdvisorStore} store
 * @param {string} accountId
 * @param {Record<string,string>} answers keyed by ONBOARDING_QUESTIONS[].key
 * @param {object} [config]
 * @returns {Promise<object[]>} the facts written
 */
export async function seedAccountMemory(store, accountId, answers, config = CONFIG) {
  const written = [];
  for (const question of ONBOARDING_QUESTIONS) {
    const answer = answers ? answers[question.key] : undefined;
    if (!answer || !String(answer).trim()) continue;
    written.push(
      await store.upsertMemory(accountId, {
        key: question.key,
        value: String(answer).trim(),
        category: question.category,
        confidence: config.memory.seedConfidence,
        source: 'onboarding',
      }),
    );
  }
  return written;
}

/**
 * Owner stated corrections. When the owner edits a fact in the UI, it lands here and
 * outranks anything the advisor inferred.
 */
export async function statedByOwner(store, accountId, key, value, category = 'general', config = CONFIG) {
  return store.upsertMemory(accountId, {
    key,
    value,
    category,
    confidence: config.memory.confidenceCeiling,
    source: 'owner_stated',
  });
}

export default { ONBOARDING_QUESTIONS, seedAccountMemory, statedByOwner };
