/* Tiny scene engine for the Trivd demo videos */
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ---------- stage scaffolding ---------- */
function buildStage({ accent, chip, hud = true, players = null, ring = true }) {
  document.documentElement.style.setProperty("--accent", accent);
  const stage = el("div"); stage.id = "stage";
  stage.appendChild(el("div", null, "")).id = "bg";
  stage.appendChild(el("div", "glow-accent"));

  const app = el("div"); app.id = "app";
  if (hud) {
    app.innerHTML = `
      <div id="hud">
        <div class="hud-block"><label>SCORE</label><div class="hud-val" id="score">0</div></div>
        <div class="hud-block center"><label>TIME</label><div class="hud-val" id="time">10</div></div>
        <div class="hud-block right"><label>QUESTION</label><div class="hud-val" id="qnum">1/3</div></div>
      </div>`;
  }
  app.appendChild(el("div", null, chip)).id = "chip";

  if (players) {
    const strip = el("div"); strip.id = "players";
    players.forEach((p) => {
      const c = el("div", "pchip " + p.cls);
      c.id = "pl-" + p.id;
      c.innerHTML = `<div class="av">${p.av}</div><div class="pname">${p.name}</div>
        <div class="pips">${'<div class="pip"></div>'.repeat(p.pips || 0)}</div>
        <div class="pscore" id="ps-${p.id}">0</div>`;
      strip.appendChild(c);
    });
    app.appendChild(strip);
  }

  const qwrap = el("div"); qwrap.id = "qwrap";
  qwrap.innerHTML = `<div id="qcard"><p id="qtext"></p></div><div id="answers"></div>`;
  app.appendChild(qwrap);

  const slot = el("div"); slot.id = "slot"; app.appendChild(slot); // free area per mode

  if (ring) {
    const rw = el("div"); rw.id = "ringwrap";
    rw.innerHTML = `
      <svg width="190" height="190" viewBox="0 0 190 190">
        <circle id="ringtrack" cx="95" cy="95" r="82" fill="none" stroke-width="12"/>
        <circle id="ringbar" cx="95" cy="95" r="82" fill="none" stroke-width="12"
          stroke-dasharray="515" stroke-dashoffset="0"/>
      </svg>
      <div id="ringnum"><span id="ringsec">10</span><small>SEC</small></div>`;
    app.appendChild(rw);
  }

  stage.appendChild(app);
  stage.appendChild(el("div", null, "")).id = "frost";
  const banner = el("div"); banner.id = "banner"; stage.appendChild(banner);
  document.body.appendChild(stage);
  return stage;
}

/* ---------- HUD ---------- */
let score = 0;
function setScore(v, animate = true) {
  score = v;
  const e = $("#score"); if (!e) return;
  e.textContent = v;
  if (animate) { e.style.transform = "scale(1.25)"; e.style.transition = "transform 0.15s";
    setTimeout(() => (e.style.transform = ""), 180); }
}
function setQnum(t) { const e = $("#qnum"); if (e) e.textContent = t; }
function setPScore(id, v) { const e = $("#ps-" + id); if (e) e.textContent = v; }

/* ---------- countdown ---------- */
let timerState = { sec: 10, total: 10, paused: false, stop: false };
function startTimer(seconds) {
  timerState = { sec: seconds, total: seconds, paused: false, stop: false };
  tickDisplay();
  (async () => {
    while (timerState.sec > 0 && !timerState.stop) {
      await sleep(1000);
      if (timerState.stop) break;
      if (!timerState.paused) { timerState.sec--; tickDisplay(); }
    }
  })();
}
function tickDisplay() {
  const t = $("#time"), rs = $("#ringsec"), rb = $("#ringbar");
  if (t) { t.textContent = timerState.sec; t.classList.toggle("low", timerState.sec <= 3); }
  if (rs) rs.textContent = timerState.sec;
  if (rb) rb.style.strokeDashoffset = 515 * (1 - timerState.sec / timerState.total);
}
function stopTimer() { timerState.stop = true; const t = $("#time"); if (t) t.classList.remove("low"); }
function pauseTimer(p) { timerState.paused = p; }

/* ---------- question ---------- */
function showQuestion(q, answers, seconds) {
  $("#qtext").textContent = q;
  const box = $("#answers"); box.innerHTML = "";
  answers.forEach((a) => {
    const d = el("div", "ans", a);
    box.appendChild(d);
  });
  $("#qwrap").classList.add("on");
  if (seconds) startTimer(seconds);
  return [...box.children];
}
async function hideQuestion() {
  stopTimer();
  $("#qwrap").classList.remove("on");
  await sleep(420);
}
/* tap an answer: who = label shown on the pill (e.g. "YOU" / "MAYA"), ok = correct? */
async function tap(pills, idx, { who, ok = true, revealCorrect = -1 } = {}) {
  const p = pills[idx];
  p.classList.add("picked");
  if (who) p.appendChild(el("span", "tapper", who));
  await sleep(320);
  p.classList.remove("picked");
  p.classList.add(ok ? "correct" : "wrong");
  pills.forEach((o, i) => { if (o !== p && i !== revealCorrect) o.classList.add("dim"); });
  if (!ok && revealCorrect >= 0) {
    await sleep(500);
    pills[revealCorrect].classList.add("correct");
  }
}

/* ---------- toast banner ---------- */
async function toast(text, cls, ms = 1400) {
  const b = $("#banner");
  b.className = cls; b.innerHTML = text;
  b.classList.add("show");
  await sleep(ms);
  b.classList.remove("show");
  await sleep(300);
}

/* ---------- overlays ---------- */
function overlay(html, { clear = false } = {}) {
  const o = el("div", "overlay" + (clear ? " clear" : ""), html);
  $("#stage").appendChild(o);
  requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add("on")));
  return o;
}
async function dismiss(o) { o.classList.remove("on"); await sleep(450); o.remove(); }

async function titleCard({ icon, title, sub, flair }, ms = 3000) {
  const o = overlay(`
    <div class="big-icon">${icon}</div>
    <div class="mode-title">${title}</div>
    <div class="mode-sub">${sub}</div>
    ${flair ? `<div class="mode-flair">${flair}</div>` : ""}`);
  await sleep(ms);
  await dismiss(o);
}

async function endCard(ms = 3400) {
  const o = overlay(`
    <div class="wordmark"><span class="t">T</span>RIVD</div>
    <div class="end-tag">You're about to get <em>Trivd.</em></div>
    <div class="store-pills">
      <div class="store-pill">App Store</div>
      <div class="store-pill">Google Play</div>
    </div>
    <div class="free-line">FREE TO PLAY</div>`);
  confetti(40, ["#FFE500", "#FF2D92", "#7C3AED", "#22C55E"]);
  await sleep(ms);
}

/* ---------- confetti ---------- */
function confetti(n, colors) {
  const stage = $("#stage");
  for (let i = 0; i < n; i++) {
    const c = el("div", "cf");
    c.style.left = Math.random() * 700 + "px";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.6 + Math.random() * 1.6 + "s";
    c.style.animationDelay = Math.random() * 0.9 + "s";
    c.style.width = c.style.height = 10 + Math.random() * 12 + "px";
    if (i % 3 === 0) c.style.borderRadius = "50%";
    stage.appendChild(c);
  }
}

function finish() { window.__done = true; }
