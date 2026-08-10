<!--pdf
title: The Song Pitch Tracker
subtitle: Three sheets that tell you what you sent, who has it, and who you owe a follow-up. Built by a songwriter who kept losing track.
kicker: Courtright Collective
brand: courtright
badges: 3 Sheets | Sheets or Excel | Nashville Built
tag: Stop Losing Track Of Pitches
-->

# The Song Pitch Tracker

## What you got

Three CSV files. Open them in Google Sheets, Excel, Numbers, or import them into Notion or Airtable. They work anywhere.

| File | What it holds |
| --- | --- |
| `1-Pitch-Tracker.csv` | Every pitch you have ever sent. The main sheet |
| `2-Song-Catalog.csv` | Your songs, splits, demo status, and paperwork |
| `3-Contacts.csv` | Who you pitch to, what they cut, and when to touch base again |

Sample rows are included so the filters and formulas have something to chew on. Delete them once you have three of your own in there.

**Setup, five minutes:**

1. Upload all three to Google Drive. Right-click each, then `Open with`, then `Google Sheets`.
2. Freeze the top row on each: `View`, then `Freeze`, then `1 row`.
3. Turn on filters: select row 1, then `Data`, then `Create a filter`.
4. Add the conditional formatting from the section below. It is the difference between a spreadsheet and a system.
5. Put a recurring 20 minute block on your calendar called "pitch follow-ups." Monday morning works.

---

## Why this exists

Here's the thing about pitching songs. The writing is the part you love and the tracking is the part that actually determines whether anything happens.

You send a song on a Tuesday. Three weeks later you are in a room with somebody and you genuinely cannot remember whether you already sent them that one, or whether they passed on it, or whether it is still on hold somewhere else and you should not be pitching it at all. So you either double-pitch, which is embarrassing, or you say nothing, which is worse.

Multiply that by a catalog and a couple of years and you are leaving real opportunities on the table. Not because the songs are not good. Because nobody wrote it down.

This is the writing-it-down.

---

## Sheet 1: The Pitch Tracker

One row per pitch. Not per song, **per pitch**. If you send the same song to four people, that is four rows. If you send two versions to one person, that is two rows. That is the whole discipline and it is the only rule that matters.

### The columns that carry the weight

**Status.** Use exactly these, no freelancing, or your filters break:

| Status | Means |
| --- | --- |
| `Pitched` | Sent, no response yet |
| `Delivered` | They asked for something and you sent it |
| `On Hold` | They are holding it. Do not pitch this song elsewhere until the hold expires |
| `Meeting Set` | It turned into a conversation |
| `Passed` | No. Which is fine. Log it and move |
| `Cut!` | Somebody is recording it |
| `Released` | It came out |
| `No Response` | 90 days of silence. Close it out, keep the relationship |

**Next Follow-Up.** The single most valuable column in the entire file. Every pitch that is not closed gets a date here. If this is blank on an open pitch, that pitch is dead and you killed it by forgetting.

**Follow-Up Count.** How many times you have nudged. When it hits 3 with no reply, stop and set the status to `No Response`. Four nudges is where a professional turns into a nuisance.

**Hold? and Hold Expires.** A hold is a promise. If a song is on hold, you do not pitch it anywhere else until that date passes. Write the date down, because "I think it was sometime in February" is not a business practice.

**Response.** Their actual words, copied and pasted. Not your summary of their words. "Not right for this project but send more" is a completely different message from "pass," and in six months you will not remember which one you got.

### Conditional formatting to set up

| Rule | Applies to | Format |
| --- | --- | --- |
| `Next Follow-Up` is before today | The row | Red background. This is your to-do list |
| `Next Follow-Up` is within 7 days | The row | Yellow background |
| `Status` is `Cut!` or `Released` | The row | Green background. You earned it |
| `Hold?` is `Yes` | The row | Bold text |
| `Follow-Up Count` is 3 or more | That cell | Orange. Time to close it out |

In Google Sheets: `Format`, then `Conditional formatting`, then `Custom formula is`. For the overdue rule, apply to `A2:U` with the formula:

```
=AND($N2<>"", $N2<TODAY(), $L2<>"Passed", $L2<>"Cut!", $L2<>"Released")
```

Column N is `Next Follow-Up` and column L is `Status`. If you add or move columns, update the letters.

### Useful formulas

Drop these anywhere in an empty area or on a summary tab.

