<!--pdf
title: The ASO Cheat Sheet
subtitle: Every character limit, keyword rule, and screenshot decision that moves App Store downloads. One page you can work off of.
kicker: Courtright Collective
brand: courtright
badges: iOS + Android | Character Limits | Launch Ready
tag: Get Found In The Store
-->

# The ASO Cheat Sheet

App Store Optimization sounds like a dark art. It is not. It is a handful of fields with character limits, a couple of rules about how the stores read those fields, and one uncomfortable truth: your screenshots matter more than your description.

This is the sheet I work off of for every launch. Print it, keep it open, fill in the worksheet at the end.

---

## 1. The fields, and how much room you get

### Apple App Store

| Field | Limit | Searchable? | What it is really for |
| --- | --- | --- | --- |
| App Name | 30 chars | **Yes, heaviest weight** | Brand plus your one best keyword phrase |
| Subtitle | 30 chars | **Yes, heavy weight** | Your second and third keyword phrases, as a benefit |
| Keyword field | 100 chars | **Yes, medium weight** | Hidden from users. Pure keyword real estate |
| Promotional Text | 170 chars | No | Updatable without review. Use for news and offers |
| Description | 4,000 chars | No | Converts the people already on your page |
| What's New | 4,000 chars | No | Shows you are alive. People check this |
| In-app purchase names | 30 chars | Yes | Free keyword space most people never use |
| Screenshots | 3 to 10 | No | The actual decision maker |
| App Preview video | Up to 3, 15 to 30s | No | Autoplays muted. Design for silence |
| Category | Primary + secondary | Yes | Primary drives rankings. Choose carefully |

### Google Play

| Field | Limit | Searchable? | What it is really for |
| --- | --- | --- | --- |
| App Title | 30 chars | **Yes, heaviest weight** | Brand plus keyword |
| Short Description | 80 chars | **Yes, heavy weight** | Shows above the fold. Also a conversion line |
| Full Description | 4,000 chars | **Yes, medium weight** | Google indexes this. Apple does not |
| Screenshots | 2 to 8 per device type | No | Same job as Apple |
| Feature Graphic | 1024 x 500 | No | Shows at the top. Required |
| Promo video | YouTube link | No | Optional. Usually skippable |

**The single biggest structural difference:** Apple ignores your description for search and gives you a hidden keyword field. Google reads your full description and gives you no hidden field. So on Apple you write a description for humans. On Google you write one for humans that happens to repeat your keywords naturally three to five times.

---

## 2. Keyword rules people get wrong

**Apple builds combinations for you.** If your name has "Trivia" and your keyword field has "quiz," you can rank for "trivia quiz" without ever writing that phrase. So never waste characters on multi-word phrases you can assemble from single words.

**Never repeat a word across fields on Apple.** A word in your app name does not need to be in your subtitle or keyword field. Every repeat is wasted space.

**Comma, no space.** The keyword field is `word,word,word` not `word, word, word`. Each space costs you a character you could have spent on a letter.

**Skip these entirely in the keyword field:**

- Your own app name (already indexed)
- Your company name (already indexed)
- The word "app" (rarely worth it)
- Your category name (Apple indexes categories separately)
- Plurals when you already have the singular (Apple handles both)
- Common stop words: a, the, and, for, with, of, in, on

**Do not use competitor brand names.** Apple rejects it, Google penalizes it, and it does not work as well as people claim anyway.

**Localize even when you do not translate.** Apple indexes English (US), English (UK), and English (Australia) separately for US users in many setups, and adds Spanish (Mexico) for the US storefront. Filling those extra locales with different keyword sets is the closest thing to free downloads in ASO. Same English copy, different keyword field.

---

## 3. Picking the right keywords

Score every candidate on three things:

| Factor | What to ask | Score |
| --- | --- | --- |
| **Relevance** | Would someone searching this actually want my app? | 1 to 5 |
| **Volume** | Do enough people search it? | 1 to 5 |
| **Difficulty** | Can I realistically crack the top 10? | 1 to 5, where 5 is easy |

Chase the 12 and up. Ignore high volume terms you cannot win. A number one ranking on a term 400 people search beats position 87 on a term 40,000 people search, every single time.

**Where to find real keywords, free:**

