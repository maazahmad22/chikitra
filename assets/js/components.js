/* ==================================================================
   components.js — small reusable UI builders
   ------------------------------------------------------------------
   These keep Tailwind class strings in one place instead of repeating
   long class lists across every page. Each returns an HTML string.
   ================================================================== */
(function (global) {
  'use strict';

  const C = {

    /* ---------- avatar ---------- */
    avatar(name, size, extra) {
      const s = size || 'h-10 w-10';
      const text = s.includes('h-8') ? 'text-[12px]' : s.includes('h-12') || s.includes('h-14') ? 'text-base' : 'text-[13px]';
      return (
        '<span class="' + s + ' ' + Utils.tint(name) + ' ' + (extra || '') +
        ' inline-flex shrink-0 items-center justify-center rounded-full font-bold ' + text + '" aria-hidden="true">' +
          Utils.initials(name) +
        '</span>'
      );
    },

    /* ---------- status badges (never colour alone — always a label) ---------- */
    appointmentBadge(status) {
      const m = APPOINTMENT_STATUS[status] || APPOINTMENT_STATUS.confirmed;
      return '<span class="' + m.badge + '">' + icon(m.icon, 'h-3.5 w-3.5') + m.label + '</span>';
    },

    invoiceBadge(status) {
      const m = INVOICE_STATUS[status] || INVOICE_STATUS.pending;
      return '<span class="' + m.badge + '">' + icon(m.icon, 'h-3.5 w-3.5') + m.label + '</span>';
    },

    staffBadge(status) {
      if (status === 'active')   return '<span class="badge-success">' + icon('check-circle', 'h-3.5 w-3.5') + 'Active</span>';
      if (status === 'on_leave') return '<span class="badge-warning">' + icon('clock', 'h-3.5 w-3.5') + 'On Leave</span>';
      return '<span class="badge-neutral">Inactive</span>';
    },

    patientBadge(status) {
      if (status === 'new')      return '<span class="badge-info">' + icon('sparkles', 'h-3.5 w-3.5') + 'New</span>';
      if (status === 'inactive') return '<span class="badge-neutral">Inactive</span>';
      return '<span class="badge-success">' + icon('check-circle', 'h-3.5 w-3.5') + 'Active</span>';
    },

    /* ---------- metric tile ---------- */
    stat(opts) {
      const tones = {
        brand:   'bg-brand-50 text-brand-700',
        warning: 'bg-amber-50 text-amber-700',
        info:    'bg-blue-50 text-blue-700',
        success: 'bg-green-50 text-green-700',
      };
      return (
        '<div class="card card-pad">' +
          '<div class="flex items-start justify-between gap-3">' +
            '<div class="min-w-0">' +
              '<p class="text-[13px] font-semibold text-muted">' + Utils.escape(opts.label) + '</p>' +
              '<p class="mt-2 text-3xl font-extrabold tracking-tight text-ink" ' +
                (opts.id ? 'id="' + opts.id + '"' : '') + '>' + opts.value + '</p>' +
              (opts.hint ? '<p class="mt-1.5 text-[12px] text-muted">' + Utils.escape(opts.hint) + '</p>' : '') +
            '</div>' +
            '<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ' + (tones[opts.tone] || tones.brand) + '">' +
              icon(opts.icon, 'h-5 w-5') +
            '</span>' +
          '</div>' +
        '</div>'
      );
    },

    /* ---------- section header inside a card ---------- */
    sectionHead(title, right, sub) {
      return (
        '<div class="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">' +
          '<div class="min-w-0">' +
            '<h2 class="text-[15px] font-bold text-ink">' + Utils.escape(title) + '</h2>' +
            (sub ? '<p class="mt-0.5 text-[12px] text-muted">' + Utils.escape(sub) + '</p>' : '') +
          '</div>' +
          (right || '') +
        '</div>'
      );
    },

    /* ---------- empty state ---------- */
    emptyState(opts) {
      return (
        '<div class="flex flex-col items-center justify-center px-6 py-14 text-center">' +
          '<span class="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">' +
            icon(opts.icon || 'inbox', 'h-6 w-6') +
          '</span>' +
          '<p class="mt-4 text-[15px] font-bold text-ink">' + Utils.escape(opts.title) + '</p>' +
          '<p class="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">' + Utils.escape(opts.message || '') + '</p>' +
          (opts.action
            ? '<button type="button" class="btn-primary mt-5" ' + (opts.actionId ? 'id="' + opts.actionId + '"' : '') + '>' +
                icon(opts.actionIcon || 'plus', 'h-4 w-4') + Utils.escape(opts.action) +
              '</button>'
            : '') +
        '</div>'
      );
    },

    /* ---------- skeleton rows for loading states ---------- */
    skeletonRows(count) {
      let out = '';
      for (let i = 0; i < (count || 4); i++) {
        out +=
          '<div class="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0">' +
            '<div class="skeleton h-10 w-10 rounded-full"></div>' +
            '<div class="flex-1 space-y-2">' +
              '<div class="skeleton h-3.5 w-1/3"></div>' +
              '<div class="skeleton h-3 w-1/4"></div>' +
            '</div>' +
            '<div class="skeleton h-6 w-20 rounded-full"></div>' +
          '</div>';
      }
      return out;
    },

    /* ---------- toggle switch ---------- */
    toggle(opts) {
      const on = !!opts.checked;
      return (
        '<div class="flex items-start justify-between gap-4 py-4">' +
          '<div class="min-w-0">' +
            '<p class="text-sm font-semibold text-ink">' + Utils.escape(opts.label) + '</p>' +
            (opts.hint ? '<p class="mt-0.5 text-[13px] leading-snug text-muted">' + Utils.escape(opts.hint) + '</p>' : '') +
          '</div>' +
          '<button type="button" role="switch" aria-checked="' + on + '" data-toggle="' + opts.name + '"' +
            ' aria-label="' + Utils.escape(opts.label) + '" class="toggle ' + (on ? 'toggle-on' : '') + '">' +
            '<span class="toggle-knob"></span>' +
          '</button>' +
        '</div>'
      );
    },

    /* ---------- page-level action bar ---------- */
    pageHead(opts) {
      return (
        '<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">' +
          '<div class="min-w-0">' +
            '<h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">' + Utils.escape(opts.title) + '</h2>' +
            (opts.sub ? '<p class="mt-1 text-sm text-muted">' + Utils.escape(opts.sub) + '</p>' : '') +
          '</div>' +
          (opts.action || '') +
        '</div>'
      );
    },

    /* ---------- key/value row used across profiles ---------- */
    field(label, value, iconName) {
      return (
        '<div class="flex items-start gap-3 py-3">' +
          (iconName ? '<span class="mt-0.5 text-slate-400">' + icon(iconName, 'h-[18px] w-[18px]') + '</span>' : '') +
          '<div class="min-w-0">' +
            '<p class="text-[12px] font-semibold uppercase tracking-wide text-muted">' + Utils.escape(label) + '</p>' +
            '<p class="mt-0.5 break-words text-sm font-medium text-ink">' + (value || '<span class="text-slate-400">—</span>') + '</p>' +
          '</div>' +
        '</div>'
      );
    },

    /* ---------- tabs ---------- */
    tabs(items, active) {
      return (
        '<div class="border-b border-line">' +
          '<div class="scrollbar-none -mb-px flex gap-6 overflow-x-auto">' +
            items.map((t) =>
              '<button type="button" data-tab="' + t.key + '" class="tab ' + (t.key === active ? 'tab-active' : '') + '">' +
                Utils.escape(t.label) +
                (t.count != null ? '<span class="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-muted">' + t.count + '</span>' : '') +
              '</button>'
            ).join('') +
          '</div>' +
        '</div>'
      );
    },
  };

  global.Components = C;
})(window);
