<!--pdf
title: Ship Your First App in 30 Days
subtitle: One task a day, roughly an hour each. On day 30 there is a real app with your name on it, in a store, that strangers can download.
kicker: A Courtright Collective Challenge
brand: courtright
badges: 30 Days | ~1 Hr a Day | Real Ship Date
tag: Day 30 You Ship
-->

# Ship Your First App in 30 Days

## Read this first

You are going to ship something small. That is not a compromise, that is the entire method.

The reason people do not ship is never talent and it is almost never time. It is that they have no process, so every night is a fresh set of decisions, and fresh decisions at 11pm are how projects die quietly in a folder called `projects/old`.

This is thirty days of not having to decide. One task a day, about an hour, sometimes less. On day 30 you press submit.

**The rules of the challenge:**

1. **One task a day.** If you miss a day, do that day next. Do not skip ahead, and do not double up to catch up. The order matters more than the pace.
2. **Ship small.** Every single time you are tempted to add something, write it in `version-two.md` instead. That file is where good ideas wait patiently.
3. **Ugly and finished beats beautiful and unreleased.** Nobody has ever downloaded the app you are still polishing.
4. **Day 30 is a real date.** Put it on a calendar today. Tell somebody. That is most of what makes this work.

**What you need:** the Indie App Starter Kit (included), an hour a day, a computer, and a phone to test on. You do not need to be an experienced developer. You do need to be willing to look things up.

---

# Week 1: Decide and validate

The week most people skip. It is also the week that determines whether the other three matter.

### Day 1: Write the sentence

Write what your app does in one sentence. If it needs an "and," cut everything after the "and" and put it in `version-two.md`.

Then answer the six scoping questions honestly and score each one out of five:

1. Can one person build v1 in under 40 hours?
2. Can it work without a backend?
3. Is it useful with zero other users?
4. Can you make all the content yourself?
5. Would you use it weekly?
6. Can you describe the buyer in one specific sentence?

**Under 24 out of 30, pick a smaller idea today.** Not tomorrow. Today, while it is free.

**Done when:** one sentence written down, six scores written down.

### Day 2: Look at the competition

Search both stores the way your customer would. Find five apps in your space. Note ratings, review counts, and what each does badly.

Zero competitors usually means no demand, not open field. Forty competitors at 4.8 stars means you need a much narrower angle. Several competitors with mediocre ratings is the best sign there is.

**Done when:** five competitors in a table, with an honest read on what that table means.

### Day 3: Read the bad reviews

Open the one and two star reviews of your top three competitors. Read for a full hour. Copy every complaint into a file, in the reviewer's own words.

This is the highest-value hour in the entire thirty days. Those exact phrases become your App Store description later.

**Done when:** twenty verbatim complaints in a file.

### Day 4: Find your people

Where does your audience already talk? A subreddit, a Facebook group, a Discord, a forum. Find three. Read, do not post.

**Done when:** three communities listed, with a note on whether they actually discuss this problem unprompted.

### Day 5: Cut it in half

Look at your one sentence and your feature list. Cut it in half.

Yes, really. Every app I have shipped got cut roughly in half between the idea and the submission, and none of them suffered for it. The cut always feels like ruining the app. It never has been.

**Done when:** the v1 feature list has three items or fewer, and `version-two.md` has everything else.

### Day 6: Sketch the screens

On paper. Every screen, boxes and labels only, no design. Most good v1 apps are three to five screens.

Then draw an arrow from every screen to every screen it can reach. If your arrows look like a plate of spaghetti, you have too many screens.

**Done when:** every screen sketched and connected.

### Day 7: Name it and claim it

Pick a name. Run the six-part test: say it on a phone call, check the `.com`, check the handle on one platform, search it, say the initials out loud, and imagine saying it for ten years.

Then register the domain and grab the handle.

**Done when:** name chosen, domain registered, one handle claimed.

---

# Week 2: Build the core

### Day 8: Set up

Get the Indie App Starter Kit running locally. Rename everything. Change `CONFIG.storageKey` so it does not collide with anything else.

**Done when:** it runs in your browser and says your app's name.

### Day 9: Colors and type

Change three colors in `app.css`: `--accent`, `--accent-2`, `--bg`. Plus the dark mode versions. Pick two fonts.

Check your contrast. Fail this and your app is unusable outdoors, which is where phones live.

**Done when:** it looks like yours, in light mode and dark.

### Day 10: The core loop, ugly

Build the one thing your app does. No design, no polish, no edge cases. Just the loop, working end to end.

**If it is not good when it is ugly, no amount of design will save it.** Find that out tonight, not on day 25.

**Done when:** you can do the main thing the app is for, start to finish.

### Day 11: Make it stick

Wire your data into the store so it survives a refresh. Close the tab, reopen it, confirm your data is still there.

**Done when:** your data survives a reload.

### Day 12: The second screen

Whatever supports the core loop. A list, a detail view, a history.

**Done when:** you can navigate between screens and back.

### Day 13: Real data

Put your actual content in. Real words, real items, real lengths. Placeholder data lies to you about how everything looks and feels.

**Done when:** no lorem ipsum and no "Test Item 1" anywhere.

### Day 14: Use it for real

