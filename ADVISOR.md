# ADVISOR.md

The reasoning layer of the Aimtogro AI Advisor: what each function does, its AI tool
signature, and how the human UI and an AI employee both reach it.

The advisor is the account's first AI employee. It is horizontal: it reads the shared client
database and every module the customer owns, and it advises the owner like a smart, loyal
employee who has studied the business.

---

## The architecture rule that governs this file

**One capability, two interfaces.** Every reasoning function is an ordinary shared function
AND an exposed AI tool. There is no human only path and no AI only path. If you catch one,
move it into `advisor/src/advisor.js` and add it to
`advisor/src/tools/toolDefinitions.js`. `advisor/test/interfaces.test.js` fails the build if
the two lists drift apart.

---

## Shape of every reasoning moment

`createAdvisor({ store, dataSource, model, config })` returns the API below. Every function
runs the same six steps:

1. **Runtime gate.** At least one paid module enabled, or refuse with the state the UI needs.
2. **Cap check.** Is this moment included, billed, or blocked. Blocked costs nothing.
3. **Retrieval.** `buildAdvisorContext(account_id, purpose)` assembles the tight bundle.
4. **Reasoning.** The only step that spends tokens.
5. **Log.** `advice_log` with the context snapshot that produced it.
6. **Meter.** Record the moment, only after the reasoning succeeded. A failed call never
   costs the owner an ask.

Every function returns:

```js
{
  text,            // what the owner reads
  adviceLogId,     // hand this to recordAdviceOutcome
  purpose,
  access,          // gate state, so the UI can render a notice without a second call
  usage, notice,   // ask meter and the soft ceiling note if there is one
  billed,          // did this draw from the pool
  items,           // ranked opportunities behind the text, for click through
  meta             // provider, model, token usage, bundleChars, modules read
}
```

---

## The six functions

### 1. generateDailyRundown(account_id, options?)

A short prioritized brief: "here is your day, focus on these three things."

- Purpose: `daily_rundown`. Focus count from `config.rundown.focusItemCount`.
- **Included once per day** and never draws from the ask pool.
- Asking again the same day returns the SAME brief rather than reasoning twice. Pass
  `{ force: true }` to regenerate, which does spend an ask.
- Scheduled by `advisor/src/schedule/dailyRundownJob.js` on `config.rundown.scheduleCron`.

```json
{ "name": "generate_daily_rundown",
  "input_schema": { "account_id": "string", "force": "boolean?" } }
```

### 2. answerAdvisorAsk(account_id, question, options?)

The on-demand ask box. "Who is my lowest hanging fruit." "What should I pitch this client."
"How is this month going." The question drives keyword relevance inside retrieval, so a
pricing question pulls the pricing facts to the front of the bundle.

Spends one ask. Throws if the question is empty.

```json
{ "name": "answer_advisor_ask",
  "input_schema": { "account_id": "string", "question": "string" } }
```

### 3. findLowHangingFruit(account_id, options?)

Ranks the highest value, lowest effort actions available right now across every enabled
module. Effort is read deterministically from the action verb in
`advisor/src/reasoning/rank.js`, so "text Mike a time" is low and "rebuild the booking flow"
is high and gets filtered out. Spends one ask.

```json
{ "name": "find_low_hanging_fruit",
  "input_schema": { "account_id": "string", "limit": "integer?" } }
```

### 4. suggestPitch(account_id, client_id, options?)

What to offer this specific client next: the offer, why it fits them, what to charge from
the pricing on file, and a message the owner can send as is in their own voice. Retrieval
narrows observations to that client. Spends one ask.

```json
{ "name": "suggest_pitch",
  "input_schema": { "account_id": "string", "client_id": "string" } }
```

### 5. weeklyReview(account_id, options?)

Natural language state of the business: what moved, what slipped, where the money is stuck,
three moves for next week, measured against the goal on file. Spends one ask.

```json
{ "name": "weekly_review", "input_schema": { "account_id": "string" } }
```

### 6. recordAdviceOutcome(advice_log_id, taken, result, options?)

Closes the learning loop. Writes `advice_outcomes`, updates the
`preferences.acts_on_<kind>` fact, and keeps the owner's own words as an observation.

**Free. Never gated, never metered.** We want as much of this as we can get.

```json
{ "name": "record_advice_outcome",
  "input_schema": { "advice_log_id": "string", "taken": "boolean", "result": "string?" } }
```

### Supporting functions (also shared, also tools)

| function | what it does | cost |
| --- | --- | --- |
| `getAdvisorHome(account_id)` | everything the panel needs in one call: state, usage, today's rundown, module catalog, suggested asks | one included rundown at most |
| `getAccountSnapshot(account_id)` | raw `getAdvisorContext` from every enabled module, tool name `get_advisor_context` | free |
| `refreshMemory(account_id)` | nightly rule pass that grows memory | free |
| `getUsage(account_id)` | the ask meter, no side effects | free |

---

## The module contract

Each module exposes ONE standard read function so the advisor never needs bespoke code per
module:

```js
getAdvisorContext(account_id, options) -> {
  module, label, headline,
  metrics: { ... },      // what the owner would want summarized
  items:   [ { id, title, detail, valueUsd, urgency, subjectType, subjectId, action } ],
  signals: { ... }       // plain numbers the memory rules watch
}
```

Shipped providers, one per module in `config/modules.config.json`:

