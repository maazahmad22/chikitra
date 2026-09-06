/* ==================================================================
   toast.js — reusable toast notifications
   ------------------------------------------------------------------
   Toast.success('Appointment created', 'Rahul Kumar · Today 10:30 AM')
   Toast.error / Toast.warning / Toast.info  share the same signature.
   Toasts auto-dismiss, can be closed manually, and stack.
   ================================================================== */
(function (global) {
  'use strict';

  const TYPES = {
    success: { icon: 'check-circle',    ring: 'bg-green-50 text-green-600 border-green-200' },
    error:   { icon: 'alert-circle',    ring: 'bg-red-50 text-red-600 border-red-200' },
    warning: { icon: 'alert-triangle',  ring: 'bg-amber-50 text-amber-600 border-amber-200' },
    info:    { icon: 'info',            ring: 'bg-blue-50 text-blue-600 border-blue-200' },
  };

  let host = null;

  function container() {
    if (host && document.body.contains(host)) return host;
    host = document.createElement('div');
    host.id = 'toast-host';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.className =
      'fixed z-[70] flex flex-col gap-2.5 pointer-events-none ' +
      'left-4 right-4 bottom-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px]';
    document.body.appendChild(host);
    return host;
  }

  function show(type, title, message, options) {
    const opts = options || {};
    const meta = TYPES[type] || TYPES.info;
    const el = document.createElement('div');
    el.className =
      'pointer-events-auto flex items-start gap-3 rounded-card border border-line bg-white ' +
      'px-4 py-3.5 shadow-pop animate-toast-in';

    el.innerHTML =
      '<span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ' + meta.ring + '">' +
        icon(meta.icon, 'h-[18px] w-[18px]') +
      '</span>' +
      '<div class="min-w-0 flex-1">' +
        '<p class="text-sm font-semibold text-ink">' + Utils.escape(title) + '</p>' +
        (message ? '<p class="mt-0.5 text-[13px] leading-snug text-muted">' + Utils.escape(message) + '</p>' : '') +
      '</div>' +
      '<button type="button" class="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink" aria-label="Dismiss notification">' +
        icon('x', 'h-4 w-4') +
      '</button>';

    const remove = () => {
      if (!el.isConnected) return;
      el.classList.remove('animate-toast-in');
      el.classList.add('animate-toast-out');
      setTimeout(() => el.remove(), 180);
    };

    el.querySelector('button').addEventListener('click', remove);
    container().appendChild(el);

    const life = opts.duration == null ? 4000 : opts.duration;
    if (life > 0) setTimeout(remove, life);
    return { dismiss: remove };
  }

  global.Toast = {
    show,
    success: (t, m, o) => show('success', t, m, o),
    error:   (t, m, o) => show('error', t, m, o),
    warning: (t, m, o) => show('warning', t, m, o),
    info:    (t, m, o) => show('info', t, m, o),
  };
})(window);