```
Open pitches:        =COUNTIFS(L:L,"Pitched")+COUNTIFS(L:L,"Delivered")
Overdue follow-ups:  =COUNTIFS(N:N,"<"&TODAY(),N:N,"<>")
Active holds:        =COUNTIF(Q:Q,"Yes")
Cuts all time:       =COUNTIF(L:L,"Cut!")
Pitches this month:  =COUNTIFS(B:B,">="&EOMONTH(TODAY(),-1)+1,B:B,"<="&EOMONTH(TODAY(),0))
Pass rate:           =COUNTIF(L:L,"Passed")/COUNTA(L2:L)
Most pitched song:   =INDEX(C:C,MODE(MATCH(C2:C,C:C,0)))
```

---

## Sheet 2: The Song Catalog

One row per song. This is the sheet that saves you when somebody says "send me everything you have that is uptempo and would work for a male artist" and you need an answer in ten minutes instead of ten days.

**The columns that matter most:**

- **Splits Confirmed and Split Sheet Signed.** Filter for `No` on either one and fix them today. An unsigned split sheet on a song that gets cut is the single most preventable disaster in songwriting. It is also the one that ends friendships.
- **Best For.** Who should sing this. Be specific. "Female artist 20s to 30s" beats "anybody."
- **Work Tape, Full Demo, Instrumental, Lyric Sheet.** What actually exists. When a sync rep asks for an instrumental on a Friday afternoon, you want to already know the answer.
- **Registered with PRO.** ASCAP, BMI, SESAC, whoever you are with. A song that gets used and is not registered does not pay you.
- **Status.** `New`, `Needs Demo`, `Active`, `On Hold`, `Cut`, `Released`, `Shelved`.

**The three filters to build:**

1. `Split Sheet Signed = No` → your paperwork to-do list
2. `Status = Active` and `Full Demo = Yes` → what you can pitch today
3. `Status = Needs Demo` → your next studio day, ranked by which ones people keep asking about

---

## Sheet 3: Contacts

One row per person. Not per company. People move, and the relationship goes with them.

**The columns people skip and then regret:**

- **What They Cut.** Their actual lane. Stop pitching ballads to the uptempo person.
- **What They Do Not Want.** Just as valuable, arguably more.
- **Accepts Unsolicited.** If it is `No`, you need an introduction, and pitching anyway burns the relationship before it starts.
- **Preferred Format.** Some people want a streaming link, some want a WAV attached, some want to hear it live with a guitar. Sending the wrong format is a free way to look like an amateur.
- **Contact Cadence and Next Touch.** How often to be in front of them without becoming the person they avoid.
- **Relationship Warmth.** `Cold`, `Neutral`, `Warm`, `Champion`. Sort by this before every pitch round. Warm contacts first, always.

---

## The follow-up rhythm that works

This is the part people get wrong in both directions. Some never follow up. Some follow up every four days until they are blocked.

| When | What to send |
| --- | --- |
| Day 0 | The pitch. One song. Never three. One |
| Day 10 to 14 | Short nudge. Two sentences. "Wanted to make sure this landed, no rush" |
| Day 30 to 45 | Second nudge, but bring something new. A different song, or news about the first one |
| Day 90 | Close it out. Set status to `No Response`. Keep the person, drop the thread |

**The rules under the rhythm:**

- **One song per email.** Three songs means they pick none. This is the most consistently true thing in music pitching.
- **Follow up with news, not with pressure.** "Another artist put a hold on this" is a follow-up. "Just checking in" is noise.
- **Log every response, in their words.** Especially the passes. A pass with a reason is a map to the next song.
- **A pass is not a no forever.** It is a no on this song, for this artist, this quarter. The tracker is what lets you know when the situation changed.
- **When somebody cuts your song, thank them and stay in the rotation.** The second cut is always easier than the first.

---

## The 20 minute Monday routine

Open the Pitch Tracker. Sort by `Next Follow-Up`, oldest at the top.

1. Everything red gets handled: send the nudge or close it out. No third option.
2. Everything with `Follow-Up Count` at 3 or more goes to `No Response`. Let it go.
3. Check `Hold Expires`. Anything past today, the song is free again. Get it back in rotation.
4. Open Contacts. Anybody past their `Next Touch` date gets something this week, even if it is not a pitch.
5. Open the Catalog. Anything with an unsigned split sheet, chase it today.
6. Pick this week's three pitches and write the rows before you send them.

Twenty minutes. Every Monday. That is the whole system.

---

## One honest note

A tracker does not get you a cut. Songs get you cuts, and relationships get your songs heard.

What this does is make sure that none of the work you already did gets quietly wasted because you forgot who had what. Which, if you have been doing this for more than a year, you already know is a real and expensive problem.

Write the row. Send the song. Follow up on Monday.

**courtrightco.com**
