/**
 * The provider map. One entry per module in config/modules.config.json.
 *
 * This file is the whole per module surface the advisor knows about. If a ninth module ships,
 * it adds a line to config/modules.config.json, a provider file next to these, and a line here.
 * No advisor code changes.
 */

import { getAdvisorContext as crm } from './crm.js';
import { getAdvisorContext as booking } from './booking.js';
import { getAdvisorContext as gatedContent } from './gatedContent.js';
import { getAdvisorContext as progress } from './progress.js';
import { getAdvisorContext as fieldCapture } from './fieldCapture.js';
import { getAdvisorContext as invoicing } from './invoicing.js';
import { getAdvisorContext as marketing } from './marketing.js';
import { getAdvisorContext as reviews } from './reviews.js';

export const PROVIDERS = Object.freeze({
  crm,
  booking,
  gated_content: gatedContent,
  progress,
  field_capture: fieldCapture,
  invoicing,
  marketing,
  reviews,
});

export default PROVIDERS;
