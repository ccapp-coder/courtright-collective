# Architecture

Read this once and you will know where everything is.

## The whole picture

```
index.html   The shell. Never re-rendered. Topbar, tabbar, modal,
             toast, onboarding, and one empty <main id="view">.

app.js       Everything else, in eight numbered sections:
               1. CONFIG        what you change
               2. Store         state + localStorage + subscribers
               3. track()       analytics stub
               4. UI helpers    $, esc, toast, confirmDialog
               5. Theme         auto / light / dark
               6. Views         one function per screen
               7. Router        hash based
               8. boot()        wires it all up

app.css      Tokens at the top. Everything below reads from them.

sw.js        Offline. Precache the shell, network-first for pages.
```

## Data flow

```
    user does something
            │
            ▼
    event handler in a view's mount()
            │
            ▼
    Store.set({ ...patch })
            │
            ├──► saves to localStorage
            └──► notifies subscribers
            │
            ▼
    render() rebuilds the current view
```

There is no virtual DOM and no reactivity system. A change means you call `render()`. For an app this size, rebuilding one screen's innerHTML is instant, and the mental model is one thing instead of five.

**The one rule:** never mutate `Store.state` directly. Always `Store.set({...})`. Direct mutation skips the save and the notify, and you get a bug that only appears after a refresh, which is the worst kind.

## The Store

```js
Store.state        // the whole app state, one plain object
Store.load()       // read from localStorage, merged over defaults
Store.set(patch)   // merge, save, notify
Store.subscribe(fn)// returns an unsubscribe function
Store.reset()      // back to defaults
```

**Why it merges over defaults on load.** When you add a new field in version 1.2, existing users have a saved state without it. Merging means the new field arrives with its default instead of `undefined`, which would break the first render for exactly the users who have been with you longest.

**The migrate hook.** When you change the *shape* of existing data (rename a field, restructure an array), add a case to `Store.migrate()` and bump `DEFAULT_STATE.version`. Migrations run once per user on load. Write them defensively, because you cannot test against a user's real saved data.

**When to leave localStorage.** Move to IndexedDB when you are storing images or binary data, when you have more than a few thousand records, or when you approach the ~5MB per-origin cap. Keep the same `Store` interface and every view keeps working unchanged.

## Views

A view is a function returning `{ title, html, mount? }`.

```js
'/thing': () => ({
  title: 'Thing',
  html: `<h1 class="page-title">Thing</h1>`,
  mount() {
    // runs after html is in the DOM. Wire your events here.
  },
})
```

Add a route by adding a key to `Views` and a link with `href="#/thing"`. That is the whole router API.

**Always escape user content** with `esc()` before putting it in a template string. `app.js` does this for every item title. Skipping it is an XSS bug, even in an app with a single local user, because your own imported or pasted data can carry markup.

## Events

The app shell uses one delegated listener on `document` for `[data-action]` buttons. Views wire their own listeners in `mount()`.

Because `render()` replaces the view's innerHTML, listeners attached to elements inside it are discarded automatically. No cleanup needed, no leaks. That is the main reason this pattern stays simple as the app grows.

For lists, attach one listener to the container and use `e.target.closest('[data-thing]')`. Never one listener per row.

## CSS

Token-driven. The `:root` block at the top of `app.css` holds every color, radius, shadow, and font. Nothing below it hardcodes a color.

Dark mode redefines only the tokens, in two places: `[data-theme="dark"]` for an explicit choice, and a `prefers-color-scheme` block under `[data-theme="auto"]` for following the device. Nothing else in the file knows dark mode exists.

**If you add a color, add it as a token.** The first hardcoded hex is how a theme starts to rot.

## The service worker

The critical line is `CACHE_VERSION` in `sw.js`. **Bump it on every deploy.** If you do not, returning users keep the old cached assets and will swear your fix did not ship.

Strategy by request type:

| Request | Strategy | Why |
| --- | --- | --- |
| Navigation | Network first, cache fallback | Never serve a stale shell after a deploy |
| `/api/*` | Not cached at all | Stale data is worse than no data |
| Everything else | Cache first | Static assets, versioned by cache name |

**Local development tip:** open DevTools, Application, Service Workers, and tick "Update on reload." Without it you will spend an hour convinced your CSS change did not save.

## The Pages Function

`functions/api/track.js` is a real Cloudflare Pages Function. Drop a file into `functions/` and its path becomes a route. `functions/api/track.js` serves `/api/track`. No config, no build, no server.

It exports a single `onRequest` that handles method checking, so a GET returns a clear 405 instead of a mystery. It validates its input before doing anything, which is the habit worth keeping when the endpoint does something real.

## Where to add things

| You want to add | Put it here |
| --- | --- |
| A new screen | A key in `Views`, a link with `href="#/thing"` |
| A new setting | A field in `DEFAULT_STATE`, a row in the settings view |
| A new stored field | `DEFAULT_STATE`, plus a `migrate()` case if it changes shape |
| A color | A token in `:root`, then the dark override |
| A backend call | A new file in `functions/api/`, fetched from a view |
| A feature you are unsure about | A flag in `CONFIG.features` |
| A third-party script | Think hard first. It is the one thing that can break everything else |