Do not code today. Use your own app for twenty minutes as if you were a customer. Write down every annoyance.

Then pick the three worst and do only those tomorrow. The rest go in `version-two.md`.

**Done when:** an annoyance list exists and the top three are picked.

---

# Week 3: Make it real

### Day 15: Fix the three

The three annoyances from yesterday. Only those three.

**Done when:** all three are fixed and nothing new got added.

### Day 16: Empty states

First launch with no data. No connection. An error. Nothing found.

Empty states are the most-seen screen in any new app and they are almost always the roughest thing in it. Design them like they matter, because they are the first thing every single user sees.

**Done when:** every empty state has real, written words in it.

### Day 17: The settings screen

Three settings. Three. Add a fourth when a real person asks.

Include a way to export or delete their data. People owning their own data is table stakes now.

**Done when:** settings work and reset actually resets.

### Day 18: Onboarding

One screen. One sentence on what the app does, three short points, one button.

Nobody reads onboarding. They tap through it and then judge your empty state, which you did yesterday.

**Done when:** it shows once, ever, and never again.

### Day 19: Devices

Test on a real phone. The smallest screen you support. The largest system text size. Dark mode. Rotation, if you allow it.

The simulator lies about performance, touch targets, and how big your text really is.

**Done when:** nothing overflows, nothing overlaps, nothing is too small to tap.

### Day 20: Polish

Transitions, haptics, the small delights. This is the reward for finishing and it is also the first thing to cut if you run out of time.

**Done when:** it feels good to use, not just possible to use.

### Day 21: Icons and images

App icon at every required size. The maskable one with all art inside the center 80 percent. Your social preview image.

One shape or one letter. It has to read at 40 pixels. Design it small, then scale it up.

**Done when:** every icon file is replaced and the home screen icon looks right on a real phone.

---

# Week 4: Ship it

### Day 22: Store listing copy

App name, 30 characters. Subtitle, 30. Keyword field, 100, single words, comma no space, no repeats between fields.

Then the description. First three lines carry all the weight, so write them last.

**Remember those twenty verbatim complaints from day 3?** Those are your description. Your customers already wrote your marketing copy, in better words than you would have used.

**Done when:** every field is written and inside its character limit.

### Day 23: Screenshots

Three to ten. Caption every one, five words or fewer. Big text, then bigger.

Screenshot one and two are 90 percent of the job, because they are the only ones most people see in search results. Squint at them at thumbnail size. If you cannot tell what they say, redo them.

**Done when:** every required size is exported and screenshot one passes the squint test.

### Day 24: Legal and accounts

Privacy policy, written and hosted at a real URL. Terms if you have accounts or payments. Support email that you will actually monitor. Developer account payment and tax forms complete, because those take longer than anybody expects.

**Done when:** every link works and every form is submitted.

### Day 25: The pre-flight

Run the full launch checklist from the Starter Kit. Sixty items. Do all of them.

Then delete every piece of debug UI, test data, and console noise.

**Done when:** the checklist is complete and the console is clean on a fresh load.

### Day 26: Submit

Submit for review. Set the release to **manual**, not automatic, so you choose your launch day.

If anything is behind a login, include demo credentials and a written walkthrough in the review notes. That one line prevents the most common rejection there is.

**Done when:** it is submitted.

### Day 27: Landing page and announcement

One page is plenty. What it is, who it is for, screenshots, a store link.

Write your announcement for everywhere you will post it, plus five social posts, so launch week does not also need fresh writing.

**Done when:** the page is live and five posts are drafted.

### Day 28: Tell people individually

Not a broadcast. Message people one at a time, personally, and tell them it is coming.

Ten personal messages outperform one public post, every time, and it is not close.

**Done when:** you have messaged at least ten people by name.

### Day 29: Handle the rejection, or wait

Most first submissions come back with something. Read exactly what they asked, fix precisely that, resubmit with a short note saying what changed. Most clear in one round.

If you got approved, take the day. You have earned an evening off.

**Done when:** approved, or resubmitted.

### Day 30: Ship it

Release it. Confirm it is actually live in your own region. Check the store page on a phone, not a browser.

Post everywhere at once. You only get one day one. Watch crash reporting for four hours. Reply to every review and comment that arrives.

Then stop refreshing the dashboard and go do something else.

**Done when: it is live, and a stranger can download it.**

---

## About day 30

Launch day for a first app with no audience is quiet. Dozens of downloads, not thousands. That is normal and it is not failure.

The apps that grow do it over months, from search traffic, word of mouth, and updates. Day 30 is not the finish line, it is the day the clock starts.

But here is the thing nobody tells you about the first one. **On day 31 you are a person who ships.** That is a different person from the one who started, and everything after this is easier, because you have proof that you finish things.

---

## What comes after

- **Week 5:** reply to everything, fix any crash immediately, watch where people drop off
- **Week 6:** ship a small update. Even a tiny one. It signals life to the store and to your users
- **Week 7:** look at day 1 and day 7 retention. This is the number that tells you whether you have a product or a project
- **Week 8:** write down three things that went wrong and one that went better than expected. Then decide, deliberately: keep pushing this one, or start the next

And when you start the next one, you already know it takes about thirty days.

**courtrightco.com**
