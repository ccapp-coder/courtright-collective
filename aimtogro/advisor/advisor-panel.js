/**
 * The advisor home panel.
 *
 * Mounts INTO the Aimtogro dashboard. It is not an app of its own:
 *
 *   import { mountAdvisorPanel } from '/aimtogro/advisor/advisor-panel.js';
 *   import { createHttpTransport } from '/aimtogro/advisor/transports.js';
 *   mountAdvisorPanel(document.querySelector('#advisor-home'), createHttpTransport({ accountId }));
 *
 * The panel talks to a transport, never to the advisor service directly, so the same
 * component renders against the live API, against a local in browser demo, or against a
 * canned payload. Two visible states matter: LOCKED (a sales surface) and ACTIVE.
 */

const STATE_LABEL = {
  locked: 'Locked',
  available: 'Available',
  active: 'Active',
  grace: 'Paused soon',
  suspended: 'Paused',
  cancelled: 'Cancelled',
};

export function mountAdvisorPanel(root, transport, options = {}) {
  if (!root) throw new Error('mountAdvisorPanel needs a root element');
  root.classList.add('adv');

  const state = { home: null, answers: [], busy: false, error: null };

  async function load() {
    setBusy(true);
    try {
      state.home = await transport.home();
      state.error = null;
    } catch (err) {
      state.error = String(err.message || err);
    } finally {
      setBusy(false);
    }
  }

  function setBusy(value) {
    state.busy = value;
    render();
  }

  async function run(label, fn) {
    setBusy(true);
    try {
      const result = await fn();
      state.answers.unshift({ label, ...result });
      state.error = null;
      if (result.usage) state.home.usage = result.usage;
    } catch (err) {
      state.error = friendlyError(err);
      if (err.body && err.body.notice) state.home.usage = err.body.usage || state.home.usage;
    } finally {
      setBusy(false);
    }
  }

  // ------------------------------------------------------------------ render
  function render() {
    root.innerHTML = '';
    if (!state.home) {
      root.append(el('div', { class: 'adv-card' }, [
        state.error
          ? el('p', { class: 'adv-error' }, [state.error])
          : el('p', { class: 'adv-body muted' }, [spinner(), 'Waking your advisor...']),
      ]));
      return;
    }

    const { state: access } = state.home;
    if (access === 'locked' || access === 'available') {
      root.append(renderLocked());
      return;
    }
    root.append(renderActive());
  }

  // ------------------------------------------------------------ locked state
  function renderLocked() {
    const home = state.home;
    const copy = home.access.copy || {
      headline: 'Your AI Advisor is one module away.',
      body: 'Add any paid module to unlock it.',
      cta: 'Add a module to unlock',
    };
    const available = home.state === 'available';

    const wrap = el('div', {});
    wrap.append(
      el('div', { class: 'adv-card adv-locked-hero' }, [
        el('div', { class: 'adv-eyebrow', style: 'color:#46C8E6' }, ['Your first AI employee']),
        available
          ? el('h3', {}, ['Hire your ', el('em', {}, ['AI Advisor'])])
          : el('h3', {}, [copy.headline]),
        el('p', {}, [available ? `It watches this whole account and tells you what to do first, every morning. $${home.price} a month.` : copy.body]),
        el('button', { class: 'adv-btn primary', onclick: () => options.onUnlock && options.onUnlock(home) }, [
          available ? `Turn on the advisor, $${home.price}/mo` : copy.cta,
        ]),
        el('div', { class: 'adv-does' }, [
          feature('A daily rundown', 'Three things worth your time, ranked, with the money attached to each.'),
          feature('Ask it anything', 'Who is my lowest hanging fruit. What should I pitch this client. How is the month going.'),
          feature('It learns your business', 'Your services, your prices, your busy season, what you refuse to do.'),
          feature('It reads everything', 'Every module you own, not just one. The whole account, one brain.'),
        ]),
        el('p', { class: 'adv-locked-price' }, [
          available
            ? 'Included in the intelligence add-on. Cancel any time, your advisor keeps what it learned.'
            : `$${home.price} a month once you have at least one paid module. The free filing cabinet on its own does not unlock it.`,
        ]),
      ]),
    );

    wrap.append(
      el('div', { class: 'adv-card' }, [
        el('div', { class: 'adv-eyebrow' }, ['Modules on this account']),
        el('p', { class: 'adv-sub', style: 'margin-bottom:1rem' }, [
          'Turn on any one of these and the advisor unlocks across all of them.',
        ]),
        el('div', { class: 'adv-modules' }, home.catalog.map(moduleRow)),
      ]),
    );

    return wrap;
  }

  function feature(title, body) {
    return el('div', {}, [el('h5', {}, [title]), el('p', {}, [body])]);
  }

  function moduleRow(mod) {
    return el('div', { class: `adv-module${mod.enabled ? ' on' : ''}` }, [
      el('div', {}, [
        el('strong', {}, [mod.name]),
        el('small', {}, [mod.advisorSummary]),
      ]),
      transport.setModule
        ? el(
            'button',
            {
              class: `adv-btn ghost${mod.enabled ? ' done' : ''}`,
              onclick: async () => {
                setBusy(true);
                try {
                  state.home = await transport.setModule(mod.id, !mod.enabled);
                  if (state.home.state === 'active' && !state.home.rundown) state.home = await transport.home();
                } catch (err) {
                  state.error = friendlyError(err);
                } finally {
                  setBusy(false);
                }
              },
            },
            [mod.enabled ? 'On' : `$${mod.priceUsdMonthly}/mo`],
          )
        : el('small', {}, [mod.enabled ? 'On' : `$${mod.priceUsdMonthly}/mo`]),
    ]);
  }

  // ------------------------------------------------------------ active state
  function renderActive() {
    const home = state.home;
    const wrap = el('div', {});

    wrap.append(
      el('div', { class: 'adv-head' }, [
        el('div', {}, [
          el('h2', { class: 'adv-title' }, [
            el('span', { class: 'dot' }),
            'Your advisor',
            el('span', { class: `adv-pill ${home.state}`, style: 'margin-left:.6rem' }, [STATE_LABEL[home.state] || home.state]),
          ]),
          el('p', { class: 'adv-sub' }, [home.access.message || todayLine()]),
        ]),
        home.usage ? meter(home.usage) : null,
      ]),
    );

    if (home.access.message && (home.state === 'grace' || home.state === 'suspended')) {
      wrap.append(
        el('div', { class: 'adv-notice' }, [
          el('h4', {}, [home.access.copy ? home.access.copy.headline : 'Advisor paused']),
          el('p', {}, [home.access.message]),
          el('button', { class: 'adv-btn primary', onclick: () => options.onUnlock && options.onUnlock(home) }, [
            home.access.copy ? home.access.copy.cta : 'Re-enable a module',
          ]),
        ]),
      );
    }

    if (home.usage && home.usage.notice) {
      const n = home.usage.notice;
      wrap.append(
        el('div', { class: `adv-notice${n.level === 'hard' ? ' hard' : ''}` }, [
          el('h4', {}, [n.headline]),
          el('p', {}, [n.body]),
          el('button', { class: 'adv-btn primary', onclick: () => options.onUpgrade && options.onUpgrade(n) }, [n.cta]),
        ]),
      );
    }

    // Today's rundown, top of the panel, always.
    wrap.append(
      el('div', { class: 'adv-card adv-rundown' }, [
        el('div', { class: 'adv-eyebrow' }, ['Here is your day']),
        home.rundown
          ? el('p', { class: 'adv-body' }, [home.rundown.text])
          : el('p', { class: 'adv-body muted' }, ['No rundown yet today.']),
        home.rundown ? feedback(home.rundown.adviceLogId) : null,
        el('div', { class: 'adv-actions' }, [
          el('button', {
            class: 'adv-btn ghost',
            disabled: state.busy,
            onclick: () => run('Rundown', () => transport.rundown(true)),
          }, ['Redo today\'s rundown']),
          el('button', {
            class: 'adv-btn ghost',
            disabled: state.busy,
            onclick: () => run('Lowest hanging fruit', () => transport.fruit()),
          }, ['Lowest hanging fruit']),
          el('button', {
            class: 'adv-btn ghost',
            disabled: state.busy,
            onclick: () => run('This week', () => transport.weekly()),
          }, ['How is the week going']),
        ]),
      ]),
    );

    // Ask box.
    const input = el('input', {
      type: 'text',
      placeholder: 'Ask your advisor anything about this business',
      'aria-label': 'Ask your advisor',
      onkeydown: (e) => {
        if (e.key === 'Enter') submit();
      },
    });
    const submit = () => {
      const question = input.value.trim();
      if (!question) return;
      input.value = '';
      run(question, () => transport.ask(question));
    };

    wrap.append(
      el('div', { class: 'adv-card' }, [
        el('div', { class: 'adv-eyebrow' }, ['Ask']),
        el('div', { class: 'adv-ask' }, [
          input,
          el('button', { class: 'adv-btn primary', disabled: state.busy, onclick: submit }, [
            state.busy ? spinner() : '',
            'Ask',
          ]),
        ]),
        el('div', { class: 'adv-chips' }, (home.suggestedAsks || []).map((q) =>
          el('button', {
            class: 'adv-chip',
            onclick: () => run(q, () => transport.ask(q)),
          }, [q]),
        )),
        state.error ? el('p', { class: 'adv-error', style: 'margin-top:.8rem' }, [state.error]) : null,
      ]),
    );

    for (const answer of state.answers) {
      wrap.append(
        el('div', { class: 'adv-card adv-answer' }, [
          el('p', { class: 'adv-q' }, [answer.label]),
          el('p', { class: 'adv-body' }, [answer.text]),
          answer.items && answer.items.length ? itemList(answer.items) : null,
          feedback(answer.adviceLogId),
        ]),
      );
    }

    if (home.usage) {
      wrap.append(
        el('p', { class: 'adv-foot' }, [
          `${home.usage.remaining} of ${home.usage.pool} asks left this month. Your daily rundown is included and never counts.`,
        ]),
      );
    }

    return wrap;
  }

  function itemList(items) {
    return el('ul', { class: 'adv-items' }, items.slice(0, 5).map((item) =>
      el('li', {}, [
        el('span', { class: 'tag' }, [item.moduleLabel || item.module]),
        el('span', {}, [item.action || item.title]),
        item.valueUsd ? el('span', { class: 'money' }, [usd(item.valueUsd)]) : null,
      ]),
    ));
  }

  /** The lightweight "was this helpful / did you do it" control that feeds advice_outcomes. */
  function feedback(adviceLogId) {
    if (!adviceLogId) return null;
    const row = el('div', { class: 'adv-feedback' }, []);
    const thanks = () => {
      row.innerHTML = '';
      row.append(el('span', {}, ['Logged. That is how I get sharper.']));
    };
    const send = async (taken, helpful) => {
      row.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      try {
        await transport.outcome(adviceLogId, taken, null, helpful);
        thanks();
      } catch (err) {
        row.append(el('span', { class: 'adv-error' }, [friendlyError(err)]));
      }
    };
    row.append(
      el('span', {}, ['Did you do it?']),
      el('button', { class: 'adv-btn', onclick: () => send(true, true) }, ['Did it']),
      el('button', { class: 'adv-btn', onclick: () => send(false, false) }, ['Skipped it']),
      el('button', { class: 'adv-btn ghost', onclick: () => send(false, true) }, ['Useful, later']),
    );
    return row;
  }

  function meter(usage) {
    const pct = Math.min(100, Math.round((usage.asksUsed / Math.max(1, usage.pool)) * 100));
    const cls = usage.hardStopped ? 'stop' : usage.softCeiling ? 'warn' : '';
    return el('div', { class: 'adv-meter' }, [
      el('div', { class: 'adv-meter-label' }, [
        el('span', {}, ['Advisory asks']),
        el('span', {}, [`${usage.asksUsed} of ${usage.pool}`]),
      ]),
      el('div', { class: 'adv-meter-bar' }, [
        el('div', { class: `adv-meter-fill ${cls}`, style: `width:${pct}%` }),
      ]),
    ]);
  }

  function todayLine() {
    const now = new Date();
    return now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  }

  render();
  load();

  return {
    refresh: load,
    get state() {
      return state;
    },
  };
}

// ------------------------------------------------------------------ helpers

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'disabled') node.disabled = Boolean(value);
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === '') continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function usd(amount) {
  return `$${Math.round(amount).toLocaleString('en-US')}`;
}

function spinner() {
  return el('span', { class: 'adv-spinner' });
}

function friendlyError(err) {
  if (err && err.body) {
    if (err.body.error === 'advisor_gated') return err.body.access ? err.body.access.message : 'The advisor is locked on this account.';
    if (err.body.error === 'advisor_cap_reached') return err.body.notice ? err.body.notice.body : 'Ask pool used up for this month.';
    if (err.body.message) return err.body.message;
  }
  return String((err && err.message) || err || 'Something went wrong.');
}

export default mountAdvisorPanel;
