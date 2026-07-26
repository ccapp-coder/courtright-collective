/* Engine for AimToGro demo scenes */
const $ = (s) => document.querySelector(s);
const SPEED = 1.15; // global pacing multiplier so each demo lands ~30s
const sleep = (ms) => new Promise((r) => setTimeout(r, ms * SPEED));

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function add(parent, tag, cls, html, style) {
  const e = el(tag, cls, html);
  if (style) Object.assign(e.style, style);
  parent.appendChild(e);
  return e;
}

const LOGO_SVG = `<svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <path d="M 318.50 684.00 C 440.33 684.00 512.00 543.53 586.53 457.53" fill="none" stroke="#46C8E6" stroke-width="65.93" stroke-linecap="round"/>
  <path d="M 652.47 238.23 Q 652.47 375.83 790.07 375.83 Q 652.47 375.83 652.47 513.43 Q 652.47 375.83 514.87 375.83 Q 652.47 375.83 652.47 238.23 Z" fill="#2FC98A"/>
  <path d="M 529.20 248.27 Q 529.20 297.00 577.93 297.00 Q 529.20 297.00 529.20 345.73 Q 529.20 297.00 480.47 297.00 Q 529.20 297.00 529.20 248.27 Z" fill="#FFD23F"/></svg>`;

const TEAM = [
  ["Sales Rep", "📈"], ["Marketer", "📣"], ["Concierge", "🛎️"], ["Accountant", "🧾"],
  ["Ops Manager", "⚙️"], ["Secretary", "📇"], ["HR", "🧑‍🤝‍🧑"],
];

/* stage exists before either the shell or an overlay is added */
function ensureStage() {
  let s = $("#stage");
  if (!s) { s = el("div"); s.id = "stage"; document.body.appendChild(s); }
  return s;
}

/* ── shell ── */
function buildShell({ active = "", team = "" } = {}) {
  const stage = ensureStage();
  const shell = el("div"); shell.id = "shell";

  const sb = el("div"); sb.id = "sidebar";
  sb.appendChild(el("div", "sb-brand", LOGO_SVG + "aimtogro"));
  sb.appendChild(el("div", "goal-card", `
    <div class="lbl">◎ YOUR GOAL</div>
    <div class="g1">Beat last year's $450k</div>
    <div class="g2">Target: $475,000 this year</div>
    <hr/>
    <div class="focus"><b>✦ TODAY'S FOCUS</b><br/>Chase the two stale quotes before noon — that's $8,400 sitting on the table.</div>`));
  const item = (id, ic, label, cls = "") => {
    const d = el("div", "sb-item " + cls + (active === id ? " active" : ""), `<span class="ic">${ic}</span>${label}`);
    d.id = "sb-" + id.replace(/\s/g, "");
    sb.appendChild(d);
    return d;
  };
  item("ceo", "💬", "Daily Meeting · CEO", "ceo");
  item("dashboard", "▦", "Team dashboard");
  item("contacts", "👥", "Contacts");
  item("jobs", "🧰", "Jobs");
  sb.appendChild(el("div", "sb-sec", "YOUR TEAM"));
  TEAM.forEach(([n, ic]) => {
    const d = el("div", "sb-item" + (team === n ? " active" : ""), `<span class="ic">${ic}</span>${n}`);
    sb.appendChild(d);
  });
  item("hire", "✦", "Hire more", "hire");
  shell.appendChild(sb);

  const main = el("div"); main.id = "main";
  main.innerHTML = `
    <div id="topbar">
      <div class="biz">Beacon Home Services</div>
      <div class="spacer"></div>
      <div class="bell">🔔</div>
      <div class="staff-chip">FULL STAFF</div>
      <div class="avatar">D</div>
    </div>
    <div id="content"><div class="inner" id="inner"></div></div>`;
  shell.appendChild(main);
  stage.appendChild(shell);

  const toast = el("div"); toast.id = "toast"; stage.appendChild(toast);

  const cur = el("div"); cur.id = "cursor";
  cur.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2 L20 12.5 L12.6 13.8 L16.2 21 L13.4 22.3 L9.8 15.1 L4.6 20 Z" fill="#0E2436" stroke="#fff" stroke-width="1.6"/></svg>`;
  cur.style.left = "1250px"; cur.style.top = "700px";
  stage.appendChild(cur);

  return $("#inner");
}

