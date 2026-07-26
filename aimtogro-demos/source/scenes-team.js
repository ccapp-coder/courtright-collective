/* AimToGro demo scenes — the AI employees */

/* shared employee page scaffold */
function employeePage({ team, icon, name, sub, replaces, stats, owns }) {
  const inner = buildShell({ team });
  heroCard(inner, icon, "YOUR HIRE · ALWAYS ON", name, sub, replaces);
  add(inner, "div", "sec-title", "Today");
  const strip = statStrip(inner, stats);
  add(inner, "div", "sec-title", `What ${team} owns`);
  const rows = owns.map(([ic, t, s, right]) => rowItem(inner, ic, t, s, right));
  return { inner, strip, rows };
}

/* ── Sales Rep ── */
SCENES["sales-rep"] = async () => {
  await introCard("Your A2G <em>Sales Rep.</em>", "Quote, follow up, close — your pipeline never goes quiet again.");
  const { inner } = employeePage({
    team: "Sales Rep", icon: "📈", name: "Your A2G Sales Rep",
    sub: "Quotes drafted, follow-ups sent, deals nudged over the line.",
    replaces: "$4,000–$7,000/mo",
    stats: [["OPEN QUOTES", "4", "$13,900 in play"], ["STALE 5+ DAYS", "2", "needs a nudge", "red"], ["CLOSED THIS MONTH", "$8,560", "", "green"]],
    owns: [
      ["🔑", "Pipeline review", "Every deal, every next step"],
      ["✉️", "Follow-up drafts", "Written in your voice, sent on your say-so"],
    ],
  });
  const stale = rowItem(inner, "⏳", "Quote #148 · Marco Alvarez · $4,200",
    "Deck staining · sent 6 days ago, no reply",
    `<button class="btn" id="draft">Draft follow-up</button>`);
  stale.style.borderColor = "#E86A5E";

  $("#shell").classList.add("on");
  await sleep(1100);
  await toast("2 quotes have gone quiet — worth $6,350 combined", 1900);

  await go($("#draft"), 1000);
  const mail = add(inner, "div", "card fade-in", `
    <div style="padding:18px 24px">
      <div style="font-size:12px;color:#5B7282">To: marco.alvarez@gmail.com</div>
      <div style="font-weight:700;font-size:14.5px;margin-top:6px">Re: Deck staining quote — holding your June slot</div>
      <div id="body" style="font-size:13.5px;color:#15314A;margin-top:10px;line-height:1.65;min-height:60px"></div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn" id="send">Send</button>
        <button class="btn ghost">Edit</button>
      </div>
    </div>`, { marginTop: "16px" });
  await reveal(mail);
  await typeIn($("#body"),
    "Hi Marco — wanted to make sure the quote didn't get buried. We can still hold June 24–25 for the deck if that works. Happy to adjust the stain options if you'd like.", 55);
  await sleep(500);
  await go($("#send"), 900);
  $("#send").textContent = "Sent ✓";
  $("#send").style.background = "#2FC98A"; $("#send").style.color = "#fff";
  stale.style.borderColor = "rgba(14,36,54,0.08)";
  stale.querySelector(".ri-right").innerHTML = `<span class="chip green">FOLLOWED UP</span>`;
  await toast("Followed up — Sales Rep will nudge again Friday if it stays quiet");
  await sleep(600);
  await endCard();
  finish();
};

/* ── Marketer ── */
SCENES["marketer"] = async () => {
  await introCard("Your A2G <em>Marketer.</em>", "Content, reviews, referrals — your name keeps showing up, without you lifting a finger.");
  const { inner } = employeePage({
    team: "Marketer", icon: "📣", name: "Your A2G Marketer",
    sub: "Review requests, social posts, and referral nudges on autopilot.",
    replaces: "$3,000–$6,000/mo",
    stats: [["GOOGLE RATING", "4.8", "127 reviews"], ["REVIEW REQUESTS", "9", "sent this week", "ink"], ["REFERRALS", "3", "this month", "green"]],
    owns: [
      ["⭐", "Review engine", "Every finished job gets a polite ask"],
      ["🔁", "Referral nudges", "Happy customers, gently reminded"],
    ],
  });

  $("#shell").classList.add("on");
  await sleep(1100);

  await toast("Job completed: Harper gutters — review request sent 20 min later", 2000);
  const rev = add(inner, "div", "row-item fade-in", `
    <div class="ri-ic">⭐</div>
    <div><div class="ri-t">New 5-star review from S. Harper</div>
    <div class="ri-s">"Crew was in and out in a morning — gutters look brand new."</div></div>
    <div class="ri-right"><span class="chip green">+1 · NOW 128</span></div>`);
  await reveal(rev);
  const stats = document.querySelectorAll(".stat .v");
  stats[0].textContent = "4.8"; // rating stays
  await sleep(1300);

  const post = add(inner, "div", "card fade-in", `
    <div style="padding:18px 24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.3px;color:#5B7282">DRAFT · FACEBOOK + GOOGLE POST</div>
      <div id="pbody" style="font-size:13.5px;margin-top:8px;line-height:1.6;min-height:44px"></div>
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn" id="approve">Approve & schedule</button>
        <button class="btn ghost">Rewrite</button>
      </div>
    </div>`, { marginTop: "14px" });
  await reveal(post);
  await typeIn($("#pbody"),
    "Another Franklin home ready for storm season 🌧️ Gutter replacement + guards in one morning. June slots are almost gone — grab yours.", 55);
  await go($("#approve"), 900);
  $("#approve").textContent = "Scheduled ✓";
  $("#approve").style.background = "#2FC98A"; $("#approve").style.color = "#fff";
  await toast("Posting tomorrow 8 AM — best engagement window for your audience");
  await sleep(600);
  await endCard();
  finish();
};

