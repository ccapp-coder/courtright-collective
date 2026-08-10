/**
 * Module 6: Invoicing and Payments.
 *
 * Money that is already earned but not collected outranks almost everything else the
 * advisor can suggest, so this provider reports aging plainly and computes the payment
 * pattern signals the memory rules watch.
 */

export const MODULE_ID = 'invoicing';

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const invoices = data.invoices || [];
  const quotes = data.quotes || [];

  const open = invoices.filter((i) => i.status !== 'paid');
  const overdue = open
    .filter((i) => (i.daysOverdue || 0) > 0)
    .sort((a, b) => (b.amountUsd || 0) - (a.amountUsd || 0));
  const outstandingUsd = open.reduce((sum, i) => sum + (i.amountUsd || 0), 0);
  const overdueUsd = overdue.reduce((sum, i) => sum + (i.amountUsd || 0), 0);

  const paid = invoices.filter((i) => i.status === 'paid');
  const averageTicketUsd = invoices.length
    ? invoices.reduce((s, i) => s + (i.amountUsd || 0), 0) / invoices.length
    : undefined;

  // Do big invoices pay late? The rule in factRules.js turns this into a durable fact.
  const threshold = 500;
  const big = invoices.filter((i) => (i.amountUsd || 0) >= threshold);
  const bigLate = big.filter((i) => (i.daysOverdue || 0) > 0 || i.paidLate);
  const lateRateAboveThreshold = big.length ? bigLate.length / big.length : undefined;

  const items = [];
  for (const invoice of overdue.slice(0, 3)) {
    items.push({
      id: `inv_${invoice.id}`,
      title: `${invoice.client} owes $${Math.round(invoice.amountUsd || 0)}, ${invoice.daysOverdue} days late`,
      detail: 'Already earned. One message usually collects it.',
      valueUsd: invoice.amountUsd,
      urgency: clamp(0.65 + (invoice.daysOverdue || 0) * 0.01),
      subjectType: 'invoice',
      subjectId: invoice.id,
      action: `Send ${invoice.client} a payment nudge`,
    });
  }
  for (const quote of (quotes || []).slice(0, 2)) {
    items.push({
      id: `quote_${quote.id}`,
      title: `${quote.client} has a $${Math.round(quote.amountUsd || 0)} quote sitting ${quote.sentDaysAgo} days`,
      detail: 'Quotes go cold fast. A single nudge closes a lot of them.',
      valueUsd: quote.amountUsd,
      urgency: clamp(0.45 + (quote.sentDaysAgo || 0) * 0.03),
      subjectType: 'quote',
      subjectId: quote.id,
      action: `Ask ${quote.client} for a yes or a no`,
    });
  }

  return {
    module: MODULE_ID,
    label: 'Invoicing',
    headline: `$${Math.round(overdueUsd)} overdue across ${overdue.length} invoices, $${Math.round(outstandingUsd)} outstanding in total, ${quotes.length} quotes waiting.`,
    metrics: {
      overdueCount: overdue.length,
      overdueUsd: Math.round(overdueUsd),
      outstandingUsd: Math.round(outstandingUsd),
      openQuotes: quotes.length,
      paidLast30: paid.length,
    },
    items,
    signals: {
      latePaymentThresholdUsd: threshold,
      lateRateAboveThreshold,
      averageTicketUsd,
      overdueUsd: Math.round(overdueUsd),
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
