# The Indie App Starter Kit

| | |
| --- | --- |
| **Product name** | The Indie App Starter Kit |
| **Price** | $79 |
| **Format** | A real, runnable app scaffold (HTML, CSS, JS, service worker, PWA manifest, icons, Cloudflare Pages Function) plus four docs and a branded PDF |
| **Files** | `starter/` (11 files + 4 icons), `docs/01` through `04`, `README.md`, `README.pdf` |
| **Feeds into** | Application Creation and the partnership program at partner.courtrightco.com. Highest-value front-end product in the library. Somebody who buys a starter kit is actively trying to build an app, and roughly a third of them eventually decide they would rather pay to have it built properly. |
| **Delivery** | Instant download, one zip |

## Sales blurb

**The first forty hours of every project get burned on the same setup work. That is exactly where solo projects die.**

Router. State that survives a refresh. Dark mode. Onboarding. Empty states. A confirm dialog that is not `window.confirm`. Toasts. Offline handling. A service worker that does not serve stale files. A manifest. Icons at four sizes including the maskable one Android needs. Security headers. A deploy config.

None of that is your app. All of it has to exist before your app can ship.

This is hour forty, already done.

**Zero dependencies. Zero build step. No `npm install`, no bundler, no framework version to keep up with.** Open it through a local server and it runs. Everything works, right now, today.

**What is in it:**

- **`app.js`, about 400 lines,** in eight numbered sections you can read top to bottom in fifteen minutes. Config, store, analytics, UI helpers, theme, views, router, boot.
- **A persistent store** with merge-on-load and a migration hook, so adding a field in version 1.2 does not break the users who have been with you since 1.0.
- **A complete feature in miniature.** The items view demonstrates the full pattern: form, store update, render, event delegation, confirm-before-destroy, derived stats, designed empty state, everything surviving a reload. Copy the shape, change the content.
- **Real dark mode** that only redefines tokens, so nothing else in the CSS knows dark mode exists.
- **A service worker** with the right strategy per request type, and a loud warning about the one line you must bump on every deploy.
- **A working Cloudflare Pages Function** with input validation, so you have a real serverless endpoint pattern to copy.
- **Four docs.** Architecture (how it fits and why each call was made), Customize (make it yours in an hour), Deploy (live on your domain, free, in ten minutes), and a 60-point Launch Checklist.

**And it tells you what it deliberately leaves out.** No auth, no database, no payments, no tests, no TypeScript. Every one of those is an omission on purpose, and the README says why. Adding them before you need them is the most common way an indie project runs out of momentum.

**$79. Deploys free. Ship something this weekend.**

> Why no framework? Not ideology. A solo v1 rarely has state complex enough to need one, and a framework adds a build step, a dependency tree, and a version treadmill. When your app outgrows this you will know, and porting a working app is far easier than finishing a half-built one.

## Notes and assumptions

- Priced at $79, the top of the library. It is by far the largest deliverable and the buyer is a developer, who prices their own time high enough that $79 for forty hours is not a decision.
- **Ambiguity call, noted as instructed.** "Indie App Starter Kit" could have meant a native iOS/SwiftUI scaffold or a web scaffold. Built as a web PWA scaffold for three reasons: it is verifiable (the whole thing was run in a browser and driven through every flow before shipping, and one real bug got caught and fixed that way), it deploys free on Cloudflare Pages which is the studio's own stack, and it works for both web apps and installable mobile apps from one codebase. A SwiftUI companion kit is the obvious second version if this one sells.
- **Every file was tested, not just written.** Onboarding, routing, add/toggle/delete, the confirm modal, persistence across reload, theme persistence, and service worker registration were all driven in a real browser. Zero console errors on a fresh load.
- Placeholder icons are generated at real sizes so the app installs correctly out of the box. The docs still tell buyers to replace them, and say why the icon is the most-seen piece of design in the app.
- License is deliberately permissive: use it commercially, no attribution, just do not resell the kit itself as a starter kit.
- Best upsell path: Starter Kit, then the "Ship Your First App in 30 Days" challenge, then Application Creation or the partnership program.
- Good bundle partner: Launch Playbook and ASO Cheat Sheet. Call it "The Ship It Bundle" at $109.
