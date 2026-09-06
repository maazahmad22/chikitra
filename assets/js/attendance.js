/* ==================================================================
   attendance.js — smart attendance demo
   ------------------------------------------------------------------
   Two halves on one page:
     · Attendance settings the clinic owner controls (toggles)
     · A simulated employee check-in, which follows those settings
   Nothing here touches a real camera or real GPS — it is a
   demonstration of the flow, not a working capture.
   ================================================================== */
(function (global) {
  'use strict';

  let actorId = 's3'; // the employee being simulated — Rahul Kumar, Receptionist

  const nowTime = () => {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  const recordFor = (staffId) =>
    Store.state.attendance.records.find((r) => r.staffId === staffId && r.date === Utils.today());

  /* ================================================================
     CHECK-IN FLOW
     ================================================================ */
  function openCheckIn(staffId) {
    const person = Store.staffMember(staffId);
    const cfg = Store.state.attendance.settings;

    // Build only the steps the clinic actually requires.
    const steps = [];
    if (cfg.selfie) steps.push('selfie');
    if (cfg.location) steps.push('location');
    steps.push('confirm');

    const state = { i: 0, selfieDone: false, locationDone: false };

    const modal = Modal.open({
      title: 'Check In',
      subtitle: person.name + ' · ' + Store.state.clinic.name,
      size: 'md',
      body: '',
      footer: '',
    });

    function progress() {
      return (
        '<div class="mb-5 flex items-center gap-2">' +
          steps.map((s, i) =>
            '<span class="h-1.5 flex-1 rounded-full ' + (i <= state.i ? 'bg-brand-600' : 'bg-slate-200') + ' transition-colors duration-200"></span>'
          ).join('') +
        '</div>' +
        '<p class="mb-4 text-[12px] font-bold uppercase tracking-wider text-muted">Step ' + (state.i + 1) + ' of ' + steps.length + '</p>'
      );
    }

    function selfieStep() {
      return progress() +
        '<h3 class="text-[15px] font-bold text-ink">Selfie Verification</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Confirm it is really you before marking attendance.</p>' +
        '<div class="mt-4 overflow-hidden rounded-card border border-line bg-nav">' +
          '<div id="selfie-frame" class="relative flex aspect-[4/3] items-center justify-center">' +
            (state.selfieDone
              ? '<div class="flex flex-col items-center gap-3">' +
                  '<span class="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">' + Utils.initials(person.name) + '</span>' +
                  '<span class="badge-success">' + icon('check', 'h-3.5 w-3.5') + 'Selfie Captured</span>' +
                '</div>'
              : '<div class="flex flex-col items-center gap-3 text-slate-500">' +
                  '<span class="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-slate-600">' +
                    icon('camera', 'h-8 w-8') +
                  '</span>' +
                  '<span class="text-[12px] font-medium">Camera preview (simulated)</span>' +
                '</div>') +
            '<span class="pointer-events-none absolute inset-3 rounded-lg border border-white/10"></span>' +
          '</div>' +
        '</div>' +
        '<p class="mt-3 flex items-start gap-2 text-[12px] leading-snug text-muted">' +
          '<span class="mt-px shrink-0 text-slate-400">' + icon('info', 'h-4 w-4') + '</span>' +
          'This demo does not access your camera. In the real product the photo is captured and stored with the attendance record.' +
        '</p>';
    }

    function locationStep() {
      const c = Store.state.clinic;
      return progress() +
        '<h3 class="text-[15px] font-bold text-ink">Location Verification</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Attendance is only accepted from the clinic premises.</p>' +
        '<div class="mt-4 overflow-hidden rounded-card border border-line">' +
          '<div class="grid-lines relative flex h-40 items-center justify-center bg-brand-50/60">' +
            '<span class="relative flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lift">' +
              icon('map-pin', 'h-6 w-6') +
              (state.locationDone ? '' : '<span class="absolute inset-0 animate-ping rounded-full bg-brand-500/40"></span>') +
            '</span>' +
          '</div>' +
          '<div class="flex items-center justify-between gap-3 border-t border-line px-4 py-3.5">' +
            '<div class="min-w-0">' +
              '<p class="truncate text-sm font-bold text-ink">' + Utils.escape(c.city + ', ' + c.state) + '</p>' +
              '<p class="truncate text-[12px] text-muted">' + Utils.escape(c.address + ' · ' + c.name) + '</p>' +
            '</div>' +
            (state.locationDone
              ? '<span class="badge-success shrink-0">' + icon('check', 'h-3.5 w-3.5') + 'Location Verified</span>'
              : '<span class="badge-neutral shrink-0">Locating…</span>') +
          '</div>' +
        '</div>' +
        '<p class="mt-3 flex items-start gap-2 text-[12px] leading-snug text-muted">' +
          '<span class="mt-px shrink-0 text-slate-400">' + icon('info', 'h-4 w-4') + '</span>' +
          'This demo uses the clinic address instead of real GPS.' +
        '</p>';
    }

    function confirmStep() {
      const cfgRows =
        (cfg.selfie   ? checkRow('Selfie verification', 'Photo captured') : '') +
        (cfg.location ? checkRow('Location verification', Store.state.clinic.city + ', ' + Store.state.clinic.state) : '');
      return progress() +
        '<h3 class="text-[15px] font-bold text-ink">Confirm Check In</h3>' +
        '<p class="mt-1 text-[13px] text-muted">Everything is verified. Mark your attendance for today.</p>' +
        '<div class="mt-4 rounded-card border border-line">' +
          '<div class="flex items-center gap-3 border-b border-line px-4 py-3.5">' +
            Components.avatar(person.name, 'h-11 w-11') +
            '<div class="min-w-0">' +
              '<p class="truncate text-sm font-bold text-ink">' + Utils.escape(person.name) + '</p>' +
              '<p class="truncate text-[12px] text-muted">' + Utils.escape(person.role + ' · ' + person.department) + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="divide-y divide-line px-4">' +
            cfgRows +
            checkRow('Date', Utils.formatDate(Utils.today())) +
            checkRow('Time', Utils.formatTime(nowTime())) +
          '</div>' +
        '</div>';
    }

    function checkRow(label, value) {
      return (
        '<div class="flex items-center justify-between gap-3 py-3">' +
          '<span class="flex items-center gap-2 text-[13px] text-muted">' +
            '<span class="text-success">' + icon('check-circle', 'h-4 w-4') + '</span>' + Utils.escape(label) +
          '</span>' +
          '<span class="text-right text-[13px] font-semibold text-ink">' + Utils.escape(value) + '</span>' +
        '</div>'
      );
    }

    function footer() {
      const step = steps[state.i];
      if (step === 'selfie') {
        return '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">' +
          '<button type="button" class="btn-ghost" data-close>Cancel</button>' +
          (state.selfieDone
            ? '<button type="button" class="btn-primary sm:min-w-[160px]" data-next>Continue' + icon('arrow-right', 'h-4 w-4') + '</button>'
            : '<button type="button" class="btn-primary sm:min-w-[160px]" data-capture>' + icon('camera', 'h-4 w-4') + 'Capture Selfie</button>') +
        '</div>';
      }
      if (step === 'location') {
        return '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">' +
          '<button type="button" class="btn-secondary" data-back>' + icon('arrow-left', 'h-4 w-4') + 'Back</button>' +
          '<button type="button" class="btn-primary sm:min-w-[160px]" data-next' + (state.locationDone ? '' : ' disabled') + '>' +
            'Continue' + icon('arrow-right', 'h-4 w-4') + '</button>' +
        '</div>';
      }
      return '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">' +
        (steps.length > 1
          ? '<button type="button" class="btn-secondary" data-back>' + icon('arrow-left', 'h-4 w-4') + 'Back</button>'
          : '<button type="button" class="btn-ghost" data-close>Cancel</button>') +
        '<button type="button" class="btn-primary sm:min-w-[180px]" data-confirm>' +
          icon('clipboard-check', 'h-4 w-4') + 'Confirm Check In</button>' +
      '</div>';
    }

    function render() {
      const step = steps[state.i];
      const views = { selfie: selfieStep, location: locationStep, confirm: confirmStep };
      modal.setBody(views[step]());
      modal.setFooter(footer());
      bind();

      // Simulate the location lock resolving a moment after the step opens.
      if (step === 'location' && !state.locationDone) {
        setTimeout(() => {
          state.locationDone = true;
          if (steps[state.i] === 'location') render();
        }, 1100);
      }
    }

    function bind() {
      const el = modal.el;
      const capture = el.querySelector('[data-capture]');
      if (capture) {
        capture.addEventListener('click', () => {
          setLoading(capture, true, 'Capturing…');
          setTimeout(() => { state.selfieDone = true; render(); }, 650);
        });
      }
      const next = el.querySelector('[data-next]');
      if (next) next.addEventListener('click', () => { state.i = Math.min(steps.length - 1, state.i + 1); render(); });
      const back = el.querySelector('[data-back]');
      if (back) back.addEventListener('click', () => { state.i = Math.max(0, state.i - 1); render(); });
      const confirm = el.querySelector('[data-confirm]');
      if (confirm) {
        confirm.addEventListener('click', () => {
          setLoading(confirm, true, 'Checking in…');
          setTimeout(() => {
            const time = nowTime();
            const existing = recordFor(staffId);
            if (existing) {
              existing.checkIn = time;
              existing.status = 'present';
            } else {
              Store.state.attendance.records.push({
                id: Utils.uid('at'), staffId, date: Utils.today(),
                checkIn: time, checkOut: null, status: 'present',
                location: Store.state.clinic.city + ', ' + Store.state.clinic.state,
              });
            }
            Store.addNotification('Employee checked in', person.name + ' at ' + Utils.formatTime(time), 'attendance', 'attendance');
            Store.addActivity(person.name + ' checked in for the day.', 'clipboard-check', 'brand');
            Store.save();

            modal.close();
            Toast.success('✓ Checked in successfully', person.name + ' · ' + Utils.formatTime(time));
            Layout.refreshBadge();
            App.refresh();
          }, 900);
        });
      }
    }

    render();
  }

  function checkOut(staffId) {
    const person = Store.staffMember(staffId);
    const rec = recordFor(staffId);
    if (!rec || !rec.checkIn) return;
    Modal.confirm({
      title: 'Check out for the day?',
      message: '<strong>' + Utils.escape(person.name) + '</strong> checked in at ' + Utils.formatTime(rec.checkIn) +
               '. This will close the attendance record for today.',
      confirmText: 'Check Out',
      icon: 'log-out',
      onConfirm() {
        rec.checkOut = nowTime();
        Store.addActivity(person.name + ' checked out.', 'log-out', 'info');
        Store.save();
        Toast.success('✓ Checked out successfully', person.name + ' · ' + Utils.formatTime(rec.checkOut));
        App.refresh();
      },
    });
  }

  /* ================================================================
     PAGE
     ================================================================ */
  function settingsCard() {
    const cfg = Store.state.attendance.settings;
    return (
      '<div id="att-settings" class="card">' +
        Components.sectionHead('Attendance Settings', null, 'Decide what your staff must provide when marking attendance.') +
        '<div class="divide-y divide-line px-5 sm:px-6">' +
          Components.toggle({ name: 'required', checked: cfg.required, label: 'Attendance Required?',
            hint: 'Staff must mark attendance every working day.' }) +
          Components.toggle({ name: 'selfie', checked: cfg.selfie, label: 'Selfie Required?',
            hint: 'A photo is captured at check-in to confirm identity.' }) +
          Components.toggle({ name: 'location', checked: cfg.location, label: 'Location Required?',
            hint: 'Check-in is only accepted from the clinic premises.' }) +
        '</div>' +
        '<div class="border-t border-line bg-slate-50/70 px-5 py-3.5 sm:px-6">' +
          '<p class="flex items-start gap-2 text-[12px] leading-snug text-muted">' +
            '<span class="mt-px shrink-0 text-slate-400">' + icon('info', 'h-4 w-4') + '</span>' +
            'Changing these settings updates the employee check-in flow on the right immediately.' +
          '</p>' +
        '</div>' +
      '</div>'
    );
  }

  function employeeCard() {
    const person = Store.staffMember(actorId);
    const rec = recordFor(actorId);
    const cfg = Store.state.attendance.settings;
    const checkedIn = !!(rec && rec.checkIn);
    const checkedOut = !!(rec && rec.checkOut);

    const requirements = [
      cfg.selfie ? 'Selfie' : null,
      cfg.location ? 'Location' : null,
    ].filter(Boolean);

    return (
      '<div class="card overflow-hidden">' +
        Components.sectionHead('Employee View', '<span class="badge-info">' + icon('sparkles', 'h-3.5 w-3.5') + 'Simulation</span>',
          'What your staff sees on their phone.') +

        '<div class="px-5 py-5 sm:px-6">' +
          // phone-ish frame
          '<div class="mx-auto max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-lift">' +
            '<div class="bg-nav px-5 py-5 text-white">' +
              '<p class="text-[13px] text-slate-400">' + Utils.formatDateShort(Utils.today()) + '</p>' +
              '<p class="mt-1 text-lg font-bold">' + Utils.greeting() + ', ' + Utils.escape(person.name.split(' ')[0]) + ' 👋</p>' +
              '<p class="mt-0.5 flex items-center gap-1.5 text-[13px] text-slate-400">' +
                icon('building', 'h-4 w-4') + Utils.escape(Store.state.clinic.name) +
              '</p>' +
            '</div>' +

            '<div class="px-5 py-5">' +
              (checkedIn
                ? '<div class="rounded-card border border-green-200 bg-green-50 px-4 py-4 text-center">' +
                    '<span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-white">' + icon('check', 'h-6 w-6') + '</span>' +
                    '<p class="mt-3 text-sm font-bold text-green-800">Checked in successfully</p>' +
                    '<p class="mt-0.5 text-[13px] text-green-700">Check-in Time: <strong>' + Utils.formatTime(rec.checkIn) + '</strong></p>' +
                    (checkedOut ? '<p class="mt-0.5 text-[13px] text-green-700">Check-out Time: <strong>' + Utils.formatTime(rec.checkOut) + '</strong></p>' : '') +
                  '</div>'
                : '<div class="rounded-card border border-dashed border-line bg-slate-50 px-4 py-5 text-center">' +
                    '<p class="text-sm font-semibold text-ink">Not checked in yet</p>' +
                    '<p class="mt-1 text-[13px] text-muted">Shift ' + Utils.escape(person.shift) + '</p>' +
                    (requirements.length
                      ? '<div class="mt-3 flex flex-wrap justify-center gap-1.5">' +
                          requirements.map((r) => '<span class="badge-neutral">' + icon(r === 'Selfie' ? 'camera' : 'map-pin', 'h-3.5 w-3.5') + r + ' required</span>').join('') +
                        '</div>'
                      : '<p class="mt-3 text-[12px] text-muted">No verification required.</p>') +
                  '</div>') +

              (!cfg.required
                ? '<p class="mt-4 rounded-lg bg-amber-50 px-3 py-2.5 text-center text-[12px] font-medium text-amber-800">Attendance is currently turned off for this clinic.</p>'
                : checkedOut
                  ? '<button type="button" class="btn-secondary btn-block mt-4" disabled>Day complete</button>'
                  : checkedIn
                    ? '<button type="button" id="btn-check-out" class="btn-secondary btn-block btn-lg mt-4">' + icon('log-out', 'h-4 w-4') + 'Check Out</button>'
                    : '<button type="button" id="btn-check-in" class="btn-primary btn-block btn-lg mt-4">' + icon('clipboard-check', 'h-5 w-5') + 'Check In</button>') +
            '</div>' +
          '</div>' +

          '<div class="mx-auto mt-4 max-w-sm">' +
            '<label for="actor" class="label">Simulate as</label>' +
            '<select id="actor" class="select">' +
              Store.state.staff.filter((s) => s.status === 'active').map((s) =>
                '<option value="' + s.id + '"' + (s.id === actorId ? ' selected' : '') + '>' +
                  Utils.escape(s.name + ' — ' + s.role) + '</option>').join('') +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function logCard() {
    const today = Utils.today();
    const rows = Store.state.staff.map((s) => {
      const rec = Store.state.attendance.records.find((r) => r.staffId === s.id && r.date === today);
      const badge = !rec || (!rec.checkIn && rec.status !== 'leave')
        ? '<span class="badge-neutral">' + icon('clock', 'h-3.5 w-3.5') + 'Not marked</span>'
        : rec.status === 'leave'
          ? '<span class="badge-warning">' + icon('info', 'h-3.5 w-3.5') + 'On Leave</span>'
          : rec.checkOut
            ? '<span class="badge-neutral">' + icon('check', 'h-3.5 w-3.5') + 'Day complete</span>'
            : '<span class="badge-success">' + icon('check-circle', 'h-3.5 w-3.5') + 'Present</span>';

      return (
        '<div class="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0 sm:px-5">' +
          Components.avatar(s.name, 'h-9 w-9') +
          '<div class="min-w-0 flex-1">' +
            '<p class="truncate text-sm font-semibold text-ink">' + Utils.escape(s.name) + '</p>' +
            '<p class="truncate text-[12px] text-muted">' + Utils.escape(s.role) +
              (rec && rec.checkIn ? ' · In ' + Utils.formatTime(rec.checkIn) : '') +
              (rec && rec.checkOut ? ' · Out ' + Utils.formatTime(rec.checkOut) : '') +
            '</p>' +
          '</div>' +
          badge +
        '</div>'
      );
    }).join('');

    const present = Store.state.attendance.records.filter((r) => r.date === today && r.checkIn).length;
    return (
      '<div class="card overflow-hidden">' +
        Components.sectionHead("Today's Attendance",
          '<span class="badge-neutral">' + present + ' of ' + Store.state.staff.length + ' present</span>') +
        rows +
      '</div>'
    );
  }

  function renderPage() {
    const root = document.getElementById('page-content');
    root.innerHTML =
      Components.pageHead({
        title: 'Attendance',
        sub: 'Set the rules once — your team checks in from their phone.',
      }) +
      '<div class="grid gap-5 lg:grid-cols-2">' +
        '<div class="min-w-0 space-y-5" id="att-left">' + settingsCard() + logCard() + '</div>' +
        '<div class="min-w-0" id="att-right">' + employeeCard() + '</div>' +
      '</div>';
    bind();
  }

  function bind() {
    document.querySelectorAll('[data-toggle]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.toggle;
        const cfg = Store.state.attendance.settings;
        cfg[key] = !cfg[key];
        Store.save();
        Toast.info(
          labelFor(key) + (cfg[key] ? ' turned on' : ' turned off'),
          cfg[key] ? 'Staff will be asked for this at check-in.' : 'Staff will no longer be asked for this.'
        );
        renderPage();
      })
    );

    const inBtn = document.getElementById('btn-check-in');
    if (inBtn) inBtn.addEventListener('click', () => openCheckIn(actorId));

    const outBtn = document.getElementById('btn-check-out');
    if (outBtn) outBtn.addEventListener('click', () => checkOut(actorId));

    const actor = document.getElementById('actor');
    if (actor) actor.addEventListener('change', (e) => { actorId = e.target.value; renderPage(); });
  }

  function labelFor(key) {
    return { required: 'Attendance', selfie: 'Selfie verification', location: 'Location verification' }[key] || key;
  }

  global.Attendance = { renderPage, openCheckIn, checkOut };
})(window);
