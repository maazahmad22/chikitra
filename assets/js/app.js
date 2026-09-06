/* ==================================================================
   app.js — application bootstrap + the simpler pages
   ------------------------------------------------------------------
   App.init('dashboard') is the single entry point every page calls.
   It loads demo state, mounts the shell, wires global search, and
   renders the page. Pages with heavier logic live in their own
   modules (appointments.js, patients.js, billing.js, attendance.js).
   ================================================================== */
(function (global) {
  'use strict';

  const App = {
    page: null,
    _refresh: null,

    /** Pages register how they should redraw after a data change. */
    setRefresh(fn) { this._refresh = fn; },
    refresh() { if (typeof this._refresh === 'function') this._refresh(); },

    init(pageKey) {
      this.page = pageKey;
      Layout.mount(pageKey);
      Search.init();

      const renderers = {
        dashboard: Pages.dashboard,
        appointments: () => Appointments.renderPage(),
        patients: () => Patients.renderPage(),
        'patient-profile': () => Patients.renderProfile(),
        doctors: Pages.doctors,
        staff: Pages.staff,
        attendance: () => Attendance.renderPage(),
        billing: () => Billing.renderPage(),
        reports: Pages.reports,
        settings: Pages.settings,
      };

      const render = renderers[pageKey];
      if (!render) return;
      render();

      // Default refresh: re-render the whole page.
      if (!this._refresh) this.setRefresh(render);

      const params = new URLSearchParams(window.location.search);

      // Deep link: appointments.html?appt=a3 opens that appointment.
      const appt = params.get('appt');
      if (appt && Store.appointment(appt)) setTimeout(() => Appointments.openDetails(appt), 250);

      // Deep link: appointments.html?book=1 opens the booking flow. This is
      // where the guided tour hands over at the end.
      if (params.get('book') === '1' && global.Appointments) {
        setTimeout(() => Appointments.openCreate({}), 300);
      }

      // The tour spans several pages, so every page offers to continue it.
      if (global.Tour && !Tour.isActive) Tour.resume();
    },
  };

  /* ================================================================
     PAGES
     ================================================================ */
  const Pages = {

    /* ---------------- DASHBOARD ---------------- */
    dashboard() {
      const root = document.getElementById('page-content');
      const s = Store.todayStats();
      const user = Store.state.currentUser;
      const today = Utils.today();

      root.innerHTML =
        // greeting
        '<div class="mb-6">' +
          '<h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">' +
            Utils.greeting() + ', ' + Utils.escape(user.shortName) + ' 👋' +
          '</h2>' +
          '<p class="mt-1 text-sm text-muted">Here is everything happening at ' + Utils.escape(Store.state.clinic.name) + ' today.</p>' +
        '</div>' +

        // metrics
        '<div id="dash-metrics" class="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">' +
          Components.stat({ label: 'Appointments Today', value: s.total, icon: 'calendar-days', tone: 'brand',
            hint: s.completed + ' completed so far' }) +
          Components.stat({ label: 'Upcoming', value: s.upcoming, icon: 'clock', tone: 'info',
            hint: 'Still to be seen' }) +
          Components.stat({ label: 'Waiting', value: s.waiting, icon: 'users', tone: 'warning',
            hint: 'In the waiting room' }) +
          Components.stat({ label: "Today's Revenue", value: Utils.money(s.revenue), icon: 'indian-rupee', tone: 'success',
            hint: Utils.money(s.pending) + ' still pending' }) +
        '</div>' +

        '<div class="grid gap-5 lg:grid-cols-3">' +
          // schedule
          '<div class="min-w-0 lg:col-span-2">' +
            '<div id="dash-schedule" class="card overflow-hidden">' +
              Components.sectionHead("Today's Schedule",
                '<a href="appointments.html" class="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 transition-colors hover:text-brand-800">' +
                  'View all' + icon('chevron-right', 'h-4 w-4') + '</a>',
                Utils.escape(user.name) + ' · ' + Utils.formatDate(today)) +
              '<div id="dash-timeline">' + Appointments.timeline(user.id, today, { limit: 10 }) + '</div>' +
            '</div>' +
          '</div>' +

          // right rail
          '<div class="min-w-0 space-y-5">' +
            '<div class="card card-pad">' +
              '<h3 class="text-[15px] font-bold text-ink">Quick Actions</h3>' +
              '<div class="mt-4 space-y-2">' +
                '<button type="button" id="qa-appt" class="btn-primary btn-block justify-start">' +
                  icon('plus', 'h-4 w-4') + 'New Appointment</button>' +
                '<button type="button" id="qa-patient" class="btn-secondary btn-block justify-start">' +
                  icon('user-plus', 'h-4 w-4') + 'Add Patient</button>' +
                '<a href="appointments.html" class="btn-secondary btn-block justify-start">' +
                  icon('calendar-days', 'h-4 w-4') + 'View Schedule</a>' +
              '</div>' +
            '</div>' +

            '<div class="card overflow-hidden">' +
              Components.sectionHead('Recent Activity') +
              '<ul class="px-5 py-2 sm:px-6">' +
                Store.state.activity.slice(0, 6).map((a, i, arr) => {
                  const tones = {
                    brand: 'bg-brand-50 text-brand-700',
                    info: 'bg-blue-50 text-blue-700',
                    success: 'bg-green-50 text-green-700',
                    danger: 'bg-red-50 text-red-700',
                  };
                  return (
                    '<li class="relative flex gap-3 py-3">' +
                      '<div class="flex flex-col items-center">' +
                        '<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' + (tones[a.tone] || tones.brand) + '">' +
                          icon(a.icon, 'h-4 w-4') + '</span>' +
                        (i === Math.min(arr.length, 6) - 1 ? '' : '<span class="mt-1 w-px flex-1 bg-line"></span>') +
                      '</div>' +
                      '<div class="min-w-0 flex-1 pb-1">' +
                        '<p class="text-[13px] leading-snug text-ink">' + Utils.escape(a.text) + '</p>' +
                        '<p class="mt-0.5 text-[11px] text-slate-400">' + Utils.timeAgo(a.at) + '</p>' +
                      '</div>' +
                    '</li>'
                  );
                }).join('') +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>';

      document.getElementById('qa-appt').addEventListener('click', () => Appointments.openCreate({}));
      document.getElementById('qa-patient').addEventListener('click', () => Patients.openCreate({}));
      bindTimeline();

      function bindTimeline() {
        const holder = document.getElementById('dash-timeline');
        holder.querySelectorAll('[data-appt]').forEach((b) =>
          b.addEventListener('click', () => Appointments.openDetails(b.dataset.appt)));
        holder.querySelectorAll('[data-book-slot]').forEach((b) =>
          b.addEventListener('click', () =>
            Appointments.openCreate({ doctorId: b.dataset.doctor, date: b.dataset.date, time: b.dataset.bookSlot })));
      }

      App.setRefresh(Pages.dashboard);
    },

    /* ---------------- DOCTORS ---------------- */
    doctors() {
      const root = document.getElementById('page-content');
      const today = Utils.today();
      const DAYS = [
        ['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'],
        ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'],
      ];

      root.innerHTML =
        Components.pageHead({
          title: 'Doctors',
          sub: 'Consulting hours and today’s load for every doctor.',
        }) +
        '<div class="space-y-5">' +
          Store.state.doctors.map((d) => {
            const todays = Store.appointmentsOn(today, d.id);
            const slots = Store.slots(d.id, today);
            const free = slots.filter((x) => !x.booked).length;
            const todayKey = Utils.weekdayKey(today);

            return (
              '<div class="card overflow-hidden">' +
                '<div class="flex flex-col gap-4 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">' +
                  '<div class="flex items-start gap-4">' +
                    Components.avatar(d.name.replace('Dr. ', ''), 'h-14 w-14') +
                    '<div class="min-w-0">' +
                      '<h3 class="text-lg font-bold tracking-tight text-ink">' + Utils.escape(d.name) + '</h3>' +
                      '<p class="text-sm text-muted">' + Utils.escape(d.specialization) + '</p>' +
                      '<p class="mt-1 text-[12px] text-muted">' + Utils.escape(d.qualification) + ' · ' + Utils.escape(d.experience) + ' experience</p>' +
                      '<div class="mt-2.5 flex flex-wrap items-center gap-2">' +
                        '<span class="badge-neutral">' + icon('map-pin', 'h-3.5 w-3.5') + Utils.escape(d.room) + '</span>' +
                        '<span class="badge-neutral">' + icon('indian-rupee', 'h-3.5 w-3.5') + d.fee + ' consultation</span>' +
                        '<span class="badge-neutral">' + icon('phone', 'h-3.5 w-3.5') + Utils.escape(d.phone) + '</span>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="flex gap-2 sm:shrink-0">' +
                    '<button type="button" data-book-doctor="' + d.id + '" class="btn-primary btn-sm flex-1 sm:flex-none">' +
                      icon('calendar-plus', 'h-4 w-4') + 'Book' +
                    '</button>' +
                    '<a href="appointments.html" class="btn-secondary btn-sm flex-1 sm:flex-none">' +
                      icon('calendar-days', 'h-4 w-4') + 'Schedule' +
                    '</a>' +
                  '</div>' +
                '</div>' +

                '<div class="grid gap-5 p-5 sm:p-6 lg:grid-cols-3">' +
                  '<div class="min-w-0 lg:col-span-2">' +
                    '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Weekly Schedule</p>' +
                    '<div class="mt-3 grid gap-2 sm:grid-cols-2">' +
                      DAYS.map(([key, label]) => {
                        const w = d.schedule[key];
                        const isToday = key === todayKey;
                        return (
                          '<div class="flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 ' +
                            (isToday ? 'border-brand-300 bg-brand-50' : w ? 'border-line bg-white' : 'border-line bg-slate-50') + '">' +
                            '<span class="flex items-center gap-2 text-[13px] font-semibold ' + (w ? 'text-ink' : 'text-slate-400') + '">' +
                              label + (isToday ? '<span class="badge-brand !px-1.5 !py-0.5 !text-[10px]">Today</span>' : '') +
                            '</span>' +
                            '<span class="shrink-0 text-[13px] ' + (w ? 'font-semibold text-ink' : 'text-slate-400') + '">' +
                              (w ? Utils.formatTime(w.start) + ' – ' + Utils.formatTime(w.end) : 'Closed') +
                            '</span>' +
                          '</div>'
                        );
                      }).join('') +
                    '</div>' +
                  '</div>' +

                  '<div>' +
                    '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Today</p>' +
                    '<div class="mt-3 space-y-2">' +
                      miniStat('Booked appointments', todays.length, 'calendar-check') +
                      miniStat('Free slots', free, 'clock') +
                      miniStat('Completed', todays.filter((a) => a.status === 'completed').length, 'check-circle') +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('') +
        '</div>';

      function miniStat(label, value, iconName) {
        return (
          '<div class="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3">' +
            '<span class="flex items-center gap-2 text-[13px] text-muted">' +
              '<span class="text-slate-400">' + icon(iconName, 'h-4 w-4') + '</span>' + label +
            '</span>' +
            '<span class="text-base font-bold text-ink">' + value + '</span>' +
          '</div>'
        );
      }

      root.querySelectorAll('[data-book-doctor]').forEach((b) =>
        b.addEventListener('click', () => Appointments.openCreate({ doctorId: b.dataset.bookDoctor })));

      App.setRefresh(Pages.doctors);
    },

    /* ---------------- STAFF ---------------- */
    staff() {
      const root = document.getElementById('page-content');
      const today = Utils.today();

      const attendanceOf = (id) => {
        const r = Store.state.attendance.records.find((x) => x.staffId === id && x.date === today);
        if (!r || (!r.checkIn && r.status !== 'leave')) return '<span class="badge-neutral">Not marked</span>';
        if (r.status === 'leave') return '<span class="badge-warning">' + icon('info', 'h-3.5 w-3.5') + 'On Leave</span>';
        return '<span class="badge-success">' + icon('check-circle', 'h-3.5 w-3.5') + 'In ' + Utils.formatTime(r.checkIn) + '</span>';
      };

      const list = Store.state.staff;

      root.innerHTML =
        Components.pageHead({
          title: 'Staff',
          sub: 'Your clinic team, their roles and today’s attendance.',
          action: '<a href="attendance.html" class="btn-primary w-full sm:w-auto">' +
                    icon('clipboard-check', 'h-4 w-4') + 'Attendance' + '</a>',
        }) +
        '<div class="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">' +
          Components.stat({ label: 'Team members', value: list.length, icon: 'users', tone: 'brand' }) +
          Components.stat({ label: 'Active', value: list.filter((s) => s.status === 'active').length, icon: 'check-circle', tone: 'success' }) +
          Components.stat({ label: 'On leave', value: list.filter((s) => s.status === 'on_leave').length, icon: 'info', tone: 'warning' }) +
          Components.stat({ label: 'Checked in today',
            value: Store.state.attendance.records.filter((r) => r.date === today && r.checkIn).length,
            icon: 'clipboard-check', tone: 'info' }) +
        '</div>' +

        '<div class="card overflow-hidden">' +
          Components.sectionHead('Clinic team') +
          '<div class="hidden overflow-x-auto md:block">' +
            '<table class="w-full">' +
              '<thead><tr>' +
                '<th class="th">Name</th><th class="th">Role</th><th class="th">Department</th>' +
                '<th class="th">Shift</th><th class="th">Status</th><th class="th">Today</th>' +
              '</tr></thead>' +
              '<tbody>' +
                list.map((s) =>
                  '<tr class="border-b border-line last:border-0">' +
                    '<td class="td">' +
                      '<div class="flex items-center gap-3">' + Components.avatar(s.name, 'h-9 w-9') +
                        '<div class="min-w-0"><p class="font-semibold text-ink">' + Utils.escape(s.name) + '</p>' +
                        '<p class="text-[12px] text-muted">' + Utils.escape(s.phone) + '</p></div>' +
                      '</div>' +
                    '</td>' +
                    '<td class="td text-muted">' + Utils.escape(s.role) + '</td>' +
                    '<td class="td text-muted">' + Utils.escape(s.department) + '</td>' +
                    '<td class="td whitespace-nowrap text-muted">' + Utils.escape(s.shift) + '</td>' +
                    '<td class="td">' + Components.staffBadge(s.status) + '</td>' +
                    '<td class="td">' + attendanceOf(s.id) + '</td>' +
                  '</tr>').join('') +
              '</tbody>' +
            '</table>' +
          '</div>' +
          '<div class="md:hidden">' +
            list.map((s) =>
              '<div class="flex items-start gap-3 border-b border-line px-4 py-4 last:border-0">' +
                Components.avatar(s.name, 'h-11 w-11') +
                '<div class="min-w-0 flex-1">' +
                  '<p class="truncate text-sm font-semibold text-ink">' + Utils.escape(s.name) + '</p>' +
                  '<p class="mt-0.5 truncate text-[12px] text-muted">' + Utils.escape(s.role + ' · ' + s.department) + '</p>' +
                  '<p class="mt-0.5 truncate text-[12px] text-muted">Shift ' + Utils.escape(s.shift) + '</p>' +
                  '<div class="mt-2 flex flex-wrap gap-1.5">' + Components.staffBadge(s.status) + attendanceOf(s.id) + '</div>' +
                '</div>' +
              '</div>').join('') +
          '</div>' +
        '</div>';

      App.setRefresh(Pages.staff);
    },

    /* ---------------- REPORTS ---------------- */
    reports() {
      const root = document.getElementById('page-content');
      const today = Utils.today();
      const start = Utils.addDays(today, -6);

      const week = Store.state.appointments.filter((a) => a.date >= start && a.date <= today);
      const completed = week.filter((a) => a.status === 'completed').length;
      const cancelled = week.filter((a) => a.status === 'cancelled').length;
      const revenue = Store.state.invoices
        .filter((v) => v.date >= start && v.date <= today)
        .reduce((s, v) => s + v.paid, 0);

      // last 7 days bar chart
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = Utils.addDays(today, -i);
        days.push({ date, count: Store.appointmentsOn(date).length });
      }
      const max = Math.max(1, ...days.map((d) => d.count));

      // per-doctor split for the week
      const byDoctor = Store.state.doctors.map((d) => ({
        name: d.name,
        count: week.filter((a) => a.doctorId === d.id && a.status !== 'cancelled').length,
      })).sort((a, b) => b.count - a.count);
      const docMax = Math.max(1, ...byDoctor.map((d) => d.count));

      root.innerHTML =
        Components.pageHead({
          title: 'Reports',
          sub: 'A simple summary of the last 7 days at ' + Store.state.clinic.name + '.',
        }) +

        '<div class="mb-5 grid grid-cols-2 gap-4 xl:grid-cols-4">' +
          Components.stat({ label: 'Appointments', value: week.length, icon: 'calendar-days', tone: 'brand', hint: 'Last 7 days' }) +
          Components.stat({ label: 'Completed', value: completed, icon: 'check-circle', tone: 'success', hint: 'Consultations done' }) +
          Components.stat({ label: 'Cancelled', value: cancelled, icon: 'ban', tone: 'warning', hint: 'Freed-up slots' }) +
          Components.stat({ label: 'Collected', value: Utils.money(revenue), icon: 'indian-rupee', tone: 'info', hint: 'Payments received' }) +
        '</div>' +

        '<div class="grid gap-5 lg:grid-cols-3">' +
          '<div class="card min-w-0 lg:col-span-2">' +
            Components.sectionHead('Appointments per day', null, 'Last 7 days including today.') +
            '<div class="px-5 py-6 sm:px-6">' +
              '<div class="flex h-52 items-stretch gap-2 sm:gap-3">' +
                days.map((d) => {
                  const h = Math.round((d.count / max) * 100);
                  const isToday = d.date === today;
                  return (
                    '<div class="flex flex-1 flex-col items-center gap-2">' +
                      '<span class="text-[12px] font-bold text-ink">' + d.count + '</span>' +
                      // the bar is positioned, so its percentage height resolves
                      // against this track rather than an indefinite flex basis
                      '<div class="relative w-full flex-1">' +
                        '<div class="absolute inset-x-0 bottom-0 rounded-t-md ' + (isToday ? 'bg-brand-600' : 'bg-brand-200') + '"' +
                          ' style="height:' + Math.max(h, 3) + '%"></div>' +
                      '</div>' +
                      '<span class="text-[11px] font-medium ' + (isToday ? 'text-brand-700' : 'text-muted') + '">' +
                        ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Utils.weekday(d.date)] + '</span>' +
                    '</div>'
                  );
                }).join('') +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="card">' +
            Components.sectionHead('By doctor', null, 'Appointments in the last 7 days.') +
            '<div class="space-y-4 px-5 py-5 sm:px-6">' +
              byDoctor.map((d) =>
                '<div>' +
                  '<div class="flex items-center justify-between gap-3">' +
                    '<span class="truncate text-[13px] font-semibold text-ink">' + Utils.escape(d.name) + '</span>' +
                    '<span class="shrink-0 text-[13px] font-bold text-ink">' + d.count + '</span>' +
                  '</div>' +
                  '<div class="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">' +
                    '<div class="h-full rounded-full bg-brand-500" style="width:' + Math.round((d.count / docMax) * 100) + '%"></div>' +
                  '</div>' +
                '</div>').join('') +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="card mt-5 overflow-hidden">' +
          Components.sectionHead('Where the time goes', null, 'Status split for the last 7 days.') +
          '<div class="grid gap-px bg-line sm:grid-cols-4">' +
            ['completed', 'confirmed', 'waiting', 'cancelled'].map((k) => {
              const n = week.filter((a) => a.status === k).length;
              const m = APPOINTMENT_STATUS[k];
              return (
                '<div class="bg-white px-5 py-5">' +
                  '<span class="flex items-center gap-2 text-[13px] font-semibold text-muted">' +
                    '<span class="badge-dot ' + m.dot + '"></span>' + m.label + '</span>' +
                  '<p class="mt-2 text-2xl font-extrabold text-ink">' + n + '</p>' +
                  '<p class="mt-0.5 text-[12px] text-muted">' + (week.length ? Math.round((n / week.length) * 100) : 0) + '% of all appointments</p>' +
                '</div>'
              );
            }).join('') +
          '</div>' +
        '</div>';

      App.setRefresh(Pages.reports);
    },

    /* ---------------- SETTINGS ---------------- */
    settings() {
      const root = document.getElementById('page-content');
      const c = Store.state.clinic;
      const u = Store.state.currentUser;

      root.innerHTML =
        Components.pageHead({
          title: 'Settings',
          sub: 'Clinic details and demo controls.',
        }) +
        '<div class="grid gap-5 lg:grid-cols-3">' +
          '<div class="min-w-0 space-y-5 lg:col-span-2">' +

            '<div class="card">' +
              Components.sectionHead('Clinic profile', null, 'Shown across the app and on printed invoices.') +
              '<div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">' +
                field('set-name', 'Clinic name', c.name) +
                field('set-phone', 'Phone number', c.phone) +
                field('set-city', 'City', c.city) +
                field('set-state', 'State', c.state) +
                '<div class="sm:col-span-2">' + field('set-address', 'Address', c.address) + '</div>' +
              '</div>' +
              '<div class="flex justify-end border-t border-line bg-slate-50/70 px-5 py-4 sm:px-6">' +
                '<button type="button" id="save-clinic" class="btn-primary">' + icon('check', 'h-4 w-4') + 'Save Changes</button>' +
              '</div>' +
            '</div>' +

            '<div class="card">' +
              Components.sectionHead('Doctor profile', null, 'The account currently signed in to the demo.') +
              '<div class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">' +
                field('set-doc-name', 'Full name', u.name) +
                field('set-doc-spec', 'Specialization', u.specialization) +
              '</div>' +
              '<div class="flex justify-end border-t border-line bg-slate-50/70 px-5 py-4 sm:px-6">' +
                '<button type="button" id="save-doctor" class="btn-primary">' + icon('check', 'h-4 w-4') + 'Save Changes</button>' +
              '</div>' +
            '</div>' +

            '<div class="card border-red-200">' +
              Components.sectionHead('Demo data', null, 'Everything you change is stored in this browser only.') +
              '<div class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">' +
                '<div class="min-w-0">' +
                  '<p class="text-sm font-semibold text-ink">Reset Demo Data</p>' +
                  '<p class="mt-1 text-[13px] leading-relaxed text-muted">' +
                    'Restore the original CarePoint Clinic data — appointments, payments, attendance and notifications all go back to how they started.' +
                  '</p>' +
                '</div>' +
                '<button type="button" id="reset-demo" class="btn-danger shrink-0">' +
                  icon('refresh', 'h-4 w-4') + 'Reset Demo Data' +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="min-w-0 space-y-5">' +
            '<div class="card card-pad">' +
              '<span class="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">' + icon('info', 'h-5 w-5') + '</span>' +
              '<h3 class="mt-3 text-[15px] font-bold text-ink">About this demo</h3>' +
              '<p class="mt-1.5 text-[13px] leading-relaxed text-muted">' +
                'CHIKITRA is shown here with fictional data for ' + Utils.escape(c.name) + '. No information leaves your browser and no real patient records are used.' +
              '</p>' +
              '<dl class="mt-4 divide-y divide-line border-t border-line">' +
                infoRow('Patients', Store.state.patients.length) +
                infoRow('Appointments', Store.state.appointments.length) +
                infoRow('Invoices', Store.state.invoices.length) +
                infoRow('Staff', Store.state.staff.length) +
              '</dl>' +
            '</div>' +

            '<div class="card card-pad">' +
              '<h3 class="text-[15px] font-bold text-ink">Where your changes go</h3>' +
              '<ul class="mt-3 space-y-3">' +
                [['Saved in this browser', 'New appointments, status changes, payments and attendance are kept in localStorage.'],
                 ['Nothing is uploaded', 'The demo runs entirely offline — there is no server behind it.'],
                 ['Reset any time', 'Use Reset Demo Data to start a fresh demo before your next meeting.']]
                .map(([t, d]) =>
                  '<li class="flex gap-2.5">' +
                    '<span class="mt-0.5 shrink-0 text-brand-600">' + icon('check-circle', 'h-[18px] w-[18px]') + '</span>' +
                    '<span><span class="block text-[13px] font-semibold text-ink">' + t + '</span>' +
                    '<span class="block text-[12px] leading-snug text-muted">' + d + '</span></span>' +
                  '</li>').join('') +
              '</ul>' +
            '</div>' +
          '</div>' +
        '</div>';

      function field(id, label, value) {
        return (
          '<div>' +
            '<label for="' + id + '" class="label">' + label + '</label>' +
            '<input id="' + id + '" type="text" class="input" value="' + Utils.escape(value) + '" />' +
          '</div>'
        );
      }
      function infoRow(label, value) {
        return (
          '<div class="flex items-center justify-between py-2.5">' +
            '<dt class="text-[13px] text-muted">' + label + '</dt>' +
            '<dd class="text-[13px] font-bold text-ink">' + value + '</dd>' +
          '</div>'
        );
      }

      const val = (id) => document.getElementById(id).value.trim();

      document.getElementById('save-clinic').addEventListener('click', (e) => {
        if (!val('set-name')) { Toast.error('Clinic name is required'); return; }
        setLoading(e.currentTarget, true, 'Saving…');
        setTimeout(() => {
          Object.assign(Store.state.clinic, {
            name: val('set-name'), phone: val('set-phone'),
            city: val('set-city'), state: val('set-state'), address: val('set-address'),
          });
          Store.save();
          Toast.success('✓ Clinic details saved', 'Reloading with the updated details…');
          setTimeout(() => window.location.reload(), 700);
        }, 600);
      });

      document.getElementById('save-doctor').addEventListener('click', (e) => {
        const name = val('set-doc-name');
        if (!name) { Toast.error('Name is required'); return; }
        setLoading(e.currentTarget, true, 'Saving…');
        setTimeout(() => {
          Store.state.currentUser.name = name;
          Store.state.currentUser.shortName = name.split(' ').slice(0, 2).join(' ');
          Store.state.currentUser.specialization = val('set-doc-spec');
          const doc = Store.doctor(Store.state.currentUser.id);
          if (doc) { doc.name = name; doc.specialization = val('set-doc-spec'); }
          Store.save();
          Toast.success('✓ Doctor profile saved', 'Reloading with the updated details…');
          setTimeout(() => window.location.reload(), 700);
        }, 600);
      });

      document.getElementById('reset-demo').addEventListener('click', () => Layout.confirmReset());

      App.setRefresh(Pages.settings);
    },
  };

  global.App = App;
  global.Pages = Pages;
})(window);
