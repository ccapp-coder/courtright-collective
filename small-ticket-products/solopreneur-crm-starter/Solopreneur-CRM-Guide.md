<!--pdf
title: The Solopreneur Mini CRM
subtitle: Three sheets that do everything a $99 a month CRM does for a one-person business, minus the $99 and the 40 fields you will never fill in.
kicker: Courtright Collective
brand: courtright
badges: 3 Sheets | No Subscription | 10 Min Setup
tag: A CRM You Will Actually Use
-->

# The Solopreneur Mini CRM

## What you got

| File | What it holds |
| --- | --- |
| `1-Pipeline.csv` | Every open opportunity and where it stands |
| `2-Contacts.csv` | Every person, how warm they are, when to reach out next |
| `3-Activity-Log.csv` | What you did, what happened, what is next |

Works in Google Sheets, Excel, Numbers, Notion, or Airtable. Sample rows are included so your filters and formulas have something to work with. Delete them once you have a few real ones.

---

## Why a spreadsheet and not a real CRM

I have signed up for six CRMs. I have paid for three. I have actually used zero of them for longer than five weeks.

Here's the thing. Real CRMs are built for sales teams. They have lead scoring and territory assignment and forty fields per record, because a twelve person sales org needs that and a manager needs to see it. You are one person. You do not have territories. You have about eleven things going on and a memory that is currently storing all of them in a way that wakes you up at 4am.

A one-person business needs to answer four questions:

1. Who owes me an answer?
2. Who do I owe an answer to?
3. What is actually going to close this month?
4. Who have I not talked to in too long?

That is it. Three sheets answer all four. When you outgrow this, you will know, because you will be annoyed by something specific rather than vaguely tempted by software.

---

## Setup, ten minutes

1. Upload all three CSVs to Google Drive. Right-click each, `Open with`, `Google Sheets`.
2. Or better: make one spreadsheet with three tabs named Pipeline, Contacts, and Activity. Import each CSV into its own tab.
3. Freeze row 1 on each tab: `View`, `Freeze`, `1 row`.
4. Turn on filters: select row 1, then `Data`, `Create a filter`.
5. Add the conditional formatting below. This is what turns a spreadsheet into something that tells you what to do.
6. Bookmark it. Put it in your bookmarks bar, not in a folder. If it is more than one click away you will not open it.

---

## Sheet 1: Pipeline

One row per opportunity. Not per company, per opportunity. If one client might buy two different things, that is two rows.

### The stages, in order

| Stage | Means | What has to be true to move on |
| --- | --- | --- |
| `New Lead` | They exist and might need you | You have made contact |
| `Contacted` | You reached out, no real conversation yet | They responded |
| `Qualified` | Real need, real budget, real timeline | They agreed to a call |
| `Discovery` | You are figuring out the actual scope | You know what to propose |
| `Proposal Sent` | Number is in front of them | They responded to it |
| `Negotiating` | Haggling over scope, price, or timing | Terms agreed |
| `Won` | Signed and paid, or signed and invoiced | Kickoff booked |
| `Lost` | No, or gone quiet past 60 days | Reason logged |
| `Nurture` | Real, but not now | Next touch date set |

**The rule:** a deal only moves forward when the thing in the right column actually happened. Not when you feel optimistic about it. Pipelines lie in exactly one direction and it is always the hopeful one.

### Probability by stage

Set these once and do not adjust them per deal. Your gut is not calibrated and mine is not either.

| Stage | Probability |
| --- | --- |
| New Lead | 10% |
| Contacted | 20% |
| Qualified | 30% |
| Discovery | 40% |
| Proposal Sent | 60% |
| Negotiating | 80% |
| Won | 100% |
| Lost | 0% |

**Weighted Value** is `Value` times `Probability`. Add it up and you get a number that is roughly honest about what is coming, instead of the fantasy number you get by adding up everything in the pipe.

### The two columns that make this work

**Next Action** and **Next Action Date.** Every open deal has both. Always.

A deal with a blank Next Action is not a deal, it is a memory. And you will lose it, not because you are disorganized but because eleven things are more than anybody holds in their head reliably.

### Conditional formatting

| Rule | Applies to | Format |
| --- | --- | --- |
| `Next Action Date` before today | Whole row | Red. This is your day |
| `Next Action Date` within 3 days | Whole row | Yellow |
| `Next Action` is blank and Stage is not Won or Lost | Whole row | Bright red. Fix immediately |
| `Stage` is Won | Whole row | Green |
| `Days In Stage` over 30 | That cell | Orange. Stalled |
| `Follow-Up Count` 3 or more | That cell | Orange. Decide something |

