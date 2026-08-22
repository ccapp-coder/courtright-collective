# Stripe setup

Everything needed to put the small-ticket library into Stripe. One command.

## What is here

| File | What it is |
| --- | --- |
| `catalog.json` | All 21 paid products and 9 bundles. Names, prices in cents, descriptions, category, and the folder each one ships from |
| `create_stripe_catalog.py` | Creates a Product and a one-time Price for each item, and optionally a shareable Payment Link |
| `stripe-results.json` | Written after a real run. Product ids, price ids, and payment link URLs |

The two free tools (eBay calculator, QR menu) are deliberately not in here. They are lead magnets, not products.

## Running it

Get a secret key from the Stripe dashboard, Developers, API keys. **Start with the test key.**

```bash
cd small-ticket-products/stripe
export STRIPE_SECRET_KEY=sk_test_...

python3 create_stripe_catalog.py --dry-run --bundles --payment-links   # look first
python3 create_stripe_catalog.py --bundles --payment-links             # do it
```

Check it in the Stripe test dashboard. When it looks right, swap in the live key and run it again. The script will ask you to type `live` before touching anything in live mode.

Needs nothing but Python 3. No pip installs, no Stripe CLI.

## Options

| Flag | What it does |
| --- | --- |
| `--dry-run` | Prints the plan, creates nothing |
| `--payment-links` | Also creates a shareable checkout link per item |
| `--bundles` | Includes the 9 bundles. Off by default |
| `--only <slug>` | One item, for testing |
| `--site <url>` | Base URL for each product's `url` field. Defaults to `https://courtrightco.com/products` |

## Running it twice is safe

- **Products** use deterministic ids (`cc_aso_cheat_sheet`), so a second run finds the existing one
- **Prices** use lookup keys (`cc_aso_cheat_sheet_price`), same idea
- **Payment links** are matched by the `slug` in their metadata
- Every write also sends an idempotency key

So re-running after a failure picks up where it stopped instead of making duplicates.

## Changing a price later

Stripe prices are immutable. To change one:

1. Edit `unit_amount` in `catalog.json`
2. Change that item's `lookup_key` by bumping the `stripe_id`, for example `cc_aso_cheat_sheet_v2`
3. Re-run the script
4. Archive the old price in the dashboard

## After the products exist

Three things left, and none of them are code:

1. **Fulfillment.** Stripe takes the money, it does not deliver the file. Either use Stripe's webhook to send the download, or use a Payment Link with a redirect to a delivery page. For a library this size, a service like Gumroad or Lemon Squeezy handles checkout and delivery together and may be less work than wiring this up.
2. **Tax.** Turn on Stripe Tax if you are selling digital goods across state lines. It matters more than people expect for downloads.
3. **The services are not instant deliverables.** The six service items (teardown, audits, calls, demo, challenge) should collect an email and any intake details at checkout. Payment Links support custom fields for that.

## A note on the number

21 paid products, 9 bundles. If somebody bought one of everything it would come to $1,233. That is not a forecast, it is a sanity check that the prices in `catalog.json` match the prices in `INDEX.md`.