/* ── Concierge ── */
SCENES["concierge"] = async () => {
  await introCard("Your A2G <em>Concierge.</em>", "Every visitor greeted, every question answered, every booking captured — 24/7.");
  const { inner } = employeePage({
    team: "Concierge", icon: "🛎️", name: "Your A2G Concierge",
    sub: "Answers your website and texts like someone who's worked for you for years.",
    replaces: "$2,500–$4,500/mo",
    stats: [["CHATS HANDLED", "31", "this week"], ["BOOKED FROM CHAT", "6", "jobs", "green"], ["AVG RESPONSE", "4s", "day or night", "ink"]],
    owns: [
      ["💬", "Website chat", "Trained on your services, prices, and area"],
      ["📅", "Slot-finder", "Offers real openings from your calendar"],
    ],
  });

  $("#shell").classList.add("on");
  await sleep(1000);

  const chat = add(inner, "div", "card", `<div style="padding:16px 22px" id="cwrap">
    <div style="font-size:11px;font-weight:700;letter-spacing:1.3px;color:#5B7282;margin-bottom:10px">LIVE · WEBSITE CHAT · 9:42 PM</div>
  </div>`, { marginTop: "16px" });
  const cwrap = $("#cwrap");
  const bub = (txt, me) => {
    const b = add(cwrap, "div", "fade-in",
      `<div style="display:inline-block;background:${me ? "#0E2436" : "#F7FAF9"};color:${me ? "#EAF3F1" : "#0E2436"};
        border:1px solid rgba(14,36,54,0.08);border-radius:12px;padding:10px 15px;font-size:13.5px;max-width:520px">${txt}</div>`,
      { textAlign: me ? "right" : "left", marginBottom: "8px" });
    return b;
  };
  const v1 = bub("Hi — do you guys service Franklin? Need a fence section replaced after the storm.", true);
  await reveal(v1);
  await sleep(1300);
  const c1 = bub("We do — Franklin's home turf for us. Storm damage like that is usually a half-day job. Want me to grab you a quote visit this week?", false);
  await reveal(c1);
  await sleep(1500);
  const slots = bub(`We have two openings: <b>Thu 3:00 PM</b> or <b>Sat 9:30 AM</b> — tap one to hold it.`, false);
  await reveal(slots);
  await sleep(1100);
  const v2 = bub("Saturday 9:30 works!", true);
  await reveal(v2);
  await sleep(900);
  const done = bub("Booked ✓ — you'll get a text confirmation right now. See you Saturday!", false);
  await reveal(done);
  await toast("New job on the calendar · lead created · you were never woken up");
  await sleep(800);
  await endCard();
  finish();
};

