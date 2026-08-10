/**
 * Module 2: Booking.
 *
 * Upcoming work, no-shows, clients overdue to rebook, and open capacity.
 * Overdue rebooks are usually the single highest value thing in the whole account, so this
 * provider is deliberately generous with urgency on them.
 */

export const MODULE_ID = 'booking';

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const upcoming = data.upcoming || [];
  const overdueRebook = (data.overdueRebook || [])
    .slice()
    .sort((a, b) => overdueBy(b) - overdueBy(a));

  const completed = data.completedLast30 || 0;
  const noShows = data.noShowsLast30 || 0;
  const noShowRate = completed + noShows > 0 ? noShows / (completed + noShows) : 0;
  const bookedUsd = upcoming.reduce((sum, b) => sum + (b.valueUsd || 0), 0);

  const items = [];
  for (const client of overdueRebook.slice(0, 4)) {
    const over = overdueBy(client);
    items.push({
      id: `rebook_${client.clientId}`,
      title: `${client.name} is ${over} days past their usual rebook`,
      detail: `Books about every ${client.typicalDays} days, last in for ${client.lastService || 'a job'} worth about $${Math.round(client.typicalValueUsd || 0)}.`,
      valueUsd: client.typicalValueUsd,
      urgency: clamp(0.6 + over / 40),
      subjectType: 'client',
      subjectId: client.clientId,
      action: `Text ${client.name} a time this week`,
    });
  }

  const nextUp = upcoming
    .slice()
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, 2);
  for (const booking of nextUp) {
    items.push({
      id: `booking_${booking.id}`,
      title: `${booking.clientName} booked for ${booking.service}`,
      detail: `Starts ${booking.startsAt}, worth about $${Math.round(booking.valueUsd || 0)}.`,
      valueUsd: booking.valueUsd,
      urgency: 0.4,
      subjectType: 'booking',
      subjectId: booking.id,
      action: `Confirm ${booking.clientName} the day before`,
    });
  }

  if ((data.openSlotsNext7 || 0) > 0) {
    items.push({
      id: 'capacity',
      title: `${data.openSlotsNext7} open slots in the next 7 days`,
      detail: 'Empty capacity is the cheapest revenue in the account to fill.',
      urgency: clamp(0.45 + data.openSlotsNext7 * 0.03),
      subjectType: 'capacity',
      subjectId: 'next7',
      action: 'Offer the open slots to overdue clients first',
    });
  }

  return {
    module: MODULE_ID,
    label: 'Booking',
    headline: `${upcoming.length} jobs on the books worth $${Math.round(bookedUsd)}, ${overdueRebook.length} clients overdue to rebook, ${data.openSlotsNext7 || 0} slots open this week.`,
    metrics: {
      upcoming: upcoming.length,
      bookedUsd: Math.round(bookedUsd),
      overdueRebook: overdueRebook.length,
      openSlotsNext7: data.openSlotsNext7 || 0,
      noShowsLast30: noShows,
    },
    items,
    signals: {
      avgRebookDays: data.avgRebookDays,
      noShowRate: Number(noShowRate.toFixed(3)),
      monthJobCount: completed,
      openSlotsNext7: data.openSlotsNext7 || 0,
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function overdueBy(client) {
  return Math.max(0, (client.daysSince || 0) - (client.typicalDays || 0));
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
