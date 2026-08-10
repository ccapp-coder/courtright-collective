/**
 * Module 7: Marketing and Content.
 *
 * What actually produced bookings, not what got likes. The advisor only cares about the
 * channel and the campaign that moved money.
 */

export const MODULE_ID = 'marketing';

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const campaigns = (data.campaigns || []).slice().sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
  const channels = (data.channels || []).slice().sort((a, b) => (b.bookings || 0) - (a.bookings || 0));
  const bookings30 = campaigns.reduce((s, c) => s + (c.bookings || 0), 0);
  const topChannel = channels[0];
  const best = campaigns[0];
  const stale = data.daysSinceLastSend;

  const items = [];
  if (best) {
    items.push({
      id: `campaign_${best.name}`,
      title: `"${best.name}" drove ${best.bookings} bookings`,
      detail: `Open rate ${Math.round((best.openRate || 0) * 100)} percent, sent ${best.sentDaysAgo} days ago. Worth running again.`,
      urgency: 0.5,
      subjectType: 'campaign',
      subjectId: best.name,
      action: `Re-run "${best.name}" to the people who did not open it`,
    });
  }
  if (typeof stale === 'number' && stale >= 21) {
    items.push({
      id: 'send_gap',
      title: `Nothing has gone out to the list in ${stale} days`,
      detail: `The list is ${data.listSize || 0} people and it is the cheapest channel you own.`,
      urgency: clamp(0.4 + stale * 0.01),
      subjectType: 'list',
      subjectId: 'main',
      action: 'Send one short offer to the list this week',
    });
  }
  if (topChannel) {
    items.push({
      id: `channel_${topChannel.name}`,
      title: `${topChannel.name} is your best channel right now`,
      detail: `${topChannel.bookings} bookings in the last 30 days.`,
      urgency: 0.3,
      subjectType: 'channel',
      subjectId: topChannel.name,
      action: `Put the next hour of effort into ${topChannel.name}`,
    });
  }

  return {
    module: MODULE_ID,
    label: 'Marketing',
    headline: `${bookings30} bookings from marketing in 30 days, list at ${data.listSize || 0} and ${data.listGrowth30 >= 0 ? 'up' : 'down'} ${Math.abs(data.listGrowth30 || 0)} this month.`,
    metrics: {
      bookingsLast30: bookings30,
      listSize: data.listSize || 0,
      listGrowth30: data.listGrowth30 || 0,
      daysSinceLastSend: stale,
    },
    items,
    signals: {
      topConvertingChannel: topChannel ? topChannel.name : undefined,
      topChannelBookings: topChannel ? topChannel.bookings : undefined,
      daysSinceLastSend: stale,
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