/* ── Accountant ── */
SCENES["accountant"] = async () => {
  await introCard("Your A2G <em>Accountant.</em>", "Live bookkeeping, chased invoices, and a cash picture you can trust at a glance.");
  const { inner } = employeePage({
    team: "Accountant", icon: "🧾", name: "Your A2G Accountant",
    sub: "Income, expenses, invoices, and quotes kept current — synced with QuickBooks.",
    replaces: "$2,000–$5,000/mo",
    stats: [["CASH IN · JUNE", "$52,400", "", "green"], ["CASH OUT", "$35,580", "", "ink"], ["UNPAID INVOICES", "3", "$4,750 outstanding", "red"]],
    owns: [
      ["🔄", "QuickBooks sync", "Reconciled nightly, no shoebox required"],
      ["📊", "Reports that arrive", "Weekly and monthly, in plain English"],
    ],
  });
  const inv = rowItem(inner, "⚠️", "Invoice #214 · Brooks · $1,150",
    "Due June 11 · 6 days overdue",
    `<button class="btn" id="remind">Send reminder</button>`);
  inv.style.borderColor = "#E86A5E";

  $("#shell").classList.add("on");
  await sleep(1100);
  await toast("Nightly sync done — 14 transactions categorized, zero left for you", 2000);

  await go($("#remind"), 1000);
  const note = add(inner, "div", "card fade-in", `
    <div style="padding:16px 22px">
      <div style="font-size:12px;color:#5B7282">To: brooks.family@icloud.com</div>
      <div id="rb" style="font-size:13.5px;margin-top:8px;line-height:1.6;min-height:40px"></div>
    </div>`, { marginTop: "14px" });
  await reveal(note);
  await typeIn($("#rb"),
    "Hi Alicia — friendly nudge that invoice #214 ($1,150) was due June 11. Here's the payment link if it slipped through. Thanks again!", 55);
  await sleep(500);
  inv.querySelector(".ri-right").innerHTML = `<span class="chip green">REMINDER SENT</span>`;
  inv.style.borderColor = "rgba(14,36,54,0.08)";
  await toast("Sent with a payment link — 82% of these get paid within 48 hours");
  await sleep(700);
  const paid = add(inner, "div", "row-item fade-in", `
    <div class="ri-ic">💵</div>
    <div><div class="ri-t">Payment received · $1,150</div><div class="ri-s">Invoice #214 · Stripe · just now</div></div>
    <div class="ri-right"><span class="chip green">RECONCILED ✓</span></div>`);
  await reveal(paid);
  await sleep(1000);
  await endCard();
  finish();
};

/* ── Ops Manager ── */
SCENES["ops-manager"] = async () => {
  await introCard("Your A2G <em>Ops Manager.</em>", "Crews, checklists, and job status — the day runs on rails, not on memory.");
  const { inner } = employeePage({
    team: "Ops Manager", icon: "⚙️", name: "Your A2G Ops Manager",
    sub: "Every job staged, staffed, and tracked from booked to paid.",
    replaces: "$3,500–$6,500/mo",
    stats: [["JOBS TODAY", "4", "2 crews"], ["ON SCHEDULE", "3", "", "green"], ["NEEDS ATTENTION", "1", "materials short", "red"]],
    owns: [
      ["📋", "Job checklists", "Prep, on-site, wrap-up — nothing skipped"],
      ["🚚", "Crew dispatch", "Right people, right stop, right order"],
    ],
  });
  const flag = rowItem(inner, "🚨", "Alvarez deck job · materials short",
    "Stain (2 gal) not on truck A — Home Depot Franklin has 6 in stock",
    `<button class="btn" id="fix">Fix it</button>`);
  flag.style.borderColor = "#E86A5E";

  $("#shell").classList.add("on");
  await sleep(1100);
  await toast("Morning check: crews clocked in, trucks loaded — one flag raised", 2000);

  await go($("#fix"), 1000);
  const plan = add(inner, "div", "card fade-in", `
    <div style="padding:16px 22px;font-size:13.5px;line-height:1.8">
      <b>Ops Manager's plan:</b><br/>
      <span id="s1">◻ Add Home Depot stop before Alvarez — 9 min detour</span><br/>
      <span id="s2">◻ Text crew lead the pickup order + SKU</span><br/>
      <span id="s3">◻ Push Alvarez ETA from 12:30 → 12:45, notify customer</span>
    </div>`, { marginTop: "14px" });
  await reveal(plan);
  await sleep(900);
  for (const id of ["s1", "s2", "s3"]) {
    const s = $("#" + id);
    s.innerHTML = "✅ " + s.textContent.slice(2);
    s.style.color = "#1F9466";
    await sleep(750);
  }
  flag.querySelector(".ri-right").innerHTML = `<span class="chip green">HANDLED</span>`;
  flag.style.borderColor = "rgba(14,36,54,0.08)";
  await toast("Crisis averted in 40 seconds — day still ends on time");
  await sleep(700);
  await endCard();
  finish();
};

