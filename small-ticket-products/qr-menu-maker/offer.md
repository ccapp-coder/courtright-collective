# QR Menu Maker

| | |
| --- | --- |
| **Product name** | QR Menu Maker |
| **Price** | **Free.** Lead magnet, not a product |
| **Format** | Single self-contained HTML file. Inline CSS and JS, fonts embedded as base64, a QR encoder written from scratch, zero dependencies, zero network calls |
| **Files** | `qr-menu-maker.html` |
| **Feeds into** | Website Creation first and foremost, then Email Automation (reservation and review-request flows) and Business Reports. A restaurant or cafe that just built a menu page with a free tool is one step from asking who could build the rest of the site. |
| **Delivery** | Deploy to Cloudflare Pages, ideally at `courtrightco.com/tools/qr-menu`. Two minutes |

## Sales blurb

**Somebody wants $29 a month to host a PDF of your menu.**

That is the actual business model of most QR menu services. And when the card on file expires, your menu goes down, usually on a Friday night.

This does the same job, once, for free, and you keep the file.

**Three steps, one screen:**

1. **Build the menu.** One item per line, `Name | Description | Price`. Start a section with `#`. Live phone preview updates as you type. Pick your accent color. Then download `menu.html`, a real, fast, mobile-first page you own.
2. **Put it online.** Step-by-step for Cloudflare Pages (free forever, no card), for a site you already have, and for the "not ready for any of that" case where you just point the code at your Google Business profile instead.
3. **Print the QR.** Enter your menu's address, get a QR code, and download either the plain PNG or a **print-ready table tent** with your place's name on it.

**Why the QR points at a URL instead of holding the menu itself:** because encoding the menu into the code means reprinting every table tent the moment a price changes. Point it at a page, and updating the menu is one file upload. The printed codes never change again.

**No signup. No monthly fee. Nothing you type is uploaded, stored, or seen by anyone.** One HTML file. Save it to your desktop and use it again next season.

Plus the printing rules that actually matter, which the $29-a-month services somehow never mention. Minimum one inch for a table tent, two for a wall, four for a window. Keep the white border. Never on a curved surface. And test it from where a customer will actually be sitting, not from six inches away.

## Notes and assumptions

- **This stays free.** It is a traffic and goodwill product. Local restaurant and cafe owners talk to each other constantly, and "the free one that does not expire" is an easy thing to recommend.
- **The QR encoder is written from scratch inside the file**, because a dependency-free tool cannot pull in a library. Byte mode, error correction levels L and M, versions 1 through 10, full mask selection with the standard four penalty rules, Reed-Solomon over GF(256), and BCH format and version information.
- **It was verified, not assumed.** 70 generated codes across both EC levels, versions 1 through 10, and two render scales were decoded with zxing, the same decoder family phone cameras use. All 70 read back byte-for-byte. Two real bugs were found and fixed during that testing: a swapped term in the Reed-Solomon generator polynomial, and format information bits placed in reverse order. Both would have produced codes that look perfectly convincing and scan on nothing.
- The printable table tent export was decode-tested as well, not just eyeballed.
- **Ambiguity call, noted as instructed.** The brief said "upload items." A file upload would mean parsing CSV or spreadsheet formats, which is more failure modes than value for a ten-item cafe menu. A plain text box with `Name | Description | Price` is faster for the owner, needs no template, and can be pasted straight out of a Word doc. If a CSV import turns out to be genuinely wanted, it is a small addition on top of the same parser.
- Includes the required "QR Code is a registered trademark of Denso Wave Incorporated" attribution in the footer. Keep it.
- **Conversion path:** the footer names the restaurant's actual next problems (online ordering, reservation reminders, review requests, the weekly numbers report) rather than pitching a package. That is the right register for a business owner who came for a free menu.
