/* ==================================================================
   billing.js — invoices, payment status, invoice detail
   ================================================================== */
(function (global) {
  'use strict';

  const filters = { q: '', status: 'all', range: 'today' };

  /* ---------- one invoice row (also used on the patient profile) ---------- */
  function row(inv) {
    const p = Store.patient(inv.patientId);
    const due = inv.amount - inv.paid;
    return (
      '<button type="button" data-invoice="' + inv.id + '"' +
        ' class="group flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-brand-50/40 sm:gap-4 sm:px-5">' +
        '<span class="hidden sm:block">' + Components.avatar(p ? p.name : '?', 'h-9 w-9') + '</span>' +
        '<span class="min-w-0 flex-1">' +
          '<span class="flex flex-wrap items-center gap-x-2">' +
            '<span class="text-sm font-semibold text-ink">' + Utils.escape(p ? p.name : 'Unknown') + '</span>' +
            '<span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted">' + Utils.escape(inv.id) + '</span>' +
          '</span>' +
          '<span class="mt-0.5 block text-[12px] text-muted">' +
            Utils.formatDateRelative(inv.date) +
            (due > 0 && inv.paid > 0 ? ' · ' + Utils.money(due) + ' due' : '') +
          '</span>' +
        '</span>' +
        '<span class="shrink-0 text-right">' +
          '<span class="block text-sm font-bold text-ink">' + Utils.money(inv.amount) + '</span>' +
          '<span class="mt-1 block">' + Components.invoiceBadge(inv.status) + '</span>' +
        '</span>' +
      '</button>'
    );
  }

  /* ================================================================
     INVOICE DETAIL
     ================================================================ */
  function openInvoice(id) {
    const inv = Store.invoice(id);
    if (!inv) return;
    const p = Store.patient(inv.patientId);

    function body() {
      const fresh = Store.invoice(id);
      const due = fresh.amount - fresh.paid;
      return (
        '<div class="flex items-center justify-between gap-4 rounded-card border border-line bg-slate-50/60 p-4">' +
          '<div class="flex items-center gap-3">' +
            Components.avatar(p.name, 'h-11 w-11') +
            '<div class="min-w-0">' +
              '<p class="truncate text-sm font-bold text-ink">' + Utils.escape(p.name) + '</p>' +
              '<p class="text-[12px] text-muted">' + Utils.escape(p.gender) + ' &bull; ' + p.age + ' Years</p>' +
            '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<p class="font-mono text-[13px] font-bold text-ink">' + Utils.escape(fresh.id) + '</p>' +
            '<p class="text-[12px] text-muted">' + Utils.formatDate(fresh.date) + '</p>' +
          '</div>' +
        '</div>' +

        '<div class="mt-4 overflow-hidden rounded-card border border-line">' +
          '<p class="border-b border-line bg-slate-50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted">Services</p>' +
          '<ul class="divide-y divide-line">' +
            fresh.items.map((it) =>
              '<li class="flex items-center justify-between gap-4 px-4 py-3">' +
                '<span class="text-sm text-ink">' + Utils.escape(it.name) + '</span>' +
                '<span class="shrink-0 text-sm font-semibold text-ink">' + Utils.money(it.price) + '</span>' +
              '</li>').join('') +
          '</ul>' +
          '<div class="space-y-2 border-t border-line bg-slate-50/60 px-4 py-3.5">' +
            '<div class="flex items-center justify-between text-sm">' +
              '<span class="text-muted">Total amount</span>' +
              '<span class="font-bold text-ink">' + Utils.money(fresh.amount) + '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between text-sm">' +
              '<span class="text-muted">Amount paid</span>' +
              '<span class="font-semibold text-success">' + Utils.money(fresh.paid) + '</span>' +
            '</div>' +
            '<div class="flex items-center justify-between border-t border-line pt-2 text-sm">' +
              '<span class="font-semibold text-ink">Balance due</span>' +
              '<span class="text-base font-extrabold ' + (due > 0 ? 'text-danger' : 'text-success') + '">' + Utils.money(due) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="mt-4 flex items-center justify-between gap-4 rounded-card border border-line p-4">' +
          '<div>' +
            '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Payment status</p>' +
            '<div class="mt-2">' + Components.invoiceBadge(fresh.status) + '</div>' +
          '</div>' +
          '<div class="text-right">' +
            '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Method</p>' +
            '<p class="mt-2 text-sm font-semibold text-ink">' + Utils.escape(fresh.method) + '</p>' +
          '</div>' +
        '</div>'
      );
    }

    function footer() {
      const fresh = Store.invoice(id);
      const settled = fresh.paid >= fresh.amount;
      return (
        '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
          '<button type="button" class="btn-secondary" id="inv-print">' + icon('printer', 'h-4 w-4') + 'Print</button>' +
          (settled
            ? '<button type="button" class="btn-secondary" data-close>Close</button>'
            : '<button type="button" class="btn-primary sm:min-w-[190px]" id="inv-pay">' +
                icon('check', 'h-4 w-4') + 'Mark as Paid' +
              '</button>') +
        '</div>'
      );
    }

    const modal = Modal.open({
      title: 'Invoice ' + inv.id,
      subtitle: p.name + ' · ' + Utils.formatDateRelative(inv.date),
      size: 'lg',
      body: body(),
      footer: footer(),
    });

    function bind() {
      const pay = modal.el.querySelector('#inv-pay');
      if (pay) {
        pay.addEventListener('click', () => {
          setLoading(pay, true, 'Recording…');
          setTimeout(() => {
            const fresh = Store.invoice(id);
            const collected = fresh.amount - fresh.paid;
            fresh.paid = fresh.amount;
            fresh.status = 'paid';
            fresh.method = 'Cash';
            Store.addNotification('Payment received', Utils.money(collected) + ' from ' + p.name + ' — ' + fresh.id, 'billing', 'billing');
            Store.addActivity('Payment of ' + Utils.money(collected) + ' received from ' + p.name + '.', 'indian-rupee', 'success');
            Store.save();

            modal.setBody(body());
            modal.setFooter(footer());
            bind();
            Toast.success('✓ Payment recorded successfully', Utils.money(collected) + ' received from ' + p.name + '.');
            Layout.refreshBadge();
            App.refresh();
          }, 800);
        });
      }
      modal.el.querySelector('#inv-print').addEventListener('click', () =>
        Toast.info('Print preview', 'Printing is not part of this demo.')
      );
    }

    bind();
  }

  /* ================================================================
     BILLING PAGE
     ================================================================ */
  function visibleInvoices() {
    const q = filters.q.trim().toLowerCase();
    const today = Utils.today();
    const weekAgo = Utils.addDays(today, -7);
    const monthAgo = Utils.addDays(today, -30);

    return Store.state.invoices
      .filter((v) => {
        if (filters.status !== 'all' && v.status !== filters.status) return false;
        if (filters.range === 'today' && v.date !== today) return false;
        if (filters.range === 'week' && v.date < weekAgo) return false;
        if (filters.range === 'month' && v.date < monthAgo) return false;
        if (q) {
          const p = Store.patient(v.patientId);
          const hay = ((p ? p.name : '') + ' ' + v.id).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
  }

  function summary() {
    const s = Store.todayStats();
    return (
      '<div class="mb-5 grid gap-4 sm:grid-cols-3">' +
        Components.stat({ label: "Today's Revenue", value: Utils.money(s.revenue), icon: 'indian-rupee', tone: 'brand', hint: 'Total billed today' }) +
        Components.stat({ label: 'Pending', value: Utils.money(s.pending), icon: 'clock', tone: 'warning', hint: 'Awaiting payment' }) +
        Components.stat({ label: 'Collected', value: Utils.money(s.collected), icon: 'check-circle', tone: 'success', hint: 'Received today' }) +
      '</div>'
    );
  }

  function tableRows(list) {
    return list.map((inv) => {
      const p = Store.patient(inv.patientId);
      const due = inv.amount - inv.paid;
      return (
        '<tr class="row-link" data-invoice="' + inv.id + '">' +
          '<td class="td whitespace-nowrap"><span class="font-mono text-[13px] font-semibold text-ink">' + Utils.escape(inv.id) + '</span></td>' +
          '<td class="td">' +
            '<div class="flex items-center gap-3">' + Components.avatar(p ? p.name : '?', 'h-8 w-8') +
            '<span class="font-semibold text-ink">' + Utils.escape(p ? p.name : 'Unknown') + '</span></div>' +
          '</td>' +
          '<td class="td whitespace-nowrap text-muted">' + Utils.formatDateRelative(inv.date) + '</td>' +
          '<td class="td whitespace-nowrap font-semibold text-ink">' + Utils.money(inv.amount) + '</td>' +
          '<td class="td whitespace-nowrap ' + (due > 0 ? 'text-danger' : 'text-muted') + '">' + Utils.money(due) + '</td>' +
          '<td class="td">' + Components.invoiceBadge(inv.status) + '</td>' +
          '<td class="td text-right"><span class="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700">Open' + icon('chevron-right', 'h-4 w-4') + '</span></td>' +
        '</tr>'
      );
    }).join('');
  }

  function listCard() {
    const list = visibleInvoices();
    if (!list.length) {
      return '<div class="card">' + Components.emptyState({
        icon: 'credit-card', title: 'No invoices found',
        message: 'No invoice matches this filter. Try a different date range or status.',
      }) + '</div>';
    }
    const total = list.reduce((s, v) => s + v.amount, 0);
    return (
      '<div class="card overflow-hidden">' +
        Components.sectionHead('Invoices',
          '<span class="badge-neutral">' + list.length + ' · ' + Utils.money(total) + '</span>') +
        '<div class="hidden overflow-x-auto md:block">' +
          '<table class="w-full">' +
            '<thead><tr>' +
              '<th class="th">Invoice</th><th class="th">Patient</th><th class="th">Date</th>' +
              '<th class="th">Amount</th><th class="th">Balance</th><th class="th">Status</th><th class="th"></th>' +
            '</tr></thead>' +
            '<tbody>' + tableRows(list) + '</tbody>' +
          '</table>' +
        '</div>' +
        '<div class="md:hidden">' + list.map((v) => row(v)).join('') + '</div>' +
      '</div>'
    );
  }

  function renderPage() {
    const root = document.getElementById('page-content');
    root.innerHTML =
      Components.pageHead({
        title: 'Billing',
        sub: 'Track clinic payments and invoices.',
      }) +
      summary() +
      '<div class="card mb-5 p-3 sm:p-4">' +
        '<div class="flex flex-col gap-3 sm:flex-row sm:items-center">' +
          '<div class="relative flex-1">' +
            '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">' + icon('search', 'h-[18px] w-[18px]') + '</span>' +
            '<input id="bl-search" type="search" placeholder="Search invoice or patient…" value="' + Utils.escape(filters.q) + '" class="input pl-10" aria-label="Search invoices" />' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2 sm:flex">' +
            '<select id="bl-range" class="select sm:w-44" aria-label="Filter by date range">' +
              '<option value="today"' + (filters.range === 'today' ? ' selected' : '') + '>Today</option>' +
              '<option value="week"' + (filters.range === 'week' ? ' selected' : '') + '>Last 7 days</option>' +
              '<option value="month"' + (filters.range === 'month' ? ' selected' : '') + '>Last 30 days</option>' +
              '<option value="all"' + (filters.range === 'all' ? ' selected' : '') + '>All time</option>' +
            '</select>' +
            '<select id="bl-status" class="select sm:w-40" aria-label="Filter by payment status">' +
              '<option value="all">All statuses</option>' +
              Object.keys(INVOICE_STATUS).map((k) =>
                '<option value="' + k + '"' + (filters.status === k ? ' selected' : '') + '>' + INVOICE_STATUS[k].label + '</option>').join('') +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="invoice-list">' + listCard() + '</div>';

    let t;
    document.getElementById('bl-search').addEventListener('input', (e) => {
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => { filters.q = v; refreshList(); }, 180);
    });
    document.getElementById('bl-range').addEventListener('change', (e) => { filters.range = e.target.value; refreshList(); });
    document.getElementById('bl-status').addEventListener('change', (e) => { filters.status = e.target.value; refreshList(); });

    bindList();
  }

  function refreshList() {
    const holder = document.getElementById('invoice-list');
    if (!holder) return;
    holder.innerHTML = listCard();
    bindList();
  }

  function bindList() {
    const holder = document.getElementById('invoice-list');
    if (!holder) return;
    holder.querySelectorAll('[data-invoice]').forEach((el) =>
      el.addEventListener('click', () => openInvoice(el.dataset.invoice))
    );
  }

  global.Billing = { renderPage, openInvoice, row, refresh: refreshList, filters };
})(window);
