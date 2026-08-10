/**
 * Module 5: Field Capture.
 *
 * Pending reports, jobs missing photos, and sign-offs nobody chased. Every one of these
 * is usually blocking an invoice, which is why the provider reports the money behind it.
 */

export const MODULE_ID = 'field_capture';

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const jobs = data.jobs || [];

  const pending = jobs
    .filter((j) => !j.reportSubmitted)
    .sort((a, b) => (b.completedDaysAgo || 0) - (a.completedDaysAgo || 0));
  const missingPhotos = jobs.filter((j) => j.reportSubmitted && (j.photos || 0) === 0);
  const unsigned = jobs.filter((j) => j.reportSubmitted && !j.signed);
  const blockedUsd = pending.reduce((sum, j) => sum + (j.valueUsd || 0), 0);

  const items = [];
  for (const job of pending.slice(0, 3)) {
    items.push({
      id: `report_${job.id}`,
      title: `${job.client} job from ${job.completedDaysAgo} days ago has no report`,
      detail: `About $${Math.round(job.valueUsd || 0)} cannot be invoiced until it is filed.`,
      valueUsd: job.valueUsd,
      urgency: clamp(0.5 + (job.completedDaysAgo || 0) * 0.05),
      subjectType: 'job',
      subjectId: job.id,
      action: `File the report for ${job.client}`,
    });
  }
  for (const job of unsigned.slice(0, 2)) {
    items.push({
      id: `signoff_${job.id}`,
      title: `${job.client} has not signed off`,
      detail: 'Unsigned work is the reason disputes happen later.',
      valueUsd: job.valueUsd,
      urgency: 0.45,
      subjectType: 'job',
      subjectId: job.id,
      action: `Send ${job.client} the sign-off link`,
    });
  }

  const lags = pending.map((j) => j.completedDaysAgo || 0);
  const avgReportLagDays = lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : undefined;

  return {
    module: MODULE_ID,
    label: 'Field Capture',
    headline: `${pending.length} reports pending on about $${Math.round(blockedUsd)} of work, ${unsigned.length} sign-offs outstanding.`,
    metrics: {
      pendingReports: pending.length,
      missingPhotos: missingPhotos.length,
      unsigned: unsigned.length,
      blockedUsd: Math.round(blockedUsd),
    },
    items,
    signals: {
      avgReportLagDays,
      blockedUsd: Math.round(blockedUsd),
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
