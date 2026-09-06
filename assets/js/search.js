/* ==================================================================
   search.js — global search
   ------------------------------------------------------------------
   One index across patients, appointments, staff and invoices.
   Desktop: a dropdown under the header input (Ctrl/Cmd + K to focus).
   Mobile:  a full-screen search sheet opened from the header icon.
   ================================================================== */
(function (global) {
  'use strict';

  const LIMIT = 4;

  /* ---------- index ---------- */
  function query(q) {
    const term = q.trim().toLowerCase();
    if (term.length < 1) return null;

    const patients = Store.state.patients
      .filter((p) => p.name.toLowerCase().includes(term) || p.phone.replace(/\s/g, '').includes(term.replace(/\s/g, '')))
      .slice(0, LIMIT)
      .map((p) => ({
        kind: 'patient', id: p.id, name: p.name,
        meta: p.gender + ' · ' + p.age + ' yrs · ' + p.phone,
        icon: 'user',
      }));

    const appointments = Store.state.appointments
      .filter((a) => {
        const p = Store.patient(a.patientId);
        return p && p.name.toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const today = Utils.today();
        const da = Math.abs(new Date(a.date) - new Date(today));
        const db = Math.abs(new Date(b.date) - new Date(today));
        return da - db;
      })
      .slice(0, LIMIT)
      .map((a) => {
        const p = Store.patient(a.patientId);
        const d = Store.doctor(a.doctorId);
        return {
          kind: 'appointment', id: a.id, name: p.name,
          meta: Utils.formatDateRelative(a.date) + ' · ' + Utils.formatTime(a.time) + ' · ' + (d ? d.name : ''),
          badge: Components.appointmentBadge(a.status),
          icon: 'calendar-days',
        };
      });

    const staff = Store.state.staff
      .filter((s) => s.name.toLowerCase().includes(term) || s.role.toLowerCase().includes(term))
      .slice(0, LIMIT)
      .map((s) => ({
        kind: 'staff', id: s.id, name: s.name,
        meta: s.role + ' · ' + s.department,
        icon: 'briefcase',
      }));

    const invoices = Store.state.invoices
      .filter((v) => {
        const p = Store.patient(v.patientId);
        return v.id.toLowerCase().includes(term) || (p && p.name.toLowerCase().includes(term));
      })
      .slice(0, LIMIT)
      .map((v) => {
        const p = Store.patient(v.patientId);
        return {
          kind: 'invoice', id: v.id, name: v.id + ' · ' + (p ? p.name : ''),
          meta: Utils.money(v.amount) + ' · ' + Utils.formatDateRelative(v.date),
          badge: Components.invoiceBadge(v.status),
          icon: 'credit-card',
        };
      });

    return { patients, appointments, staff, invoices,
      total: patients.length + appointments.length + staff.length + invoices.length };
  }

  /* ---------- markup ---------- */
  function groupHtml(label, items) {
    if (!items.length) return '';
    return (
      '<div class="px-2 pb-1 pt-3 first:pt-2">' +
        '<p class="px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">' + label + '</p>' +
        items.map((r) =>
          '<button type="button" data-result="' + r.kind + ':' + r.id + '"' +
            ' class="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-brand-50 focus:bg-brand-50 focus:outline-none">' +
            '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-muted">' + icon(r.icon, 'h-4 w-4') + '</span>' +
            '<span class="min-w-0 flex-1">' +
              '<span class="block truncate text-sm font-semibold text-ink">' + Utils.escape(r.name) + '</span>' +
              '<span class="block truncate text-[12px] text-muted">' + Utils.escape(r.meta) + '</span>' +
            '</span>' +
            (r.badge ? '<span class="hidden shrink-0 sm:block">' + r.badge + '</span>' : '') +
          '</button>').join('') +
      '</div>'
    );
  }

  function resultsHtml(q) {
    const res = query(q);
    if (!res) {
      return (
        '<div class="px-4 py-6 text-center">' +
          '<p class="text-[13px] text-muted">Start typing to search patients, appointments, staff and invoices.</p>' +
          '<div class="mt-3 flex flex-wrap justify-center gap-1.5">' +
            ['Rahul', 'Priya', 'INV-1025'].map((s) =>
              '<button type="button" data-suggest="' + s + '" class="rounded-full border border-line bg-white px-3 py-1 text-[12px] font-medium text-muted transition-colors hover:border-brand-400 hover:text-brand-700">' + s + '</button>').join('') +
          '</div>' +
        '</div>'
      );
    }
    if (!res.total) {
      return (
        '<div class="px-4 py-8 text-center">' +
          '<span class="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">' + icon('search', 'h-5 w-5') + '</span>' +
          '<p class="mt-3 text-sm font-semibold text-ink">No results for &ldquo;' + Utils.escape(q) + '&rdquo;</p>' +
          '<p class="mt-1 text-[13px] text-muted">Try a patient name, a staff name or an invoice number.</p>' +
        '</div>'
      );
    }
    return (
      groupHtml('Patients', res.patients) +
      groupHtml('Appointments', res.appointments) +
      groupHtml('Staff', res.staff) +
      groupHtml('Invoices', res.invoices)
    );
  }

  /* ---------- navigation ---------- */
  function go(token, close) {
    const [kind, id] = token.split(':');
    if (kind === 'patient') {
      window.location.href = 'patient-profile.html?id=' + id;
    } else if (kind === 'appointment') {
      close();
      setTimeout(() => Appointments.openDetails(id), 180);
    } else if (kind === 'invoice') {
      close();
      setTimeout(() => Billing.openInvoice(id), 180);
    } else if (kind === 'staff') {
      window.location.href = 'staff.html';
    }
  }

  function bindResults(container, close, onSuggest) {
    container.querySelectorAll('[data-result]').forEach((b) =>
      b.addEventListener('click', () => go(b.dataset.result, close))
    );
    container.querySelectorAll('[data-suggest]').forEach((b) =>
      b.addEventListener('click', () => onSuggest(b.dataset.suggest))
    );
  }

  /* ---------- desktop dropdown ---------- */
  function initDesktop() {
    const input = document.getElementById('global-search');
    if (!input) return;
    const wrap = input.parentElement;

    const panel = document.createElement('div');
    panel.className =
      'absolute left-0 right-0 top-full z-50 mt-2 hidden max-h-[420px] overflow-y-auto ' +
      'rounded-card border border-line bg-white pb-2 shadow-pop';
    panel.setAttribute('role', 'listbox');
    wrap.appendChild(panel);

    const close = () => panel.classList.add('hidden');
    const open = () => {
      panel.innerHTML = resultsHtml(input.value);
      panel.classList.remove('hidden');
      panel.classList.add('animate-scale-in');
      bindResults(panel, close, (s) => { input.value = s; open(); });
    };

    input.addEventListener('focus', open);
    input.addEventListener('input', open);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); input.blur(); }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = panel.querySelector('[data-result]');
        if (first) first.focus();
      }
    });
    panel.addEventListener('keydown', (e) => {
      const items = Array.from(panel.querySelectorAll('[data-result]'));
      const i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); (items[i - 1] || input).focus(); }
      if (e.key === 'Escape')    { close(); input.focus(); }
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) close();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(min-width: 768px)').matches) { input.focus(); input.select(); }
        else openMobile();
      }
    });
  }

  /* ---------- mobile sheet ---------- */
  function openMobile() {
    const root = document.createElement('div');
    root.className = 'fixed inset-0 z-[65] bg-white md:hidden';
    root.innerHTML =
      '<div class="flex h-14 items-center gap-2 border-b border-line px-3">' +
        '<button type="button" data-close-search class="btn-ghost !min-h-[40px] !px-2" aria-label="Close search">' + icon('arrow-left', 'h-5 w-5') + '</button>' +
        '<div class="relative flex-1">' +
          '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">' + icon('search', 'h-[18px] w-[18px]') + '</span>' +
          '<input id="m-search" type="search" autocomplete="off" placeholder="Search the clinic…" class="input pl-10" aria-label="Search the clinic" />' +
        '</div>' +
      '</div>' +
      '<div id="m-results" class="h-[calc(100%-3.5rem)] overflow-y-auto pb-6"></div>';

    document.body.appendChild(root);
    document.body.classList.add('overflow-hidden');

    const input = root.querySelector('#m-search');
    const results = root.querySelector('#m-results');
    const close = () => {
      root.remove();
      document.body.classList.remove('overflow-hidden');
    };

    const paint = () => {
      results.innerHTML = resultsHtml(input.value);
      bindResults(results, close, (s) => { input.value = s; paint(); });
    };

    root.querySelector('[data-close-search]').addEventListener('click', close);
    input.addEventListener('input', paint);
    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    paint();
    setTimeout(() => input.focus(), 60);
  }

  function init() {
    initDesktop();
    const btn = document.getElementById('btn-search-mobile');
    if (btn) btn.addEventListener('click', openMobile);
  }

  global.Search = { init, query, openMobile };
})(window);
