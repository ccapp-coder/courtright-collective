/**
 * Margin reporting. Illustrative only, never used for gating.
 *
 * Rates live in config/advisor.config.json under `costs`. Swap them for the real provider
 * rates and re-run: the shape of the answer barely moves, which is the point. The cost of
 * this product is bounded by the size of the context bundle multiplied by the number of
 * advisory moments, and both of those are numbers we choose.
 */

import { CONFIG } from '../../../config/index.js';

/**
 * @param {object} usage {rundowns, asks}
 * @param {object} [config]
 */
export function estimateMonthlyCost(usage, config = CONFIG) {
  const { costs } = config;
  const moments = (usage.rundowns || 0) + (usage.asks || 0);
  const inputTokens = moments * costs.assumedInputTokensPerMoment;
  const outputTokens = moments * costs.assumedOutputTokensPerMoment;
  const inputUsd = (inputTokens / 1_000_000) * costs.inputPerMillionUsd;
  const outputUsd = (outputTokens / 1_000_000) * costs.outputPerMillionUsd;
  const totalUsd = inputUsd + outputUsd;
  const price = config.product.addOnPriceUsdMonthly;
  return {
    moments,
    inputTokens,
    outputTokens,
    inputUsd: round(inputUsd),
    outputUsd: round(outputUsd),
    totalUsd: round(totalUsd),
    priceUsd: price,
    marginUsd: round(price - totalUsd),
    marginPercent: Number((((price - totalUsd) / price) * 100).toFixed(1)),
  };
}

/** The two scenarios worth watching: a heavy user at the cap, and a normal owner. */
export function marginReport(config = CONFIG) {
  const heavy = estimateMonthlyCost(
    { rundowns: 30, asks: config.cap.monthlyAskPool },
    config,
  );
  const typical = estimateMonthlyCost({ rundowns: 22, asks: 40 }, config);
  return { heavy, typical, capUnit: config.cap.unit, pool: config.cap.monthlyAskPool };
}

function round(n) {
  return Number(n.toFixed(4));
}

export default { estimateMonthlyCost, marginReport };
