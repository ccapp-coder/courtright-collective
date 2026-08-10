/**
 * Module 1: CRM.
 *
 * getAdvisorContext returns hot leads, overdue follow-ups and top clients, trimmed hard.
 * In production `options.data` is replaced by the module's own query against the shared
 * client database. The shape below is the contract that query must satisfy.
 */

export const MODULE_ID = 'crm';

const HOT_STAGES = new Set(['quoted', 'negotiating', 'ready']);

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || { leads: [], clients: [] };
  const leads = data.leads || [];
  const clients = data.clients || [];

  const hotLeads = leads
    .filter((l) => HOT_STAGES.has(l.stage))
    .sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

  const overdue = leads
    .filter((l) => (l.lastTouchDays || 0) >= 3 && l.stage !== 'won' && l.stage !== 'lost')
    .sort((a, b) => (b.lastTouchDays || 0) - (a.lastTouchDays || 0));

  const topClients = clients
    .slice()
    .sort((a, b) => (b.lifetimeValueUsd || 0) - (a.lifetimeValueUsd || 0));

  const pipelineUsd = hotLeads.reduce((sum, l) => sum + (l.valueUsd || 0), 0);

  const items = [];
  for (const lead of hotLeads.slice(0, 4)) {
    items.push({
      id: `lead_${lead.id}`,
      title: `${lead.name} is ${lead.stage} on $${Math.round(lead.valueUsd || 0)}`,
      detail: `Last touched ${lead.lastTouchDays} days ago, came from ${lead.source || 'unknown'}.`,
      valueUsd: lead.valueUsd,
      urgency: clamp(0.55 + (lead.lastTouchDays || 0) * 0.05 + (lead.valueUsd || 0) / 20000),
      subjectType: 'lead',
      subjectId: lead.id,
      action: `Follow up with ${lead.name} today`,
    });
  }
  for (const lead of overdue.slice(0, 3)) {
    if (items.some((i) => i.subjectId === lead.id)) continue;
    items.push({
      id: `stale_${lead.id}`,
      title: `${lead.name} has gone quiet for ${lead.lastTouchDays} days`,
      detail: `Stage ${lead.stage}, worth about $${Math.round(lead.valueUsd || 0)}.`,
      valueUsd: lead.valueUsd,
      urgency: clamp(0.3 + (lead.lastTouchDays || 0) * 0.04),
      subjectType: 'lead',
      subjectId: lead.id,
      action: `Send ${lead.name} a short check in`,
    });
  }

  const top = topClients[0];

  return {
    module: MODULE_ID,
    label: 'CRM',
    headline: `${hotLeads.length} hot leads worth about $${Math.round(pipelineUsd)}, ${overdue.length} follow-ups overdue.`,
    metrics: {
      hotLeads: hotLeads.length,
      overdueFollowUps: overdue.length,
      pipelineUsd: Math.round(pipelineUsd),
      activeClients: clients.length,
    },
    items,
    signals: {
      topClientName: top ? top.name : undefined,
      topClientValueUsd: top ? top.lifetimeValueUsd : undefined,
      medianLeadResponseHours: data.medianLeadResponseHours,
      pipelineUsd: Math.round(pipelineUsd),
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
