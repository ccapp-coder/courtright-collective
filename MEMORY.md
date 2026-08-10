# MEMORY.md

The account memory layer behind the Aimtogro AI Advisor.

This is what makes the advisor feel like it learned the business. It is not fine-tuning and
it never will be. There is exactly one model in production, shared by every account. What
differs per account is the CONTEXT we hand it before it thinks.

**Rule: never fine-tune per account. Accumulate facts, recall them as context.**

Same felt result as learning. A tiny fraction of the cost, and no per account model to
version, host, evaluate, or roll back.

---

## 1. The schema

Migration: `supabase/migrations/0001_advisor_memory.sql`. Every table is per account with
row level security keyed to `account_id`.

### account_memory

Durable learned facts. One row per `(account_id, key)`, upserted so a fact sharpens instead
of duplicating.

| column | type | notes |
| --- | --- | --- |
| account_id | uuid | |
| key | text | dotted, `category.thing`, for example `pricing.typical` |
| value | text | short, human readable, goes into a prompt verbatim |
| category | text | business, services, pricing, clients, seasonality, preferences, voice, goals, operations, general |
| confidence | numeric 0..1 | drives retrieval order and the floor cut |
| source | text | onboarding, observed, outcome, owner_stated, imported |
| updated_at | timestamptz | drives decay |

Keys are stable strings, not free text, so a fact can be corrected rather than accumulated.
`services.offered` always means the same thing.

### advisor_observations

Things the advisor noticed over time. Append only, recency weighted, deduped on write.

| column | notes |
| --- | --- |
| observation | one sentence, already phrased for a human |
| module_source | which module the pattern came from |
| subject_type / subject_id | optional, lets a pitch pull only that client's history |
| weight | 0..1, how much this matters |

Examples that the shipped rules actually produce: "Clients rebook about every 4 weeks on
average." "Invoices over $500 tend to pay late (66 percent of them)." "New leads wait about
19 hours for a first reply."

### advice_log

What the advisor suggested, plus the exact `context_snapshot` that produced it. The snapshot
is trimmed (fact strings, observation strings, module headlines and metrics) so the table
stays small, but it is enough to answer "why did it say that" months later.

### advice_outcomes

The feedback loop. `taken`, `result`, `helpful`, joined to `advice_log`. **This is the table
that makes advice improve.** See section 4.

### Supporting tables

- `advisor_usage`: advisory moments, for the cap. Not memory, but it lives with it.
- `account_modules`: which modules are toggled on. Source of truth for the runtime gate and
  for which providers the advisor is allowed to call.
- `account_addons`: advisor entitlement, including the `suspended` state. Suspension never
  touches any of the memory tables.

---

## 2. How memory forms

Three paths, all of them cheap plumbing. **None of them spend a token.**

### a. Seeded at onboarding

`advisor/src/memory/onboarding.js`. A ten question form, none of it required:

business type, services offered, typical pricing, best customer, six month goal, busy and
dead seasons, weekly capacity, working preferences and hard nos, the owner's own voice
(paste a real message), and what makes them different.

Answers land in `account_memory` at `seedConfidence` (0.9) with `source: onboarding`. That
is enough for the very first rundown to sound like it already knows the shop.

`statedByOwner()` handles corrections from the UI. Owner stated facts write at the
confidence ceiling and outrank anything inferred.

### b. Grown automatically by rules watching module data

`advisor/src/memory/factRules.js`. Every module's `getAdvisorContext` returns a `signals`
bag of plain numbers. Rules read those numbers and write sentences.

| rule | watches | writes |
| --- | --- | --- |
| booking.rebook_cadence | avgRebookDays | `operations.rebook_cadence_days` plus an observation |
| booking.no_show_pattern | noShowRate | `operations.no_show_rate` when above 8 percent |
| invoicing.late_payment_threshold | lateRateAboveThreshold | `operations.late_invoice_threshold_usd` plus an observation |
| invoicing.average_ticket | averageTicketUsd | `pricing.average_ticket_usd` |
| crm.top_client | topClientName, topClientValueUsd | `clients.top_client` |
| crm.lead_response_gap | medianLeadResponseHours | observation when replies are slow |
| gated_content.churn_signal | churnRiskCount, churnSilentDays | observation |
| progress.stall_point | commonStallWeek | `operations.common_stall_week` |
| marketing.converting_channel | topConvertingChannel | `operations.best_channel` |
| reviews.request_timing | bestRequestDelayDays | `operations.review_request_delay_days` |
| field_capture.report_lag | avgReportLagDays | observation |
| seasonality.month_volume | monthJobCount | `seasonality.volume_<month>` |

