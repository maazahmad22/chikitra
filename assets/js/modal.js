/* ==================================================================
   modal.js — reusable modal + slide-over system
   ------------------------------------------------------------------
   Modal.open({ title, subtitle, body, footer, size, onMount })
   SlideOver.open({ title, subtitle, body, footer, width, onMount })
   Modal.confirm({ title, message, confirmText, tone, onConfirm })

   Both return a handle: { el, close(), setBody(html), setFooter(html) }
   Shared behaviour: ESC to close, backdrop click, focus trap, focus
   restore, and a body scroll lock that survives stacked overlays.
   ================================================================== */
(function (global) {
  'use strict';

  const stack = [];

  function lockScroll() {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
  }
  function unlockScroll() {
    if (stack.length) return;
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
  }

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
    'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(panel, e) {
    const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  const MODAL_SIZE = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-3xl',
  };
  const PANEL_WIDTH = {
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
  };

  function header(opts, closeLabel) {
    return (
      '<div class="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">' +
        '<div class="min-w-0">' +
          '<h2 class="text-lg font-bold tracking-tight text-ink" data-overlay-title>' + Utils.escape(opts.title || '') + '</h2>' +
          (opts.subtitle ? '<p class="mt-0.5 text-[13px] text-muted" data-overlay-subtitle>' + Utils.escape(opts.subtitle) + '</p>' : '') +
        '</div>' +
        '<button type="button" data-overlay-close class="-mr-1.5 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink" aria-label="' + closeLabel + '">' +
          icon('x', 'h-5 w-5') +
        '</button>' +
      '</div>'
    );
  }

  function build(kind, opts) {
    const o = opts || {};
    const root = document.createElement('div');
    root.className = 'fixed inset-0 z-[60]';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    if (o.title) root.setAttribute('aria-label', o.title);

    const isPanel = kind === 'panel';
    const panelCls = isPanel
      ? 'relative ml-auto flex h-full w-full ' + (PANEL_WIDTH[o.width] || PANEL_WIDTH.lg) +
        ' flex-col bg-white shadow-panel animate-slide-left'
      : 'relative flex max-h-full w-full ' + (MODAL_SIZE[o.size] || MODAL_SIZE.md) +
        ' flex-col overflow-hidden rounded-t-2xl bg-white shadow-pop animate-scale-in sm:rounded-card';

    const wrapCls = isPanel
      ? 'absolute inset-0 flex'
      : 'absolute inset-0 flex items-end justify-center p-0 sm:items-center sm:p-6';

    root.innerHTML =
      '<div data-overlay-backdrop class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"></div>' +
      '<div class="' + wrapCls + '">' +
        '<div data-overlay-panel class="' + panelCls + '">' +
          header(o, isPanel ? 'Close panel' : 'Close dialog') +
          '<div data-overlay-body class="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">' + (o.body || '') + '</div>' +
          (o.footer
            ? '<div data-overlay-footer class="border-t border-line bg-slate-50/70 px-5 py-4 sm:px-6">' + o.footer + '</div>'
            : '<div data-overlay-footer class="hidden"></div>') +
        '</div>' +
      '</div>';

    const panel = root.querySelector('[data-overlay-panel]');
    const bodyEl = root.querySelector('[data-overlay-body]');
    const footEl = root.querySelector('[data-overlay-footer]');
    const previouslyFocused = document.activeElement;
    let closed = false;

    function close(result) {
      if (closed) return;
      closed = true;
      const i = stack.indexOf(handle);
      if (i > -1) stack.splice(i, 1);
      root.querySelector('[data-overlay-backdrop]').style.opacity = '0';
      panel.style.transition = 'opacity 180ms ease, transform 180ms ease';
      panel.style.opacity = '0';
      panel.style.transform = isPanel ? 'translateX(24px)' : 'translateY(8px) scale(.985)';
      document.removeEventListener('keydown', onKey, true);
      setTimeout(() => {
        root.remove();
        unlockScroll();
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        if (typeof o.onClose === 'function') o.onClose(result);
      }, 180);
    }

    function onKey(e) {
      if (stack[stack.length - 1] !== handle) return;
      if (e.key === 'Escape' && o.closable !== false) { e.preventDefault(); close(); }
      else if (e.key === 'Tab') trapFocus(panel, e);
    }

    const handle = {
      el: root,
      panel,
      body: bodyEl,
      close,
      setTitle(t) {
        const n = root.querySelector('[data-overlay-title]');
        if (n) n.textContent = t;
      },
      setSubtitle(t) {
        const n = root.querySelector('[data-overlay-subtitle]');
        if (n) n.textContent = t;
      },
      setBody(html) {
        bodyEl.innerHTML = html;
        return bodyEl;
      },
      setFooter(html) {
        footEl.innerHTML = html || '';
        footEl.className = html
          ? 'border-t border-line bg-slate-50/70 px-5 py-4 sm:px-6'
          : 'hidden';
        return footEl;
      },
      scrollTop() { bodyEl.scrollTop = 0; },
    };

    root.querySelectorAll('[data-overlay-close]').forEach((b) =>
      b.addEventListener('click', () => close())
    );
    if (o.closable !== false) {
      root.querySelector('[data-overlay-backdrop]').addEventListener('click', () => close());
    }
    // Any element inside the overlay can request a close.
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) close();
    });
    document.addEventListener('keydown', onKey, true);

    document.body.appendChild(root);
    lockScroll();
    stack.push(handle);

    if (typeof o.onMount === 'function') o.onMount(bodyEl, handle);

    // Focus the first sensible control, or the panel itself.
    requestAnimationFrame(() => {
      const target =
        panel.querySelector('[data-autofocus]') ||
        panel.querySelector(FOCUSABLE);
      if (target) target.focus({ preventScroll: true });
    });

    return handle;
  }

  const Modal = {
    open: (opts) => build('modal', opts),

    /** Small confirmation dialog. Returns the overlay handle. */
    confirm(opts) {
      const o = opts || {};
      const tone = o.tone === 'danger' ? 'danger' : 'primary';
      const btnClass = tone === 'danger' ? 'btn-primary !bg-danger hover:!bg-red-600' : 'btn-primary';
      const iconWrap = tone === 'danger'
        ? 'bg-red-50 text-danger border-red-200'
        : 'bg-brand-50 text-brand-700 border-brand-200';

      const handle = build('modal', {
        title: o.title || 'Are you sure?',
        size: 'sm',
        body:
          '<div class="flex gap-4">' +
            '<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ' + iconWrap + '">' +
              icon(o.icon || (tone === 'danger' ? 'alert-triangle' : 'info'), 'h-5 w-5') +
            '</span>' +
            '<p class="pt-2 text-sm leading-relaxed text-muted">' + (o.message || '') + '</p>' +
          '</div>',
        footer:
          '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
            '<button type="button" class="btn-secondary" data-close>' + Utils.escape(o.cancelText || 'Cancel') + '</button>' +
            '<button type="button" class="' + btnClass + '" data-confirm>' + Utils.escape(o.confirmText || 'Confirm') + '</button>' +
          '</div>',
      });

      handle.el.querySelector('[data-confirm]').addEventListener('click', () => {
        handle.close();
        if (typeof o.onConfirm === 'function') o.onConfirm();
      });
      return handle;
    },

    closeAll() {
      [...stack].reverse().forEach((h) => h.close());
    },
  };

  const SlideOver = {
    open: (opts) => build('panel', opts),
  };

  /* ---- Button loading state helper, used by every async-feeling action ---- */
  function setLoading(btn, isLoading, loadingText) {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.prevHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent opacity-70"></span>' +
        '<span>' + Utils.escape(loadingText || 'Processing…') + '</span>';
    } else {
      btn.disabled = false;
      if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
      delete btn.dataset.prevHtml;
    }
  }

  global.Modal = Modal;
  global.SlideOver = SlideOver;
  global.setLoading = setLoading;
})(window);
