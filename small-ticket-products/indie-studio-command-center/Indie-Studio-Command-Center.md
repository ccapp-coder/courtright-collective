<!--pdf
title: Indie Studio Command Center
subtitle: The single Notion workspace that runs an indie app studio. Ideas, builds, launches, money, and support, all in one place.
kicker: Courtright Collective
brand: courtright
badges: Notion Template | 11 Databases | Setup in 20 Min
tag: Run The Whole Studio
-->

# Indie Studio Command Center

A Notion workspace for people who ship. Built from the actual system I use to run Courtright Collective across multiple apps, a services business, and whatever new thing I talked myself into last week.

**Import it:** Notion, then `Import`, then `Markdown & CSV`, then drop this file in. Everything below becomes pages and sub-pages. Then follow the Setup section to turn the tables into real Notion databases (it takes about 20 minutes and it is worth doing properly).

---

## Setup, do this first

1. Import this file. You will get one page with everything nested inside it.
2. For each table below, click into it, select the table, and choose `Turn into database`. Notion keeps your columns.
3. Set the property types. The tables tell you which type each column wants.
4. Build the views listed under each database. Views are where the value is, not the table.
5. Delete the sample rows once you have added two or three of your own. They are there so the views have something to show.
6. Pin the Command Center page to your sidebar. If it is not one click away you will not use it.

**One rule before you start:** do not customize this for two weeks. Use it as-is, notice what annoys you, then change that specific thing. Every Notion template dies from people redesigning it instead of using it.

---

## 1. The Command Center home

This is the page you open every morning. Keep it thin.

**Layout, top to bottom:**

- **Today.** A linked view of the Tasks database, filtered to `Due is on or before today` and `Status is not Done`, sorted by Priority.
- **In flight.** A linked view of Projects, filtered to `Status is Building` or `Status is Launching`, as a board grouped by Status.
- **Money at a glance.** A linked view of the Revenue Log, filtered to the current month, with a Sum on the Amount column.
- **Next launch.** A linked view of Launches, filtered to `Launch date is within the next month`.
- **Inbox.** A linked view of the Idea Vault, filtered to `Status is Unsorted`, so nothing gets lost between Tuesdays.

**The rule of the home page:** if something is not actionable today or this week, it does not belong here. Everything else lives one click deeper.

---

## 2. Apps and Projects

The master list. Every app, client project, and side thing you have going.

| Name | Type | Status | Platform | Launched | MRR | Owner | Next milestone | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TinkerTaps | Own App | Live | iOS | 2024-11-02 | $340 | Dillon | 2.0 activity pack | High |
| Trivd | Own App | Live | iOS | 2025-03-18 | $610 | Dillon | Daily challenge retention fix | High |
| Client site rebuild | Client | Building | Web | | $0 | Dillon | Design approval | Medium |
| New idea, unnamed | Own App | Idea | TBD | | $0 | Dillon | Validate demand | Low |

**Property types:** Name `Title`, Type `Select` (Own App, Client, Internal Tool, Experiment), Status `Select` (Idea, Validating, Building, Launching, Live, Maintenance, Killed), Platform `Multi-select` (iOS, Android, Web, Desktop), Launched `Date`, MRR `Number, dollar`, Owner `Person`, Next milestone `Text`, Priority `Select` (High, Medium, Low).

**Views to build:**

- **Board by Status.** Your studio at a glance. This is the one you will look at most.
- **Live only.** Table filtered to `Status is Live`, sorted by MRR descending. This is the honest scoreboard.
- **Graveyard.** Filtered to `Status is Killed`. Keep it. Killing things is a skill and you should be able to see the evidence that you have it.
- **Gallery.** With app icons as covers. Nice for screenshots and for your own morale.

---

## 3. Tasks

One database for everything. Do not make one task list per project, you will stop opening most of them.

