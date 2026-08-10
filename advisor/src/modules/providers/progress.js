/**
 * Module 4: Progress Tracking.
 *
 * Stalled clients, programs about to end, and the week where people commonly drop off.
 */

export const MODULE_ID = 'progress';

const STALL_DAYS = 10;

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const clients = data.clients || [];

  const stalled = clients
    .filter((c) => (c.lastUpdateDays || 0) >= STALL_DAYS)
    .sort((a, b) => (b.lastUpdateDays || 0) - (a.lastUpdateDays || 0));

  const endingSoon = clients.filter(
    (c) => (c.percentComplete || 0) >= 0.8 && (c.percentComplete || 0) < 1,
  );

  const items = [];
  for (const client of stalled.slice(0, 3)) {
    items.push({
      id: `stall_${client.id}`,
      title: `${client.name} has not moved in ${client.lastUpdateDays} days`,
      detail: `Week ${client.week} of ${client.program || 'their program'}, ${Math.round((client.percentComplete || 0) * 100)} percent done.`,
      valueUsd: client.programValueUsd,
      urgency: clamp(0.5 + (client.lastUpdateDays - STALL_DAYS) * 0.03),
      subjectType: 'client',
      subjectId: client.id,
      action: `Check in on ${client.name} before they quit`,
    });
  }
  for (const client of endingSoon.slice(0, 2)) {
    items.push({
      id: `ending_${client.id}`,
      title: `${client.name} is nearly finished`,
      detail: `${Math.round((client.percentComplete || 0) * 100)} percent through ${client.program || 'their program'}. This is the renewal conversation.`,
      valueUsd: client.programValueUsd,
      urgency: 0.6,
      subjectType: 'client',
      subjectId: client.id,
      action: `Line up what comes next for ${client.name}`,
    });
  }

  const stallWeeks = stalled.map((c) => c.week).filter((w) => typeof w === 'number');
  const commonStallWeek = stallWeeks.length ? mode(stallWeeks) : undefined;

  return {
    module: MODULE_ID,
    label: 'Progress',
    headline: `${clients.length} clients in a program, ${stalled.length} stalled, ${endingSoon.length} close to finishing.`,
    metrics: {
      activePrograms: clients.length,
      stalled: stalled.length,
      endingSoon: endingSoon.length,
    },
    items,
    signals: {
      commonStallWeek,
      stalledCount: stalled.length,
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
