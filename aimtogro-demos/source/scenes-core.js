/* AimToGro demo scenes — core pages */
const SCENES = {};

/* ── Dashboard ── */
SCENES["dashboard"] = async () => {
  await introCard("The team <em>dashboard.</em>", "Your whole back office on one screen — numbers, workflows, and your AI team.");
  const inner = buildShell({ active: "dashboard" });

  add(inner, "div", "h-greet", "Good to see you, Dillon.");
  add(inner, "div", "h-sub", "Your command center — pinned widgets and workflows up top, your team below.");

  add(inner, "div", "sec-title", "Your dashboard");
  add(inner, "div", "sec-sub", "Pinned charts and data. Add or remove from any employee's workspace.");
  const strip = statStrip(inner, [
    ["FRESH LEADS", "0", ""], ["STALE FOLLOW-UPS", "0", ""], ["OPEN QUOTES", "0", ""], ["ACTIVE JOBS", "0", ""]]);
  const vals = strip.querySelectorAll(".v");

  add(inner, "div", "sec-title", "Pinned workflows");
  const grid = add(inner, "div", "wf-grid");
  const wf1 = add(grid, "div", "wf-card live", `<div class="ic">🔑</div><h4>Pipeline Review</h4>
    <p>See where every active deal stands and what to do next.</p><div class="run">Tap to run</div>`);
  add(grid, "div", "wf-card", `<div class="ic">🧰</div><h4>Proposal Builder</h4>
    <p>Full-length proposal for bigger opportunities.</p><div class="run">Tap to run</div>`);

  add(inner, "div", "sec-title", "Your team");
  const tg = add(inner, "div", "team-grid");
  const t1 = add(tg, "div", "team-card", `<div class="tc-top"><div class="tc-ic">👑</div>
    <div><div class="tc-tag">ALWAYS ON</div><div class="tc-name">Your A2G CEO</div></div></div>
    <p>The strategic advisor in your corner every morning.</p>`);
  const t2 = add(tg, "div", "team-card", `<div class="tc-top"><div class="tc-ic">📈</div>
    <div><div class="tc-tag">HIRED</div><div class="tc-name">Your A2G Sales Rep</div></div></div>
    <p>Quote, follow up, close — your pipeline never goes quiet.</p>`);
  const t3 = add(tg, "div", "team-card", `<div class="tc-top"><div class="tc-ic">📣</div>
    <div><div class="tc-tag">HIRED</div><div class="tc-name">Your A2G Marketer</div></div></div>
    <p>Content, reviews, referrals — your name keeps showing up.</p>`);

  $("#shell").classList.add("on");
  await sleep(700);

  // numbers land
  countUp(vals[0], 3); countUp(vals[1], 2); countUp(vals[2], 4); await countUp(vals[3], 6);
  await sleep(700);

  // run Pipeline Review
  await go(wf1, 1000);
  await toast("Pipeline Review running — 3 deals need a nudge today");
  await sleep(400);

  // glance at the team
  for (const t of [t1, t2, t3]) { t.style.transition = "all 0.3s"; }
  await go(t1, 800); t1.style.borderColor = "#46C8E6";
  await sleep(500);
  await moveTo(1250, 760, 800);
  await toast("Everything above is live — pulled from your real tools", 1700);
  await sleep(300);
  await endCard();
  finish();
};

