/**
 * The seeded demo account.
 *
 * One realistic small business with every module turned on, enough live data for the
 * advisor to have something real to say, and a few past pieces of advice with outcomes so
 * the learning loop is visible on the first click.
 *
 * Used by the tests, by the local dev server, and by the static preview of the panel.
 */

import { InMemoryStore } from '../memory/inMemoryStore.js';
import { seedAccountMemory } from '../memory/onboarding.js';
import { createAdvisor } from '../advisor.js';
import { createModelClient } from '../reasoning/modelClient.js';
import { MODULES } from '../../../config/index.js';

export const DEMO_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';

export const DEMO_ONBOARDING = Object.freeze({
  'business.type': 'Mobile detailing, two vans, Nashville area',
  'services.offered': 'Interior detail, exterior wash and wax, ceramic coating, monthly maintenance plan',
  'pricing.typical': 'Interior $180, wash and wax $120, ceramic $900, maintenance plan $99 a month',
  'clients.best_customer': 'Fleet accounts with three or more vehicles, and anyone on the monthly plan',
  'goals.primary': 'Get to $18,000 a month without hiring a third tech',
  'seasonality.busy': 'Busy March through June, slow in January and February',
  'operations.capacity': 'About 22 jobs a week across two vans',
  'preferences.workstyle': 'No weekend jobs. Never cold call. I do not discount, I add value instead.',
  'voice.tone': 'Hey Mike, truck came out clean. Want me to grab it same time next month?',
  'business.differentiator': 'We come to them and we are never late',
});