Google Sheets, custom formula for the overdue rule, applied to `A2:U`:

```
=AND($O2<>"", $O2<TODAY(), $F2<>"Won", $F2<>"Lost")
```

Column O is `Next Action Date`, column F is `Stage`. Update the letters if you move columns.

### Formulas worth having

```
Pipeline value:      =SUMIF(F:F,"<>Won",G:G)-SUMIF(F:F,"Lost",G:G)
Weighted pipeline:   =SUM(I2:I)
Deals needing action:=COUNTIFS(O:O,"<"&TODAY(),O:O,"<>")
Won this month:      =SUMIFS(G:G,F:F,"Won",L:L,">="&EOMONTH(TODAY(),-1)+1)
Win rate:            =COUNTIF(F:F,"Won")/(COUNTIF(F:F,"Won")+COUNTIF(F:F,"Lost"))
Avg deal size:       =AVERAGEIF(F:F,"Won",G:G)
Days in stage:       =IF(F2="Won","",TODAY()-K2)
Best source:         =QUERY(A:U,"select J, count(A) where F='Won' group by J order by count(A) desc",1)
```

That last one is worth more than the rest combined. It tells you where your money actually comes from, which is almost never where you assumed it came from.

---

## Sheet 2: Contacts

One row per person. People change companies and the relationship goes with them, not with the logo.

**Type:** `Prospect`, `Client`, `Past Client`, `Referral Partner`, `Vendor`, `Friend of the business`.

**Warmth:** `Cold`, `Neutral`, `Warm`, `Champion`. This column decides who gets your time when you only have an hour. Warm and Champion first, always.

**Next Touch and Touch Cadence.** The most underrated pair of columns in the whole file. Suggested cadences:

| Type | Cadence |
| --- | --- |
| Active deal | Weekly |
| Current client | Monthly, minimum |
| Past client | Quarterly |
| Referral partner | Monthly |
| Champion | Monthly, and give more than you take |
| Cold prospect | Every 6 weeks, or stop |

**Personal Notes.** Not creepy, just human. Their kid plays travel soccer. They run marathons. They hate phone calls and prefer text. This is the column that turns a vendor into a person somebody actually likes hearing from, and it costs you five seconds to fill in.

**The one filter to live in:** `Next Touch` is before today, sorted by Warmth. That is your week's relationship work, and it takes about twenty minutes.

---

## Sheet 3: Activity Log

One row every time something happens. Call, email, meeting, coffee, DM, proposal, whatever.

This feels like busywork for about two weeks and then it saves you in a very specific way: somebody says "you told me it would be four thousand" and you can open a row from six weeks ago and see exactly what you said and when.

**Keep it fast or you will stop.** Date, who, type, what happened, next step, done. Sixty seconds. Do it right after the call, not at the end of the week, because at the end of the week you will not remember and you will write "good call" for all five of them.

**Time Spent** is optional but useful. Fill it in for a month and you will find out how much unbilled time you spend on prospects who never sign. That number changes how you run discovery.

---

## The weekly rhythm

### Monday, 20 minutes

1. Pipeline tab. Sort by `Next Action Date`. Everything red gets handled today.
2. Any deal with a blank Next Action, fill it in now.
3. Any deal over 30 days in the same stage: move it, or move it to Nurture, or kill it. No fourth option.
4. Contacts tab. Filter `Next Touch` before today. Pick five, send five notes. They do not have to be pitches.

### Friday, 10 minutes

1. Update every stage that changed this week.
2. Log anything you did not log.
3. Look at the weighted pipeline number. Is it enough for next month? If not, Monday's list needs prospecting on it.
4. Anything Lost, write the real reason. "Price" is usually not the real reason, and next quarter you will want the truth.

That is 30 minutes a week to run the entire business development side of a one-person company.

---

## When you have outgrown this

Move to real software when one of these is true, not before:

- You have more than about 40 open deals at once
- Somebody else needs to see and update this
- You need email to log itself automatically
- You are running actual sequences to dozens of people at a time

Until then, this does the job, and it does it without a monthly bill and without you learning somebody else's idea of how your business works.

---

## The honest part

A CRM does not sell anything. You do. What this fixes is the specific and expensive problem of good opportunities dying quietly because nobody wrote down what happens next.

Thirty minutes a week. Everything red gets handled. Every deal has a next action.

That is the whole system.

**courtrightco.com**
