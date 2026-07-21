/* Engine for TinkerTaps demo scenes */
const $ = (s) => document.querySelector(s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
/* absolutely positioned styled div */
function prop(parent, cls, style, html) {
  const e = el("div", "abs " + (cls || ""), html);
  Object.assign(e.style, style);
  parent.appendChild(e);
  return e;
}

const LOGO_COLORS = ["#E05A5A", "#F0B800", "#B08FD8", "#6FA8DC", "#F0A050", "#5CAF5F"];
function logoHTML(text, small) {
  const spans = [...text].map((ch, i) =>
    `<span style="color:${LOGO_COLORS[i % LOGO_COLORS.length]}; animation-delay:${i * 0.12}s">${ch}</span>`).join("");
  return `<div class="tt-logo${small ? " small" : ""}">${spans}</div>`;
}

function buildStage() {
  const stage = el("div"); stage.id = "stage";
  const scene = el("div"); scene.id = "scene";
  stage.appendChild(scene);
  document.body.appendChild(stage);
  return scene;
}

/* HUD */
function hud(scene, pills) {
  let x = 30;
  const counters = [];
  pills.forEach(([em, val]) => {
    const p = el("div", "hud-pill", `<span class="em">${em}</span><span class="ct">${val}</span>`);
    p.style.left = x + "px";
    scene.appendChild(p);
    counters.push(p.querySelector(".ct"));
    x += 170;
  });
  scene.appendChild(el("div", null, "")).id = "pause";
  return {
    set(i, v) {
      counters[i].textContent = v;
      const pill = counters[i].parentElement;
      pill.style.transition = "transform 0.18s"; pill.style.transform = "scale(1.12)";
      setTimeout(() => (pill.style.transform = ""), 200);
    },
  };
}

/* touch ripple at stage coords; lingers `hold` ms */
async function touch(x, y, hold = 420) {
  const t = el("div", "touch", '<div class="ring"></div>');
  t.style.left = x + "px"; t.style.top = y + "px";
  $("#stage").appendChild(t);
  await sleep(hold);
  t.style.transition = "opacity 0.25s"; t.style.opacity = "0";
  await sleep(260);
  t.remove();
}

/* drag finger from (x1,y1) to (x2,y2) over ms, optionally moving element (with inline left/top) */
async function drag(x1, y1, x2, y2, ms, elmt) {
  const t = el("div", "touch", '<div class="ring"></div>');
  t.style.left = x1 + "px"; t.style.top = y1 + "px";
  t.style.transition = `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out`;
  $("#stage").appendChild(t);
  if (elmt) {
    elmt.style.transition = `left ${ms}ms ease-in-out, top ${ms}ms ease-in-out`;
  }
  await sleep(60);
  t.style.left = x2 + "px"; t.style.top = y2 + "px";
  if (elmt) {
    const dx = x2 - x1, dy = y2 - y1;
    elmt.style.left = parseFloat(elmt.style.left) + dx + "px";
    elmt.style.top = parseFloat(elmt.style.top) + dy + "px";
  }
  await sleep(ms + 80);
  t.style.transition = "opacity 0.25s"; t.style.opacity = "0";
  await sleep(260);
  t.remove();
}

/* star sparkle burst */
function sparkle(x, y, n = 6, glyph = "✨") {
  for (let i = 0; i < n; i++) {
    const s = el("div", "spark", glyph);
    const a = (i / n) * Math.PI * 2;
    s.style.left = x + "px"; s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(a) * (60 + Math.random() * 40) + "px");
    s.style.setProperty("--dy", Math.sin(a) * (46 + Math.random() * 34) + "px");
    $("#stage").appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}

function overlay(html) {
  const o = el("div", "overlay", html);
  $("#stage").appendChild(o);
  requestAnimationFrame(() => requestAnimationFrame(() => o.classList.add("on")));
  return o;
}
async function dismiss(o) { o.classList.remove("on"); await sleep(520); o.remove(); }

async function titleCard(verb, name, sub, colors, ms = 2900) {
  const dots = (colors || ["#E05A5A", "#F0B800", "#6FA8DC", "#5CAF5F"])
    .map((c) => `<i style="background:${c}"></i>`).join("");
  const o = overlay(`
    ${logoHTML("TinkerTaps", true)}
    <div style="height:34px"></div>
    <div class="game-verb">${verb}</div>
    <div class="game-name">${name}</div>
    <div class="game-sub">${sub}</div>
    <div class="title-dots">${dots}</div>`);
  await sleep(ms);
  await dismiss(o);
}

async function endCard(ms = 3200) {
  const o = overlay(`
    ${logoHTML("TinkerTaps")}
    <div class="end-tag">Big ideas for little hands.</div>
    <div class="end-tagline">21 calm, sensory activities for ages 1–4</div>
    <div class="store-pills">
      <div class="store-pill">App Store</div>
      <div class="store-pill">Google Play</div>
    </div>
    <div class="free-line">FREE TO DOWNLOAD · NO ADS</div>`);
  await sleep(ms);
}

function finish() { window.__done = true; }