/** Live module data. In production each module queries its own tables for this. */
export function demoDataSource(now = new Date()) {
  const iso = (days) => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 16).replace('T', ' ');
  return {
    crm: {
      leads: [
        { id: 'l1', name: 'Harbor Fleet Services', stage: 'quoted', valueUsd: 3600, lastTouchDays: 6, source: 'referral' },
        { id: 'l2', name: 'Dana Whitfield', stage: 'negotiating', valueUsd: 900, lastTouchDays: 2, source: 'google' },
        { id: 'l3', name: 'Corner Auto Group', stage: 'quoted', valueUsd: 2400, lastTouchDays: 11, source: 'referral' },
        { id: 'l4', name: 'Peter Rowe', stage: 'new', valueUsd: 180, lastTouchDays: 4, source: 'instagram' },
        { id: 'l5', name: 'Salem Landscaping', stage: 'ready', valueUsd: 1200, lastTouchDays: 1, source: 'referral' },
      ],
      clients: [
        { id: 'c1', name: 'Mike Trent', lifetimeValueUsd: 4820, lastJobDays: 41 },
        { id: 'c2', name: 'Ramirez Plumbing', lifetimeValueUsd: 7350, lastJobDays: 18 },
        { id: 'c3', name: 'Anna Boyd', lifetimeValueUsd: 1560, lastJobDays: 9 },
        { id: 'c4', name: 'Grant Holloway', lifetimeValueUsd: 2280, lastJobDays: 63 },
      ],
      medianLeadResponseHours: 19,
    },
    booking: {
      upcoming: [
        { id: 'b1', clientId: 'c3', clientName: 'Anna Boyd', startsAt: iso(1), service: 'Interior detail', valueUsd: 180 },
        { id: 'b2', clientId: 'c2', clientName: 'Ramirez Plumbing', startsAt: iso(2), service: 'Fleet wash, 4 trucks', valueUsd: 480 },
        { id: 'b3', clientId: 'c5', clientName: 'Tilly Reese', startsAt: iso(4), service: 'Wash and wax', valueUsd: 120 },
      ],
      overdueRebook: [
        { clientId: 'c1', name: 'Mike Trent', daysSince: 41, typicalDays: 28, lastService: 'interior detail', typicalValueUsd: 180 },
        { clientId: 'c4', name: 'Grant Holloway', daysSince: 63, typicalDays: 30, lastService: 'wash and wax', typicalValueUsd: 120 },
        { clientId: 'c6', name: 'Delaney Fields', daysSince: 35, typicalDays: 28, lastService: 'interior detail', typicalValueUsd: 180 },
      ],
      completedLast30: 68,
      noShowsLast30: 7,
      openSlotsNext7: 9,
      avgRebookDays: 29,
    },
    gated_content: {
      members: [
        { id: 'm1', name: 'Mike Trent', joinedDaysAgo: 210, lastActiveDays: 22, planUsd: 99 },
        { id: 'm2', name: 'Anna Boyd', joinedDaysAgo: 95, lastActiveDays: 3, planUsd: 99 },
        { id: 'm3', name: 'Sam Okafor', joinedDaysAgo: 5, lastActiveDays: 1, planUsd: 99 },
        { id: 'm4', name: 'Delaney Fields', joinedDaysAgo: 150, lastActiveDays: 31, planUsd: 149 },
      ],
      topContent: [
        { title: 'Ceramic coating, what it actually does', views: 940, conversions: 11 },
        { title: 'Winter salt and your paint', views: 610, conversions: 4 },
      ],
    },
    progress: {
      clients: [
        { id: 'c2', name: 'Ramirez Plumbing', program: 'Fleet maintenance year one', week: 7, lastUpdateDays: 4, percentComplete: 0.55, programValueUsd: 5760 },
        { id: 'c1', name: 'Mike Trent', program: 'Paint restoration', week: 3, lastUpdateDays: 16, percentComplete: 0.3, programValueUsd: 900 },
        { id: 'c7', name: 'Bell Contracting', program: 'Fleet maintenance year one', week: 11, lastUpdateDays: 2, percentComplete: 0.85, programValueUsd: 5760 },
      ],
    },
    field_capture: {
      jobs: [
        { id: 'j1', client: 'Ramirez Plumbing', completedDaysAgo: 5, reportSubmitted: false, photos: 0, signed: false, valueUsd: 480 },
        { id: 'j2', client: 'Anna Boyd', completedDaysAgo: 2, reportSubmitted: true, photos: 6, signed: false, valueUsd: 180 },
        { id: 'j3', client: 'Bell Contracting', completedDaysAgo: 9, reportSubmitted: false, photos: 0, signed: false, valueUsd: 720 },
        { id: 'j4', client: 'Tilly Reese', completedDaysAgo: 1, reportSubmitted: true, photos: 4, signed: true, valueUsd: 120 },
      ],
    },
    invoicing: {
      invoices: [
        { id: 'i1', client: 'Bell Contracting', amountUsd: 1450, daysOverdue: 22, status: 'sent', paidLate: false },
        { id: 'i2', client: 'Corner Auto Group', amountUsd: 640, daysOverdue: 9, status: 'sent', paidLate: false },
        { id: 'i3', client: 'Anna Boyd', amountUsd: 180, daysOverdue: 0, status: 'paid', paidLate: false },
        { id: 'i4', client: 'Ramirez Plumbing', amountUsd: 480, daysOverdue: 0, status: 'sent', paidLate: false },
        { id: 'i5', client: 'Mike Trent', amountUsd: 900, daysOverdue: 0, status: 'paid', paidLate: true },
        { id: 'i6', client: 'Salem Landscaping', amountUsd: 1200, daysOverdue: 0, status: 'paid', paidLate: true },
        { id: 'i7', client: 'Tilly Reese', amountUsd: 120, daysOverdue: 0, status: 'paid', paidLate: false },
      ],
      quotes: [
        { id: 'q1', client: 'Harbor Fleet Services', amountUsd: 3600, sentDaysAgo: 6 },
        { id: 'q2', client: 'Corner Auto Group', amountUsd: 2400, sentDaysAgo: 12 },
      ],
    },
    marketing: {
      campaigns: [
        { name: 'Spring ceramic offer', sentDaysAgo: 24, openRate: 0.41, bookings: 9 },
        { name: 'Monthly plan reminder', sentDaysAgo: 51, openRate: 0.33, bookings: 4 },
      ],
      channels: [
        { name: 'Referrals', bookings: 14 },
        { name: 'Google', bookings: 8 },
        { name: 'Instagram', bookings: 3 },
      ],
      listSize: 612,
      listGrowth30: 28,
      daysSinceLastSend: 24,
    },
    reviews: {
      recent: [
        { id: 'r1', client: 'Grant Holloway', rating: 3, text: 'Good work but showed up late', daysAgo: 4, responded: false },
        { id: 'r2', client: 'Anna Boyd', rating: 5, text: 'Car looks brand new', daysAgo: 2, responded: false },
        { id: 'r3', client: 'Tilly Reese', rating: 5, text: 'Easy to work with', daysAgo: 12, responded: true },
      ],
      askable: [
        { clientId: 'c3', name: 'Anna Boyd', daysSinceJob: 2 },
        { clientId: 'c2', name: 'Ramirez Plumbing', daysSinceJob: 5 },
      ],
    },
  };
}

