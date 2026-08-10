/**
 * Print the margin table for the numbers currently in config.
 *   node advisor/dev/margin.js
 */

import { marginReport } from '../src/usage/margin.js';
import { CONFIG } from '../../config/index.js';

const report = marginReport();

const rows = [
  ['scenario', 'moments', 'token cost', 'price', 'margin'],
  [
    `heavy (30 rundowns + ${CONFIG.cap.monthlyAskPool} asks)`,
    report.heavy.moments,
    `$${report.heavy.totalUsd.toFixed(2)}`,
    `$${report.heavy.priceUsd}`,
    `${report.heavy.marginPercent}%`,
  ],
  [
    'typical (22 rundowns + 40 asks)',
    report.typical.moments,
    `$${report.typical.totalUsd.toFixed(2)}`,
    `$${report.typical.priceUsd}`,
    `${report.typical.marginPercent}%`,
  ],
];

const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
for (const row of rows) {
  process.stdout.write(row.map((cell, i) => String(cell).padEnd(widths[i])).join('   ') + '\n');
}
process.stdout.write(
  `\nRates used: $${CONFIG.costs.inputPerMillionUsd}/M in, $${CONFIG.costs.outputPerMillionUsd}/M out, ` +
  `${CONFIG.costs.assumedInputTokensPerMoment} in and ${CONFIG.costs.assumedOutputTokensPerMoment} out per moment.\n` +
  'Swap the rates in config/advisor.config.json for the real ones. The shape barely moves.\n',
);