| Task | Project | Status | Priority | Due | Effort | Type |
| --- | --- | --- | --- | --- | --- | --- |
| Fix crash on iPad landscape | Trivd | Not started | High | 2026-01-14 | 1h | Bug |
| Write App Store update notes | TinkerTaps | In progress | Medium | 2026-01-15 | 30m | Launch |
| Reply to partnership email | Studio | Not started | High | 2026-01-13 | 15m | Admin |
| Record 3 demo clips | Trivd | Not started | Low | 2026-01-20 | 2h | Marketing |

**Property types:** Task `Title`, Project `Relation to Apps and Projects`, Status `Status` (Not started, In progress, Blocked, Done), Priority `Select` (High, Medium, Low), Due `Date`, Effort `Select` (15m, 30m, 1h, 2h, Half day, Full day, Multi-day), Type `Select` (Build, Bug, Launch, Marketing, Admin, Support).

**Views to build:**

- **Today.** `Due is on or before today` and `Status is not Done`.
- **This week.** `Due is within the next week`, grouped by Project.
- **Quick wins.** `Effort is 15m or 30m` and `Status is Not started`. For the twenty minutes between other things.
- **Blocked.** `Status is Blocked`. Check it every Friday or it will quietly rot.
- **By project.** Board grouped by Project.

**The effort column is the most useful thing in this database.** When you have twenty free minutes at 11pm, you do not want to read your whole list. You want the 15m view.

---

## 4. Idea Vault

Where ideas go so they stop living in your head at 2am.

| Idea | One-liner | Category | Excitement | Effort | Audience clarity | Score | Status | Captured |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Trivia for road trips | Offline trivia packs for long drives | App | 4 | 3 | 4 | 11 | Unsorted | 2026-01-08 |
| Invoice chaser bot | Auto-nudges late invoices for freelancers | Automation | 5 | 2 | 5 | 12 | Shortlist | 2026-01-05 |
| Toddler sound board | Simple cause-and-effect sounds | App | 3 | 5 | 3 | 11 | Parked | 2025-12-19 |

**Property types:** Idea `Title`, One-liner `Text`, Category `Select` (App, Automation, Content, Service, Tool), Excitement `Number 1 to 5`, Effort `Number 1 to 5, where 5 is easy`, Audience clarity `Number 1 to 5`, Score `Formula`, Status `Select` (Unsorted, Shortlist, Validating, Building, Parked, Killed), Captured `Created time`.

**Score formula:**

```
prop("Excitement") + prop("Effort") + prop("Audience clarity")
```

Anything scoring 12 or higher goes to Shortlist. Anything under 8 gets parked without guilt. The point is not that the math is scientific. The point is that you have to answer three honest questions before an idea gets to eat your weekend.

**Views to build:**

- **Unsorted inbox.** Everything new. Clear it every Friday.
- **Shortlist by score.** Sorted descending. Your next build comes from the top of this list.
- **Parked.** Review it once a quarter. Ideas get better when the world catches up to them.

---

## 5. Launch Command

One row per launch. Apps, updates, features, products, whatever.

| Launch | Project | Launch date | Stage | Store status | Assets done | Post-launch check |
| --- | --- | --- | --- | --- | --- | --- |
| Trivd 1.4 | Trivd | 2026-01-22 | Prep | In review | 3/6 | |
| TinkerTaps 2.0 | TinkerTaps | 2026-02-14 | Building | Not submitted | 0/6 | |

**Property types:** Launch `Title`, Project `Relation`, Launch date `Date`, Stage `Select` (Building, Prep, Submitted, Live, Post-launch), Store status `Select` (Not submitted, In review, Approved, Rejected, Live), Assets done `Text or Rollup`, Post-launch check `Checkbox`.

### The launch checklist (duplicate this into every launch page)

**Two weeks out**