/**
 * Build a fully seeded demo advisor.
 *
 * @param {object} [options]
 * @param {string[]} [options.enabledModules] defaults to every module in the catalog
 * @param {boolean} [options.advisorActive] defaults true
 * @param {object} [options.model] inject a model client, defaults to the stub
 * @param {Date} [options.now]
 */
export async function createDemoAdvisor(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const store = options.store || new InMemoryStore({ clock: () => now.getTime() });
  const accountId = options.accountId || DEMO_ACCOUNT_ID;
  const enabled = options.enabledModules || MODULES.modules.map((m) => m.id);

  for (const moduleId of enabled) {
    await store.setModuleEnabled(accountId, moduleId, true, true);
  }
  if (options.advisorActive !== false) {
    await store.setAddon(accountId, 'advisor', { status: 'active' });
  }

  await seedAccountMemory(store, accountId, DEMO_ONBOARDING);

  // A few observations that would already exist after a couple of weeks of watching.
  await store.addObservation(accountId, {
    observation: 'Fleet accounts rebook without being asked. Single vehicle clients almost never do.',
    module_source: 'booking',
    weight: 0.8,
  });
  await store.addObservation(accountId, {
    observation: 'Jobs booked from a referral close at roughly double the rate of Instagram leads.',
    module_source: 'crm',
    weight: 0.75,
  });

  const dataSource = options.dataSource || demoDataSource(now);
  const model = options.model || createModelClient({ forceProvider: options.provider || 'stub' });

  const advisor = createAdvisor({
    store,
    dataSource,
    model,
    clock: () => now,
  });

  // Two pieces of past advice with outcomes so the loop is visible immediately.
  if (options.seedHistory !== false) {
    const daysBack = (n) => new Date(now.getTime() - n * 86400000).toISOString();

    const taken = await store.logAdvice(accountId, {
      advice_given: 'Text Mike Trent a time this week, he is past his usual rebook.',
      context_snapshot: { seeded: true },
      purpose: 'daily_rundown',
      created_at: daysBack(6),
    });
    await advisor.recordAdviceOutcome(taken.id, true, 'He booked for Thursday, $180');

    const ignored = await store.logAdvice(accountId, {
      advice_given: 'Post a reel about ceramic coating to the Instagram account.',
      context_snapshot: { seeded: true },
      purpose: 'daily_rundown',
      created_at: daysBack(3),
    });
    await advisor.recordAdviceOutcome(ignored.id, false, 'Not doing video right now');
  }

  // Let the rules write their first round of learned facts.
  await advisor.refreshMemory(accountId, { now });

  return { advisor, store, accountId, dataSource, now };
}

export default createDemoAdvisor;
