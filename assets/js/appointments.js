/* ==================================================================
   appointments.js — appointment workflows
   ------------------------------------------------------------------
   · Appointments page (day / week / month views + filters)
   · Appointment detail slide-over with working status actions
   · 5-step "New Appointment" workflow
   · Reschedule workflow
   · Shared row + timeline builders reused by the dashboard
   ================================================================== */
(function (global) {
  'use strict';

  /* ================================================================
     SHARED BUILDERS
     ================================================================ */

  /** One appointment row. Used on the appointments page and elsewhere. */
  function row(appt, opts) {
    const o = opts || {};
    const p = Store.patient(appt.patientId);
    const d = Store.doctor(appt.doctorId);
    const sub = [d ? d.name : '', appt.type].filter(Boolean).join(' · ');

    return (
      '<button type="button" data-appt="' + appt.id + '"' +
        ' class="group flex w-full items-center gap-3 border-b border-line px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-brand-50/40 sm:gap-4 sm:px-5">' +
        '<span class="flex w-[68px] shrink-0 flex-col sm:w-[92px]">' +
          '<span class="text-[13px] font-bold text-ink sm:text-sm">' + Utils.formatTime(appt.time) + '</span>' +
          (o.showDate
            ? '<span class="text-[11px] text-muted">' + Utils.formatDateRelative(appt.date) + '</span>'
            : '<span class="text-[11px] text-muted">' + appt.duration + ' min</span>') +
        '</span>' +
        '<span class="hidden sm:block">' + Components.avatar(p ? p.name : '?', 'h-9 w-9') + '</span>' +
        '<span class="min-w-0 flex-1">' +
          '<span class="block truncate text-sm font-semibold text-ink">' + Utils.escape(p ? p.name : 'Unknown') + '</span>' +
          '<span class="block truncate text-[12px] text-muted">' + Utils.escape(sub) + '</span>' +
        '</span>' +
        '<span class="shrink-0">' + Components.appointmentBadge(appt.status) + '</span>' +
        '<span class="hidden shrink-0 text-slate-300 transition-colors group-hover:text-brand-600 sm:block">' +
          icon('chevron-right', 'h-4 w-4') +
        '</span>' +
      '</button>'
    );
  }

  /** A free slot row with an inline book action. */
  function freeRow(time, doctorId, date) {
    return (
      '<button type="button" data-book-slot="' + time + '" data-doctor="' + doctorId + '" data-date="' + date + '"' +
        ' class="group flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 hover:bg-brand-50/50 sm:gap-4 sm:px-5">' +
        '<span class="w-[68px] shrink-0 text-[13px] font-semibold text-slate-400 sm:w-[92px] sm:text-sm">' + Utils.formatTime(time) + '</span>' +
        '<span class="flex-1 text-sm text-slate-400">Available</span>' +
        '<span class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-brand-700 transition-colors group-hover:bg-brand-100">' +
          icon('plus', 'h-4 w-4') + 'Book' +
        '</span>' +
      '</button>'
    );
  }

  /** Slot-by-slot day timeline for one doctor (used by dashboard + day view). */
  function timeline(doctorId, date, options) {
    const o = options || {};
    const slots = Store.slots(doctorId, date);
    if (!slots.length) {
      const d = Store.doctor(doctorId);
      return Components.emptyState({
        icon: 'calendar-x',
        title: 'No clinic hours',
        message: (d ? d.name : 'This doctor') + ' does not consult on ' + Utils.formatDateShort(date) + '.',
      });
    }
    const visible = o.limit ? slots.slice(0, o.limit) : slots;
    const rows = visible
      .map((s) => (s.booked ? row(s.appointment) : o.hideFree ? '' : freeRow(s.time, doctorId, date)))
      .join('');
    return rows || Components.emptyState({ icon: 'calendar-days', title: 'Nothing booked yet', message: 'This day is completely free.' });
  }

  /* ================================================================
     STATUS ACTIONS
     ================================================================ */
  const NEXT_LABEL = {
    confirmed:   'Mark Waiting',
    waiting:     'Start Consultation',
    in_progress: 'Complete',
  };

  function setStatus(id, status, opts) {
    const o = opts || {};
    const appt = Store.appointment(id);
    if (!appt) return;
    const p = Store.patient(appt.patientId);
    const name = p ? p.name : 'Patient';
    appt.status = status;

    const messages = {
      waiting:     ['Patient marked as waiting', name + ' is now in the waiting list.'],
      in_progress: ['Consultation started',      'Now consulting ' + name + '.'],
      completed:   ['Appointment marked as completed', name + ' · ' + Utils.formatTime(appt.time)],
      cancelled:   ['Appointment cancelled',     name + ' · ' + Utils.formatDateRelative(appt.date) + ' ' + Utils.formatTime(appt.time)],
      confirmed:   ['Appointment confirmed',     name + ' · ' + Utils.formatTime(appt.time)],
    };
    const [title, body] = messages[status] || ['Appointment updated', name];

    const activityIcon = { waiting: 'user', in_progress: 'play', completed: 'check-circle', cancelled: 'ban' }[status] || 'activity';
    const tone = status === 'cancelled' ? 'danger' : status === 'completed' ? 'success' : 'brand';

    Store.addActivity(
      status === 'waiting'   ? name + ' checked in.'
      : status === 'in_progress' ? 'Consultation started for ' + name + '.'
      : status === 'completed'   ? 'Consultation completed for ' + name + '.'
      : status === 'cancelled'   ? name + "'s appointment was cancelled."
      : name + "'s appointment was confirmed.",
      activityIcon, tone
    );
    Store.addNotification(title, body, 'appointment', 'appointments');
    Store.save();

    if (status === 'cancelled') Toast.warning(title, body);
    else Toast.success('✓ ' + title, body);

    Layout.refreshBadge();
    if (o.refresh !== false) App.refresh();
  }

  /* ================================================================
     APPOINTMENT DETAIL SLIDE-OVER
     ================================================================ */
  function detailBody(appt) {
    const p = Store.patient(appt.patientId);
    const d = Store.doctor(appt.doctorId);
    const meta = APPOINTMENT_STATUS[appt.status];

    return (
      // patient block
      '<div class="rounded-card border border-line bg-slate-50/60 p-4">' +
        '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Patient</p>' +
        '<div class="mt-3 flex items-center gap-3">' +
          Components.avatar(p.name, 'h-12 w-12') +
          '<div class="min-w-0">' +
            '<p class="truncate text-base font-bold text-ink">' + Utils.escape(p.name) + '</p>' +
            '<p class="text-[13px] text-muted">' + Utils.escape(p.gender) + ' &bull; ' + p.age + ' Years</p>' +
          '</div>' +
        '</div>' +
        '<div class="mt-3 grid gap-1 border-t border-line pt-3 sm:grid-cols-2">' +
          '<a href="tel:' + Utils.escape(p.phone) + '" class="flex items-center gap-2 rounded-lg px-1 py-1.5 text-sm text-ink transition-colors hover:text-brand-700">' +
            '<span class="text-slate-400">' + icon('phone', 'h-4 w-4') + '</span>' + Utils.escape(p.phone) +
          '</a>' +
          '<span class="flex items-center gap-2 px-1 py-1.5 text-sm text-ink">' +
            '<span class="text-slate-400">' + icon('mail', 'h-4 w-4') + '</span>' +
            '<span class="truncate">' + Utils.escape(p.email) + '</span>' +
          '</span>' +
        '</div>' +
        '<a href="patient-profile.html?id=' + p.id + '" class="btn-secondary btn-sm mt-3 w-full">' +
          icon('user', 'h-4 w-4') + 'View full patient profile' +
        '</a>' +
      '</div>' +

      // appointment block
      '<div class="mt-4 rounded-card border border-line p-4">' +
        '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Appointment</p>' +
        '<div class="mt-2 divide-y divide-line">' +
          Components.field('Date', Utils.formatDateRelative(appt.date) + ' &bull; ' + Utils.formatDate(appt.date), 'calendar-days') +
          Components.field('Time', Utils.formatTime(appt.time) + ' <span class="font-normal text-muted">(' + appt.duration + ' min)</span>', 'clock') +
          Components.field('Doctor', Utils.escape(d.name) + '<br><span class="text-[12px] font-normal text-muted">' + Utils.escape(d.specialization) + ' &bull; ' + Utils.escape(d.room) + '</span>', 'stethoscope') +
          Components.field('Reason', Utils.escape(appt.reason || appt.type), 'file-text') +
        '</div>' +
      '</div>' +

      // status block
      '<div class="mt-4 flex items-center justify-between gap-3 rounded-card border border-line p-4">' +
        '<div>' +
          '<p class="text-[11px] font-bold uppercase tracking-wider text-muted">Status</p>' +
          '<div class="mt-2" id="detail-status">' + Components.appointmentBadge(appt.status) + '</div>' +
        '</div>' +
        '<span class="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">' +
          icon(meta.icon, 'h-5 w-5') +
        '</span>' +
      '</div>'
    );
  }

  function detailFooter(appt) {
    const closed = appt.status === 'completed' || appt.status === 'cancelled';
    if (closed) {
      return (
        '<div class="flex flex-col gap-2 sm:flex-row">' +
          '<button type="button" class="btn-secondary btn-block sm:flex-1" data-act="reschedule">' +
            icon('rotate-ccw', 'h-4 w-4') + 'Book a follow-up' +
          '</button>' +
          '<button type="button" class="btn-ghost sm:w-auto" data-close>Close</button>' +
        '</div>'
      );
    }
    const nextLabel = NEXT_LABEL[appt.status];
    const nextStatus = { confirmed: 'waiting', waiting: 'in_progress', in_progress: 'completed' }[appt.status];
    const nextIcon = { confirmed: 'user', waiting: 'play', in_progress: 'check' }[appt.status];

    return (
      '<div class="space-y-2">' +
        '<div class="grid gap-2 sm:grid-cols-2">' +
          '<button type="button" class="btn-primary btn-block" data-act="advance" data-next="' + nextStatus + '">' +
            icon(nextIcon, 'h-4 w-4') + nextLabel +
          '</button>' +
          '<button type="button" class="btn-secondary btn-block" data-act="reschedule">' +
            icon('rotate-ccw', 'h-4 w-4') + 'Reschedule' +
          '</button>' +
        '</div>' +
        '<div class="grid gap-2 sm:grid-cols-2">' +
          (appt.status !== 'in_progress'
            ? '<button type="button" class="btn-secondary btn-block" data-act="complete">' + icon('check-circle', 'h-4 w-4') + 'Complete' + '</button>'
            : '<span class="hidden sm:block"></span>') +
          '<button type="button" class="btn-danger btn-block" data-act="cancel">' +
            icon('ban', 'h-4 w-4') + 'Cancel Appointment' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  function openDetails(id) {
    const appt = Store.appointment(id);
    if (!appt) return;
    const p = Store.patient(appt.patientId);

    const panel = SlideOver.open({
      title: 'Appointment Details',
      subtitle: Utils.formatDateRelative(appt.date) + ' · ' + Utils.formatTime(appt.time),
      width: 'lg',
      body: detailBody(appt),
      footer: detailFooter(appt),
    });

    function rerender() {
      const fresh = Store.appointment(id);
      panel.setBody(detailBody(fresh));
      panel.setFooter(detailFooter(fresh));
      bind();
    }

    function bind() {
      panel.el.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;

          if (act === 'advance') {
            setLoading(btn, true, 'Updating…');
            setTimeout(() => {
              setStatus(id, btn.dataset.next);
              rerender();
            }, 500);

          } else if (act === 'complete') {
            setLoading(btn, true, 'Completing…');
            setTimeout(() => {
              setStatus(id, 'completed');
              rerender();
            }, 500);

          } else if (act === 'reschedule') {
            panel.close();
            setTimeout(() => openReschedule(id), 200);

          } else if (act === 'cancel') {
            Modal.confirm({
              title: 'Cancel this appointment?',
              message: '<strong>' + Utils.escape(p.name) + '</strong> at ' + Utils.formatTime(appt.time) +
                       ' will be removed from the schedule and the slot becomes available again.',
              confirmText: 'Yes, cancel it',
              cancelText: 'Keep appointment',
              tone: 'danger',
              onConfirm() {
                setStatus(id, 'cancelled');
                panel.close();
              },
            });
          }
        });
      });
    }

    bind();
  }

  /* ================================================================
     DATE STRIP — shared by create + reschedule
     ================================================================ */
  function dateStrip(doctorId, selected, days) {
    const today = Utils.today();
    const doc = Store.doctor(doctorId);
    let out = '';
    for (let i = 0; i < (days || 14); i++) {
      const date = Utils.addDays(today, i);
      const open = doc ? !!doc.schedule[Utils.weekdayKey(date)] : true;
      const isSel = date === selected;
      const d = new Date(date + 'T00:00:00');
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      const cls = !open
        ? 'border-line bg-slate-50 text-slate-300 cursor-not-allowed'
        : isSel
          ? 'border-brand-600 bg-brand-600 text-white shadow-sm'
          : 'border-line bg-white text-ink hover:border-brand-500 hover:bg-brand-50';
      out +=
        '<button type="button" ' + (open ? 'data-date="' + date + '"' : 'disabled') +
          ' class="flex w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-2.5 transition-all duration-200 ' + cls + '">' +
          '<span class="text-[11px] font-semibold uppercase tracking-wide ' + (isSel ? 'text-white/80' : 'text-muted') + '">' + dayName + '</span>' +
          '<span class="text-lg font-bold leading-none">' + d.getDate() + '</span>' +
          '<span class="text-[10px] ' + (isSel ? 'text-white/80' : 'text-muted') + '">' + (i === 0 ? 'Today' : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]) + '</span>' +
        '</button>';
    }
    return '<div class="scrollbar-none flex gap-2 overflow-x-auto pb-1">' + out + '</div>';
  }

  function slotGrid(doctorId, date, selectedTime, excludeApptId) {
    const slots = Store.slots(doctorId, date);
    if (!Store.window(doctorId, date)) {
      const d = Store.doctor(doctorId);
      return '<div class="rounded-card border border-dashed border-line bg-slate-50 px-5 py-8 text-center">' +
        '<p class="text-sm font-semibold text-ink">Clinic closed</p>' +
        '<p class="mt-1 text-[13px] text-muted">' + Utils.escape(d ? d.name : 'This doctor') + ' does not consult on ' + Utils.formatDateShort(date) + '. Pick another day.</p>' +
      '</div>';
    }
    const free = slots.filter((s) => !s.booked || (excludeApptId && s.appointment && s.appointment.id === excludeApptId));
    if (!free.length) {
      return '<div class="rounded-card border border-dashed border-line bg-slate-50 px-5 py-8 text-center">' +
        '<p class="text-sm font-semibold text-ink">Fully booked</p>' +
        '<p class="mt-1 text-[13px] text-muted">Every slot on ' + Utils.formatDateShort(date) + ' is taken. Try another day.</p>' +
      '</div>';
    }
    return (
      '<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">' +
        slots.map((s) => {
          const isSelf = excludeApptId && s.appointment && s.appointment.id === excludeApptId;
          if (s.booked && !isSelf) {
            return '<button type="button" disabled class="slot slot-booked" aria-label="' + Utils.formatTime(s.time) + ' — already booked">' +
              Utils.formatTime(s.time) + '</button>';
          }
          const sel = s.time === selectedTime;
          return '<button type="button" data-slot="' + s.time + '" class="slot ' + (sel ? 'slot-selected' : '') + '"' +
            (sel ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + Utils.formatTime(s.time) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted">' +
        '<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm border border-line bg-white"></span>Available</span>' +
        '<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-brand-600"></span>Selected</span>' +
        '<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm bg-slate-200"></span>Already booked</span>' +
      '</div>'
    );
  }

  /* ================================================================
     CREATE APPOINTMENT — 5 step workflow
     ================================================================ */
  const STEPS = [
    { key: 1, label: 'Patient' },
    { key: 2, label: 'Doctor' },
    { key: 3, label: 'Date' },
    { key: 4, label: 'Time' },
    { key: 5, label: 'Confirm' },
  ];

  function stepper(current) {
    return (
      '<ol class="mb-6 flex items-center gap-1.5 sm:gap-2">' +
        STEPS.map((s, i) => {
          const state = s.key < current ? 'step-done' : s.key === current ? 'step-current' : 'step-todo';
          return (
            '<li class="flex flex-1 items-center gap-1.5 sm:gap-2">' +
              '<span class="step-dot ' + state + '">' +
                (s.key < current ? icon('check', 'h-4 w-4') : s.key) +
              '</span>' +
              '<span class="hidden text-[12px] font-semibold ' + (s.key === current ? 'text-ink' : 'text-muted') + ' sm:block">' + s.label + '</span>' +
              (i < STEPS.length - 1 ? '<span class="h-px flex-1 bg-line"></span>' : '') +
            '</li>'
          );
        }).join('') +
      '</ol>'
    );
  }

  function openCreate(prefill) {
    const pre = prefill || {};
    const draft = {
      step: 1,
      patientId: pre.patientId || null,
      doctorId: pre.doctorId || Store.state.currentUser.id,
      date: pre.date || Utils.today(),
      time: pre.time || null,
      type: 'Consultation',
      reason: '',
      query: '',
      // Clicking a specific free slot already answers doctor/date/time —
      // choosing the patient is then the only thing left to do.
      fastTrack: !!pre.time,
    };
    if (pre.time && pre.patientId) draft.step = 5;

    const modal = Modal.open({
      title: 'New Appointment',
      subtitle: 'Book a slot in a few quick steps.',
      size: 'lg',
      body: '',
      footer: '',
    });

    /* ---------- step renderers ---------- */
    function stepPatient() {
      const q = draft.query.trim().toLowerCase();
      const list = Store.state.patients
        .filter((p) => !q || p.name.toLowerCase().includes(q) || p.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))
        .slice(0, 8);

      const slotBanner = draft.fastTrack
        ? '<div class="mb-4 flex items-start gap-2.5 rounded-card border border-brand-200 bg-brand-50 px-4 py-3">' +
            '<span class="mt-px shrink-0 text-brand-700">' + icon('check-circle', 'h-[18px] w-[18px]') + '</span>' +
            '<p class="text-[13px] leading-snug text-brand-800">Slot held: <strong>' +
              Utils.formatDateRelative(draft.date) + ', ' + Utils.formatTime(draft.time) + '</strong> with ' +
              Utils.escape(Store.doctor(draft.doctorId).name) + '. Just pick the patient.</p>' +
          '</div>'
        : '';

      return (
        slotBanner +
        '<h3 class="text-[15px] font-bold text-ink">Select Patient</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Search by name or phone number.</p>' +
        '<div class="relative mt-4">' +
          '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">' + icon('search', 'h-[18px] w-[18px]') + '</span>' +
          '<input id="patient-search" data-autofocus type="text" autocomplete="off" placeholder="Type a patient name…" value="' + Utils.escape(draft.query) + '" class="input pl-10" />' +
        '</div>' +
        '<div class="mt-3 max-h-[280px] space-y-1.5 overflow-y-auto pr-1" id="patient-results">' +
          (list.length
            ? list.map((p) => {
                const sel = p.id === draft.patientId;
                return (
                  '<button type="button" data-patient="' + p.id + '"' +
                    ' class="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all duration-200 ' +
                    (sel ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:border-brand-300 hover:bg-brand-50/50') + '">' +
                    Components.avatar(p.name, 'h-9 w-9') +
                    '<span class="min-w-0 flex-1">' +
                      '<span class="block truncate text-sm font-semibold text-ink">' + Utils.escape(p.name) + '</span>' +
                      '<span class="block truncate text-[12px] text-muted">' + Utils.escape(p.gender) + ' &bull; ' + p.age + ' yrs &bull; ' + Utils.escape(p.phone) + '</span>' +
                    '</span>' +
                    (sel ? '<span class="text-brand-600">' + icon('check-circle', 'h-5 w-5') + '</span>' : '') +
                  '</button>'
                );
              }).join('')
            : '<div class="rounded-lg border border-dashed border-line px-4 py-8 text-center">' +
                '<p class="text-sm font-semibold text-ink">No patient found</p>' +
                '<p class="mt-1 text-[13px] text-muted">No record matches &ldquo;' + Utils.escape(draft.query) + '&rdquo;.</p>' +
              '</div>') +
        '</div>' +
        '<button type="button" id="new-patient" class="btn-secondary btn-block mt-3">' +
          icon('user-plus', 'h-4 w-4') + 'Create New Patient' +
        '</button>'
      );
    }

    function stepDoctor() {
      return (
        '<h3 class="text-[15px] font-bold text-ink">Select Doctor</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Choose who the patient will be seeing.</p>' +
        '<div class="mt-4 space-y-2">' +
          Store.state.doctors.map((d) => {
            const sel = d.id === draft.doctorId;
            const openToday = d.schedule[Utils.weekdayKey(draft.date)];
            return (
              '<button type="button" data-doctor="' + d.id + '"' +
                ' class="flex w-full items-center gap-3.5 rounded-lg border px-4 py-3.5 text-left transition-all duration-200 ' +
                (sel ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-line bg-white hover:border-brand-300 hover:bg-brand-50/50') + '">' +
                Components.avatar(d.name.replace('Dr. ', ''), 'h-11 w-11') +
                '<span class="min-w-0 flex-1">' +
                  '<span class="block truncate text-sm font-bold text-ink">' + Utils.escape(d.name) + '</span>' +
                  '<span class="block truncate text-[13px] text-muted">' + Utils.escape(d.specialization) + '</span>' +
                  '<span class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">' +
                    '<span class="flex items-center gap-1">' + icon('indian-rupee', 'h-3 w-3') + d.fee + ' consultation</span>' +
                    '<span class="flex items-center gap-1">' + icon('map-pin', 'h-3 w-3') + Utils.escape(d.room) + '</span>' +
                  '</span>' +
                '</span>' +
                (sel ? '<span class="text-brand-600">' + icon('check-circle', 'h-5 w-5') + '</span>' : '') +
              '</button>'
            );
          }).join('') +
        '</div>'
      );
    }

    function stepDate() {
      return (
        '<h3 class="text-[15px] font-bold text-ink">Select Date</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Greyed-out days are outside ' + Utils.escape(Store.doctor(draft.doctorId).name) + '&rsquo;s clinic hours.</p>' +
        '<div class="mt-4">' + dateStrip(draft.doctorId, draft.date, 14) + '</div>' +
        '<div class="mt-5 rounded-card border border-line bg-slate-50/60 p-4">' +
          '<label for="exact-date" class="label">Or pick an exact date</label>' +
          '<input id="exact-date" type="date" value="' + draft.date + '" min="' + Utils.today() + '" class="input" />' +
        '</div>'
      );
    }

    function stepTime() {
      return (
        '<h3 class="text-[15px] font-bold text-ink">Available Time Slots</h3>' +
        '<p class="mt-1 text-[13px] text-muted">' +
          Utils.escape(Store.doctor(draft.doctorId).name) + ' &bull; ' + Utils.formatDateRelative(draft.date) + ', ' + Utils.formatDate(draft.date) +
        '</p>' +
        '<div class="mt-4" id="slot-area">' + slotGrid(draft.doctorId, draft.date, draft.time) + '</div>'
      );
    }

    function stepConfirm() {
      const p = Store.patient(draft.patientId);
      const d = Store.doctor(draft.doctorId);
      return (
        '<h3 class="text-[15px] font-bold text-ink">Confirm Appointment</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Please check the details before booking.</p>' +
        '<div class="mt-4 overflow-hidden rounded-card border border-line">' +
          '<div class="flex items-center gap-3.5 border-b border-line bg-brand-50/60 px-4 py-4">' +
            Components.avatar(p.name, 'h-12 w-12') +
            '<div class="min-w-0">' +
              '<p class="truncate text-base font-bold text-ink">' + Utils.escape(p.name) + '</p>' +
              '<p class="text-[13px] text-muted">' + Utils.escape(p.gender) + ' &bull; ' + p.age + ' Years &bull; ' + Utils.escape(p.phone) + '</p>' +
            '</div>' +
          '</div>' +
          '<dl class="divide-y divide-line px-4">' +
            summaryRow('Doctor', d.name + ' · ' + d.specialization, 'stethoscope') +
            summaryRow('Date', Utils.formatDateRelative(draft.date) + ' · ' + Utils.formatDate(draft.date), 'calendar-days') +
            summaryRow('Time', Utils.formatTime(draft.time) + ' (' + Store.state.clinic.slotMinutes + ' min)', 'clock') +
            summaryRow('Consultation fee', Utils.money(d.fee), 'indian-rupee') +
          '</dl>' +
        '</div>' +
        '<div class="mt-4 grid gap-3 sm:grid-cols-2">' +
          '<div>' +
            '<label for="appt-type" class="label">Appointment type</label>' +
            '<select id="appt-type" class="select">' +
              ['Consultation', 'Follow-up', 'New Visit'].map((t) =>
                '<option' + (t === draft.type ? ' selected' : '') + '>' + t + '</option>').join('') +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label for="appt-reason" class="label">Reason <span class="font-normal text-muted">(optional)</span></label>' +
            '<input id="appt-reason" type="text" class="input" placeholder="e.g. Fever and cold" value="' + Utils.escape(draft.reason) + '" />' +
          '</div>' +
        '</div>'
      );
    }

    function summaryRow(label, value, iconName) {
      return (
        '<div class="flex items-center gap-3 py-3">' +
          '<span class="text-slate-400">' + icon(iconName, 'h-[18px] w-[18px]') + '</span>' +
          '<dt class="w-28 shrink-0 text-[13px] text-muted">' + label + '</dt>' +
          '<dd class="min-w-0 flex-1 text-right text-sm font-semibold text-ink sm:text-left">' + Utils.escape(value) + '</dd>' +
        '</div>'
      );
    }

    /* ---------- footer ---------- */
    function footer() {
      const canNext =
        (draft.step === 1 && draft.patientId) ||
        (draft.step === 2 && draft.doctorId) ||
        (draft.step === 3 && draft.date) ||
        (draft.step === 4 && draft.time);

      if (draft.step === 5) {
        return (
          '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">' +
            '<button type="button" class="btn-secondary" data-nav="back">' + icon('arrow-left', 'h-4 w-4') + 'Back</button>' +
            '<button type="button" class="btn-primary sm:min-w-[200px]" data-nav="confirm">' +
              icon('check', 'h-4 w-4') + 'Confirm Appointment' +
            '</button>' +
          '</div>'
        );
      }
      return (
        '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">' +
          (draft.step > 1
            ? '<button type="button" class="btn-secondary" data-nav="back">' + icon('arrow-left', 'h-4 w-4') + 'Back</button>'
            : '<button type="button" class="btn-ghost" data-close>Cancel</button>') +
          '<button type="button" class="btn-primary sm:min-w-[140px]" data-nav="next"' + (canNext ? '' : ' disabled') + '>' +
            'Continue' + icon('arrow-right', 'h-4 w-4') +
          '</button>' +
        '</div>'
      );
    }

    /* ---------- render + bind ---------- */
    function render() {
      const views = { 1: stepPatient, 2: stepDoctor, 3: stepDate, 4: stepTime, 5: stepConfirm };
      modal.setBody(stepper(draft.step) + views[draft.step]());
      modal.setFooter(footer());
      modal.scrollTop();
      bind();
    }

    function bind() {
      const body = modal.body;

      // step 1
      const search = body.querySelector('#patient-search');
      if (search) {
        search.addEventListener('input', (e) => {
          draft.query = e.target.value;
          const results = body.querySelector('#patient-results');
          const pos = e.target.selectionStart;
          modal.setBody(stepper(draft.step) + stepPatient());
          bind();
          const again = modal.body.querySelector('#patient-search');
          again.focus();
          again.setSelectionRange(pos, pos);
        });
        body.querySelectorAll('[data-patient]').forEach((btn) =>
          btn.addEventListener('click', () => {
            draft.patientId = btn.dataset.patient;
            draft.step = draft.fastTrack ? 5 : 2;
            render();
          })
        );
        body.querySelector('#new-patient').addEventListener('click', () => {
          Patients.openCreate({
            onCreated(p) {
              draft.patientId = p.id;
              draft.step = 2;
              render();
            },
          });
        });
      }

      // step 2
      body.querySelectorAll('[data-doctor]').forEach((btn) =>
        btn.addEventListener('click', () => {
          draft.doctorId = btn.dataset.doctor;
          draft.time = null;
          draft.step = 3;
          render();
        })
      );

      // step 3
      body.querySelectorAll('[data-date]').forEach((btn) =>
        btn.addEventListener('click', () => {
          draft.date = btn.dataset.date;
          draft.time = null;
          draft.step = 4;
          render();
        })
      );
      const exact = body.querySelector('#exact-date');
      if (exact) {
        exact.addEventListener('change', (e) => {
          if (!e.target.value) return;
          draft.date = e.target.value;
          draft.time = null;
          render();
        });
      }

      // step 4
      body.querySelectorAll('[data-slot]').forEach((btn) =>
        btn.addEventListener('click', () => {
          draft.time = btn.dataset.slot;
          body.querySelector('#slot-area').innerHTML = slotGrid(draft.doctorId, draft.date, draft.time);
          modal.setFooter(footer());
          bind();
        })
      );

      // step 5 inputs
      const typeSel = body.querySelector('#appt-type');
      if (typeSel) typeSel.addEventListener('change', (e) => { draft.type = e.target.value; });
      const reason = body.querySelector('#appt-reason');
      if (reason) reason.addEventListener('input', (e) => { draft.reason = e.target.value; });

      // footer nav
      modal.el.querySelectorAll('[data-nav]').forEach((btn) =>
        btn.addEventListener('click', () => {
          const nav = btn.dataset.nav;
          if (nav === 'next') {
            draft.step = draft.fastTrack && draft.step === 1 ? 5 : Math.min(5, draft.step + 1);
            render();
          }
          else if (nav === 'back') { draft.step = Math.max(1, draft.step - 1); render(); }
          else if (nav === 'confirm') confirmBooking(btn);
        })
      );
    }

    function confirmBooking(btn) {
      setLoading(btn, true, 'Booking…');
      setTimeout(() => {
        const p = Store.patient(draft.patientId);
        const d = Store.doctor(draft.doctorId);
        const appt = {
          id: Utils.uid('a'),
          patientId: draft.patientId,
          doctorId: draft.doctorId,
          date: draft.date,
          time: draft.time,
          duration: Store.state.clinic.slotMinutes,
          type: draft.type,
          reason: draft.reason || draft.type,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          notes: '',
        };
        Store.state.appointments.push(appt);
        if (p.status === 'inactive') p.status = 'active';

        const when = Utils.formatDateRelative(draft.date) + ', ' + Utils.formatTime(draft.time);
        Store.addNotification('New appointment created', p.name + ' — ' + when, 'appointment', 'appointments');
        Store.addActivity('Appointment booked for ' + p.name + ' with ' + d.name + '.', 'calendar-plus', 'brand');
        Store.save();

        modal.close();
        Toast.success('✓ Appointment successfully created', p.name + ' · ' + when);
        Layout.refreshBadge();
        App.refresh();
      }, 900);
    }

    render();
  }

  /* ================================================================
     RESCHEDULE
     ================================================================ */
  function openReschedule(id) {
    const appt = Store.appointment(id);
    if (!appt) return;
    const p = Store.patient(appt.patientId);
    const isFollowUp = appt.status === 'completed' || appt.status === 'cancelled';

    const draft = {
      date: isFollowUp ? Utils.today() : appt.date,
      time: null,
      doctorId: appt.doctorId,
    };

    const modal = Modal.open({
      title: isFollowUp ? 'Book a Follow-up' : 'Reschedule Appointment',
      subtitle: p.name + ' · ' + Store.doctor(appt.doctorId).name,
      size: 'lg',
      body: '',
      footer: '',
    });

    function body() {
      return (
        (!isFollowUp
          ? '<div class="mb-5 flex items-center gap-3 rounded-card border border-amber-200 bg-amber-50 px-4 py-3">' +
              '<span class="text-amber-600">' + icon('clock', 'h-5 w-5') + '</span>' +
              '<p class="text-[13px] text-amber-800">Currently booked for <strong>' + Utils.formatDateRelative(appt.date) +
              ', ' + Utils.formatTime(appt.time) + '</strong></p>' +
            '</div>'
          : '') +
        '<h3 class="text-[15px] font-bold text-ink">Select New Date</h3>' +
        '<div class="mt-3">' + dateStrip(draft.doctorId, draft.date, 14) + '</div>' +
        '<h3 class="mt-6 text-[15px] font-bold text-ink">Available Slots</h3>' +
        '<p class="mt-1 text-[13px] text-muted">' + Utils.formatDateRelative(draft.date) + ', ' + Utils.formatDate(draft.date) + '</p>' +
        '<div class="mt-3" id="reschedule-slots">' + slotGrid(draft.doctorId, draft.date, draft.time, isFollowUp ? null : appt.id) + '</div>'
      );
    }

    function footer() {
      return (
        '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">' +
          '<p class="text-[13px] text-muted">' +
            (draft.time
              ? 'New time: <strong class="text-ink">' + Utils.formatDateRelative(draft.date) + ', ' + Utils.formatTime(draft.time) + '</strong>'
              : 'Select a slot to continue.') +
          '</p>' +
          '<div class="flex gap-2">' +
            '<button type="button" class="btn-ghost" data-close>Cancel</button>' +
            '<button type="button" class="btn-primary" id="confirm-reschedule"' + (draft.time ? '' : ' disabled') + '>' +
              icon('check', 'h-4 w-4') + (isFollowUp ? 'Confirm Booking' : 'Confirm Reschedule') +
            '</button>' +
          '</div>' +
        '</div>'
      );
    }

    function render() {
      modal.setBody(body());
      modal.setFooter(footer());
      bind();
    }

    function bind() {
      modal.body.querySelectorAll('[data-date]').forEach((btn) =>
        btn.addEventListener('click', () => {
          draft.date = btn.dataset.date;
          draft.time = null;
          render();
        })
      );
      modal.body.querySelectorAll('[data-slot]').forEach((btn) =>
        btn.addEventListener('click', () => {
          draft.time = btn.dataset.slot;
          modal.body.querySelector('#reschedule-slots').innerHTML = slotGrid(draft.doctorId, draft.date, draft.time, isFollowUp ? null : appt.id);
          modal.setFooter(footer());
          bind();
        })
      );
      const confirm = modal.el.querySelector('#confirm-reschedule');
      if (confirm) {
        confirm.addEventListener('click', () => {
          setLoading(confirm, true, isFollowUp ? 'Booking…' : 'Rescheduling…');
          setTimeout(() => {
            const when = Utils.formatDateRelative(draft.date) + ', ' + Utils.formatTime(draft.time);
            if (isFollowUp) {
              Store.state.appointments.push({
                id: Utils.uid('a'), patientId: appt.patientId, doctorId: draft.doctorId,
                date: draft.date, time: draft.time, duration: Store.state.clinic.slotMinutes,
                type: 'Follow-up', reason: 'Follow-up visit', status: 'confirmed',
                createdAt: new Date().toISOString(), notes: '',
              });
              Store.addNotification('Follow-up booked', p.name + ' — ' + when, 'appointment', 'appointments');
              Store.addActivity('Follow-up booked for ' + p.name + '.', 'calendar-plus', 'brand');
              Store.save();
              modal.close();
              Toast.success('✓ Follow-up successfully booked', p.name + ' · ' + when);
            } else {
              appt.date = draft.date;
              appt.time = draft.time;
              appt.status = 'confirmed';
              Store.addNotification('Appointment rescheduled', p.name + ' moved to ' + when, 'appointment', 'appointments');
              Store.addActivity(p.name + "'s appointment was rescheduled.", 'rotate-ccw', 'info');
              Store.save();
              modal.close();
              Toast.success('✓ Appointment successfully rescheduled', p.name + ' · ' + when);
            }
            Layout.refreshBadge();
            App.refresh();
          }, 800);
        });
      }
    }

    render();
  }

  /* ================================================================
     APPOINTMENTS PAGE
     ================================================================ */
  const filters = {
    q: '',
    doctorId: 'all',
    date: null,        // set on first render
    status: 'all',
    view: 'day',
  };

  function toolbar() {
    const docs = Store.state.doctors;
    return (
      '<div class="card mb-5 p-3 sm:p-4">' +
        '<div class="flex flex-col gap-3 lg:flex-row lg:items-center">' +
          // search
          '<div class="relative lg:max-w-xs lg:flex-1">' +
            '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">' + icon('search', 'h-[18px] w-[18px]') + '</span>' +
            '<input id="f-search" type="search" placeholder="Search patient…" value="' + Utils.escape(filters.q) + '" class="input pl-10" aria-label="Search appointments by patient" />' +
          '</div>' +
          // date
          '<div class="flex items-center gap-2">' +
            '<button type="button" id="f-prev" class="btn-secondary !min-h-[42px] !px-2.5" aria-label="Previous day">' + icon('chevron-left', 'h-4 w-4') + '</button>' +
            '<input id="f-date" type="date" value="' + filters.date + '" class="input !py-2.5 min-w-[150px]" aria-label="Select date" />' +
            '<button type="button" id="f-next" class="btn-secondary !min-h-[42px] !px-2.5" aria-label="Next day">' + icon('chevron-right', 'h-4 w-4') + '</button>' +
            '<button type="button" id="f-today" class="btn-secondary btn-sm whitespace-nowrap">Today</button>' +
          '</div>' +
          // doctor + status
          '<div class="grid grid-cols-2 gap-2 lg:ml-auto lg:flex">' +
            '<select id="f-doctor" class="select lg:w-52" aria-label="Filter by doctor">' +
              '<option value="all"' + (filters.doctorId === 'all' ? ' selected' : '') + '>All doctors</option>' +
              docs.map((d) => '<option value="' + d.id + '"' + (filters.doctorId === d.id ? ' selected' : '') + '>' + Utils.escape(d.name) + '</option>').join('') +
            '</select>' +
            '<select id="f-status" class="select lg:w-40" aria-label="Filter by status">' +
              '<option value="all"' + (filters.status === 'all' ? ' selected' : '') + '>All statuses</option>' +
              Object.keys(APPOINTMENT_STATUS).map((k) =>
                '<option value="' + k + '"' + (filters.status === k ? ' selected' : '') + '>' + APPOINTMENT_STATUS[k].label + '</option>').join('') +
            '</select>' +
          '</div>' +
        '</div>' +

        // view toggle
        '<div class="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">' +
          '<div class="inline-flex rounded-lg border border-line bg-slate-50 p-1" role="group" aria-label="Calendar view">' +
            ['day', 'week', 'month'].map((v) =>
              '<button type="button" data-view="' + v + '" class="rounded-md px-3.5 py-1.5 text-[13px] font-semibold capitalize transition-colors duration-200 ' +
              (filters.view === v ? 'bg-white text-brand-700 shadow-sm' : 'text-muted hover:text-ink') + '">' + v + '</button>').join('') +
          '</div>' +
          '<p class="hidden text-[13px] text-muted sm:block" id="result-count"></p>' +
        '</div>' +
      '</div>'
    );
  }

  function matches(a) {
    if (filters.status !== 'all' && a.status !== filters.status) return false;
    if (filters.doctorId !== 'all' && a.doctorId !== filters.doctorId) return false;
    if (filters.q) {
      const p = Store.patient(a.patientId);
      if (!p || !p.name.toLowerCase().includes(filters.q.toLowerCase())) return false;
    }
    return true;
  }

  function dayView() {
    const date = filters.date;
    const isFiltered = filters.q || filters.status !== 'all';
    // A single doctor with no other filters gets the full slot-by-slot timeline.
    if (filters.doctorId !== 'all' && !isFiltered) {
      return timeline(filters.doctorId, date);
    }
    const list = Store.appointmentsOn(date).filter(matches);
    if (!list.length) return null;
    return list.map((a) => row(a)).join('');
  }

  function weekView() {
    const start = Utils.startOfWeek(filters.date);
    let cols = '';
    for (let i = 0; i < 7; i++) {
      const date = Utils.addDays(start, i);
      const list = Store.appointmentsOn(date).filter(matches);
      const isToday = date === Utils.today();
      const isSel = date === filters.date;
      cols +=
        '<div class="min-w-[190px] flex-1 border-l border-line first:border-l-0">' +
          '<button type="button" data-goto-day="' + date + '" class="w-full border-b border-line px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ' +
            (isSel ? 'bg-brand-50' : '') + '">' +
            '<p class="text-[11px] font-bold uppercase tracking-wide ' + (isToday ? 'text-brand-700' : 'text-muted') + '">' +
              ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][Utils.weekday(date)] + '</p>' +
            '<p class="mt-0.5 flex items-baseline gap-1.5">' +
              '<span class="text-lg font-bold ' + (isToday ? 'text-brand-700' : 'text-ink') + '">' + new Date(date + 'T00:00:00').getDate() + '</span>' +
              '<span class="text-[11px] text-muted">' + (list.length ? list.length + ' booked' : 'free') + '</span>' +
            '</p>' +
          '</button>' +
          '<div class="space-y-1.5 p-2">' +
            (list.length
              ? list.slice(0, 6).map((a) => {
                  const p = Store.patient(a.patientId);
                  const m = APPOINTMENT_STATUS[a.status];
                  return '<button type="button" data-appt="' + a.id + '" class="w-full rounded-lg border border-line bg-white px-2.5 py-2 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/50">' +
                    '<span class="flex items-center gap-1.5">' +
                      '<span class="badge-dot ' + m.dot + '"></span>' +
                      '<span class="text-[11px] font-bold text-ink">' + Utils.formatTime(a.time) + '</span>' +
                    '</span>' +
                    '<span class="mt-0.5 block truncate text-[12px] font-medium text-muted">' + Utils.escape(p ? p.name : '') + '</span>' +
                  '</button>';
                }).join('') +
                (list.length > 6 ? '<p class="px-1 pt-1 text-[11px] font-semibold text-muted">+' + (list.length - 6) + ' more</p>' : '')
              : '<p class="px-1 py-3 text-center text-[12px] text-slate-400">No appointments</p>') +
          '</div>' +
        '</div>';
    }
    return '<div class="scrollbar-none overflow-x-auto"><div class="flex min-w-[900px]">' + cols + '</div></div>';
  }

  function monthView() {
    const base = new Date(filters.date + 'T00:00:00');
    const year = base.getFullYear();
    const month = base.getMonth();
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // Monday-first grid
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="min-h-[92px] border-b border-r border-line bg-slate-50/60"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
      const date = Utils.iso(new Date(year, month, d));
      const list = Store.appointmentsOn(date).filter(matches);
      const isToday = date === Utils.today();
      const isSel = date === filters.date;
      cells +=
        '<button type="button" data-goto-day="' + date + '" class="min-h-[92px] border-b border-r border-line p-2 text-left transition-colors hover:bg-brand-50/50 ' +
          (isSel ? 'bg-brand-50 ring-1 ring-inset ring-brand-500' : 'bg-white') + '">' +
          '<span class="flex items-center justify-between">' +
            '<span class="' + (isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white' : 'text-[13px] font-semibold text-ink') + '">' + d + '</span>' +
            (list.length ? '<span class="text-[11px] font-bold text-brand-700">' + list.length + '</span>' : '') +
          '</span>' +
          '<span class="mt-1.5 block space-y-1">' +
            list.slice(0, 2).map((a) => {
              const p = Store.patient(a.patientId);
              const m = APPOINTMENT_STATUS[a.status];
              return '<span class="flex items-center gap-1 truncate rounded bg-slate-50 px-1.5 py-1 text-[10px] font-medium text-muted">' +
                '<span class="badge-dot ' + m.dot + '"></span>' +
                '<span class="truncate">' + Utils.formatTime(a.time).replace(':00', '') + ' ' + Utils.escape(p ? p.name.split(' ')[0] : '') + '</span>' +
              '</span>';
            }).join('') +
            (list.length > 2 ? '<span class="block px-1 text-[10px] font-semibold text-muted">+' + (list.length - 2) + ' more</span>' : '') +
          '</span>' +
        '</button>';
    }
    const trail = (7 - ((lead + daysInMonth) % 7)) % 7;
    for (let i = 0; i < trail; i++) cells += '<div class="min-h-[92px] border-b border-r border-line bg-slate-50/60"></div>';

    const monthName = base.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    return (
      '<div class="flex items-center justify-between border-b border-line px-5 py-3">' +
        '<h3 class="text-[15px] font-bold text-ink">' + monthName + '</h3>' +
        '<div class="flex gap-1.5">' +
          '<button type="button" id="m-prev" class="btn-secondary !min-h-[36px] !px-2.5" aria-label="Previous month">' + icon('chevron-left', 'h-4 w-4') + '</button>' +
          '<button type="button" id="m-next" class="btn-secondary !min-h-[36px] !px-2.5" aria-label="Next month">' + icon('chevron-right', 'h-4 w-4') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="scrollbar-none overflow-x-auto">' +
        '<div class="min-w-[720px]">' +
          '<div class="grid grid-cols-7 border-b border-line bg-slate-50">' +
            ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) =>
              '<div class="border-r border-line px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">' + d + '</div>').join('') +
          '</div>' +
          '<div class="grid grid-cols-7 border-l border-line">' + cells + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function listCard() {
    if (filters.view === 'week') return '<div class="card overflow-hidden">' + weekView() + '</div>';
    if (filters.view === 'month') return '<div class="card overflow-hidden">' + monthView() + '</div>';

    const content = dayView();
    const doctorName = filters.doctorId === 'all' ? 'All doctors' : Store.doctor(filters.doctorId).name;
    const head = Components.sectionHead(
      Utils.formatDateRelative(filters.date) + ' · ' + Utils.formatDate(filters.date),
      '<span class="badge-neutral">' + Utils.escape(doctorName) + '</span>',
      null
    );
    return (
      '<div class="card overflow-hidden">' + head +
        (content ||
          Components.emptyState({
            icon: 'calendar-x',
            title: 'No appointments found',
            message: "You don't have any appointments matching this filter.",
            action: 'Create Appointment',
            actionId: 'empty-create',
          })) +
      '</div>'
    );
  }

  function renderPage() {
    const root = document.getElementById('page-content');
    if (!filters.date) filters.date = Utils.today();

    root.innerHTML =
      Components.pageHead({
        title: 'Appointments',
        sub: 'Manage your clinic appointments efficiently.',
        action:
          '<button type="button" id="btn-new-appt" class="btn-primary w-full sm:w-auto">' +
            icon('plus', 'h-4 w-4') + 'New Appointment' +
          '</button>',
      }) +
      toolbar() +
      '<div id="appt-list">' + listCard() + '</div>';

    bindPage();
    updateCount();
  }

  function updateCount() {
    const el = document.getElementById('result-count');
    if (!el) return;
    if (filters.view === 'day') {
      const n = Store.appointmentsOn(filters.date).filter(matches).length;
      el.textContent = n + (n === 1 ? ' appointment' : ' appointments');
    } else {
      el.textContent = '';
    }
  }

  function refreshList() {
    const holder = document.getElementById('appt-list');
    if (!holder) return;
    holder.innerHTML = listCard();
    bindList();
    updateCount();
  }

  function bindList() {
    const holder = document.getElementById('appt-list');
    if (!holder) return;
    holder.querySelectorAll('[data-appt]').forEach((b) =>
      b.addEventListener('click', () => openDetails(b.dataset.appt))
    );
    holder.querySelectorAll('[data-book-slot]').forEach((b) =>
      b.addEventListener('click', () =>
        openCreate({ doctorId: b.dataset.doctor, date: b.dataset.date, time: b.dataset.bookSlot })
      )
    );
    holder.querySelectorAll('[data-goto-day]').forEach((b) =>
      b.addEventListener('click', () => {
        filters.date = b.dataset.gotoDay;
        filters.view = 'day';
        renderPage();
      })
    );
    const emptyBtn = holder.querySelector('#empty-create');
    if (emptyBtn) emptyBtn.addEventListener('click', () => openCreate({ date: filters.date }));
    const mPrev = holder.querySelector('#m-prev');
    const mNext = holder.querySelector('#m-next');
    if (mPrev) mPrev.addEventListener('click', () => { shiftMonth(-1); });
    if (mNext) mNext.addEventListener('click', () => { shiftMonth(1); });
  }

  function shiftMonth(delta) {
    const d = new Date(filters.date + 'T00:00:00');
    d.setMonth(d.getMonth() + delta, 1);
    filters.date = Utils.iso(d);
    renderPage();
  }

  function bindPage() {
    document.getElementById('btn-new-appt').addEventListener('click', () => openCreate({ date: filters.date }));

    const search = document.getElementById('f-search');
    let timer;
    search.addEventListener('input', (e) => {
      clearTimeout(timer);
      const v = e.target.value;
      timer = setTimeout(() => { filters.q = v; refreshList(); }, 180);
    });

    document.getElementById('f-date').addEventListener('change', (e) => {
      if (e.target.value) { filters.date = e.target.value; refreshList(); }
    });
    document.getElementById('f-prev').addEventListener('click', () => {
      filters.date = Utils.addDays(filters.date, -1);
      renderPage();
    });
    document.getElementById('f-next').addEventListener('click', () => {
      filters.date = Utils.addDays(filters.date, 1);
      renderPage();
    });
    document.getElementById('f-today').addEventListener('click', () => {
      filters.date = Utils.today();
      renderPage();
    });
    document.getElementById('f-doctor').addEventListener('change', (e) => {
      filters.doctorId = e.target.value; refreshList();
    });
    document.getElementById('f-status').addEventListener('change', (e) => {
      filters.status = e.target.value; refreshList();
    });
    document.querySelectorAll('[data-view]').forEach((b) =>
      b.addEventListener('click', () => { filters.view = b.dataset.view; renderPage(); })
    );

    bindList();
  }

  /* ================================================================
     EXPORT
     ================================================================ */
  global.Appointments = {
    renderPage,
    refresh: refreshList,
    filters,
    row,
    freeRow,
    timeline,
    openDetails,
    openCreate,
    openReschedule,
    setStatus,
  };
})(window);