- [ ] Build is feature complete and frozen
- [ ] Tested on the oldest device you still support
- [ ] Tested on the newest OS beta
- [ ] Crash-free session rate checked
- [ ] Store listing copy written and read out loud
- [ ] Keywords researched and finalized
- [ ] Screenshots made for every required size
- [ ] Preview video recorded or deliberately skipped
- [ ] What's New text written
- [ ] Privacy labels reviewed and still accurate
- [ ] Pricing and in-app purchase config confirmed
- [ ] Analytics events firing and verified in the dashboard

**One week out**

- [ ] Build submitted for review
- [ ] Landing page updated and live
- [ ] Announcement email drafted
- [ ] Social posts drafted, at least five
- [ ] Screenshots and clips exported for social
- [ ] Support email and FAQ updated for the new version
- [ ] Anyone who asked to be told, told

**Launch day**

- [ ] Release approved and live in every region
- [ ] Landing page CTA points at the new version
- [ ] Announcement email sent
- [ ] Social posts published
- [ ] Watch crash reporting for the first four hours
- [ ] Reply to every review that comes in on day one

**One week after**

- [ ] Downloads and conversion reviewed against the last release
- [ ] Crash-free rate compared to previous build
- [ ] All reviews replied to
- [ ] Retention checked at day 1 and day 7
- [ ] Three things that went wrong, written down in the Ship Log
- [ ] One thing that worked better than expected, written down too

---

## 6. Revenue Log

Money in. Keep it stupid simple or you will not keep it at all.

| Date | Source | Type | Amount | Notes |
| --- | --- | --- | --- | --- |
| 2026-01-05 | App Store | Subscriptions | $612.40 | Trivd, December payout |
| 2026-01-05 | App Store | Subscriptions | $338.90 | TinkerTaps, December payout |
| 2026-01-09 | Client work | Project | $2,500.00 | Website build, deposit |
| 2026-01-11 | Products | Digital | $87.00 | Prompt Vault, 3 sales |

**Property types:** Date `Date`, Source `Select`, Type `Select` (Subscriptions, One-time, Project, Retainer, Digital, Other), Amount `Number, dollar`, Notes `Text`.

**Views to build:**

- **This month.** With a Sum on Amount. That number is the whole point.
- **By source.** Board grouped by Source, with sums. Shows you which horse is actually pulling the cart.
- **Year to date.** Filtered to this year, grouped by month.

**Companion database, Expenses.** Same shape: Date, Vendor, Category (Software, Hardware, Services, Store fees, Marketing, Other), Amount, Recurring checkbox, Notes. Build a view filtered to `Recurring is checked`, sorted by Amount descending, and read it once a quarter. That view will pay for this template.

---

## 7. Metrics

One row per app per month. Boring to fill in, incredibly useful to look back on.

| Month | App | Downloads | Active users | Paying users | MRR | Churn | Rating | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2025-12 | Trivd | 1,840 | 620 | 74 | $610 | 5.2% | 4.7 | Holiday bump |
| 2025-12 | TinkerTaps | 970 | 410 | 41 | $340 | 6.8% | 4.8 | Steady |

**Property types:** Month `Date`, App `Relation`, the rest `Number` or `Text`.

**Views to build:**

- **Latest month, all apps.** The scoreboard.
- **By app, chronological.** Your growth curve, or your flat line. Both are worth seeing.

Fill this in on the first business day of every month. Put it on a recurring reminder. Fifteen minutes a month gives you a year of history you will be grateful for the first time you have to make a real decision.

---

## 8. Support and Feedback

Every bug report, feature request, and review worth remembering.

| Item | Source | App | Type | Severity | Status | Count | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Timer resets when app backgrounds | Email | Trivd | Bug | High | Fixing | 4 | 2026-01-09 |
| Wants offline mode | App Store review | TinkerTaps | Feature | Medium | Considering | 11 | 2026-01-07 |
| Confused by the score screen | Email | Trivd | UX | Medium | Fixed | 3 | 2025-12-28 |