1. **App Store search autocomplete.** Type your category term and write down every suggestion. Those are ranked by actual search volume.
2. **Your competitors' names and subtitles.** They paid someone to research those. Read them.
3. **Your reviews.** The words customers use to describe your app are the words they searched to find it.
4. **Your support email.** Same idea, more honest.
5. **Related searches at the bottom of a search result page.**

**Where to find them for money, when it is worth it:** AppFollow, Sensor Tower, AppTweak, Astro. All have free tiers that are enough for one app. Do not pay for these before you have a live app with data.

---

## 4. Writing the fields

### App Name formula

```
[Brand]: [Primary keyword phrase]
```

Examples of the shape:

- `Trivd: Head to Head Trivia`
- `TinkerTaps: Toddler Activities`

Rules: brand first if you have any recognition, keyword first if you have none. Keep the brand short enough that the keyword phrase fits. Under 30 characters including spaces and the colon.

### Subtitle formula

```
[Benefit] with [second keyword]. [Third keyword hook].
```

The subtitle has two jobs and both matter. It ranks for keywords **and** it is the second thing a human reads. Write it so that both jobs get done. Do not stuff it, that reads as spam and kills conversion.

### Keyword field, worked example

Bad, 100 characters spent badly:

```
trivia game, quiz game, trivia app, fun trivia, best trivia, trivia questions
```

Good, same space, far more coverage:

```
quiz,questions,knowledge,brain,challenge,friends,multiplayer,party,pub,bar,night,general
```

Every word in the second version combines with every other word and with your app name. The first version wasted most of its space on repeats and stop words.

### Description structure that converts

```
Line 1 to 3:  The hook. What it is, who it is for, in one breath.
              This is all most people read before "more."
Line 4 to 8:  Three to five benefit bullets. Benefits, not features.
Middle:       Social proof. Ratings, downloads, a review quote, an award.
Then:         Feature list, short and scannable.
Then:         Subscription terms if you have any. Be clear, it reduces
              refunds and angry reviews.
Last:         Support email, privacy link, one line of personality.
```

The first three lines carry almost all the weight. Write them last, when you know what the rest says.

---

## 5. Screenshots, where the downloads actually come from

Your screenshots do more conversion work than every word on the page combined. Most people ship whatever the simulator gave them and wonder why the traffic does not convert.

**The rules:**

1. **Screenshot 1 and 2 are 90 percent of the job.** Those are the only ones most people see in search results. Everything else is for the deep readers.
2. **Caption every screenshot.** A raw UI screenshot means nothing to someone who has never used your app. Put a short benefit line above it.
3. **Captions get five words or fewer.** They are read at thumbnail size.
4. **Big text. Bigger than feels right.** Then look at it on your phone at actual size and make it bigger again.
5. **Show one idea per screenshot.** One feature, one benefit, one screen.
6. **Use your brand colors on the background.** Consistent background color across all screenshots makes your listing look intentional in a sea of white.
7. **Front-load the strongest feature.** Not the onboarding, not the settings screen. The moment where your app is good.
8. **Portrait for phone apps. Always.** Landscape screenshots display smaller in search results.
9. **First screenshot readable at thumbnail size.** Squint test: if you cannot tell what it says while squinting, redo it.

**Required sizes as of this writing:** iPhone 6.9 inch and 6.5 inch cover the App Store requirement, iPad 13 inch if you support iPad. Google Play wants at least two phone screenshots at 1080 x 1920 or better. Apple scales down from the largest size, so make the big one properly and let it scale.

**Video:** autoplays with no sound. If your video only makes sense with audio, it does not make sense. Show gameplay or the core loop in the first three seconds, no logo intro. Nobody has ever downloaded an app because of a logo animation.

---

## 6. Ratings and reviews

Ratings affect rankings and they hammer conversion. A 4.7 converts dramatically better than a 3.9 with identical everything else.

**Ask at the right moment.** Use the native rating prompt (`SKStoreReviewController` on iOS, In-App Review API on Android) and trigger it right after a win. Level completed, task finished, third successful session. Never on launch, never during onboarding, never after an error.

**You get three prompts per year, per user, on iOS.** Spend them carefully. One well-timed prompt beats three desperate ones.

**Reply to every review for the first month after launch.** Apple lets you respond publicly and users get notified. A polite reply turns a two star into a four star more often than you would expect. It also shows every future browser that a human is home.

