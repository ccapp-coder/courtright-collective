/* ============================================================
   Starter, app.js
   A whole small app in one file: store, router, views, UI.
   No framework, no build step, no dependencies.

   Read this top to bottom once. It is about 400 lines and it
   covers every pattern you will need for a v1.
   ============================================================ */

/* ── 1. CONFIG ────────────────────────────────────────────────
   Everything you are likely to change lives here.
*/
const CONFIG = {
  name: 'Starter',
  storageKey: 'starter.v1',
  // Flip these to turn features on and off without deleting code.
  // Ship with something off rather than ripping it out. You will
  // want it back in three weeks.
  features: {
    darkMode: true,
    onboarding: true,
    analytics: false,   // set true once you have wired a real endpoint
    offlineBanner: true,
  },
  analyticsEndpoint: '/api/track',
};

/* ── 2. STORE ─────────────────────────────────────────────────
   One object, saved to localStorage, with subscribers.
   Small enough to read, big enough for a real v1.
*/
const DEFAULT_STATE = {
  version: 1,
  onboarded: false,
  theme: 'auto',          // 'auto' | 'light' | 'dark'
  soundEnabled: true,
  items: [],              // { id, title, done, createdAt }
  stats: { created: 0, completed: 0 },
};

const Store = {
  state: structuredClone(DEFAULT_STATE),
  listeners: new Set(),

  load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        // Merge rather than replace, so a new field added in a later
        // version does not come back undefined for existing users.
        this.state = { ...structuredClone(DEFAULT_STATE), ...saved };
        this.migrate();
      }
    } catch (err) {
      // Corrupted storage should never brick the app.
      console.warn('Could not read saved state, starting fresh.', err);
      this.state = structuredClone(DEFAULT_STATE);
    }
    return this.state;
  },

  // Add a case here every time you change the shape of the state.
  migrate() {
    if (this.state.version < 1) {
      this.state.version = 1;
    }
  },

  save() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.state));
    } catch (err) {
      // Private browsing and full disks both land here.
      toast('Could not save. Storage may be full.');
      console.warn(err);
    }
  },

  set(patch) {
    Object.assign(this.state, patch);
    this.save();
    this.listeners.forEach((fn) => fn(this.state));
  },

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },

  reset() {
    localStorage.removeItem(CONFIG.storageKey);
    this.state = structuredClone(DEFAULT_STATE);
    this.save();
    this.listeners.forEach((fn) => fn(this.state));
  },
};

