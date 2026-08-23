#!/usr/bin/env python3
"""
Create the Courtright Collective small-ticket catalog in Stripe.

Creates one Product and one one-time Price for every item in catalog.json,
and optionally a shareable Payment Link for each.

Safe to run more than once. Products use deterministic ids and prices use
lookup keys, so a second run finds what already exists instead of creating
duplicates.

Usage:
    export STRIPE_SECRET_KEY=sk_test_...
    python3 create_stripe_catalog.py --dry-run          # show what would happen
    python3 create_stripe_catalog.py                    # create products + prices
    python3 create_stripe_catalog.py --payment-links    # also create checkout links
    python3 create_stripe_catalog.py --bundles          # include the 9 bundles
    python3 create_stripe_catalog.py --only founders-copy-bank

Requires nothing but Python 3. No pip installs.
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

API = "https://api.stripe.com/v1"
HERE = os.path.dirname(os.path.abspath(__file__))


def flatten(prefix, value, out):
    """Stripe wants form-encoded nested params: metadata[slug]=x"""
    if isinstance(value, dict):
        for k, v in value.items():
            flatten("%s[%s]" % (prefix, k) if prefix else k, v, out)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            flatten("%s[%d]" % (prefix, i), v, out)
    elif value is not None:
        out[prefix] = str(value)
    return out


def call(method, path, key, params=None, idempotency_key=None):
    url = API + path
    data = None
    if params:
        flat = flatten("", params, {})
        if method == "GET":
            url += "?" + urllib.parse.urlencode(flat)
        else:
            data = urllib.parse.urlencode(flat).encode()

    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", "Bearer " + key)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("Stripe-Version", "2024-06-20")
    if idempotency_key:
        req.add_header("Idempotency-Key", idempotency_key)

    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode()), None
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            err = json.loads(body).get("error", {})
        except Exception:
            err = {"message": body}
        return None, err


def ensure_product(key, item, site, dry):
    pid = item["stripe_id"]
    if dry:
        return {"id": pid, "_dry": True}, "would create"

    existing, err = call("GET", "/products/" + pid, key)
    if existing:
        return existing, "exists"

    params = {
        "id": pid,
        "name": item["name"],
        "description": item["description"],
        "metadata": {
            "slug": item["slug"],
            "category": item["category"],
            "kind": item.get("kind", "digital"),
            "library": "small-ticket-products",
        },
        "shippable": "false",
    }
    if item.get("folder"):
        params["metadata"]["folder"] = item["folder"]
    if item.get("contains"):
        params["metadata"]["contains"] = ",".join(item["contains"])
    if site:
        params["url"] = site.rstrip("/") + "/" + item["slug"]

    created, err = call("POST", "/products", key, params, idempotency_key="prod-" + pid)
    if err:
        return None, "ERROR: " + err.get("message", "unknown")
    return created, "created"


def ensure_price(key, item, product_id, currency, dry):
    lookup = item["stripe_id"] + "_price"
    if dry:
        return {"id": "price_dry_" + item["slug"], "_dry": True}, "would create"

    found, err = call("GET", "/prices", key, {"lookup_keys": [lookup], "limit": 1})
    if found and found.get("data"):
        return found["data"][0], "exists"

    params = {
        "product": product_id,
        "unit_amount": item["unit_amount"],
        "currency": currency,
        "lookup_key": lookup,
        "nickname": item["name"] + " (one-time)",
        "metadata": {"slug": item["slug"]},
    }
    created, err = call("POST", "/prices", key, params, idempotency_key="price-" + lookup)
    if err:
        return None, "ERROR: " + err.get("message", "unknown")
    return created, "created"


def ensure_payment_link(key, item, price_id, dry):
    if dry:
        return {"url": "https://buy.stripe.com/DRY_RUN"}, "would create"

    # A payment link cannot be looked up by metadata, so page through and match.
    starting_after = None
    for _ in range(20):
        params = {"limit": 100}
        if starting_after:
            params["starting_after"] = starting_after
        page, err = call("GET", "/payment_links", key, params)
        if err or not page:
            break
        for link in page.get("data", []):
            if link.get("metadata", {}).get("slug") == item["slug"]:
                return link, "exists"
        if not page.get("has_more"):
            break
        starting_after = page["data"][-1]["id"]

    params = {
        "line_items": [{"price": price_id, "quantity": 1}],
        "metadata": {"slug": item["slug"]},
        "after_completion": {
            "type": "hosted_confirmation",
            "hosted_confirmation": {
                "custom_message": "Thanks for grabbing %s. Your download link is on its way to your inbox. If anything goes sideways, reply to that email and it comes straight to me. Dillon" % item["name"]
            },
        },
        "allow_promotion_codes": "true",
    }
    created, err = call("POST", "/payment_links", key, params, idempotency_key="link-" + item["stripe_id"])
    if err:
        return None, "ERROR: " + err.get("message", "unknown")
    return created, "created"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--key", default=os.environ.get("STRIPE_SECRET_KEY"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--payment-links", action="store_true")
    ap.add_argument("--bundles", action="store_true", help="also create the 9 bundles")
    ap.add_argument("--only", help="one slug, for testing")
    ap.add_argument("--site", default="https://courtrightco.com/products",
                    help="base URL used for each product's url field")
    ap.add_argument("--catalog", default=os.path.join(HERE, "catalog.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "stripe-results.json"))
    args = ap.parse_args()

    if not args.key and not args.dry_run:
        sys.exit("No API key. Set STRIPE_SECRET_KEY or pass --key.")

    key = args.key or ""
    # Stripe issues sk_test_/sk_live_ secret keys and rk_test_/rk_live_
    # restricted keys. Anything that is not clearly a test key is treated
    # as live, so the confirmation prompt errs toward being annoying
    # rather than toward creating real products by accident.
    is_test = key.startswith(("sk_test", "rk_test")) or "_test_" in key[:12]
    target = "TEST" if is_test else "LIVE"
    mode = ("DRY RUN, would target " + target) if args.dry_run else target

    if not args.dry_run and target == "LIVE":
        print("\n  You are about to create products in LIVE Stripe.")
        if input("  Type 'live' to continue: ").strip().lower() != "live":
            sys.exit("Stopped. Nothing created.")

    catalog = json.load(open(args.catalog))
    items = list(catalog["products"])
    if args.bundles:
        items += catalog["bundles"]
    if args.only:
        items = [i for i in items if i["slug"] == args.only]
        if not items:
            sys.exit("No item with slug " + args.only)

    print("\n  Mode: %s   Items: %d   Currency: %s\n" % (mode, len(items), catalog["currency"].upper()))
    print("  %-34s %8s  %-9s %-9s %s" % ("PRODUCT", "PRICE", "PRODUCT", "PRICE", "LINK"))
    print("  " + "-" * 88)

    results = []
    failures = 0

    for item in items:
        product, pstate = ensure_product(args.key, item, args.site, args.dry_run)
        if not product:
            print("  %-34s %8s  %s" % (item["name"][:34], "", pstate))
            failures += 1
            continue

        price, prstate = ensure_price(args.key, item, product["id"], catalog["currency"], args.dry_run)
        if not price:
            print("  %-34s %8s  %-9s %s" % (item["name"][:34], "", pstate, prstate))
            failures += 1
            continue

        link, lstate, url = None, "-", ""
        if args.payment_links:
            link, lstate = ensure_payment_link(args.key, item, price["id"], args.dry_run)
            url = (link or {}).get("url", "")
            if not link:
                failures += 1

        print("  %-34s %8s  %-9s %-9s %s" % (
            item["name"][:34], "$%.2f" % (item["unit_amount"] / 100), pstate, prstate, url or lstate))

        results.append({
            "slug": item["slug"], "name": item["name"],
            "amount": item["unit_amount"], "product_id": product["id"],
            "price_id": price["id"], "payment_link": url,
        })

    print()
    if args.dry_run:
        print("  Dry run. Nothing was created. Drop --dry-run to do it for real.\n")
    elif results:
        json.dump(results, open(args.out, "w"), indent=2)
        print("  Wrote %s\n" % args.out)
    if failures:
        print("  %d item(s) had errors. Scroll up.\n" % failures)
        sys.exit(1)


if __name__ == "__main__":
    main()