/* ── Secretary ── */
SCENES["secretary"] = async () => {
  await introCard("Your A2G <em>Secretary.</em>", "Inbox, calendar, missed calls — caught and triaged before lunch.");
  const { inner } = employeePage({
    team: "Secretary", icon: "📇", name: "Your A2G Secretary",
    sub: "Inbox, calendar, missed calls — caught and triaged before lunch.",
    replaces: "$1,500–$4,000/mo",
    stats: [["MISSED CALLS (24H)", "0", "Auto-text-back fired"], ["VOICEMAILS TO TRIAGE", "0", "Transcribed by AI"], ["UPCOMING JOBS (7D)", "11", "Each one gets a reminder", "ink"]],
    owns: [
      ["📧", "Inbox triage", "Gmail + Outlook · sorted by priority"],
      ["📞", "Missed calls", "Auto-text-back + voicemail transcripts"],
    ],
  });

  $("#shell").classList.add("on");
  await sleep(1100);

  // missed call arrives
  await toast("📞 Incoming call — you're on a roof, it rings out", 1900);
  const stats = document.querySelectorAll(".stat .v");
  stats[0].textContent = "1";
  const call = rowItem(inner, "📞", "Missed call · (615) 555-0197 · 11:42 AM",
    "Auto-text-back sent in 8 seconds: \"Sorry we missed you — text us here and we'll get right back.\"",
    `<span class="chip aqua">TEXT-BACK SENT</span>`);
  call.classList.add("fade-in"); await reveal(call);
  await sleep(1600);

  const vm = rowItem(inner, "🎙️", "Voicemail transcribed",
    "\"Hi, this is Carla Jenkins — we've got a leaning fence on Cedar Lane, hoping someone can look this week.\"",
    `<span class="chip green">LEAD CREATED</span>`);
  vm.classList.add("fade-in"); await reveal(vm);
  stats[1].textContent = "1";
  await sleep(1600);

  const inbox = rowItem(inner, "📧", "Inbox this morning: 22 emails",
    "3 need you · 6 answered by Secretary · 13 filed. Top of the pile: the county permit reply.",
    `<span class="chip yellow">3 FOR YOU</span>`);
  inbox.classList.add("fade-in"); await reveal(inbox);
  await sleep(1200);
  await toast("Nothing slipped — and you never left the roof");
  await sleep(600);
  await endCard();
  finish();
};

/* ── HR ── */
SCENES["hr"] = async () => {
  await introCard("Your A2G <em>HR.</em>", "Hiring paperwork, onboarding, and timesheets — the parts of growing a crew nobody warns you about.");
  const { inner } = employeePage({
    team: "HR", icon: "🧑‍🤝‍🧑", name: "Your A2G HR",
    sub: "From offer letter to first clock-in, every step tracked.",
    replaces: "$2,000–$4,000/mo",
    stats: [["CREW", "6", "+1 starting Monday", "ink"], ["TIMESHEETS", "6/6", "approved for this week", "green"], ["COMPLIANCE", "OK", "W-9s, insurance current", "green"]],
    owns: [
      ["🗂️", "Onboarding", "Docs collected, schedules set, nothing chased twice"],
      ["⏱️", "Timesheets", "Collected Friday, summarized for payroll"],
    ],
  });
  const cardEl = add(inner, "div", "card", `
    <div style="padding:16px 22px">
      <div style="font-weight:700;font-size:14.5px">Onboarding · Jake Morrison · starts Monday</div>
      <div style="font-size:13.5px;line-height:1.9;margin-top:8px">
        <span id="h1">◻ Offer letter signed</span><br/>
        <span id="h2">◻ W-9 + direct deposit collected</span><br/>
        <span id="h3">◻ Added to Crew A schedule</span><br/>
        <span id="h4">◻ First-day plan texted Sunday 6 PM</span>
      </div>
    </div>`, { marginTop: "16px" });

  $("#shell").classList.add("on");
  await sleep(1100);
  await toast("New hire accepted your offer — HR started onboarding automatically", 2000);

  for (const id of ["h1", "h2", "h3"]) {
    const s = $("#" + id);
    await sleep(850);
    s.innerHTML = "✅ " + s.textContent.slice(2);
    s.style.color = "#1F9466";
  }
  await sleep(700);
  const h4 = $("#h4");
  h4.innerHTML = "🕕 " + h4.textContent.slice(2) + " — scheduled";
  await sleep(900);

  const ts = rowItem(inner, "⏱️", "Week 24 timesheets ready",
    "6 crew · 238 hours · 4.5 OT flagged for your OK",
    `<button class="btn" id="appr">Approve all</button>`);
  ts.classList.add("fade-in"); await reveal(ts);
  await go($("#appr"), 1000);
  $("#appr").textContent = "Approved ✓";
  $("#appr").style.background = "#2FC98A"; $("#appr").style.color = "#fff";
  await toast("Payroll summary sent to your bookkeeper — done before coffee");
  await sleep(600);
  await endCard();
  finish();
};

/* runner */
(async () => {
  const name = new URLSearchParams(location.search).get("scene");
  await SCENES[name]();
})();