/* ── 3. ANALYTICS ─────────────────────────────────────────────
   Stub it now, wire it later. Three events beat thirty.
   Track: did they start, did they get the first win, did they come back.
*/
function track(event, props = {}) {
  if (!CONFIG.features.analytics) {
    console.debug('[track]', event, props);
    return;
  }
  // Never block the UI on analytics. Fire and forget.
  try {
    const body = JSON.stringify({ event, props, ts: Date.now() });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(CONFIG.analyticsEndpoint, body);
    } else {
      fetch(CONFIG.analyticsEndpoint, { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  } catch (_) { /* analytics must never throw into the app */ }
}

/* ── 4. UI HELPERS ────────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

let toastTimer;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2400);
}

function confirmDialog({ title, body, confirmText = 'Confirm' }) {
  return new Promise((resolve) => {
    const modal = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalBody').textContent = body;
    $('[data-modal-confirm]').textContent = confirmText;
    modal.hidden = false;

    const close = (result) => {
      modal.hidden = true;
      $('[data-modal-confirm]').removeEventListener('click', onYes);
      $('[data-modal-cancel]').removeEventListener('click', onNo);
      modal.removeEventListener('click', onBackdrop);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    };
    const onYes = () => close(true);
    const onNo = () => close(false);
    const onBackdrop = (e) => { if (e.target === modal) close(false); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };

    $('[data-modal-confirm]').addEventListener('click', onYes);
    $('[data-modal-cancel]').addEventListener('click', onNo);
    modal.addEventListener('click', onBackdrop);
    document.addEventListener('keydown', onKey);
  });
}

/* ── 5. THEME ─────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = $('[data-theme-icon]');
  if (icon) icon.textContent = theme === 'dark' ? '●' : theme === 'light' ? '○' : '◐';
}

function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const next = order[(order.indexOf(Store.state.theme) + 1) % order.length];
  Store.set({ theme: next });
  applyTheme(next);
  toast(`Theme: ${next}`);
  track('theme_changed', { theme: next });
}

/* ── 6. VIEWS ─────────────────────────────────────────────────
   Each view is a function that returns an HTML string, plus an
   optional mount() for wiring events after it lands in the DOM.
*/
const Views = {
  '/': () => {
    const { items, stats } = Store.state;
    const open = items.filter((i) => !i.done).length;
    return {
      title: 'Home',
      html: `
        <h1 class="page-title">Hey there</h1>
        <p class="page-sub">This is the screen people land on. Make it useful on day one, not empty.</p>

        <div class="card hero-card">
          <h2>${open ? `${open} thing${open === 1 ? '' : 's'} left` : 'All clear'}</h2>
          <p>${open
            ? 'Nice work. Keep going, the list is right through here.'
            : 'Nothing open. Add something or go outside, both are valid.'}</p>
          <div class="btn-row">
            <a class="btn" href="#/list" data-link>Open the list</a>
          </div>
        </div>

        <div class="section-label">At a glance</div>
        <div class="stats">
          <div class="stat"><b>${items.length}</b><span>Total</span></div>
          <div class="stat"><b>${open}</b><span>Open</span></div>
          <div class="stat"><b>${stats.completed}</b><span>Completed</span></div>
        </div>

        <div class="section-label">Where to start</div>
        <div class="card">
          <h3>Rename the app</h3>
          <p>Search the project for <code>Starter</code> and replace it. Six files, two minutes.</p>
        </div>
        <div class="card">
          <h3>Change three colors</h3>
          <p>Open <code>app.css</code>, edit <code>--accent</code>, <code>--accent-2</code>, and <code>--bg</code>. That is your whole brand.</p>
        </div>
        <div class="card">
          <h3>Replace this feature</h3>
          <p>The items list is a working example of the full pattern: store, render, event, persist. Swap it for your real thing.</p>
        </div>
      `,
    };
  },

  '/list': () => {
    const { items } = Store.state;
    const rows = items.map((item) => `
      <li class="${item.done ? 'done' : ''}" data-id="${item.id}">
        <button class="item-check" data-toggle aria-label="Toggle done">✓</button>
        <span class="item-title">${esc(item.title)}</span>
        <button class="item-del" data-del aria-label="Delete">×</button>
      </li>
    `).join('');

    return {
      title: 'Items',
      html: `
        <h1 class="page-title">Items</h1>
        <p class="page-sub">A complete feature in miniature. Add, toggle, delete, persist.</p>

        <form class="inline-form" id="addForm">
          <input class="input" id="newItem" placeholder="Add something" maxlength="120" autocomplete="off">
          <button class="btn btn-primary" type="submit">Add</button>
        </form>

        ${items.length ? `<ul class="list" id="list">${rows}</ul>` : `
          <div class="empty">
            <div class="empty-mark">◇</div>
            <h3>Nothing here yet</h3>
            <p>Empty states are the most-seen screen in any new app. Design this one before you design the full one.</p>
          </div>
        `}
      `,
      mount() {
        $('#addForm').addEventListener('submit', (e) => {
          e.preventDefault();
          const input = $('#newItem');
          const title = input.value.trim();
          if (!title) return;
          const items = [
            { id: crypto.randomUUID(), title, done: false, createdAt: Date.now() },
            ...Store.state.items,
          ];
          Store.set({ items, stats: { ...Store.state.stats, created: Store.state.stats.created + 1 } });
          track('item_created');
          input.value = '';
          render();
          $('#newItem')?.focus();
        });

        $('#list')?.addEventListener('click', async (e) => {
          const li = e.target.closest('li');
          if (!li) return;
          const id = li.dataset.id;

          if (e.target.closest('[data-toggle]')) {
            const items = Store.state.items.map((i) =>
              i.id === id ? { ...i, done: !i.done } : i);
            const justDone = items.find((i) => i.id === id).done;
            Store.set({
              items,
              stats: {
                ...Store.state.stats,
                completed: Store.state.stats.completed + (justDone ? 1 : -1),
              },
            });
            if (justDone) track('item_completed');
            render();
          }

          if (e.target.closest('[data-del]')) {
            const ok = await confirmDialog({
              title: 'Delete this?',
              body: 'It will not come back. There is no undo in v1, and that is a deliberate choice you can revisit.',
              confirmText: 'Delete',
            });
            if (!ok) return;
            Store.set({ items: Store.state.items.filter((i) => i.id !== id) });
            toast('Deleted');
            render();
          }
        });
      },
    };
  },

  '/settings': () => {
    const s = Store.state;
    return {
      title: 'Settings',
      html: `
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">Ship with three settings. Add a fourth when somebody actually asks.</p>

        <div class="card card-row">
          <div><h3>Sound</h3><p>Feedback sounds on interactions.</p></div>
          <label class="switch">
            <input type="checkbox" id="soundToggle" ${s.soundEnabled ? 'checked' : ''}>
            <span></span>
          </label>
        </div>

        ${CONFIG.features.darkMode ? `
        <div class="card card-row">
          <div><h3>Theme</h3><p>Currently <strong>${s.theme}</strong>. Auto follows your device.</p></div>
          <button class="btn" data-action="toggle-theme">Change</button>
        </div>` : ''}

        <div class="section-label">Your data</div>
        <div class="card">
          <h3>Everything is on this device</h3>
          <p>No account, no server, nothing leaves your phone. Export it if you want a copy.</p>
          <div class="btn-row">
            <button class="btn" id="exportBtn">Export JSON</button>
            <button class="btn btn-danger" id="resetBtn">Reset everything</button>
          </div>
        </div>

        <div class="section-label">About</div>
        <div class="card">
          <h3>${CONFIG.name}</h3>
          <p>Version 1.0.0 &nbsp;&bull;&nbsp; Built with the Indie App Starter Kit by Courtright Collective.</p>
        </div>
      `,
      mount() {
        $('#soundToggle').addEventListener('change', (e) => {
          Store.set({ soundEnabled: e.target.checked });
          toast(e.target.checked ? 'Sound on' : 'Sound off');
        });

        $('#exportBtn').addEventListener('click', () => {
          const blob = new Blob([JSON.stringify(Store.state, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${CONFIG.storageKey}-export.json`;
          a.click();
          URL.revokeObjectURL(url);
          track('data_exported');
        });

        $('#resetBtn').addEventListener('click', async () => {
          const ok = await confirmDialog({
            title: 'Reset everything?',
            body: 'Every item and setting is erased. This cannot be undone.',
            confirmText: 'Reset',
          });
          if (!ok) return;
          Store.reset();
          applyTheme(Store.state.theme);
          toast('Reset. Fresh start.');
          location.hash = '#/';
          render();
        });
      },
    };
  },
};

/* ── 7. ROUTER ────────────────────────────────────────────────
   Hash routing, because it works on any static host with zero
   config, including opening the file straight off your desktop.
*/
function currentPath() {
  const hash = location.hash.replace(/^#/, '') || '/';
  return Views[hash] ? hash : '/';
}

function render() {
  const path = currentPath();
  const view = Views[path]();
  const el = $('#view');
  el.innerHTML = view.html;
  document.title = `${view.title} | ${CONFIG.name}`;

  document.querySelectorAll('.tabbar a').forEach((a) => {
    if (a.dataset.tab === path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  view.mount?.();
  el.scrollTop = 0;
}

/* ── 8. BOOT ─────────────────────────────────────────────── */
function boot() {
  Store.load();
  applyTheme(Store.state.theme);

  if (CONFIG.features.onboarding && !Store.state.onboarded) {
    $('#onboarding').hidden = false;
    track('onboarding_started');
  }

  // One delegated click listener for the whole app shell.
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (action === 'toggle-theme') cycleTheme();
    if (action === 'finish-onboarding') {
      $('#onboarding').hidden = true;
      Store.set({ onboarded: true });
      track('onboarding_completed');
    }
  });

  window.addEventListener('hashchange', render);

  if (CONFIG.features.offlineBanner) {
    const banner = $('#offlineBanner');
    const sync = () => { banner.hidden = navigator.onLine; };
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    sync();
  }

  render();
  track('app_opened');

  // Service worker: only over http(s). Opening index.html from the
  // filesystem uses file:// and would throw here.
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker not registered.', err);
    });
  }
}

boot();
