/* ==================================================================
   sidebar.js — application shell
   ------------------------------------------------------------------
   Renders the dark sidebar, the top header, the mobile drawer, the
   notification panel and the profile menu, then hands the page module
   an empty <main id="page-content"> to render into.

   Every page in /pages calls:  Layout.mount('appointments')
   ================================================================== */
(function (global) {
  'use strict';

  const NAV = [
    {
      group: 'Main',
      items: [
        { key: 'dashboard',    label: 'Dashboard',    icon: 'layout-dashboard', href: 'dashboard.html' },
        { key: 'appointments', label: 'Appointments', icon: 'calendar-days',    href: 'appointments.html' },
        { key: 'patients',     label: 'Patients',     icon: 'users',            href: 'patients.html' },
      ],
    },
    {
      group: 'Clinic',
      items: [
        { key: 'doctors',    label: 'Doctors',    icon: 'stethoscope',      href: 'doctors.html' },
        { key: 'staff',      label: 'Staff',      icon: 'briefcase',        href: 'staff.html' },
        { key: 'attendance', label: 'Attendance', icon: 'clipboard-check',  href: 'attendance.html' },
      ],
    },
    {
      group: 'Finance',
      items: [
        { key: 'billing', label: 'Billing', icon: 'credit-card', href: 'billing.html' },
        { key: 'reports', label: 'Reports', icon: 'bar-chart',   href: 'reports.html' },
      ],
    },
  ];

  const PAGES = {
    dashboard:      { title: 'Dashboard',    sub: 'Your day at a glance.' },
    appointments:   { title: 'Appointments', sub: 'Manage your clinic appointments efficiently.' },
    patients:       { title: 'Patients',     sub: 'Keep patient information organized and easy to access.' },
    'patient-profile': { title: 'Patient Profile', sub: 'Full history in one place.', parent: 'patients' },
    doctors:        { title: 'Doctors',      sub: 'Doctor profiles and weekly schedules.' },
    staff:          { title: 'Staff',        sub: 'Your clinic team and their roles.' },
    attendance:     { title: 'Attendance',   sub: 'Smart check-in for your clinic staff.' },
    billing:        { title: 'Billing',      sub: 'Track clinic payments and invoices.' },
    reports:        { title: 'Reports',      sub: 'A simple summary of how the clinic is running.' },
    settings:       { title: 'Settings',     sub: 'Clinic preferences and demo controls.' },
  };

  /* ---------------- brand mark ---------------- */
  function logoMark(size) {
    const s = size || 'h-9 w-9';
    return (
      '<span class="' + s + ' inline-flex shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">' +
        icon('heart-pulse', 'h-5 w-5') +
      '</span>'
    );
  }

  function navMarkup(active) {
    return NAV.map((section) =>
      '<div class="px-3">' +
        '<p class="px-3 pb-1.5 pt-5 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">' + section.group + '</p>' +
        '<ul class="space-y-0.5">' +
          section.items.map((item) => {
            const isActive = item.key === active;
            return '<li>' +
              '<a href="' + item.href + '" class="nav-link ' + (isActive ? 'nav-link-active' : '') + '"' +
                (isActive ? ' aria-current="page"' : '') + '>' +
                icon(item.icon, 'h-[18px] w-[18px] shrink-0') +
                '<span>' + item.label + '</span>' +
              '</a></li>';
          }).join('') +
        '</ul>' +
      '</div>'
    ).join('');
  }

  function sidebarInner(active) {
    const s = Store.state;
    return (
      '<div class="flex h-16 shrink-0 items-center gap-2.5 border-b border-nav-line px-5">' +
        logoMark('h-8 w-8') +
        '<div class="min-w-0">' +
          '<p class="text-[15px] font-extrabold tracking-[0.14em] text-white">CHIKITRA</p>' +
          '<p class="-mt-0.5 text-[10px] font-medium tracking-wide text-slate-500">CLINIC MANAGEMENT</p>' +
        '</div>' +
      '</div>' +

      '<nav class="min-h-0 flex-1 overflow-y-auto pb-4" aria-label="Main navigation">' +
        navMarkup(active) +
        '<div class="mt-5 border-t border-nav-line px-3 pt-4">' +
          '<a href="settings.html" class="nav-link ' + (active === 'settings' ? 'nav-link-active' : '') + '">' +
            icon('settings', 'h-[18px] w-[18px] shrink-0') + '<span>Settings</span>' +
          '</a>' +
        '</div>' +
      '</nav>' +

      '<div class="shrink-0 border-t border-nav-line p-3">' +
        '<div class="rounded-lg bg-white/[0.04] p-3">' +
          '<div class="flex items-center gap-2.5">' +
            '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300">' +
              icon('building', 'h-4 w-4') +
            '</span>' +
            '<div class="min-w-0">' +
              '<p class="truncate text-[13px] font-semibold text-white">' + Utils.escape(s.clinic.name) + '</p>' +
              '<p class="truncate text-[11px] text-slate-500">' + Utils.escape(s.clinic.city + ', ' + s.clinic.state) + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<a href="../index.html" class="nav-link mt-1.5 w-full">' +
          icon('log-out', 'h-[18px] w-[18px] shrink-0') + '<span>Exit Demo</span>' +
        '</a>' +
      '</div>'
    );
  }

  function headerMarkup(pageKey) {
    const meta = PAGES[pageKey] || { title: 'CHIKITRA', sub: '' };
    const user = Store.state.currentUser;
    const unread = Store.unreadCount();

    return (
      '<div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">' +
        // mobile: menu + brand
        '<button type="button" id="btn-open-drawer" class="btn-ghost -ml-2 !min-h-[40px] !px-2 lg:hidden" aria-label="Open navigation menu">' +
          icon('menu', 'h-5 w-5') +
        '</button>' +
        '<div class="flex min-w-0 flex-1 items-center gap-3">' +
          '<div class="min-w-0">' +
            '<h1 class="truncate text-[17px] font-bold tracking-tight text-ink sm:text-xl">' + Utils.escape(meta.title) + '</h1>' +
            '<p class="hidden truncate text-[13px] text-muted sm:block">' + Utils.escape(meta.sub) + '</p>' +
          '</div>' +
        '</div>' +

        // desktop search
        '<div class="relative hidden md:block md:w-64 lg:w-80">' +
          '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">' + icon('search', 'h-[18px] w-[18px]') + '</span>' +
          '<input id="global-search" type="search" autocomplete="off" placeholder="Search patients, appointments, staff…"' +
            ' class="input !py-2.5 pl-10 pr-14 text-[13px]" aria-label="Search the clinic" />' +
          '<kbd class="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-muted lg:block">Ctrl K</kbd>' +
        '</div>' +

        '<button type="button" id="btn-search-mobile" class="btn-ghost !min-h-[40px] !px-2.5 md:hidden" aria-label="Search">' +
          icon('search', 'h-5 w-5') +
        '</button>' +

        // notifications
        '<button type="button" id="btn-notifications" class="btn-ghost relative !min-h-[40px] !px-2.5" aria-label="Notifications">' +
          icon('bell', 'h-5 w-5') +
          '<span id="notif-badge" class="' + (unread ? '' : 'hidden ') + 'absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">' + unread + '</span>' +
        '</button>' +

        // profile
        '<div class="relative">' +
          '<button type="button" id="btn-profile" class="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-100 sm:pr-2.5"' +
            ' aria-haspopup="true" aria-expanded="false">' +
            '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">' + Utils.initials(user.name) + '</span>' +
            '<span class="hidden text-left sm:block">' +
              '<span class="block text-[13px] font-semibold leading-tight text-ink">' + Utils.escape(user.shortName) + '</span>' +
              '<span class="block text-[11px] leading-tight text-muted">' + Utils.escape(user.specialization) + '</span>' +
            '</span>' +
            '<span class="hidden text-slate-400 sm:block">' + icon('chevron-down', 'h-4 w-4') + '</span>' +
          '</button>' +
          profileMenuMarkup(user) +
        '</div>' +
      '</div>'
    );
  }

  function profileMenuMarkup(user) {
    return (
      '<div id="profile-menu" class="absolute right-0 top-full z-50 mt-2 hidden w-64 origin-top-right rounded-card border border-line bg-white p-1.5 shadow-pop">' +
        '<div class="border-b border-line px-3 pb-3 pt-2">' +
          '<p class="text-sm font-semibold text-ink">' + Utils.escape(user.name) + '</p>' +
          '<p class="text-[12px] text-muted">' + Utils.escape(user.email) + '</p>' +
          '<span class="badge-brand mt-2">' + Utils.escape(user.role) + '</span>' +
        '</div>' +
        '<a href="settings.html" class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-slate-100">' +
          icon('settings', 'h-[18px] w-[18px] text-muted') + 'Settings' +
        '</a>' +
        '<button type="button" id="menu-reset" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:bg-slate-100">' +
          icon('refresh', 'h-[18px] w-[18px] text-muted') + 'Reset demo data' +
        '</button>' +
        '<a href="../index.html" class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-red-50">' +
          icon('log-out', 'h-[18px] w-[18px]') + 'Exit demo' +
        '</a>' +
      '</div>'
    );
  }

  /* ---------------- notifications ---------------- */
  function notificationIcon(type) {
    const map = {
      appointment: ['calendar-check', 'bg-brand-50 text-brand-700'],
      billing:     ['indian-rupee',   'bg-green-50 text-green-700'],
      attendance:  ['clipboard-check','bg-blue-50 text-blue-700'],
      patient:     ['user-plus',      'bg-violet-50 text-violet-700'],
      info:        ['info',           'bg-slate-100 text-slate-600'],
    };
    return map[type] || map.info;
  }

  function notificationsBody() {
    const list = Store.state.notifications;
    if (!list.length) {
      return Components.emptyState({
        icon: 'inbox',
        title: 'No notifications',
        message: 'Clinic activity will show up here as it happens.',
      });
    }
    return (
      '<div class="-mx-5 -my-5 sm:-mx-6">' +
        '<ul class="divide-y divide-line">' +
          list.map((n) => {
            const [ic, tint] = notificationIcon(n.type);
            return (
              '<li>' +
                '<button type="button" data-notif="' + n.id + '"' +
                  ' class="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 sm:px-6 ' +
                  (n.read ? '' : 'bg-brand-50/40') + '">' +
                  '<span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ' + tint + '">' + icon(ic, 'h-[18px] w-[18px]') + '</span>' +
                  '<span class="min-w-0 flex-1">' +
                    '<span class="flex items-center gap-2">' +
                      '<span class="text-sm font-semibold text-ink">' + Utils.escape(n.title) + '</span>' +
                      (n.read ? '' : '<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500"></span>') +
                    '</span>' +
                    '<span class="mt-0.5 block text-[13px] leading-snug text-muted">' + Utils.escape(n.body) + '</span>' +
                    '<span class="mt-1 block text-[11px] font-medium text-slate-400">' + Utils.timeAgo(n.at) + '</span>' +
                  '</span>' +
                '</button>' +
              '</li>'
            );
          }).join('') +
        '</ul>' +
      '</div>'
    );
  }

  function openNotifications() {
    const panel = SlideOver.open({
      title: 'Notifications',
      subtitle: Store.unreadCount() + ' unread',
      width: 'lg',
      body: notificationsBody(),
      footer:
        '<div class="flex items-center justify-between gap-3">' +
          '<button type="button" class="btn-ghost !px-2" data-close>Close</button>' +
          '<button type="button" class="btn-secondary btn-sm" id="mark-all-read">' + icon('check', 'h-4 w-4') + 'Mark all as read</button>' +
        '</div>',
    });

    const refresh = () => {
      panel.setBody(notificationsBody());
      panel.setSubtitle(Store.unreadCount() + ' unread');
      bind();
      Layout.refreshBadge();
    };

    function bind() {
      panel.body.querySelectorAll('[data-notif]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const n = Store.state.notifications.find((x) => x.id === btn.dataset.notif);
          if (!n) return;
          n.read = true;
          Store.save();
          if (n.link) {
            window.location.href = n.link + '.html';
          } else {
            refresh();
          }
        });
      });
    }

    panel.el.querySelector('#mark-all-read').addEventListener('click', () => {
      Store.state.notifications.forEach((n) => { n.read = true; });
      Store.save();
      refresh();
      Toast.success('All notifications marked as read');
    });

    bind();
  }

  /* ---------------- mount ---------------- */
  const Layout = {
    NAV,
    PAGES,
    logoMark,
    page: null,

    mount(pageKey) {
      Store.load();
      this.page = pageKey;
      const meta = PAGES[pageKey] || {};
      const activeKey = meta.parent || pageKey;
      document.title = (meta.title ? meta.title + ' · ' : '') + 'CHIKITRA';

      const root = document.getElementById('app');
      root.innerHTML =
        // mobile drawer backdrop
        '<div id="drawer-backdrop" class="fixed inset-0 z-40 hidden bg-slate-900/50 backdrop-blur-[1px] lg:hidden"></div>' +

        // sidebar / drawer
        '<aside id="sidebar" class="fixed inset-y-0 left-0 z-50 flex w-[272px] -translate-x-full flex-col bg-nav ' +
          'transition-transform duration-250 ease-out lg:w-64 lg:translate-x-0">' +
          '<button type="button" id="btn-close-drawer" class="absolute right-3 top-4 rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close navigation menu">' +
            icon('x', 'h-5 w-5') +
          '</button>' +
          sidebarInner(activeKey) +
        '</aside>' +

        // workspace
        '<div class="flex min-h-screen flex-col lg:pl-64">' +
          '<header class="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">' +
            headerMarkup(pageKey) +
          '</header>' +
          '<main id="page-content" class="flex-1 px-4 py-6 sm:px-6 lg:px-8"></main>' +
        '</div>';

      this.bindShell();
      return document.getElementById('page-content');
    },

    bindShell() {
      const sidebar = document.getElementById('sidebar');
      const backdrop = document.getElementById('drawer-backdrop');

      const openDrawer = () => {
        sidebar.classList.remove('-translate-x-full');
        backdrop.classList.remove('hidden');
        document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
      };
      const closeDrawer = () => {
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
        document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
      };

      document.getElementById('btn-open-drawer').addEventListener('click', openDrawer);
      document.getElementById('btn-close-drawer').addEventListener('click', closeDrawer);
      backdrop.addEventListener('click', closeDrawer);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) closeDrawer();
      });

      // profile menu
      const profileBtn = document.getElementById('btn-profile');
      const profileMenu = document.getElementById('profile-menu');
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !profileMenu.classList.contains('hidden');
        profileMenu.classList.toggle('hidden', isOpen);
        profileMenu.classList.toggle('animate-scale-in', !isOpen);
        profileBtn.setAttribute('aria-expanded', String(!isOpen));
      });
      document.addEventListener('click', (e) => {
        if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
          profileMenu.classList.add('hidden');
          profileBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.getElementById('menu-reset').addEventListener('click', () => {
        profileMenu.classList.add('hidden');
        Layout.confirmReset();
      });

      document.getElementById('btn-notifications').addEventListener('click', openNotifications);
    },

    refreshBadge() {
      const badge = document.getElementById('notif-badge');
      if (!badge) return;
      const unread = Store.unreadCount();
      badge.textContent = unread;
      badge.classList.toggle('hidden', unread === 0);
    },

    confirmReset() {
      Modal.confirm({
        title: 'Reset demo data?',
        message:
          'Every appointment, payment, attendance record and notification you changed will be replaced with the original demo data. This cannot be undone.',
        confirmText: 'Reset demo data',
        tone: 'danger',
        icon: 'refresh',
        onConfirm() {
          Store.reset();
          Toast.success('Demo data restored', 'Reloading the original CarePoint Clinic data…');
          setTimeout(() => window.location.reload(), 700);
        },
      });
    },

    openNotifications,
  };

  global.Layout = Layout;
})(window);
