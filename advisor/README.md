# advisor/

The Aimtogro AI Advisor service: the account memory layer, the retrieval step, and the shared
reasoning functions behind the account's first AI employee.

Zero npm dependencies. Plain ESM. Runs unchanged in Node, in a Cloudflare Worker, and in the
browser.

Read [MEMORY.md](../MEMORY.md) for the memory schema and the retrieval contract,
[ADVISOR.md](../ADVISOR.md) for the reasoning functions and how both interfaces reach them,
and [BUILD-NOTES.md](../BUILD-NOTES.md) for what is real, what is stubbed and what needs a
decision.

## Try it

```bash
node --test advisor/test/*.test.js   # 73 tests, no network, no database, no API key
node advisor/dev/server.js           # then open http://localhost:8787/aimtogro/dashboard.html
node advisor/dev/margin.js           # margin table for the numbers currently in config
```

## Layout

```
config/                      cap numbers, price, model choice, module catalog. Never hardcoded.
supabase/migrations/         the memory schema with row level security

advisor/src/
  advisor.js                 the six shared reasoning functions, one spine, six steps
  memory/
    store.js                 the store contract every adapter implements
    inMemoryStore.js         tests, demo, browser preview
    supabaseStore.js         production, PostgREST over fetch
    onboarding.js            questionnaire seeding, path one of three
    factRules.js             rules watching module data, path two
    outcomes.js              the feedback loop, path three
  context/
    buildAdvisorContext.js   retrieval. The margin lever.
  modules/
    registry.js              the getAdvisorContext contract and its enforcement
    providers/               one file per module, eight of them
  reasoning/
    modelClient.js           the only place tokens are spent
    prompts.js               system prompt and per purpose task lines
    rank.js                  deterministic scoring, free and stable
    stubComposer.js          zero token fallback writer
  gate/gate.js               the billing gate and the runtime gate
  usage/cap.js               advisory moments, soft ceiling, hard stop
  usage/margin.js            illustrative cost reporting
  tools/toolDefinitions.js   the same functions, exposed as AI tools
  http/router.js             one HTTP surface for both interfaces
  schedule/                  the daily rundown job and the nightly memory refresh
  demo/seed.js               the seeded demo account

aimtogro/
  advisor/advisor-panel.js   the panel that mounts into the dashboard
  advisor/transports.js      http transport and the in browser demo transport
  dashboard.html             a dashboard shell showing the panel in both states
```

## The three rules this code is built around

1. **Never fine-tune per account.** Memory plus retrieval only.
2. **Keep retrieval bundles tight.** That is the margin, and it lives in one config block.
3. **One capability, two interfaces.** Every function the UI calls is the same function an
   AI employee calls. `test/interfaces.test.js` fails if that drifts.