/* ── Daily Meeting · CEO ── */
SCENES["ceo"] = async () => {
  await introCard("Daily Meeting with your <em>A2G CEO.</em>", "A five-minute standup with an advisor who knows your goals, your numbers, and what matters today.");
  const inner = buildShell({ active: "ceo" });

  add(inner, "div", "h-greet", "Daily Meeting");
  add(inner, "div", "h-sub", "Wednesday, June 17 · Your A2G CEO is ready.");
  const chat = add(inner, "div", "chat", "", { marginTop: "26px" });

  const msg = (who, cls) => {
    const m = add(chat, "div", "msg " + cls, `<div class="who">${who}</div><div class="bubble"></div>`);
    return m;
  };

  $("#shell").classList.add("on");
  await sleep(600);

  const m1 = msg("👑", "");
  m1.classList.add("on");
  const b1 = m1.querySelector(".bubble");
  await typeIn(b1, "Morning, Dillon. Revenue is at $412,300 — 87% of the way to your $475k goal with 19 weeks left.", 62);
  b1.insertAdjacentHTML("beforeend", `<div class="progress"><i id="pg"></i></div>
    <div style="font-size:12px;color:#5B7282">$412,300 of $475,000</div>`);
  await sleep(150);
  $("#pg").style.width = "87%";
  await sleep(900);

  const m2 = msg("👑", "");
  m2.classList.add("on");
  await typeIn(m2.querySelector(".bubble"),
    "Three things today: 1) Two quotes worth $8,400 have gone quiet — say the word and Sales Rep chases them. 2) Invoice #214 is 6 days overdue. 3) Thursday is booked solid — I'd protect it.", 62);
  await sleep(700);

  const m3 = msg("D", "me");
  m3.classList.add("on");
  await typeIn(m3.querySelector(".bubble"), "Do all three. Keep Thursday clear.", 40);
  await sleep(800);

  const m4 = msg("👑", "");
  m4.classList.add("on");
  const b4 = m4.querySelector(".bubble");
  await typeIn(b4, "Done. Sales Rep is drafting both follow-ups, Accountant sent the invoice reminder, and Thursday is blocked off.", 62);
  b4.insertAdjacentHTML("beforeend", `<div style="margin-top:10px;display:flex;gap:8px">
    <span class="chip green">FOLLOW-UPS DRAFTED</span><span class="chip green">REMINDER SENT</span>
    <span class="chip aqua">THURSDAY PROTECTED</span></div>`);
  await sleep(1100);
  await toast("Standup logged — your team is already moving");
  await endCard();
  finish();
};

/* ── Command center ── */
SCENES["command-center"] = async () => {
  await introCard("The <em>command center.</em>", "Pin the widgets and workflows you actually use — and shape the cockpit around your morning.");
  const inner = buildShell({ active: "dashboard" });

  add(inner, "div", "h-greet", "Command center");
  add(inner, "div", "h-sub", "Pinned widgets and workflows up top. Drag to reorder, group into named sections.");

  const bar = add(inner, "div", "", "", { display: "flex", justifyContent: "flex-end", margin: "18px 0 10px" });
  const customize = add(bar, "button", "btn ghost", "✏️ Customize layout");

  const strip = statStrip(inner, [
    ["CASH POSITION", "$18,240", "Updated 9:02 AM", "green"],
    ["FRESH LEADS", "3", "2 from missed calls"],
    ["OPEN QUOTES", "4", "$13,900 in play"]]);

  add(inner, "div", "sec-title", "Morning routine");
  const grid = add(inner, "div", "wf-grid");
  const w1 = add(grid, "div", "wf-card live", `<div class="ic">🔑</div><h4>Pipeline Review</h4>
    <p>Where every deal stands, and the next move for each.</p><div class="run">Tap to run</div>`);
  add(grid, "div", "wf-card", `<div class="ic">🧾</div><h4>Invoice Sweep</h4>
    <p>Anything unpaid, chased politely before 10 AM.</p><div class="run">Tap to run</div>`);

  $("#shell").classList.add("on");
  await sleep(800);

  // customize mode
  await go(customize, 1000);
  [strip, w1].forEach((c) => { c.style.transition = "all 0.3s"; c.style.borderColor = "#46C8E6"; c.style.borderStyle = "dashed"; });
  await toast("Edit mode — drag widgets, pin new ones, name your sections");
  await sleep(300);

  // pin a widget
  const picker = add(inner, "div", "card", `
    <div style="padding:16px 20px;font-weight:700;font-size:14px">Pin a widget</div>
    <div style="display:flex;gap:10px;padding:0 20px 18px">
      <span class="chip aqua" id="pk1" style="font-size:12px;padding:9px 16px">📅 Week ahead</span>
      <span class="chip green" id="pk2" style="font-size:12px;padding:9px 16px">⭐ Review score</span>
      <span class="chip yellow" style="font-size:12px;padding:9px 16px">📉 Expenses MTD</span>
    </div>`, { marginTop: "16px" });
  await reveal(picker);
  await go($("#pk1"), 900);
  picker.remove();
  const neu = add(strip, "div", "stat fade-in", `<div class="k">WEEK AHEAD</div><div class="v ink">11</div><div class="n">jobs scheduled</div>`);
  await reveal(neu);
  await sleep(600);

  // done
  [strip, w1].forEach((c) => { c.style.borderStyle = "solid"; c.style.borderColor = "rgba(14,36,54,0.08)"; });
  await go(customize, 800);
  customize.textContent = "✓ Layout saved";
  await toast("Command center saved — it'll look like this every morning");
  await sleep(400);
  await endCard();
  finish();
};