| # | module | returns |
| --- | --- | --- |
| 1 | crm | hot leads, overdue follow-ups, top clients |
| 2 | booking | upcoming, no-shows, overdue rebooks, open capacity |
| 3 | gated_content | churn risk, new members, converting content |
| 4 | progress | stalled clients, programs ending soon |
| 5 | field_capture | pending reports, unsigned sign-offs, blocked revenue |
| 6 | invoicing | overdue invoices, aging, quotes waiting |
| 7 | marketing | campaigns that produced bookings, list state |
| 8 | reviews | unanswered reviews, clients worth asking |

Rules the registry enforces (`advisor/src/modules/registry.js`):

- A module **registers** its provider when it is enabled on an account
  (`registerEnabledModules`).
- The advisor **never calls a provider for a disabled module**. Feature flags are respected
  at the registry, not deep in a query.
- Every snapshot is **trimmed** to `context.maxItemsPerModule` and `maxCharsPerItem` before
  it can reach a prompt. This is the token cost lever.
- A module that throws is logged into `moduleErrors` and skipped. One broken module never
  takes the advisor down.
- `getAdvisorContext` is a normal shared function and is also callable by AI employees.

Adding a ninth module is: a row in `config/modules.config.json`, a provider file, a line in
`advisor/src/modules/providers/index.js`. No advisor code changes.

---

## How it is called

### From the human UI

```js
import { mountAdvisorPanel } from '/aimtogro/advisor/advisor-panel.js';
import { createHttpTransport } from '/aimtogro/advisor/transports.js';

mountAdvisorPanel(
  document.querySelector('#advisor-home'),
  createHttpTransport({ accountId }),
);
```

The panel is the account home panel inside the Aimtogro dashboard: today's rundown up top,
the ask box under it, and a "did you do it" control on every piece of advice that feeds
`advice_outcomes`. It renders two visible states, LOCKED (a sales surface) and ACTIVE, plus
the grace and suspended notices. See `aimtogro/dashboard.html` for a working mount.

HTTP routes (`advisor/src/http/router.js`), all under `/api/advisor`:

```
GET  /home            POST /rundown        POST /ask
GET  /usage           POST /fruit          POST /pitch
GET  /snapshot        POST /weekly         POST /outcome
GET  /tools           POST /modules        POST /memory/refresh
POST /tool            <- the AI employee entry point
```

Statuses that matter: `403 advisor_gated` carries the access state to render,
`429 advisor_cap_reached` carries the upsell notice, `402 advisor_locked` is the billing
gate refusing a purchase.

### From an AI employee

```js
import { ADVISOR_TOOLS, dispatchAdvisorTool, toToolResult } from './advisor/src/tools/toolDefinitions.js';

// hand ADVISOR_TOOLS to the employee's model as its tool list, then:
const result = toToolResult(await dispatchAdvisorTool(advisor, toolName, toolInput));
```

Identical code path, identical answer, identical metering: an employee spends the account's
advisory moments exactly like the owner does. `toToolResult` keeps the payload small so an
employee's own context window survives.

---

## The gate

Enforced in two places (`advisor/src/gate/gate.js`):

1. **Billing gate.** `canPurchaseAdvisor()` at checkout. The advisor add-on cannot be
   purchased or enabled while the account has zero paid modules. The free filing cabinet
   does NOT unlock it. `activateAdvisor()` refuses with `advisor_locked`.
2. **Runtime gate.** `assertAdvisorAllowed()` at the top of every reasoning moment. An
   account that drops to zero modules is SUSPENDED, not deleted: it gets a
   `config.gate.graceDays` window where everything keeps working with a short note, then it
   pauses with a re-unlock prompt. **Memory is never deleted.** Turning any module back on
   restores it instantly, with everything it learned.

States the UI renders: `locked`, `available`, `active`, `grace`, `suspended`, `cancelled`.

Memory keeps forming while suspended. Only reasoning is gated, never learning.

---

## The cap

Measured in **advisory moments**, never in raw tokens. Owners see "212 of 300 asks this
month", which is a number a human can reason about.

- One daily rundown per day is included and never counted.
- A generous monthly pool of on-demand asks, 300 by default. A normal owner uses about 40.
- At 80 percent of the pool a gentle note appears offering the 1/3/7 AI Employee tiers. The
  cap doubles as the upsell path.
- At the pool the asks stop, the daily rundown keeps arriving.
- Everything lives in `config/advisor.config.json` under `cap`, overridable by env var.

Margin with the illustrative rates in config (`node advisor/dev/margin.js`):

```
scenario                          moments   token cost   price   margin
heavy (30 rundowns + 300 asks)    330       $4.90        $69     92.9%
typical (22 rundowns + 40 asks)   62        $0.92        $69     98.7%
```

Plug in the real provider rates. The shape barely moves, because the cost is bounded by
bundle size times moment count and we choose both numbers.

---

## Models

`config/advisor.config.json` under `model`. Provider, reasoning model, per purpose output
ceilings, temperature and the API key env var are all config, never hardcoded.

With no API key present the client falls back to `stub`: a deterministic writer
(`advisor/src/reasoning/stubComposer.js`) that composes from the same ranked bundle at zero
cost. That is what the tests, the seeded demo and the static preview run on, and it doubles
as the floor of the product if the provider is ever down.

---

## Running it

```bash
node --test advisor/test/*.test.js     # 65 tests, seeded demo account, no network
node advisor/dev/server.js             # dev server on :8787
open http://localhost:8787/aimtogro/dashboard.html
node advisor/dev/margin.js             # margin table for the current config
```