**Reply template that works:**

> Thanks for taking the time to write this. You are right that `[the specific thing]` is rough right now. It is fixed in the next update, going out `[timeframe]`. If you want to tell me more, `[email]` comes straight to me.

**Never buy reviews.** Both stores detect it, and the penalty is removal.

---

## 7. The stuff that also moves rankings

| Signal | Weight | What you can do about it |
| --- | --- | --- |
| Download velocity | Very high | Launch pushes, feature spots, press, any traffic burst |
| Retention (day 1, day 7) | Very high | This is a product problem, not an ASO problem |
| Ratings volume and average | High | Ask at the right moment, reply to everything |
| Keyword relevance | High | Everything in sections 2 through 4 |
| Uninstall rate | Medium | Fix onboarding. Most uninstalls happen in minute one |
| Update frequency | Medium | Ship something every 4 to 8 weeks, even small |
| In-app purchase names | Low but free | Put keywords in them |
| App size | Low | Smaller downloads convert better on cellular |

The uncomfortable truth in that table: retention outranks almost everything you can control with copy. ASO gets people to the page. Retention keeps you ranking. If your day 7 retention is bad, better keywords will not save you, they will just cost you more to acquire people who leave.

---

## 8. The testing loop

**Apple:** Product Page Optimization lets you run up to three treatments against your current page, testing icon, screenshots, or preview video. It is free and it is built into App Store Connect. Most indie devs never touch it.

**Google:** Store Listing Experiments does the same with more flexibility, including text.

**How to run one properly:**

1. Change **one thing.** Icon or screenshots or subtitle. Not all three.
2. Let it run until you have a clear winner or 7 days minimum, whichever is later.
3. Watch conversion rate, not downloads. Downloads move for a hundred reasons.
4. Write the result down in a log, including the losers. The losers teach you more.
5. Then change the next thing.

**Test in this order, highest impact first:** icon, then screenshot 1, then screenshot 2, then subtitle, then the rest.

---

## 9. The 30-day rhythm

| When | Do this |
| --- | --- |
| Every release | Update What's New. Actually write it, do not ship "bug fixes and improvements" |
| Weekly | Check keyword rankings for your top 10 terms. Note movement |
| Weekly | Reply to new reviews |
| Monthly | Review conversion rate, impressions, and download source in App Store Connect |
| Monthly | Refresh Promotional Text (no review needed, so it is free to experiment) |
| Quarterly | Full keyword refresh. Search terms move, seasons change |
| Quarterly | New screenshots if the app has changed visually |
| Yearly | Reconsider your category. A smaller category you can rank in beats a big one you cannot |

---

## 10. The launch-day worksheet

Fill this in before you submit. Print it, write on it, keep it with the release.

**App Name** (30 max): `_______________________________`
Characters used: `____`

**Subtitle** (30 max): `_______________________________`
Characters used: `____`

**Keyword field** (100 max, comma no space):

```
________________________________________________________________
```

Characters used: `____`

**Top 10 target keywords, ranked**

| # | Keyword | Relevance | Volume | Difficulty | Total |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |
| 9 | | | | | |
| 10 | | | | | |

**Screenshot captions** (five words or fewer each)

1. `_______________________________`
2. `_______________________________`
3. `_______________________________`
4. `_______________________________`
5. `_______________________________`

**Pre-submit checks**

- [ ] No word repeated between name, subtitle, and keyword field
- [ ] No stop words in the keyword field
- [ ] No spaces after the commas
- [ ] Extra English locales filled with a different keyword set
- [ ] Screenshot 1 passes the squint test at thumbnail size
- [ ] Description's first three lines work with nothing after them
- [ ] Subscription terms stated plainly if you have any
- [ ] What's New written like a person wrote it
- [ ] Rating prompt fires after a win, not on launch
- [ ] Support email in the description and monitored

---

## The one-paragraph version

Put your best keyword phrase in your app name, your next two in your subtitle, and fill the 100 character keyword field with single words and no repeats. Make screenshot one so clear that a stranger understands your app while squinting at a thumbnail. Ask for ratings right after a win. Reply to every review. Ship an update every six weeks. Then test one thing at a time, forever.

That is ASO. The rest is patience.

**courtrightco.com**
