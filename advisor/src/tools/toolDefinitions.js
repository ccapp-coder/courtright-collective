/**
 * One capability, two interfaces.
 *
 * Everything the human UI can do, an AI employee can do, because both call the SAME
 * function. This file adds no logic. It is a thin description of the shared functions in
 * the shape a model expects, plus a dispatcher that routes a tool call straight into the
 * advisor instance.
 *
 * If you ever find a capability that exists on only one side, the fix is to move it into
 * advisor.js and add it here. Do not fork it.
 */

/** Tool schemas in Anthropic tool-use shape. */
export const ADVISOR_TOOLS = Object.freeze([
  {
    name: 'generate_daily_rundown',
    description:
      'Get the owner\'s prioritized brief for today across every enabled module. Included once per day, no ask is spent.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'The Aimtogro account.' },
        force: { type: 'boolean', description: 'Regenerate even if today\'s rundown already exists. Spends an ask.' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'answer_advisor_ask',
    description:
      'Answer an on demand question about this business, grounded in the account\'s memory and live module state. Spends one ask.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        question: { type: 'string', description: 'The owner\'s question in their own words.' },
      },
      required: ['account_id', 'question'],
    },
  },
  {
    name: 'find_low_hanging_fruit',
    description:
      'Rank the highest value, lowest effort actions available across every enabled module right now. Spends one ask.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        limit: { type: 'integer', description: 'How many items to return. Default 5.' },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'suggest_pitch',
    description:
      'Recommend what to offer a specific client next, priced and worded in the owner\'s voice. Spends one ask.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        client_id: { type: 'string' },
      },
      required: ['account_id', 'client_id'],
    },
  },
  {
    name: 'weekly_review',
    description:
      'Natural language state of the business: what moved, what slipped, where money is stuck, three moves for next week. Spends one ask.',
    input_schema: {
      type: 'object',
      properties: { account_id: { type: 'string' } },
      required: ['account_id'],
    },
  },
  {
    name: 'record_advice_outcome',
    description:
      'Close the learning loop: mark a piece of advice as taken or ignored and say what happened. Free, never metered.',
    input_schema: {
      type: 'object',
      properties: {
        advice_log_id: { type: 'string' },
        taken: { type: 'boolean' },
        result: { type: 'string', description: 'What actually happened, in the owner\'s words.' },
      },
      required: ['advice_log_id', 'taken'],
    },
  },
  {
    name: 'get_advisor_context',
    description:
      'Read the compact current state of every enabled module without spending an ask. Use this before reasoning of your own.',
    input_schema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        purpose: { type: 'string', description: 'daily_rundown | ask | low_hanging_fruit | pitch | weekly_review' },
      },
      required: ['account_id'],
    },
  },
]);

/**
 * Route a tool call into the shared advisor functions.
 *
 * @param {ReturnType<import('../advisor.js').createAdvisor>} advisor
 * @param {string} name
 * @param {object} input
 */
export async function dispatchAdvisorTool(advisor, name, input = {}) {
  switch (name) {
    case 'generate_daily_rundown':
      return advisor.generateDailyRundown(input.account_id, { force: Boolean(input.force) });
    case 'answer_advisor_ask':
      return advisor.answerAdvisorAsk(input.account_id, input.question);
    case 'find_low_hanging_fruit':
      return advisor.findLowHangingFruit(input.account_id, { limit: input.limit });
    case 'suggest_pitch':
      return advisor.suggestPitch(input.account_id, input.client_id);
    case 'weekly_review':
      return advisor.weeklyReview(input.account_id);
    case 'record_advice_outcome':
      return advisor.recordAdviceOutcome(input.advice_log_id, input.taken, input.result);
    case 'get_advisor_context':
      return advisor.getAccountSnapshot(input.account_id, { purpose: input.purpose });
    default:
      throw new Error(`unknown advisor tool ${name}`);
  }
}

/**
 * Shape a tool result for a model: text plus the handful of structured fields an employee
 * needs to keep working. Deliberately excludes the full context bundle, which would blow
 * up the employee's own context window for no benefit.
 */
export function toToolResult(result) {
  if (!result) return { text: '' };
  return {
    text: result.text,
    advice_log_id: result.adviceLogId,
    items: (result.items || []).map((i) => ({
      module: i.module,
      title: i.title,
      action: i.action,
      value_usd: i.valueUsd,
      subject_type: i.subjectType,
      subject_id: i.subjectId,
      effort: i.effort,
    })),
    asks_remaining: result.usage ? result.usage.remaining : undefined,
  };
}

export default { ADVISOR_TOOLS, dispatchAdvisorTool, toToolResult };
