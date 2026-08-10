<!--pdf
title: The Email Signature Pack
subtitle: Seven signatures that do not break in Outlook, plus a builder that fills them in for you. No images, no subscriptions, no broken red X.
kicker: Courtright Collective
brand: courtright
badges: 7 Styles | Builder Tool | Gmail + Outlook + Apple
tag: Look Legit In Every Reply
-->

# The Email Signature Pack

## What you got

| File | What it is |
| --- | --- |
| `signature-builder.html` | **Start here.** Open it in any browser. Fill in your details, pick a style, click copy |
| `signatures/01-classic.html` | The Classic. Serif name, copper rule, all the basics |
| `signatures/02-minimal.html` | The Minimal. Two lines, for people who reply 60 times a day |
| `signatures/03-monogram.html` | The Monogram. Colored initials block instead of a logo image |
| `signatures/04-cta-button.html` | The Booking CTA. A real button that works in Outlook |
| `signatures/05-social.html` | The Social. Text-based social links that never break |
| `signatures/06-promo-banner.html` | The Promo Banner. A rotating announcement strip |
| `signatures/07-two-column.html` | The Two Column. For addresses, hours, license numbers |

**The builder is the easy path.** Double-click `signature-builder.html`, it opens in your browser, everything runs locally and nothing you type gets sent anywhere. The raw files are there for anyone who wants to hand-edit the HTML.

---

## Why these do not break

Email is not the web. Email clients run rendering engines from a decade ago, strip out anything they do not like, and block images by default. Which is why so many signatures show up as a broken red X, a wall of blue underlined text, or a giant photo of somebody's face at 400 pixels wide.

Every signature in this pack follows the rules that keep it intact:

- **Tables for layout, not divs.** Outlook on Windows renders email with the Microsoft Word engine. Word does not do flexbox. It does tables.
- **Inline styles only.** No `<style>` blocks and no classes. Gmail strips those.
- **Zero images.** No logo files, no social icons, no headshots. Images need hosting, they break when the host goes down, and roughly half of email blocks remote images by default. The monogram block, the CTA button, and the social pills are all built from colored table cells instead.
- **Web-safe fonts.** Georgia and Helvetica or Arial. Custom fonts do not load in email, and when they fail they fail ugly.
- **Bulletproof buttons.** The CTA button is a background-colored table cell with a padded link inside it. That renders everywhere, including Outlook.
- **No background images, no CSS gradients, no border-radius dependence.** Where a rounded corner does not render, the shape just squares off and still looks fine.
- **Tel and mailto links** so a tap on a phone actually dials.

---

## Installing it

### Gmail

1. Open the builder, fill it in, click **Copy signature**
2. Gmail, gear icon, then **See all settings**
3. Scroll down to **Signature**, then **Create new**
4. Click into the signature box and paste
5. Under **Signature defaults**, set it for new emails and for replies
6. Scroll all the way down and click **Save Changes**. This is the step everybody misses

### Outlook (new Outlook and Outlook on the web)

1. Copy the signature from the builder
2. **Settings**, then **Mail**, then **Compose and reply**
3. Paste into the signature box
4. Select it for new messages and for replies and forwards
5. **Save**

### Outlook (classic desktop, Windows)

1. Copy the signature from the builder
2. **File**, **Options**, **Mail**, **Signatures**
3. **New**, name it, then paste into the edit box
4. Set the defaults for new messages and replies
5. **OK**

### Apple Mail

1. Copy the signature from the builder
2. **Mail**, **Settings**, **Signatures**
3. Pick the account on the left, click **+**
4. **Uncheck "Always match my default message font."** This one matters, if you skip it Apple Mail flattens your formatting
5. Paste into the box on the right

### iPhone and iPad

The Mail app on iOS only supports plain text signatures in Settings. Two options:

- Keep a short plain text version on mobile: name, title, phone, website. That is normal and nobody minds.
- Or paste the rich signature into a note, copy it from there, and paste it into Settings, Mail, Signature. It sometimes holds the formatting, depending on the iOS version. Not reliable enough to promise.

### If it pastes as plain text

Some browsers block rich clipboard access. Do this instead:

1. In the builder, click **Show HTML** and copy the code
2. Paste it into a text editor and save it as `signature.html`
3. Open that file in Chrome or Safari
4. Select all on the page, then copy
5. Paste into your mail client. The formatting comes with it

---

## Editing the raw files

Every file in `signatures/` uses `[BRACKETS]` for anything you need to change.

1. Open the file in a text editor. Not Word. TextEdit in plain text mode, Notepad, VS Code, anything
2. Replace every bracket with your real details
3. Delete any line you do not want. Whole `<tr>` rows come out cleanly
4. Save, open the file in a browser, select all, copy, paste into your mail client

**One gotcha.** `[PHONE-DIGITS-ONLY]` in a `tel:` link means digits and nothing else. `6155550142`, not `(615) 555-0142`. Phones will not dial a link with parentheses in it.

---

## The rules for a signature that does its job

1. **Four lines maximum on the identity block.** Name, title and company, phone and email, website. Anything past that gets skipped.
2. **One link that matters.** If everything is a link, nothing is. Pick the one you want clicked and make it the only bold copper one.
3. **No headshot.** People are not looking at your face on the eleventh reply. It also doubles your file size and breaks when images are off.
4. **No quotes.** No inspirational quote, no "sent from my iPhone" replacement joke, no environmental guilt line about whether to print this email.
5. **No social icons as images.** Words. Always words. See the reason above.
6. **Test it by emailing yourself,** then open it on your phone. That is the only test that counts.
7. **If you have a CTA, make it one CTA.** A booking link or a promo banner. Not both. Two asks is zero asks.

---

## Changing the colors

Every color in these files is a hex code sitting right there in the markup. Find and replace to make them yours.

| What | Default | Where it shows up |
| --- | --- | --- |
| Ink | `#0E1520` | Name, body text |
| Copper | `#C45C28` | Accent rule, links, button, monogram block |
| Gold | `#D9A030` | Secondary rule, banner edge |
| Smoke | `#7A7268` | Muted secondary text |
| Parchment | `#F4EBD9` | Text on dark backgrounds |

Two accent colors, maximum. Three looks like a carnival, and a carnival at the bottom of every email you send gets old fast.

**courtrightco.com**
