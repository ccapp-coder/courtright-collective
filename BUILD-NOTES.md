# BUILD-NOTES.md

Build log for the Aimtogro AI Advisor. Assumptions, calls made without asking, what is real,
what is stubbed, and what needs Dillon.

---

## The situation this was built into

This repository is the Courtright Collective marketing site (static HTML on Cloudflare, plus
`wrangler.toml` serving `./` as assets). **The Aimtogro application itself does not live
here.** `aimtogro/` contained five marketing pages and nothing else: no dashboard, no
modules, no Supabase client, no build system, no package manager.

So the instruction "register `getAdvisorContext` in each existing module (1-8)" had no
existing modules to register into. The call made: build the advisor as a **self contained,
portable service** with the module contract fully specified and all eight providers written
against it, so that wiring it into the real Aimtogro app is a matter of swapping the data
source, not writing new advisor code. Everything is plain ESM with **zero npm dependencies**
and runs unchanged in Node, in a Cloudflare Worker, and in the browser.

---

## Decisions made without asking

1. **The eight modules.** The brief named five by example (CRM, Booking, Gated Content,
   Progress, Field Capture) and referred to "modules 1-8". The other three were chosen to
   match what an Aimtogro account plausibly sells: Invoicing and Payments, Marketing and
   Content, Reviews and Reputation. They live in `config/modules.config.json` with prices,
   so renaming or replacing one is a config edit plus a provider file.
   **Needs Dillon: confirm the real module list and prices.**

2. **Module prices are placeholders.** $19 to $39 a month each. The advisor add-on price
   ($69) came from the brief and is real.

3. **No root `package.json`.** Adding one could change how Cloudflare builds and deploys the
   live marketing site. Instead there are scoped `package.json` files in `advisor/` and
   `config/` (both `type: module`). `wrangler.toml` was not touched.

4. **JSON config loaded with import attributes** (`with { type: 'json' }`). Works in Node 20+
   and every current browser. If a build target ever chokes on it, the fix is a two line
   change in `config/index.js`.

5. **Supabase access over PostgREST via `fetch`**, not `@supabase/supabase-js`. Keeps the
   dependency count at zero and works on the edge. If Aimtogro already carries the client,
   swapping the internals of `advisor/src/memory/supabaseStore.js` is mechanical, since
   nothing above that layer knows about the transport.
   **Needs Dillon: the real `current_account_id()` JWT claim shape.** The RLS policies in the
   migration assume an `account_id` claim, matching the pattern the shared client database
   already uses. If it resolves through a membership table instead, only that one SQL
   function changes.

6. **A `stub` model provider.** With no `ANTHROPIC_API_KEY`, the reasoning layer writes from
   the same ranked bundle deterministically at zero cost. This was not in the brief. It was
   added because it makes the whole thing clickable and testable today with no key and no
   database, and because it doubles as a real product floor: if the provider is down the
   owner still gets a usable rundown instead of an error.