/* ── Settings ── */
SCENES["settings"] = async () => {
  await introCard("Settings that <em>respect your evenings.</em>", "Verify your phone, pick which alerts matter, set quiet hours. Aimtogro only texts when it counts.");
  const inner = buildShell({ active: "dashboard" });

  add(inner, "div", "", `<span style="font-size:13px;color:#5B7282">← Dashboard</span>`, { marginBottom: "8px" });
  add(inner, "div", "", `<span class="chip aqua">SETTINGS</span>`, { marginBottom: "8px" });
  add(inner, "div", "h-greet", "SMS notifications");
  add(inner, "div", "h-sub", "Get a text when something needs you — overdue invoices, stale quotes, new leads from missed calls.");

  const phone = add(inner, "div", "card", `
    <div style="padding:20px 24px 6px;font-weight:700;font-size:15px">📞 Your phone</div>
    <div style="display:flex;gap:12px;padding:10px 24px 20px">
      <div id="ph" style="flex:1;border:1.5px solid rgba(14,36,54,0.15);border-radius:8px;padding:12px 16px;font-size:15px;color:#5B7282"></div>
      <button class="btn dark" id="sendcode">Send code</button>
    </div>`, { marginTop: "18px" });

  const list = add(inner, "div", "card", `<div style="padding:18px 24px 4px;font-weight:700;font-size:15px">Alerts</div>`, { marginTop: "16px" });
  const mk = (t, s) => {
    const r = add(list, "div", "", `
      <div><div style="font-size:14.5px;font-weight:600">${t}</div>
      <div style="font-size:12px;color:#5B7282">${s}</div></div>
      <div class="tog"><i></i></div>`,
      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 24px", borderTop: "1px solid rgba(14,36,54,0.06)" });
    return r.querySelector(".tog");
  };
  const t1 = mk("Overdue invoices", "When an invoice goes past due");
  const t2 = mk("Stale quotes", "Sent quotes with no response 5+ days");
  const t3 = mk("Voicemail leads", "New lead from a missed call");
  const t4 = mk("Daily standup reminder", "Quick AM nudge to log your standup");

  $("#shell").classList.add("on");
  await sleep(700);

  // type phone + verify
  await moveTo(700, 318, 900);
  await typeIn($("#ph"), "(629) 555-0184", 26);
  $("#ph").style.color = "#0E2436";
  await go($("#sendcode"), 700);
  $("#sendcode").textContent = "Verified ✓";
  $("#sendcode").style.background = "#2FC98A"; $("#sendcode").style.color = "#fff";
  await toast("Phone verified");

  // flip toggles
  for (const t of [t1, t2, t3]) {
    await go(t, 800);
    t.classList.add("on");
    await sleep(220);
  }
  await moveTo(1240, 780, 700);
  await sleep(300);
  const quiet = add(inner, "div", "row-item fade-in", `
    <div class="ri-ic">🌙</div>
    <div><div class="ri-t">Quiet hours</div><div class="ri-s">No texts between 9:00 PM and 7:00 AM</div></div>
    <div class="ri-right"><span class="chip green">ON</span></div>`, { marginTop: "16px" });
  await reveal(quiet);
  await toast("Saved — you'll only hear from us when it matters");
  await sleep(400);
  await endCard();
  finish();
};

/* ── CRM · Contacts ── */
SCENES["crm-contacts"] = async () => {
  await introCard("Every customer, <em>remembered.</em>", "The contacts page keeps history, notes, and next steps — so nobody falls through the cracks.");
  const inner = buildShell({ active: "contacts" });

  add(inner, "div", "h-greet", "Contacts");
  add(inner, "div", "h-sub", "247 people — customers, leads, and vendors, kept current automatically.");

  const bar = add(inner, "div", "", `
    <div id="search" style="flex:1;max-width:420px;border:1.5px solid rgba(14,36,54,0.15);border-radius:8px;padding:11px 16px;font-size:14px;color:#5B7282">🔍 <span id="q"></span></div>
    <button class="btn">+ New contact</button>`,
    { display: "flex", gap: "12px", margin: "18px 0 14px", alignItems: "center" });

  const tbl = add(inner, "table", "tbl");
  tbl.innerHTML = `<tr><th>NAME</th><th>LAST JOB</th><th>LIFETIME VALUE</th><th>TAGS</th></tr>`;
  const data = [
    ["Henderson, Paula", "Gutter replacement · May 28", "$6,180", '<span class="chip aqua">REPEAT</span>'],
    ["Alvarez, Marco", "Deck staining · Jun 2", "$2,340", ""],
    ["Whitfield, Dana", "Fence repair · Jun 9", "$980", '<span class="chip green">NEW</span>'],
    ["Nguyen, Tommy", "Pressure wash · Jun 11", "$450", ""],
    ["Brooks, Alicia", "Roof inspection · Jun 14", "$310", ""],
  ];
  const rows = data.map(([n, j, v, tg]) => {
    const tr = el("tr", "", `<td><b>${n}</b></td><td>${j}<div class="sub">Completed</div></td><td class="num">${v}</td><td>${tg}</td>`);
    tbl.appendChild(tr);
    return tr;
  });

  $("#shell").classList.add("on");
  await sleep(800);

  // search filters
  await moveTo(560, 296, 800);
  await typeIn($("#q"), "Henderson", 22);
  rows.slice(1).forEach((r) => { r.style.transition = "opacity 0.4s"; r.style.opacity = "0.14"; });
  rows[0].classList.add("hl");
  await sleep(900);

  // open the contact
  await go(rows[0].firstChild, 800);
  const drawer = add(inner, "div", "card fade-in", `
    <div style="padding:20px 26px;display:flex;gap:16px;align-items:center;border-bottom:1px solid rgba(14,36,54,0.08)">
      <div class="avatar" style="width:44px;height:44px;font-size:18px;background:#FFD23F">PH</div>
      <div><div style="font-size:18px;font-weight:700">Paula Henderson</div>
      <div style="font-size:12.5px;color:#5B7282">(615) 555-0142 · paula.h@gmail.com · Franklin, TN</div></div>
      <div style="margin-left:auto" id="tagbtn"><button class="btn ghost">+ Tag</button></div>
    </div>
    <div style="display:flex;gap:26px;padding:16px 26px">
      <div style="flex:1"><div style="font-size:11px;font-weight:700;letter-spacing:1.2px;color:#5B7282">HISTORY</div>
        <div style="font-size:13.5px;margin-top:8px;line-height:1.7">Gutter replacement — $6,180 · May 28<br/>Spring package — $2,900 · Mar 14<br/>First job — $1,150 · Nov 2025</div></div>
      <div style="flex:1"><div style="font-size:11px;font-weight:700;letter-spacing:1.2px;color:#5B7282">NOTES (AI-KEPT)</div>
        <div style="font-size:13.5px;margin-top:8px;line-height:1.7">Prefers texts over calls. Two rentals on Maple St — asks for bundled pricing. Referred the Whitfields.</div></div>
    </div>`, { marginTop: "16px" });
  await reveal(drawer);
  await sleep(1400);

  // add VIP tag
  await go($("#tagbtn"), 800);
  const th = drawer.querySelector("#tagbtn");
  th.innerHTML = `<span class="chip yellow" style="font-size:12px;padding:8px 16px">★ VIP</span>`;
  await toast("Tagged VIP — Marketer will treat her like one");
  await sleep(500);
  await endCard();
  finish();
};

/* ── CRM · Leads ── */
SCENES["crm-leads"] = async () => {
  await introCard("Leads that <em>never go cold.</em>", "Every call, form, and referral lands here — and your Sales Rep keeps them moving.");
  const inner = buildShell({ active: "contacts" });

  add(inner, "div", "h-greet", "Leads");
  add(inner, "div", "h-sub", "Your pipeline at a glance. New leads arrive on their own — even from missed calls.");

  const kb = add(inner, "div", "kb", "", { marginTop: "20px" });
  const col = (t, n) => {
    const c = add(kb, "div", "kb-col", `<h5>${t}<span>${n}</span></h5>`);
    return c;
  };
  const cNew = col("NEW", "2"), cCon = col("CONTACTED", "1"), cQuo = col("QUOTED", "2"), cWon = col("WON · JUNE", "3");
  const card = (c, n, d, v) => add(c, "div", "kb-card", `<div class="n">${n}</div><div class="d">${d}</div>${v ? `<div class="v">${v}</div>` : ""}`);
  card(cNew, "Dana Whitfield", "Website form · fence repair", "$—");
  card(cNew, "Ray Osei", "Referral from Paula H.", "$—");
  card(cCon, "Tommy Nguyen", "Texted back · wants Sat quote", "$450 est");
  card(cQuo, "Marco Alvarez", "Quote #148 · sent 6 days ago", "$4,200");
  card(cQuo, "Lena Fox", "Quote #151 · sent yesterday", "$2,150");
  card(cWon, "Brooks · roof insp.", "Closed Jun 14", "$310");
  card(cWon, "Harper · gutters", "Closed Jun 10", "$3,900");
  card(cWon, "Diaz · pressure wash", "Closed Jun 6", "$450");

  $("#shell").classList.add("on");
  await sleep(900);

  // a missed call becomes a lead
  await toast("📞 Missed call from (615) 555-0197 — auto-text-back sent", 2100);
  const fresh = card(cNew, "Carla Jenkins", "Missed call · voicemail transcribed", "$—");
  fresh.style.borderColor = "#46C8E6"; fresh.classList.add("pulse");
  cNew.querySelector("h5 span").textContent = "3";
  await sleep(1400);

  // drag it to Contacted
  await go(fresh, 900);
  fresh.classList.remove("pulse");
  fresh.style.opacity = "0.35";
  const ghost = add(cCon, "div", "kb-card fade-in", fresh.innerHTML);
  ghost.style.borderColor = "#2FC98A";
  await reveal(ghost);
  fresh.remove();
  cNew.querySelector("h5 span").textContent = "2";
  cCon.querySelector("h5 span").textContent = "2";
  await sleep(600);
  await toast("Sales Rep drafted the intro text — review or let it send at 9 AM");
  await sleep(500);
  await endCard();
  finish();
};

/* ── Jobs · routing ── */
SCENES["jobs-routing"] = async () => {
  await introCard("Routing on the <em>jobs page.</em>", "Four stops, one button — Aimtogro orders the day so your crew drives less and does more.");
  const inner = buildShell({ active: "jobs" });

  add(inner, "div", "h-greet", "Jobs · Today's route");
  add(inner, "div", "h-sub", "Thursday, June 18 · Crew A · 4 stops");

  const wrap = add(inner, "div", "", "", { display: "flex", gap: "18px", marginTop: "18px" });
  const list = add(wrap, "div", "", "", { width: "380px", flex: "none" });
  const stops = [
    ["1", "Henderson · Franklin", "Gutter tune-up · 8:30 AM"],
    ["2", "Nguyen · Brentwood", "Pressure wash · 10:15 AM"],
    ["3", "Alvarez · Franklin", "Deck staining · 12:30 PM"],
    ["4", "Fox · Nolensville", "Fence quote walk · 3:00 PM"],
  ].map(([n, t, s]) => rowItem(list, n, t, s));
  const optimize = add(list, "button", "btn", "⚡ Optimize route", { width: "100%", justifyContent: "center", marginTop: "4px" });

  const map = add(wrap, "div", "map", `<svg width="700" height="470">
      <path id="route" d="M 80 400 L 300 120 L 210 330 L 560 90 L 620 380" fill="none" stroke="#46C8E6" stroke-width="5" stroke-dasharray="10 8" stroke-linecap="round" opacity="0.9"/>
    </svg>`, { flex: "1", height: "470px" });
  const pin = (x, y, n, cls) => {
    const p = add(map, "div", "pin " + (cls || ""), `<span>${n}</span>`);
    p.style.left = x + "px"; p.style.top = y + "px";
    return p;
  };
  pin(80, 400, "🏠", "depot");
  const p1 = pin(300, 120, "1"), p2 = pin(210, 330, "2"), p3 = pin(560, 90, "3"), p4 = pin(620, 380, "4");

  $("#shell").classList.add("on");
  await sleep(1100);
  await toast("Current order crisscrosses town — 96 miles, 2 h 45 m drive", 2100);

  // optimize
  await go(optimize, 1000);
  optimize.textContent = "⚡ Optimizing…";
  await sleep(900);
  // reorder pins: depot -> (2) -> (1) -> (3) -> (4) becomes sequential path
  $("#route").setAttribute("d", "M 80 400 L 210 330 L 300 120 L 560 90 L 620 380");
  $("#route").setAttribute("stroke", "#2FC98A");
  $("#route").setAttribute("stroke-dasharray", "none");
  p2.querySelector("span").textContent = "1";
  p1.querySelector("span").textContent = "2";
  p3.querySelector("span").textContent = "3";
  p4.querySelector("span").textContent = "4";
  // reorder list rows
  const l = stops.map((r) => r.querySelector(".ri-t"));
  l[0].textContent = "Nguyen · Brentwood"; stops[0].querySelector(".ri-s").textContent = "Pressure wash · 8:30 AM";
  l[1].textContent = "Henderson · Franklin"; stops[1].querySelector(".ri-s").textContent = "Gutter tune-up · 10:00 AM";
  l[2].textContent = "Alvarez · Franklin"; stops[2].querySelector(".ri-s").textContent = "Deck staining · 11:45 AM";
  l[3].textContent = "Fox · Nolensville"; stops[3].querySelector(".ri-s").textContent = "Fence quote walk · 2:15 PM";
  stops.forEach((r) => { r.style.transition = "all 0.3s"; r.style.borderColor = "#2FC98A"; });
  optimize.textContent = "✓ Route optimized";
  optimize.style.background = "#2FC98A"; optimize.style.color = "#fff";
  await sleep(700);
  await toast("New order saves 38 minutes and 21 miles — customers texted new ETAs");
  await sleep(1300);
  await endCard();
  finish();
};

/* ── Calendar ── */
SCENES["calendar"] = async () => {
  await introCard("A calendar that <em>talks back.</em>", "Drag a job, and the confirmation text writes itself. Your week, handled.");
  const inner = buildShell({ active: "jobs" });

  add(inner, "div", "h-greet", "Calendar");
  add(inner, "div", "h-sub", "Week of June 15 · 11 jobs scheduled · Thursday protected");

  const cal = add(inner, "div", "cal", "", { marginTop: "18px" });
  const days = ["", "MON 15", "TUE 16", "WED · TODAY", "THU 18", "FRI 19"];
  days.forEach((d, i) => add(cal, "div", "hd" + (i === 3 ? " today" : ""), d));
  const times = ["9 AM", "11 AM", "1 PM", "3 PM"];
  const cells = [];
  times.forEach((t, r) => {
    add(cal, "div", "slot time", t);
    for (let c = 0; c < 5; c++) cells.push(add(cal, "div", "slot"));
  });
  const evt = (r, c, txt, color, h = 1) => {
    const e = add(cells[r * 5 + c], "div", "evt", txt);
    e.style.top = "4px"; e.style.height = h * 64 - 10 + "px"; e.style.background = color;
    return e;
  };
  evt(0, 0, "Harper · gutters", "#1F9466");
  evt(1, 1, "Nguyen · wash", "#46C8E6");
  evt(0, 2, "Alvarez · deck day 1", "#0E2436", 2);
  const thb = evt(0, 3, "PROTECTED · buffer day", "rgba(255,210,63,0.9)", 4);
  thb.style.color = "#081726";
  const mv = evt(2, 2, "Fox · fence walk", "#E86A5E");

  $("#shell").classList.add("on");
  await sleep(1100);
  await toast("Wednesday is overloaded — Fox clashes with the Alvarez deck job", 2000);

  // drag Fox event to Friday 11am
  await go(mv, 900);
  const target = cells[1 * 5 + 4];
  const tb = target.getBoundingClientRect(), mb = mv.getBoundingClientRect();
  mv.style.transform = `translate(${tb.left - mb.left + 4}px, ${tb.top - mb.top + 4}px)`;
  await moveTo(tb.left + tb.width / 2, tb.top + 30, 900);
  await sleep(300);
  target.appendChild(mv);
  mv.style.transform = "none"; mv.style.top = "4px"; mv.style.background = "#1F9466";
  await click();
  await sleep(400);

  const sms = add(inner, "div", "row-item fade-in", `
    <div class="ri-ic">💬</div>
    <div><div class="ri-t">Draft to Lena Fox</div>
    <div class="ri-s">"Hi Lena — moving your fence walk to Fri 11 AM so we can give it full attention. Still good?"</div></div>
    <div class="ri-right"><button class="btn" id="sendsms">Send</button></div>`, { marginTop: "16px" });
  await reveal(sms);
  await go($("#sendsms"), 900);
  $("#sendsms").textContent = "Sent ✓";
  $("#sendsms").style.background = "#2FC98A"; $("#sendsms").style.color = "#fff";
  await toast("Rescheduled + confirmed — calendar and route updated everywhere");
  await sleep(500);
  await endCard();
  finish();
};

/* ── P&L + receipts ── */
SCENES["pnl-receipts"] = async () => {
  await introCard("The P&L that <em>keeps itself.</em>", "Snap a receipt, watch it land in the right line. Your profit is never a mystery again.");
  const inner = buildShell({ active: "dashboard" });

  add(inner, "div", "h-greet", "Profit & Loss · June");
  add(inner, "div", "h-sub", "Live from QuickBooks, Stripe, and your receipts. Updated 4 minutes ago.");

  const wrap = add(inner, "div", "", "", { display: "flex", gap: "18px", marginTop: "18px" });
  const left = add(wrap, "div", "", "", { flex: "1" });
  const tbl = add(left, "table", "tbl");
  tbl.innerHTML = `
    <tr><th>LINE</th><th style="text-align:right">JUNE</th><th style="text-align:right">VS MAY</th></tr>
    <tr><td><b>Income</b></td><td class="num">$52,400</td><td class="num" style="color:#1F9466">+8%</td></tr>
    <tr><td>Materials</td><td class="num" id="mat">$11,830</td><td class="num">+3%</td></tr>
    <tr><td>Labor</td><td class="num">$16,200</td><td class="num">+5%</td></tr>
    <tr><td>Fuel & vehicles</td><td class="num">$2,940</td><td class="num" style="color:#1F9466">−4%</td></tr>
    <tr><td>Overhead</td><td class="num">$4,610</td><td class="num">0%</td></tr>
    <tr class="hl"><td><b>Net profit</b></td><td class="num" id="net"><b>$16,820</b></td><td class="num" style="color:#1F9466"><b>+14%</b></td></tr>`;

  const right = add(wrap, "div", "", "", { width: "400px", flex: "none" });
  const drop = add(right, "div", "card", `
    <div style="padding:22px;text-align:center">
      <div style="font-size:30px">🧾</div>
      <div style="font-weight:700;font-size:15px;margin-top:8px">Add a receipt</div>
      <div style="font-size:12.5px;color:#5B7282;margin-top:4px">Snap it, forward it, or drop it here.<br/>The Accountant does the rest.</div>
      <button class="btn" id="upload" style="margin-top:14px">Upload receipt</button>
    </div>`);

  $("#shell").classList.add("on");
  await sleep(1000);

  // upload receipt
  await go($("#upload"), 1000);
  const rec = add(right, "div", "card fade-in", `
    <div style="padding:18px 22px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <b style="font-size:14.5px">Home Depot</b><span class="chip aqua">SCANNING…</span></div>
      <div id="lines" style="font-size:13px;color:#5B7282;margin-top:10px;line-height:1.8"></div>
    </div>`, { marginTop: "14px" });
  await reveal(rec);
  await sleep(900);
  const lines = rec.querySelector("#lines");
  lines.innerHTML = `2× gutter guard 25 ft — $96.00<br/>Fasteners + sealant — $41.30<br/>Work gloves — $18.90<br/><b style="color:#0E2436">Total $184.20 → Materials</b>`;
  rec.querySelector(".chip").outerHTML = `<span class="chip green">CATEGORIZED ✓</span>`;
  await sleep(1600);

  // P&L updates
  const mat = $("#mat"), net = $("#net");
  mat.style.transition = "background 0.5s"; mat.style.background = "rgba(47,201,138,0.15)";
  mat.textContent = "$12,014";
  net.innerHTML = "<b>$16,636</b>";
  net.style.background = "rgba(47,201,138,0.15)";
  await toast("Filed under Materials · Henderson job — P&L and QuickBooks updated");
  await sleep(1000);
  await moveTo(500, 420, 900);
  await toast("Every number traces back to a receipt, an invoice, or a payout", 2000);
  await endCard();
  finish();
};