Run nightly through `runMemoryRefresh()` in `advisor/src/schedule/dailyRundownJob.js`.
Observations are deduped against the last 7 days, so a nightly job does not spam the table.
A rule that throws is counted and skipped: one broken module never stops the others.

Facts decay. `decayStaleFacts()` drops confidence by 0.1 per stale period
(`memory.staleAfterDays`, default 180) for observed facts only. Onboarding and owner stated
facts never decay. Nothing is deleted, it just falls below the retrieval floor.

### c. Grown by capturing outcomes

`advisor/src/memory/outcomes.js`. When the owner uses the "did you do it" control, we write
an `advice_outcomes` row and fold it back into memory:

1. The advice string is classified into a kind with a regex, no model: follow_up, rebook,
   collect, upsell, content, review, retention, ops.
2. A running tally lands on `preferences.acts_on_<kind>`, phrased for a prompt:
   `ignores content advice (0 of 5), stop leading with it`.
3. If the owner typed a result, it is kept verbatim as an observation.

That preference fact does real work twice: it goes into the prompt, and it is read by
`rankOpportunities()` in `advisor/src/reasoning/rank.js`, which multiplies the score of an
ignored advice kind by 0.6 and an acted-on kind by 1.25. So the ranking changes even before
the model sees anything.

---

## 3. How memory is USED: the retrieval contract

**The only token cost in the whole system is the reasoning call. Retrieval decides how big
that call is, which makes this function the margin.**

```js
buildAdvisorContext(account_id, purpose, deps) -> Promise<Bundle>
```

`advisor/src/context/buildAdvisorContext.js`.

**purpose** is one of `daily_rundown`, `ask`, `low_hanging_fruit`, `pitch`, `weekly_review`.

**deps**: `{ store, registry, enabledModuleIds, dataSource, question?, clientId?, now?, config? }`

**Returns** a compact bundle:

```js
{
  accountId, purpose, generatedAt, question?, clientId?,
  enabledModules: string[],
  facts:        [{ key, value, category, confidence }],
  observations: [{ text, from }],
  outcomes:     [{ advice, taken, result }],
  modules:      [{ module, label, headline, metrics, items[] }],
  moduleErrors: [], modulesSkipped: [],
  bundleChars:  number
}
```

### What gets in

1. **Facts** are scored `categoryWeight(purpose) * confidence + keywordBonus(question)`.
   Each purpose has its own category weighting, in `PURPOSE_PROFILES`. A pitch studies
   services, pricing, clients and voice. A weekly review studies goals and seasonality.
   Facts below `context.minConfidence` never load at all.
2. **Observations** are scored `weight + keywordBonus + recencyBonus`, inside the
   `observationRecencyDays` window. A pitch pulls only observations about that client.
3. **Outcomes** are the last few, summarized to one line each.
4. **Modules** are the live `getAdvisorContext` from each ENABLED module, each already
   trimmed by the registry to `maxItemsPerModule` items of `maxCharsPerItem` chars.

### The budget

`enforceBudget()` caps the whole bundle at `context.maxBundleChars` (9000, about 2,250
tokens). When it is over, it drops in this order: extra outcomes, then observations, then
the fattest module's least urgent item, then facts. It never drops below 2 outcomes,
3 observations, 1 item per module or 8 facts, so an answer can never end up ungrounded.

### Rendering

`renderContextForPrompt(bundle)` turns the bundle into plain lines under three headings:
WHAT I KNOW ABOUT THIS BUSINESS, PATTERNS I HAVE NOTICED, HOW PAST ADVICE LANDED, LIVE STATE
RIGHT NOW. Plain text, not JSON: JSON costs tokens and buys nothing here. Confidence scores
stay out of the prompt, they are a retrieval concern.

### The tuning knobs

All of them in `config/advisor.config.json` under `context`, all overridable by env var:

```
maxMemoryFacts 25   maxObservations 12   maxOutcomes 8
maxModules 8        maxItemsPerModule 5  maxCharsPerItem 180
maxBundleChars 9000 minConfidence 0.35
observationRecencyDays 45   outcomeRecencyDays 90
```

Raising `maxBundleChars` is the single fastest way to hurt the margin. Treat it as a
business number, not a technical one.

---

## 4. Why this is enough

The loop closes: onboarding gives the advisor a file, module rules keep the file current,
outcomes teach it which advice this particular owner actually acts on, and retrieval hands
the right page of that file to the model before every answer. From the owner's seat that is
indistinguishable from an employee who has been there six months. From the P&L's seat it is
a few thousand tokens.