7. **Ranking is deterministic, in code, not in the model.** `advisor/src/reasoning/rank.js`
   scores every opportunity by urgency, money, effort and the owner's own outcome history,
   and the ranked list goes INTO the prompt as a starting point. Three reasons: it is free,
   it is stable across runs, and it lets learned preferences ("this owner ignores content
   advice") change the answer without asking a model to remember that.

8. **`maxBundleChars` set to 9000** (about 2,250 input tokens), which matches the
   `assumedInputTokensPerMoment` in the cost block. The first pass at 6000 was starving the
   bundle when all eight modules reported. This single number is the margin lever, so it is
   config, and it is documented as a business number in MEMORY.md.

9. **The daily rundown is cached per day.** Asking for it twice returns the same brief
   instead of reasoning twice. Cheaper and less confusing than two different answers to the
   same morning. `{ force: true }` regenerates and spends an ask.

10. **Grace before suspension.** The brief asked for "a short grace note rather than a hard
    cutoff". Implemented as a real state: seven days (`gate.graceDays`) where everything
    keeps working with a countdown message, then `suspended`. Memory is never touched.

11. **Extra rundowns cost an ask** (`cap.extraRundownCostsAnAsk`). Otherwise the free daily
    rundown is an unbounded loophole.

12. **A moment is metered after the reasoning succeeds**, never before. A provider error
    costs the owner nothing. There is a test for this.

13. **Employee tier numbers** (1/3/7 at $149/$349/$699 with larger pools) are placeholders in
    config so the soft ceiling has something to upsell to.
    **Needs Dillon: real tier pricing.**

14. **`aimtogro/dashboard.html` is a demo shell**, marked `noindex` and not linked from any
    marketing page. The real dashboard does not exist in this repo, so this page exists to
    prove the mount and to let the advisor be clicked through. Mounting into the real
    dashboard is one div and two lines of script, both shown in ADVISOR.md.

15. **The demo business is Sharp Line Detailing**, a two van mobile detailing shop in
    Nashville, seeded with live data across all eight modules, two pieces of past advice with
    outcomes, and a full onboarding questionnaire. Chosen because it exercises every module
    naturally: recurring bookings, fleet clients, a membership plan, field reports, invoices,
    reviews.

---

## What is real

- **Memory layer.** Full schema with RLS, two store adapters against one contract
  (in memory and Supabase), onboarding seeding, twelve automatic fact rules, confidence
  decay, and the outcome loop that feeds both the prompt and the ranking.
- **Retrieval.** `buildAdvisorContext` with per purpose category weighting, keyword
  relevance, recency weighting and a hard character budget that degrades in a defined order.
- **All six reasoning functions**, plus four supporting shared functions, each also an AI
  tool with a real schema, dispatching into the identical code path.
- **The module contract** and all eight providers, with registry level enforcement that a
  disabled module is never queried and a broken module never propagates.
- **Both gates**, all six access states, grace and suspension without memory loss.
- **The cap**, the soft ceiling with its upsell, the hard stop, monthly reset, and the margin
  calculator.
- **The panel**, mounted, in both visible states, with the "did you do it" control writing
  real outcomes. Verified end to end in a real browser: ask, answer, feedback, module toggle,
  state transitions.
- **73 tests**, all passing, no network, no database, no API key.

## What is stubbed

- **Module data.** Providers read `options.data`, supplied by the demo data source. In
  production each provider swaps that for its own query. The shape it must return is the
  contract and is documented in ADVISOR.md.
- **The model call under test.** Tests and the demo run the deterministic writer. The
  Anthropic path is written and reads its model from config, but has not been exercised
  against the live API from this environment.
- **Checkout.** `canPurchaseAdvisor()` is the gate the checkout flow must call. Wiring it to
  the actual billing provider is not done.
- **Scheduling.** `runDailyRundowns` and `runMemoryRefresh` are written and tested. Nothing
  registers them with a real cron yet, and per account timezone handling falls back to a
  single configured zone.
- **Authentication.** The HTTP layer takes `accountId` from an `x-account-id` header or a
  resolver hook. It does not verify a session. **Do not expose these routes publicly until
  that resolver is wired to the real session.**

## TODOs, in the order they matter

1. Wire `resolveAccountId` in `createFetchHandler` to the real Aimtogro session. Nothing
   else should ship before this.
2. Replace each provider's `options.data` with the module's own query.
3. Confirm the module list and prices, and the employee tier prices.
4. Point `SupabaseStore` at the real project and run the migration.
5. Call `canPurchaseAdvisor()` from checkout, and call `evaluateAdvisorAccess()` from the
   module toggle so a downgrade opens the grace window immediately.
6. Register the cron for `runDailyRundowns` (hourly, fires per account local morning) and
   `runMemoryRefresh` (nightly).
7. Run one real model call per purpose and re-tune `maxBundleChars` and the output ceilings
   against actual token counts and real provider rates.
8. Mount the panel into the real dashboard and delete `aimtogro/dashboard.html`, or keep it
   as the demo surface for sales calls.

## Known rough edges

- `decayStaleFacts` writes through `upsertMemory`, which refreshes `updated_at`. So a fact
  decays one step per stale period rather than continuously. Acceptable, and the alternative
  is a dedicated column.
- The pitch composer picks a client's first name with a regex over the item title. Fine for
  the demo writer; the real model reads the whole bundle and does better.
- `advisor_usage` counts rows rather than incrementing a counter. At 300 asks a month per
  account this is nothing, and it keeps a full audit trail. Revisit if an employee tier ever
  pushes an account into the tens of thousands.
- The soft ceiling and hard stop copy interpolate `{used}` and `{pool}`. Adding a new
  placeholder to the copy in config without adding it to the values bag renders the literal
  token. Deliberate, so a typo is visible rather than silent.

---

## Verification

```
node --test advisor/test/*.test.js
# tests 73   pass 73   fail 0
```

Covers: memory forming from all three paths, dedupe and decay, the outcome loop changing
ranking, retrieval relevance and budget, disabled modules never being queried, a broken
module not propagating, both gates and every access state, memory surviving suspension, the
cap including the daily rundown and blocking at the pool, a failed model call not costing an
ask, all six reasoning functions against the seeded account, human and AI tool paths
producing identical answers, the HTTP surface mapping gate and cap to real statuses, the
scheduled jobs, and the Supabase adapter's query shapes against a fake fetch.

Browser verified in headless Chromium: ACTIVE and LOCKED states render, the ask box returns
a grounded answer, the "did you do it" control writes an outcome, and toggling a module
moves the account between states live.

---

## Summary: done, stubbed, needs Dillon

**Done.** Memory layer (schema, adapters, seeding, rules, decay, outcome loop). Retrieval
with a hard budget. All six reasoning functions plus four supporting ones, every one of them
also an AI tool on the same code path. The `getAdvisorContext` contract and all eight module
providers. Both gates with grace and suspension that never deletes memory. The cap, soft
ceiling, upsell and margin calculator. The advisor panel mounted into a dashboard, in both
visible states, with the feedback control feeding `advice_outcomes`. 73 passing tests and a
seeded demo account that can be clicked through right now with no key and no database.

**Stubbed.** Module data sources (contract is real, queries are not). The live Anthropic call
(written, unexercised). Checkout wiring. Cron registration. Session authentication on the
HTTP routes.

**Needs Dillon.** Confirm the real module list and prices. Confirm the 1/3/7 employee tier
prices. Confirm the Supabase JWT claim shape for the RLS helper. Point it at the real project
and run the migration. Decide whether `aimtogro/dashboard.html` stays as a sales demo or gets
deleted once the real dashboard mounts the panel. And before anything is exposed publicly,
wire session authentication into `resolveAccountId`.