**Property types:** Item `Title`, Source `Select` (Email, App Store review, Play review, Social, Support form, Friend), App `Relation`, Type `Select` (Bug, Feature, UX, Praise, Other), Severity `Select` (Critical, High, Medium, Low), Status `Select` (New, Considering, Fixing, Fixed, Won't do), Count `Number`, Date `Date`.

**The Count column is the important one.** Bump it every time someone else says the same thing. Build a view sorted by Count descending and you will never again guess what to build next.

---

## 9. Content Calendar

| Post | Channel | App | Type | Status | Publish date | Link |
| --- | --- | --- | --- | --- | --- | --- |
| Behind the scenes of the 1.4 build | Instagram | Trivd | Behind the scenes | Drafted | 2026-01-16 | |
| Three things I got wrong about ASO | LinkedIn | Studio | Teaching | Idea | 2026-01-18 | |
| New activity pack preview | Instagram | TinkerTaps | Promo | Idea | 2026-01-20 | |

**Property types:** Post `Title`, Channel `Multi-select`, App `Relation`, Type `Select` (Teaching, Behind the scenes, Promo, Milestone, Customer win, Question), Status `Select` (Idea, Drafted, Scheduled, Published), Publish date `Date`, Link `URL`.

**Views:** Calendar by publish date, and a board grouped by Status. Keep at least five posts in Idea at all times so you never open this page and find a blank.

---

## 10. Ship Log

The one page that will matter most in two years.

Every time you ship anything, add a row. One line on what shipped, one line on what you learned.

| Date | What shipped | Project | What I learned |
| --- | --- | --- | --- |
| 2025-12-14 | Trivd 1.3, daily challenge | Trivd | Shipping on a Friday means fixing bugs on Saturday. Ship Tuesday. |
| 2025-11-02 | TinkerTaps launch | TinkerTaps | The screenshots did more work than the description. Spend the time there. |

On the bad weeks, open this page and scroll. That is what it is for.

---

## 11. Weekly Review

Do this every Friday. Twenty minutes, no exceptions, and you can be honest because nobody else is reading it.

**Duplicate this template weekly:**

### Week of `[date]`

**Shipped this week**

-

**Numbers**

| Metric | This week | Last week |
| --- | --- | --- |
| Revenue | | |
| Downloads | | |
| New leads | | |
| Support items | | |

**What worked**

-

**What did not**

-

**What I am avoiding** (be honest, this is the one that matters)

-

**The one thing that moves the needle next week**

-

**Inbox zero checks**

- [ ] Idea Vault cleared out of Unsorted
- [ ] Blocked tasks unblocked or killed
- [ ] Support items triaged
- [ ] Revenue Log updated
- [ ] Next week has one protected build block on the calendar

---

## 12. Studio Assets

The page you will search for at the worst possible time.

| Asset | Type | Where it lives | Notes |
| --- | --- | --- | --- |
| App icons, all sizes | Design | `[link]` | Master file in `[tool]` |
| Brand palette and fonts | Design | `[link]` | |
| App Store screenshots, current | Marketing | `[link]` | Update every release |
| Privacy policy | Legal | `[link]` | Review annually |
| Terms of service | Legal | `[link]` | |
| Press kit | Marketing | `[link]` | Logo, screenshots, boilerplate |
| Support email templates | Ops | `[link]` | |

**Do not put passwords in Notion.** Use a password manager and put the name of the vault entry here instead. That is the only security advice in this template and it is the one worth following.

---

## The five habits that make this work

1. **Open the Command Center home first, every day.** Before email, before the App Store, before social.
2. **Capture everything into the Idea Vault immediately.** No exceptions. The vault is only useful if it is complete.
3. **Do the Weekly Review on Friday.** Twenty minutes. It is the single highest return habit in this whole system.
4. **Update the Metrics database on the first of the month.** Future you is begging.
5. **Add a Ship Log row every time you ship.** Even small things. Especially small things.

Systems do not make you productive. Showing up makes you productive. This just means you never waste the showing up on trying to remember what you were doing.

**courtrightco.com**
