/* Courtright Collective funnel script: help bot, email capture, exit intent.
   Loaded on every page. No dependencies, no third-party SDKs.
   Leads POST to the courtright-leads Worker. */
(function () {
  "use strict";

  var LEADS_ENDPOINT = "https://leads.courtrightco.com/api/lead";
  var BOT_DISMISS_KEY = "cc_bot_dismissed";
  var BOT_SHOWN_KEY = "cc_bot_shown";

  function sendLead(fields) {
    var body = Object.assign({ page: location.pathname }, fields);
    return fetch(LEADS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json(); });
  }

  /* ---------- Email capture forms ----------
     Any <form data-lead="source-name"> with an input[type=email] gets wired.
     Optional hidden input[name=item] rides along. */
  function wireForms() {
    var forms = document.querySelectorAll("form[data-lead]");
    forms.forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = form.querySelector('input[type="email"]');
        var name = form.querySelector('input[name="name"]');
        var item = form.querySelector('input[name="item"]');
        var msg = form.querySelector('textarea, input[name="message"]');
        var btn = form.querySelector('button, input[type="submit"]');
        if (!email || !email.value) return;
        if (btn) { btn.disabled = true; btn.dataset.orig = btn.textContent; btn.textContent = "Sending..."; }
        sendLead({
          email: email.value,
          name: name ? name.value : "",
          item: item ? item.value : "",
          message: msg ? msg.value : "",
          source: form.getAttribute("data-lead"),
        }).then(function (res) {
          if (res && res.ok) {
            var done = document.createElement("p");
            done.className = "lead-done";
            done.textContent = form.getAttribute("data-done") || "Got it. Check your inbox soon.";
            form.replaceWith(done);
          } else { throw new Error("bad response"); }
        }).catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.orig; }
          alert("That did not go through. Email us instead: info@courtrightco.com");
        });
      });
    });
  }

  /* ---------- Help bot ---------- */
  var ROUTES = [
    { label: "My customers are scattered everywhere", href: "https://contact.courtrightco.com" },
    { label: "Booking is chaos", href: "https://booked.courtrightco.com" },
    { label: "I don't know if I'm making money", href: "https://accounting.courtrightco.com" },
    { label: "I need content but have no time", href: "https://tealden.com" },
    { label: "I'd rather hire it out", href: "/book.html" },
  ];

  var botOpen = false;
  var botEl = null;

  function buildBot() {
    if (botEl) return botEl;
    botEl = document.createElement("div");
    botEl.id = "cc-bot";
    botEl.innerHTML =
      '<div class="cc-bot-panel" role="dialog" aria-label="Help">' +
      '<button class="cc-bot-close" aria-label="Close">&times;</button>' +
      '<p class="cc-bot-hi">Hey, Dillon here (well, my website is). Quick question...</p>' +
      '<p class="cc-bot-q">What are you trying to fix in your business?</p>' +
      '<div class="cc-bot-chips"></div>' +
      '<div class="cc-bot-capture">' +
      '<p>Or drop your email and I’ll personally point you at the right tool.</p>' +
      '<form data-lead="help-bot"><input type="email" placeholder="you@business.com" required>' +
      '<button type="submit">Send it</button></form>' +
      "</div></div>";
    var chips = botEl.querySelector(".cc-bot-chips");
    ROUTES.forEach(function (r) {
      var a = document.createElement("a");
      a.className = "cc-bot-chip";
      a.textContent = r.label;
      a.href = r.href;
      chips.appendChild(a);
    });
    botEl.querySelector(".cc-bot-close").addEventListener("click", function () {
      botEl.classList.remove("open");
      botOpen = false;
      try { sessionStorage.setItem(BOT_DISMISS_KEY, "1"); } catch (e) {}
    });
    document.body.appendChild(botEl);
    injectBotStyles();
    wireForms();
    return botEl;
  }

  function showBot() {
    try { if (sessionStorage.getItem(BOT_DISMISS_KEY)) return; } catch (e) {}
    if (botOpen) return;
    buildBot();
    botEl.classList.add("open");
    botOpen = true;
    try { sessionStorage.setItem(BOT_SHOWN_KEY, "1"); } catch (e) {}
  }

  function injectBotStyles() {
    if (document.getElementById("cc-bot-css")) return;
    var css =
      "#cc-bot{position:fixed;bottom:1.25rem;right:1.25rem;z-index:200;font-family:'Outfit',-apple-system,sans-serif;display:none}" +
      "#cc-bot.open{display:block}" +
      "#cc-bot .cc-bot-panel{background:#0E1520;color:#F4EBD9;border:1px solid rgba(217,160,48,.35);border-radius:14px;padding:1.4rem;width:min(340px,calc(100vw - 2.5rem));box-shadow:0 18px 48px rgba(14,21,32,.45);animation:ccBotIn .35s ease}" +
      "@keyframes ccBotIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}" +
      "#cc-bot .cc-bot-close{position:absolute;top:.5rem;right:.75rem;background:none;border:none;color:#F4EBD9;font-size:1.4rem;cursor:pointer;opacity:.6}" +
      "#cc-bot .cc-bot-close:hover{opacity:1}" +
      "#cc-bot .cc-bot-panel{position:relative}" +
      "#cc-bot .cc-bot-hi{margin:0 0 .3rem;font-size:.8rem;color:rgba(244,235,217,.55)}" +
      "#cc-bot .cc-bot-q{margin:0 0 .9rem;font-size:1.05rem;font-weight:600}" +
      "#cc-bot .cc-bot-chip{display:block;margin:.4rem 0;padding:.55rem .8rem;border:1px solid rgba(244,235,217,.25);border-radius:8px;color:#F4EBD9;text-decoration:none;font-size:.88rem;transition:all .2s}" +
      "#cc-bot .cc-bot-chip:hover{border-color:#D9A030;background:rgba(217,160,48,.12)}" +
      "#cc-bot .cc-bot-capture{margin-top:1rem;padding-top:.9rem;border-top:1px solid rgba(244,235,217,.15)}" +
      "#cc-bot .cc-bot-capture p{margin:0 0 .5rem;font-size:.8rem;color:rgba(244,235,217,.6)}" +
      "#cc-bot form{display:flex;gap:.4rem}" +
      "#cc-bot input[type=email]{flex:1;min-width:0;padding:.5rem .65rem;border-radius:7px;border:1px solid rgba(244,235,217,.25);background:rgba(244,235,217,.06);color:#F4EBD9;font-size:.85rem}" +
      "#cc-bot button[type=submit]{padding:.5rem .8rem;border:none;border-radius:7px;background:#C45C28;color:#fff;font-weight:600;font-size:.85rem;cursor:pointer}" +
      "#cc-bot .lead-done{font-size:.85rem;color:#D9A030;margin:0}";
    var style = document.createElement("style");
    style.id = "cc-bot-css";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* Triggers: 30s on page, 50% scroll, or exit intent. First one wins. */
  function armBot() {
    var fired = false;
    function fire() { if (!fired) { fired = true; showBot(); } }
    setTimeout(fire, 30000);
    window.addEventListener("scroll", function onScroll() {
      var h = document.documentElement;
      if (h.scrollTop / (h.scrollHeight - h.clientHeight) > 0.5) {
        window.removeEventListener("scroll", onScroll);
        fire();
      }
    }, { passive: true });
    document.addEventListener("mouseout", function (e) {
      if (!e.relatedTarget && e.clientY <= 0) fire();
    });
  }

  /* ---------- Boot ---------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
  function init() {
    wireForms();
    armBot();
    /* Optional manual trigger: any element with data-open-bot */
    document.querySelectorAll("[data-open-bot]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        try { sessionStorage.removeItem(BOT_DISMISS_KEY); } catch (err) {}
        showBot();
      });
    });
  }
})();
