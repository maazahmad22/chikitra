/* ==================================================================
   tour.js — guided tour
   ------------------------------------------------------------------
   Dims the page, spotlights one element at a time and explains it in
   a sentence. Runs on a visitor's first look at the dashboard and
   carries on across pages, so the whole product gets introduced.

   Progress lives in the store, which is what lets the tour survive a
   page navigation. It ends by opening the booking flow — the thing a
   doctor most needs to see working.

   Tour.start()      begin at a step
   Tour.resume()     called on every page load; continues or auto-starts
   Tour.restart()    replay from the beginning (header button)
   Tour.stop(seen)   leave the tour
   ================================================================== */
(function (global) {
  'use strict';

  /* ---------------- the script ----------------
     Each step names the page it belongs to, what to spotlight, and one
     short paragraph. mobileTarget / mobileBody take over under 640px.
     ------------------------------------------------------------- */
  const STEPS = [
    /* ---- Dashboard ---- */
    {
      page: 'dashboard', section: 'Welcome', target: null,
      title: 'Welcome to CHIKITRA',
      body: 'A quick walk through a clinic day — about two minutes. Everything here runs on real demo data, so nothing you click is a dead end.',
      next: 'Show me around',
    },
    {
      page: 'dashboard', section: 'Dashboard', target: '#dash-metrics',
      title: 'Your whole day in four numbers',
      body: 'What you want before you sit down: how many patients are booked, how many are still to come, who is waiting right now, and what has been billed today.',
    },
    {
      page: 'dashboard', section: 'Dashboard', target: '#dash-schedule',
      title: "Today's schedule",
      body: 'Every appointment in order with its status. The greyed-out rows are free slots — tapping one starts a booking at exactly that time.',
    },
    {
      page: 'dashboard', section: 'Dashboard', target: '#global-search', mobileTarget: '#btn-search-mobile',
      title: 'Find anyone in seconds',
      body: 'One box searches patients, appointments, staff and invoices together. Press Ctrl + K from anywhere in the app.',
      mobileBody: 'Tap here to search patients, appointments, staff and invoices — all from one box.',
    },

    /* ---- Appointments ---- */
    {
      page: 'appointments', section: 'Appointments', target: '#appt-toolbar',
      title: 'Filter the day down',
      body: 'Search for a patient, jump to any date, or narrow to one doctor or one status. The arrows step through days one at a time.',
    },
    {
      page: 'appointments', section: 'Appointments', target: '#appt-views',
      title: 'Day, week or month',
      body: 'Day gives you the slot-by-slot list. Week shows the load across all seven days. Month is the overview — click any date to drop back into it.',
    },
    {
      page: 'appointments', section: 'Appointments', target: '#appt-list [data-appt]',
      title: 'Open any appointment',
      body: 'Tapping a row opens the full detail — patient, contact, doctor, status — with buttons to mark them waiting, start the consultation, complete it, reschedule or cancel.',
    },

    /* ---- Patients ---- */
    {
      page: 'patients', section: 'Patients', target: '#pt-filters',
      title: 'Every patient, searchable',
      body: 'Search by name or phone, or filter by doctor and status. On a phone this same list becomes cards instead of a table.',
    },
    {
      page: 'patients', section: 'Patients', target: '#patient-list',
      title: 'One tap to the full record',
      body: 'Opening a patient gives you their overview, every appointment they have had, their medical history and their billing — in four tabs.',
    },

    /* ---- Attendance ---- */
    {
      page: 'attendance', section: 'Attendance', target: '#att-settings',
      title: 'You set the rules',
      body: 'Decide whether staff must mark attendance at all, and whether a selfie and the clinic location are required. The check-in changes to match, immediately.',
    },
    {
      page: 'attendance', section: 'Attendance', target: '#att-right',
      title: 'What your staff sees',
      body: 'This is the phone view your receptionist or nurse gets. Try Check In — the selfie and location steps are simulated, so nothing real is captured.',
    },

    /* ---- Billing ---- */
    {
      page: 'billing', section: 'Billing', target: '#bl-summary',
      title: "Today's money at a glance",
      body: 'Billed, still pending, and actually collected. These move the moment you record a payment — nothing here is a fixed picture.',
    },
    {
      page: 'billing', section: 'Billing', target: '#invoice-list',
      title: 'Settle an invoice',
      body: 'Open any unpaid invoice to see the services and the balance, then mark it paid. The totals above update on the spot.',
    },

    /* ---- Finale ---- */
    {
      page: 'billing', section: 'Your turn', target: null,
      title: "That's the tour",
      body: 'The one thing left is the one you do fifty times a day. Booking takes five quick steps: the patient, the doctor, the day, a free slot, confirm.',
      next: 'Book an appointment',
      finish: true,
      goTo: 'appointments.html?book=1',
    },
  ];

  /* ---------------- state ---------------- */
  let i = 0;
  let root = null;
  let els = {};
  let active = false;
  let pending = null;   // deferred start, so it can be cancelled

  const isMobile = () => window.innerWidth < 640;

  /** Progress is stored — that is what lets the tour survive a page change. */
  function tstate() {
    if (!Store.state.tour) Store.state.tour = { seen: false, running: false, step: 0 };
    return Store.state.tour;
  }
  function persist(patch) {
    Object.assign(tstate(), patch);
    Store.save();
  }
  const currentPage = () => (global.App && App.page) || (global.Layout && Layout.page) || '';

  function resolve(step) {
    const sel = isMobile() && step.mobileTarget ? step.mobileTarget : step.target;
    if (!sel) return null;
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // an element with no box (hidden at this breakpoint) counts as absent
    return r.width > 0 && r.height > 0 ? el : null;
  }

  /* ---------------- chrome ---------------- */
  function build() {
    root = document.createElement('div');
    root.id = 'tour-root';
    root.className = 'fixed inset-0 z-[80]';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Guided tour');
    root.innerHTML =
      '<div data-tour-block class="absolute inset-0"></div>' +
      '<div data-tour-hole class="pointer-events-none absolute rounded-xl ring-2 ring-brand-400 transition-all duration-250 ease-out"></div>' +
      '<div data-tour-tip class="absolute w-full max-w-[360px] rounded-card border border-line bg-white p-5 shadow-pop"></div>';
    document.body.appendChild(root);
    els = {
      block: root.querySelector('[data-tour-block]'),
      hole: root.querySelector('[data-tour-hole]'),
      tip: root.querySelector('[data-tour-tip]'),
    };
    els.block.addEventListener('click', (e) => e.stopPropagation());
  }

  function tipHtml(step) {
    return (
      '<div class="flex items-start justify-between gap-3">' +
        '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="badge-brand">' + icon('sparkles', 'h-3.5 w-3.5') + Utils.escape(step.section) + '</span>' +
          '<span class="text-[11px] font-semibold text-muted">Step ' + (i + 1) + ' of ' + STEPS.length + '</span>' +
        '</div>' +
        '<button type="button" data-tour="skip" class="-mr-1.5 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink" aria-label="Skip the tour">' +
          icon('x', 'h-4 w-4') +
        '</button>' +
      '</div>' +

      '<h2 class="mt-3 text-[17px] font-bold tracking-tight text-ink">' + Utils.escape(step.title) + '</h2>' +
      '<p class="mt-1.5 text-[13px] leading-relaxed text-muted">' +
        Utils.escape(isMobile() && step.mobileBody ? step.mobileBody : step.body) + '</p>' +

      '<div class="mt-4 flex items-center gap-1" aria-hidden="true">' +
        STEPS.map((s, n) =>
          '<span class="h-1.5 flex-1 rounded-full transition-colors duration-200 ' +
          (n <= i ? 'bg-brand-600' : 'bg-slate-200') + '"></span>').join('') +
      '</div>' +

      // Skip sits on every step, not only the first
      '<div class="mt-4 flex items-center justify-between gap-3">' +
        '<button type="button" data-tour="skip" class="btn-ghost btn-sm !px-2">Skip tour</button>' +
        '<div class="flex items-center gap-2">' +
          (i > 0
            ? '<button type="button" data-tour="back" class="btn-secondary btn-sm">' + icon('arrow-left', 'h-4 w-4') + 'Back</button>'
            : '') +
          '<button type="button" data-tour="next" data-autofocus class="btn-primary btn-sm">' +
            Utils.escape(step.next || 'Next') +
            icon(step.finish ? 'calendar-plus' : 'arrow-right', 'h-4 w-4') +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ---------------- positioning ---------------- */
  function position(target) {
    const tip = els.tip;
    const hole = els.hole;
    const pad = 8;
    const gap = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!target) {
      hole.style.opacity = '0';
      hole.style.width = hole.style.height = '0px';
      hole.style.boxShadow = '0 0 0 9999px rgba(15,23,42,.62)';
      hole.style.top = '-50px';
      hole.style.left = (vw / 2) + 'px';
      tip.style.width = isMobile() ? (vw - 24) + 'px' : '';
      tip.style.bottom = 'auto';
      tip.style.left = Math.round((vw - tip.offsetWidth) / 2) + 'px';
      tip.style.top = Math.round((vh - tip.offsetHeight) / 2) + 'px';
      return;
    }

    const r = target.getBoundingClientRect();
    hole.style.opacity = '1';
    hole.style.top = (r.top - pad) + 'px';
    hole.style.left = (r.left - pad) + 'px';
    hole.style.width = (r.width + pad * 2) + 'px';
    hole.style.height = (r.height + pad * 2) + 'px';
    hole.style.boxShadow = '0 0 0 9999px rgba(15,23,42,.62)';

    // On a phone the card is a bottom sheet — far easier to read than a
    // bubble squeezed in beside the highlight.
    if (isMobile()) {
      tip.style.left = '12px';
      tip.style.top = 'auto';
      tip.style.bottom = '12px';
      tip.style.width = (vw - 24) + 'px';
      return;
    }
    tip.style.bottom = 'auto';
    tip.style.width = '';

    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let top = r.bottom + gap;
    if (top + th > vh - gap) {
      top = r.top - th - gap;                    // flip above
      if (top < gap) top = Math.max(gap, (vh - th) / 2);
    }
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(gap, Math.min(left, vw - tw - gap));

    tip.style.top = Math.round(top) + 'px';
    tip.style.left = Math.round(left) + 'px';
  }

  /* ---------------- flow ---------------- */
  function render() {
    const step = STEPS[i];
    const target = resolve(step);

    if (target) {
      const r = target.getBoundingClientRect();
      if (r.top < 80 || r.bottom > window.innerHeight - 80) {
        target.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }

    els.tip.innerHTML = tipHtml(step);
    requestAnimationFrame(() => {
      position(resolve(step));
      const btn = els.tip.querySelector('[data-autofocus]');
      if (btn) btn.focus({ preventScroll: true });
    });
    bind();
  }

  function bind() {
    els.tip.querySelectorAll('[data-tour]').forEach((b) =>
      b.addEventListener('click', () => {
        const act = b.dataset.tour;
        if (act === 'next') advance();
        else if (act === 'back') goTo(i - 1);
        else stop(true);
      })
    );
  }

  /** Move to a step, changing page first when that step lives elsewhere. */
  function goTo(n) {
    if (n < 0 || n >= STEPS.length) return;
    const step = STEPS[n];
    if (step.page !== currentPage()) {
      persist({ running: true, step: n });
      window.location.href = step.page + '.html';
      return;
    }
    i = n;
    persist({ running: true, step: n });
    render();
  }

  function advance() {
    const step = STEPS[i];
    if (step.finish) {
      stop(true);
      if (step.goTo) {
        setTimeout(() => { window.location.href = step.goTo; }, 200);
      } else if (global.Appointments) {
        setTimeout(() => Appointments.openCreate({}), 220);
      }
      return;
    }
    goTo(i + 1);
  }

  function onKey(e) {
    if (!active) return;
    if (e.key === 'Escape') { e.preventDefault(); stop(true); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); advance(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(i - 1); }
  }

  const reposition = () => { if (active) position(resolve(STEPS[i])); };

  function start(from) {
    if (active) return;
    active = true;
    i = Math.max(0, Math.min(from || 0, STEPS.length - 1));
    persist({ running: true, step: i });
    build();
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    render();
  }

  function stop(markSeen) {
    if (pending) { clearTimeout(pending); pending = null; }
    if (!active) {
      if (markSeen) persist({ seen: true, running: false, step: 0 });
      return;
    }
    active = false;
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
    if (root) { root.remove(); root = null; }
    if (markSeen) persist({ seen: true, running: false, step: 0 });
  }

  /**
   * Runs on every page load: continues a tour already in progress, or
   * starts one for a first-time visitor landing on the dashboard.
   */
  function resume() {
    const t = tstate();
    const page = currentPage();

    if (new URLSearchParams(window.location.search).get('tour') === '1') {
      persist({ running: true, step: 0, seen: false });
      if (page === 'dashboard') { start(0); return true; }
      window.location.href = 'dashboard.html?tour=1';
      return true;
    }

    if (t.running) {
      const step = STEPS[t.step];
      if (!step) { persist({ running: false, step: 0 }); return false; }
      if (step.page !== page) return false;              // still travelling
      pending = setTimeout(() => { pending = null; start(t.step); }, 250);
      return true;
    }

    if (!t.seen && page === 'dashboard') {
      pending = setTimeout(() => { pending = null; start(0); }, 450);
      return true;
    }
    return false;
  }

  /** Header button: always replays from the beginning. */
  function restart() {
    stop(false);
    persist({ running: true, step: 0, seen: false });
    if (currentPage() === 'dashboard') start(0);
    else window.location.href = 'dashboard.html?tour=1';
  }

  global.Tour = {
    start: (n) => start(n || 0),
    restart,
    resume,
    stop,
    steps: STEPS,
    get isActive() { return active; },
  };
})(window);
