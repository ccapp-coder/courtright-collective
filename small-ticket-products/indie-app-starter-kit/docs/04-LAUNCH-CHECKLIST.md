# Launch checklist

Print it. Work down it. Nothing here takes long, and every one of them is something somebody has shipped without and regretted.

## Identity

- [ ] App renamed everywhere (`index.html`, `app.js`, `manifest.webmanifest`, `sw.js`)
- [ ] `CONFIG.storageKey` changed from `starter.v1`
- [ ] Brand mark letter changed in the topbar and onboarding
- [ ] `icon-192.png` replaced
- [ ] `icon-512.png` replaced
- [ ] `icon-maskable-512.png` replaced, art inside the center 80 percent
- [ ] `og.png` replaced
- [ ] Favicon looks right in a browser tab

## Content

- [ ] `<title>` written for humans and for search results
- [ ] Meta description written, under 160 characters
- [ ] Open Graph title, description, and image set
- [ ] Onboarding copy written, one sentence plus three points
- [ ] Empty states written, every single one
- [ ] Error messages say what to do, not just what broke
- [ ] Button labels say what happens, not "Submit"
- [ ] Nothing anywhere still says "Starter" or "Lorem"

## Function

- [ ] Core loop works start to finish on a real phone
- [ ] Data survives a reload
- [ ] Data survives closing and reopening the tab
- [ ] Reset actually resets
- [ ] Export produces a valid file that opens
- [ ] Every destructive action is behind a confirm
- [ ] Forms handle empty input without breaking
- [ ] Long text does not break any layout (paste 200 characters and see)
- [ ] Rapid tapping does not create duplicates
- [ ] Back button behaves sensibly

## Offline and install

- [ ] Service worker registers without errors
- [ ] App opens with the network disabled
- [ ] Offline banner appears when offline and disappears when back
- [ ] `CACHE_VERSION` bumped for this release
- [ ] Installs to the home screen on iOS
- [ ] Installs to the home screen on Android
- [ ] Opens standalone, without browser chrome
- [ ] Icon on the home screen is not squashed, cropped wrong, or blurry

## Looks

- [ ] Light mode checked
- [ ] Dark mode checked
- [ ] Auto mode follows the device setting
- [ ] Tested at 320px wide (the smallest phone still in use)
- [ ] Tested at tablet width
- [ ] Tested at desktop width
- [ ] Nothing overflows horizontally, anywhere
- [ ] Safe area respected on a notched phone (nothing under the home indicator)
- [ ] Tap targets at least 44 by 44 points

## Accessibility

- [ ] Every interactive element reachable by keyboard
- [ ] Focus is visible on every one of them
- [ ] Largest system text size does not break any layout
- [ ] Contrast passes 4.5:1 for text, both themes
- [ ] Images and icon buttons have labels
- [ ] `prefers-reduced-motion` respected
- [ ] Nothing communicates meaning with color alone

## Performance

- [ ] First load under 2 seconds on a slow connection
- [ ] No console errors on a fresh load
- [ ] No console warnings you have not read and decided to ignore
- [ ] Images sized correctly, not scaled down in CSS
- [ ] Nothing loaded from a third-party CDN that you could self-host

## Privacy and legal

- [ ] Privacy policy written and linked, even if it says "we collect nothing"
- [ ] If you collect anything at all, it is named specifically
- [ ] No analytics firing before you have said you use analytics
- [ ] No IP addresses or user agents logged unless you genuinely need them
- [ ] Terms of service, if you have accounts or payments
- [ ] Support email exists and somebody watches it

## Launch day

- [ ] Deployed and live on the real domain
- [ ] HTTPS working, no mixed content warnings
- [ ] Opened the live URL on a real phone
- [ ] Share preview checked by pasting the link into a chat
- [ ] Landing page or app page live with a working link
- [ ] Announcement written for every place you will post
- [ ] Five social posts drafted in advance
- [ ] Personal messages sent to the people who asked to know
- [ ] A way to collect feedback that is not just your inbox

## The week after

- [ ] Analytics checked, are the three events firing
- [ ] Every piece of feedback replied to
- [ ] One small update shipped, however small
- [ ] Three things that went wrong, written down
- [ ] One thing that went better than expected, written down too

---

**The one to not skip:** open it on a real phone, on cellular, as a first-time visitor with no storage. That single test catches more problems than every other line on this list.
