/**
 * Module 3: Gated Content.
 *
 * Churn risk first, new members second, and which piece of content actually converts.
 */

export const MODULE_ID = 'gated_content';

const QUIET_DAYS = 14;

export async function getAdvisorContext(accountId, options = {}) {
  const data = options.data || {};
  const members = data.members || [];
  const atRisk = members
    .filter((m) => (m.lastActiveDays || 0) >= QUIET_DAYS)
    .sort((a, b) => (b.planUsd || 0) - (a.planUsd || 0));
  const newMembers = members.filter((m) => (m.joinedDaysAgo || 999) <= 7);
  const mrr = members.reduce((sum, m) => sum + (m.planUsd || 0), 0);

  const items = [];
  for (const member of atRisk.slice(0, 3)) {
    items.push({
      id: `churn_${member.id}`,
      title: `${member.name} has not logged in for ${member.lastActiveDays} days`,
      detail: `On the $${Math.round(member.planUsd || 0)} plan. Quiet members cancel at the next renewal.`,
      valueUsd: (member.planUsd || 0) * 12,
      urgency: clamp(0.5 + (member.lastActiveDays - QUIET_DAYS) * 0.02),
      subjectType: 'member',
      subjectId: member.id,
      action: `Send ${member.name} the one thing they have not seen yet`,
    });
  }
  for (const member of newMembers.slice(0, 2)) {
    items.push({
      id: `new_${member.id}`,
      title: `${member.name} joined ${member.joinedDaysAgo} days ago`,
      detail: 'First two weeks decide whether a member sticks.',
      valueUsd: (member.planUsd || 0) * 12,
      urgency: 0.5,
      subjectType: 'member',
      subjectId: member.id,
      action: `Welcome ${member.name} personally`,
    });
  }

  const topContent = (data.topContent || [])
    .slice()
    .sort((a, b) => (b.conversions || 0) - (a.conversions || 0))[0];
  if (topContent) {
    items.push({
      id: 'top_content',
      title: `"${topContent.title}" is converting best`,
      detail: `${topContent.conversions} signups from ${topContent.views} views.`,
      urgency: 0.35,
      subjectType: 'content',
      subjectId: topContent.title,
      action: 'Put that piece in front of more people',
    });
  }

  return {
    module: MODULE_ID,
    label: 'Gated Content',
    headline: `${members.length} members worth $${Math.round(mrr)} a month, ${atRisk.length} at churn risk, ${newMembers.length} new this week.`,
    metrics: {
      members: members.length,
      mrrUsd: Math.round(mrr),
      churnRisk: atRisk.length,
      newLast7: newMembers.length,
    },
    items,
    signals: {
      churnRiskCount: atRisk.length,
      churnSilentDays: atRisk.length
        ? Math.round(atRisk.reduce((s, m) => s + m.lastActiveDays, 0) / atRisk.length)
        : undefined,
      mrrUsd: Math.round(mrr),
      topConvertingContent: topContent ? topContent.title : undefined,
    },
    generatedAt: (options.now || new Date()).toISOString(),
  };
}

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default getAdvisorContext;
