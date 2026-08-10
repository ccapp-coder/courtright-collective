# Make it yours

About an hour, start to finish. Do them in this order.

## 1. Rename it (5 minutes)

Search the whole project for `Starter` and replace it with your app name. It appears in:

| File | Where |
| --- | --- |
| `index.html` | `<title>`, meta description, og tags, apple-mobile-web-app-title, brand name, onboarding heading |
| `app.js` | `CONFIG.name` |
| `manifest.webmanifest` | `name`, `short_name`, `description` |
| `sw.js` | `CACHE_VERSION` |
| `docs/` | Wherever you care |

Then change `CONFIG.storageKey` in `app.js` from `starter.v1` to `yourapp.v1`. If you skip this and test two apps from the same starter on the same local server, they will share storage and you will lose an hour to a bug that does not exist.

Change the brand mark letter too: the `S` in the `.brand-mark` span in `index.html`, and the one in `.onboarding-card .mark`.

## 2. Change three colors (5 minutes)

Open `app.css`, top of the file:

```css
--accent:#C45C28;    /* your primary. Buttons, links, active states */
--accent-2:#D9A030;  /* your secondary. Gradients, highlights */
--bg:#FAF6EF;        /* page background */
```

Then the dark equivalents in the `[data-theme="dark"]` block and the `prefers-color-scheme` block. Six values total.

**Picking two that work together:** stay within about 60 degrees of each other on the color wheel, or go fully complementary and commit. Anything in between looks like an accident. If in doubt, pick one color you like and use a lighter, warmer version of it as the second.

**Check contrast.** Your `--accent` needs at least 4.5:1 against `--bg` for text, 3:1 for large text and UI elements. There are free contrast checkers everywhere. Fail this and your app is unusable outdoors, which is where phones live.

## 3. Replace the icons (15 minutes)

You need three PNGs in `icons/`:

| File | Size | Notes |
| --- | --- | --- |
| `icon-192.png` | 192x192 | Home screen |
| `icon-512.png` | 512x512 | Splash and install prompt |
| `icon-maskable-512.png` | 512x512 | Android adaptive. **Keep all art inside the center 80 percent**, Android crops the rest into a circle or squircle |
| `og.png` | 1200x630 | Social preview when someone shares your link |

The included placeholders are valid PNGs at the correct sizes, so the app installs correctly before you replace them. Replace them anyway. The icon is the single most-seen piece of design in your entire app.

**Icon rules that hold up:**

- One shape or one letter. Not your whole logo, not a word
- It has to read at 40 pixels. Design it small, then scale up
- High contrast against both light and dark home screens
- No transparency for iOS. Fill the whole square, the OS rounds the corners
- No thin lines, they disappear at small sizes

## 4. Write your onboarding (10 minutes)

Open `index.html` and find `.onboarding-card`. Three lines and three points.

**What works:** one sentence on what the app does, three points on what makes it different, one button. Nobody reads onboarding. They tap through it and then judge your empty state.

**What does not work:** a five-screen carousel, a feature tour before they have seen the app, a request for permissions on screen one.

## 5. Build your feature (the rest of the hour, and then some)

Delete the `/list` view and write yours. Before you delete it, read it once. It is a complete feature in miniature:

- A form that adds to the store
- A list that renders from state
- One delegated click listener for the whole list
- A destructive action behind a confirm dialog
- Stats derived from state rather than stored separately
- An empty state that is designed, not an afterthought
- Everything persisting across a reload

Copy that shape. Change the content.

**Derive, do not duplicate.** Notice that "how many are open" is computed at render time rather than stored. Every number you store separately is a number that can get out of sync with reality. Store the minimum, compute the rest.

## 6. Settings, ruthlessly (5 minutes)

Ship with three settings. The starter has sound, theme, and data. Add a fourth when a real person asks for it, not before.

Every setting is a branch in your code, a thing to test, and a decision you are handing to a user who did not ask for it.

## 7. Analytics, three events (10 minutes)

In `app.js`, set `CONFIG.features.analytics = true` and point `analyticsEndpoint` at your real destination.

**The only three events that matter for a v1:**

1. `app_opened`, did anyone show up
2. Your activation event, whatever "they got the point" means in your app. In the starter it is `item_created`
3. Your retention signal, did they come back on another day

Thirty events tell you nothing because you will never look at them. Three tell you whether you have a product.

## 8. Meta tags and social (5 minutes)

In `index.html`:

- `<title>` and `<meta name="description">`, these are what people see in search results
- `og:title`, `og:description`, `og:image`, these are what people see when your link is shared
- `theme-color`, tints the browser chrome on mobile

Test the share preview by pasting your URL into a group chat. That is the real test and it takes ten seconds.

## 9. The things people forget

- [ ] `CONFIG.storageKey` changed from the default
- [ ] `CACHE_VERSION` in `sw.js` bumped before every deploy
- [ ] Icons replaced, including the maskable one
- [ ] `og.png` replaced, it is the thing people see before they click
- [ ] Contrast checked in both light and dark
- [ ] Tested at the largest system text size
- [ ] Tested with the network off, does it still open
- [ ] Tested on a real phone, not just a narrow browser window

That last one is not optional. The simulator lies about touch targets, scroll behavior, and how big your text really is.
