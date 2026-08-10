# eBay Repricing Calculator

| | |
| --- | --- |
| **Product name** | eBay Repricing Calculator |
| **Price** | **Free.** This is a lead magnet, not a product |
| **Format** | Single self-contained HTML file. Inline CSS and JS, fonts embedded as base64, zero dependencies, zero network calls |
| **Files** | `ebay-repricing-calculator.html` |
| **Feeds into** | Business Reports, Asset Tracking, Financial Trackers, and Email Automation. Resellers are one of the best small business segments for automation work: high transaction volume, thin margins, and every one of them is tracking inventory in a notebook or a spreadsheet held together with hope. |
| **Delivery** | Deploy to Cloudflare Pages. Drag the file into a Pages project, or put it at `courtrightco.com/tools/ebay-calculator`. Takes about two minutes |

## Sales blurb

**You are guessing. Everyone selling on eBay is guessing.**

You know roughly what you paid and roughly what fees run, so you price it at whatever feels about right and hope. Then somebody undercuts you by three dollars and you match them without doing the math, because doing the math means opening a calculator and remembering what the final value fee actually is.

Three modes, one screen, instant answers.

- **What do I actually make?** Type your price. See what you keep after every fee and cost, with the margin, the ROI, and exactly where your break-even sits.
- **What should I charge?** Type the profit you want, or the margin you want, and it solves backwards for the listing price.
- **Can I match this price?** Type a competitor's price and your minimum acceptable profit. It tells you yes or no, and how much room you actually have.

Plus a **price ladder** showing profit at eight price points around yours, so you can see how fast your profit falls off as you drop. That slope is the number that matters in a price war, and it is almost always steeper than it feels.

**It also tells you the truth.** Under 10 percent margin gets flagged as thin, with a note that one return or one shipping surprise wipes out several sales. And if matching a competitor puts you under your own floor, it says so plainly: racing them to the bottom is not a strategy, it is a countdown.

**Free. No signup. Nothing you type leaves your browser.** One HTML file that works offline, and you can save it to your desktop if you want.

## Notes and assumptions

- **This is a free tool and should stay free.** Its job is traffic and email addresses, not revenue. Reseller communities share tools like this constantly, and it is the single most linkable thing in the whole library.
- **Fee defaults are 13.25% plus $0.30, which is a common eBay final value fee configuration, not a universal one.** Rates vary by category, store level, and account standing. The tool makes every fee field editable and includes an expandable note telling sellers to pull the real rate off one of their own recent orders (total fees divided by order total). That is honest, and it makes the tool more accurate than a hardcoded competitor.
- **Fees are calculated on the full amount the buyer pays, item plus shipping,** which is how eBay bills it. Sales tax handling is deliberately left out because eBay collects and remits marketplace facilitator tax in most US states and it muddies the model without changing the seller's decision.
- **Math was verified by hand** against every mode: profit, break-even, target profit, target margin, and the loss case. All correct to the cent.
- Includes a clear "not affiliated with eBay Inc." line in the footer. Worth keeping.
- **Conversion path:** the footer CTA does not pitch a product, it names the reseller's actual next problem (listing, tracking, reorder points, reports they keep meaning to build) and points at courtrightco.com. If an email capture gets added later, the natural trade is a saved-scenarios feature or a printable margin sheet.
- Deploying at a clean URL like `courtrightco.com/tools/ebay-calculator` matters for SEO. "ebay fee calculator" is a high-volume search term with mostly ugly, ad-covered results.
