/**
 * The only place in the advisor that spends tokens.
 *
 * Everything else (memory writes, retrieval, ranking, scheduling, gating, metering) is
 * plumbing. That separation is the whole margin story, so keep it that way: if you find
 * yourself calling a model from anywhere other than a reasoning function, stop.
 *
 * Providers:
 *   anthropic  real calls, model id and token ceilings come from config
 *   stub       deterministic composer, zero cost, used with no API key
 */

import { CONFIG } from '../../../config/index.js';
import { STUB_COMPOSERS } from './stubComposer.js';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * @param {object} [options]
 * @param {object} [options.config]
 * @param {string} [options.apiKey]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {object} [options.env]
 * @param {string} [options.forceProvider]
 */
export function createModelClient(options = {}) {
  const config = options.config || CONFIG;
  const env = options.env || (typeof process !== 'undefined' ? process.env : {}) || {};
  const apiKey = options.apiKey || env[config.model.apiKeyEnvVar];
  const provider =
    options.forceProvider ||
    (config.model.provider === 'anthropic' && !apiKey ? config.model.fallbackProvider : config.model.provider);
  const fetchImpl = options.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);

  return {
    provider,
    model: provider === 'anthropic' ? config.model.reasoningModel : 'stub',

    /**
     * @param {object} request
     * @param {string} request.system
     * @param {string} request.prompt
     * @param {string} request.purpose
     * @param {object} request.bundle      the context bundle, used by the stub provider
     * @param {string} [request.question]
     * @param {string} [request.clientId]
     * @returns {Promise<{text: string, provider: string, model: string, usage: object}>}
     */
    async complete(request) {
      if (provider === 'stub') {
        const composer = STUB_COMPOSERS[request.purpose] || STUB_COMPOSERS.ask;
        return {
          text: composer(request.bundle, request),
          provider: 'stub',
          model: 'stub',
          usage: { inputTokens: 0, outputTokens: 0, estimated: false },
        };
      }

      if (provider !== 'anthropic') {
        throw new Error(`unknown model provider ${provider}`);
      }
      if (!fetchImpl) throw new Error('no fetch implementation available');
      if (!apiKey) throw new Error(`missing ${config.model.apiKeyEnvVar}`);

      const maxTokens =
        config.model.maxOutputTokens[camel(request.purpose)] ||
        config.model.maxOutputTokens.advisorAsk ||
        700;

      const res = await fetchImpl(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model.reasoningModel,
          max_tokens: maxTokens,
          temperature: config.model.temperature,
          system: request.system,
          messages: [{ role: 'user', content: request.prompt }],
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`model call failed: ${res.status} ${body}`);
        err.code = 'model_error';
        err.status = res.status;
        throw err;
      }

      const json = await res.json();
      const text = (json.content || [])
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .trim();

      return {
        text,
        provider: 'anthropic',
        model: json.model || config.model.reasoningModel,
        usage: {
          inputTokens: json.usage ? json.usage.input_tokens : null,
          outputTokens: json.usage ? json.usage.output_tokens : null,
          estimated: false,
        },
      };
    },
  };
}

function camel(purpose) {
  const map = {
    daily_rundown: 'dailyRundown',
    ask: 'advisorAsk',
    low_hanging_fruit: 'lowHangingFruit',
    pitch: 'suggestPitch',
    weekly_review: 'weeklyReview',
  };
  return map[purpose] || 'advisorAsk';
}

export default createModelClient;
