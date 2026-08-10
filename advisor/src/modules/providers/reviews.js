/**
 * Module 8: Reviews and Reputation.
 *
 * Unanswered reviews (especially bad ones), and the clients who are most likely to leave
 * a good one if asked in the next day or two.
 */

export const MODULE_ID = 'reviews';

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const recent = data.recent || [];
  const askable = (data.askable || [])
    .slice()
    .sort((a, b) => (a.daysSinceJob || 0) - (b.daysSinceJob || 0));

  const unanswered = recent.filter((r) => !r.responded);
  const negative = unanswered.filter((r) => (r.rating || 5) <= 3);
  const average = recent.length
    ? recent.reduce((s, r) => s + (r.rating || 0), 0) / recent.length
    : undefined;

  const items = [];
  for (const review of negative.slice(0, 2)) {
    items.push({
      id: `neg_${review.id}`,
      title: `${review.rating} star review from ${review.client} is still unanswered`,
      detail: `Left ${review.daysAgo} days ago. A calm public reply is worth more than the review costs you.`,
      urgency: clamp(0.75 + (review.daysAgo || 0) * 0.02),
      subjectType: 'review',
      subjectId: review.id,
      action: `Reply to ${review.client} publicly today`,
    });
  }
  for (const review of unanswered.filter((r) => (r.rating || 0) >= 4).slice(0, 1)) {
    items.push({
      id: `pos_${review.id}`,
      title: `${review.client} left ${review.rating} stars and got no reply`,
      detail: 'Thanking happy reviewers is how you get the next one.',
      urgency: 0.35,
      subjectType: 'review',
      subjectId: review.id,
      action: `Thank ${review.client}`,
    });
  }
  for (const client of askable.slice(0, 2)) {
    items.push({
      id: `ask_${client.clientId}`,
      title: `${client.name} finished ${client.daysSinceJob} days ago and would probably leave a review`,
      detail: 'Ask window is short. After a week the yes rate falls off a cliff.',
      urgency: clamp(0.55 - (client.daysSinceJob || 0) * 0.04),
      subjectType: 'client',
      subjectId: client.clientId,
      action: `Ask ${client.name} for a review`,
    });
  }

  const delays = askable.map((c) => c.daysSinceJob).filter((d) => typeof d === 'number');

  return {
    module: MODULE_ID,
    label: 'Reviews',
    headline: `${recent.length} reviews recently at ${average ? average.toFixed(1) : 'n/a'} stars, ${unanswered.length} unanswered, ${askable.length} clients worth asking.`,
    metrics: {
      recentReviews: recent.length,
      unanswered: unanswered.length,
      negativeUnanswered: negative.length,
      averageRating: average ? Number(average.toFixed(2)) : undefined,
      askable: askable.length,
    },
    signals: {
      averageRating: average ? Number(average.toFixed(2)) : undefined,
      bestRequestDelayDays: delays.length ? Math.min(...delays) : undefined,
      negativeUnanswered: negative.length,
    },
    items,
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