/* ── cursor ── */
async function moveTo(x, y, ms = 1100) {
  const c = $("#cursor");
  c.style.transitionDuration = ms + "ms, " + ms + "ms";
  c.style.left = x + "px"; c.style.top = y + "px";
  await sleep(ms + 60);
}
async function click(elmt) {
  const r = el("div", "click-ring");
  const c = $("#cursor");
  r.style.left = parseFloat(c.style.left) + 4 + "px";
  r.style.top = parseFloat(c.style.top) + 4 + "px";
  $("#stage").appendChild(r);
  if (elmt) { elmt.classList.add("pressed"); setTimeout(() => elmt.classList.remove("pressed"), 250); }
  await sleep(420);
  r.remove();
}
/* move cursor to the center of an element (by rect) then click it */
async function go(elmt, ms = 1050, dx = 0, dy = 0) {
  const b = elmt.getBoundingClientRect();
  await moveTo(b.left + b.width / 2 + dx, b.top + b.height / 2 + dy, ms);
  await click(elmt);
}

/* ── toast ── */
async function toast(html, ms = 2400) {
  const t = $("#toast");
  t.innerHTML = `<span class="tick">✓</span> ${html}`;
  t.classList.add("show");
  await sleep(ms);
  t.classList.remove("show");
  await sleep(300);
}

/* ── typing effect ── */
async function typeIn(elmt, text, cps = 42) {
  for (let i = 0; i <= text.length; i++) {
    elmt.textContent = text.slice(0, i);
    await sleep(1000 / cps);
  }
}

/* ── count-up ── */
async function countUp(elmt, to, ms = 900, fmt = (v) => v) {
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    elmt.textContent = fmt(Math.round((to * i) / steps));
    await sleep(ms / steps);
  }
}

/* ── reveal helper ── */
async function reveal(elmt, delay = 0) {
  elmt.classList.add("fade-in");
  await sleep(delay);
  requestAnimationFrame(() => requestAnimationFrame(() => elmt.classList.add("on")));
}

/* ── shared scene chrome ── */
function overlay(html) {
  const o = el("div", "overlay", html);
  ensureStage().appendChild(o);
  requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add("on")));
  return o;
}
async function dismiss(o) { o.classList.remove("on"); await sleep(480); o.remove(); }

async function introCard(title, sub, ms = 3800) {
  const o = overlay(`
    <div class="ov-logo">${LOGO_SVG}aimtogro</div>
    <div class="ov-badge">Product demo</div>
    <div class="ov-title">${title}</div>
    <div class="ov-sub">${sub}</div>`);
  await sleep(ms);
  await dismiss(o);
}

async function endCard(ms = 5200) {
  overlay(`
    <div class="ov-logo">${LOGO_SVG}aimtogro</div>
    <div class="ov-title">Your AI business <em>co-pilot.</em></div>
    <div class="ov-sub">Daily standups, live bookkeeping, and the automations you'd build if you had the time.</div>
    <div class="ov-small">COMING SOON · AIMTOGRO.COM</div>`);
  await sleep(ms);
}

/* ── common builders ── */
function heroCard(inner, icon, tag, name, sub, replaces) {
  return add(inner, "div", "hero-card", `
    <div class="hc-ic">${icon}</div>
    <div style="flex:1">
      <div class="hc-tag">${tag}</div>
      <h3>${name}</h3>
      <div class="hc-sub">${sub}</div>
      ${replaces ? `<div class="hc-rep">Replaces a <b>${replaces}</b> real hire.</div>` : ""}
    </div>`);
}
function statStrip(inner, stats) {
  const c = add(inner, "div", "card stat-strip");
  stats.forEach(([k, v, n, cls]) => add(c, "div", "stat",
    `<div class="k">${k}</div><div class="v ${cls || ""}">${v}</div>${n ? `<div class="n">${n}</div>` : ""}`));
  return c;
}
function rowItem(inner, ic, t, s, right) {
  return add(inner, "div", "row-item", `
    <div class="ri-ic">${ic}</div>
    <div><div class="ri-t">${t}</div><div class="ri-s">${s}</div></div>
    <div class="ri-right">${right || ""}</div>`);
}

function finish() { window.__done = true; }
