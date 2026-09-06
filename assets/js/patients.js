/* ==================================================================
   patients.js — patient list, add-patient form, patient profile
   ------------------------------------------------------------------
   The list is a table on desktop and a stack of cards on mobile —
   the same data, laid out for the device rather than shrunk down.
   ================================================================== */
(function (global) {
  'use strict';

  const filters = { q: '', status: 'all', doctorId: 'all' };

  /* ================================================================
     ADD / EDIT PATIENT
     ================================================================ */
  function openCreate(opts) {
    const o = opts || {};
    const editing = o.patient || null;

    const form =
      '<div class="grid gap-4 sm:grid-cols-2">' +
        '<div class="sm:col-span-2">' +
          '<label for="pf-name" class="label">Full name <span class="text-danger">*</span></label>' +
          '<input id="pf-name" data-autofocus type="text" class="input" placeholder="e.g. Rahul Kumar" value="' + Utils.escape(editing ? editing.name : '') + '" />' +
          '<p class="mt-1.5 hidden text-[12px] font-medium text-danger" data-error="name">Please enter the patient&rsquo;s name.</p>' +
        '</div>' +
        '<div>' +
          '<label for="pf-phone" class="label">Phone number <span class="text-danger">*</span></label>' +
          '<input id="pf-phone" type="tel" class="input" placeholder="+91 98765 43210" value="' + Utils.escape(editing ? editing.phone : '') + '" />' +
          '<p class="mt-1.5 hidden text-[12px] font-medium text-danger" data-error="phone">Please enter a phone number.</p>' +
        '</div>' +
        '<div>' +
          '<label for="pf-email" class="label">Email <span class="font-normal text-muted">(optional)</span></label>' +
          '<input id="pf-email" type="email" class="input" placeholder="name@example.com" value="' + Utils.escape(editing ? editing.email : '') + '" />' +
        '</div>' +
        '<div>' +
          '<label for="pf-gender" class="label">Gender</label>' +
          '<select id="pf-gender" class="select">' +
            ['Male', 'Female', 'Other'].map((g) =>
              '<option' + (editing && editing.gender === g ? ' selected' : '') + '>' + g + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label for="pf-age" class="label">Age <span class="text-danger">*</span></label>' +
          '<input id="pf-age" type="number" min="0" max="120" class="input" placeholder="32" value="' + (editing ? editing.age : '') + '" />' +
          '<p class="mt-1.5 hidden text-[12px] font-medium text-danger" data-error="age">Please enter a valid age.</p>' +
        '</div>' +
        '<div>' +
          '<label for="pf-blood" class="label">Blood group</label>' +
          '<select id="pf-blood" class="select">' +
            ['O+','O-','A+','A-','B+','B-','AB+','AB-','Unknown'].map((b) =>
              '<option' + (editing && editing.bloodGroup === b ? ' selected' : '') + '>' + b + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label for="pf-city" class="label">City</label>' +
          '<input id="pf-city" type="text" class="input" placeholder="Bhagalpur" value="' + Utils.escape(editing ? editing.city : Store.state.clinic.city) + '" />' +
        '</div>' +
        '<div class="sm:col-span-2">' +
          '<label for="pf-doctor" class="label">Assigned doctor</label>' +
          '<select id="pf-doctor" class="select">' +
            Store.state.doctors.map((d) =>
              '<option value="' + d.id + '"' + (editing && editing.doctorId === d.id ? ' selected' : '') + '>' +
                Utils.escape(d.name) + ' — ' + Utils.escape(d.specialization) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="sm:col-span-2">' +
          '<label for="pf-notes" class="label">Notes <span class="font-normal text-muted">(optional)</span></label>' +
          '<textarea id="pf-notes" class="textarea" placeholder="Anything the front desk should remember…">' + Utils.escape(editing ? editing.notes : '') + '</textarea>' +
        '</div>' +
      '</div>';

    const modal = Modal.open({
      title: editing ? 'Edit Patient' : 'Add Patient',
      subtitle: editing ? 'Update the patient record.' : 'Create a new patient record for ' + Store.state.clinic.name + '.',
      size: 'lg',
      body: form,
      footer:
        '<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">' +
          '<button type="button" class="btn-secondary" data-close>Cancel</button>' +
          '<button type="button" class="btn-primary sm:min-w-[150px]" id="save-patient">' +
            icon('check', 'h-4 w-4') + (editing ? 'Save Changes' : 'Add Patient') +
          '</button>' +
        '</div>',
    });

    const $ = (sel) => modal.body.querySelector(sel);

    function showError(field, show) {
      const el = modal.body.querySelector('[data-error="' + field + '"]');
      if (el) el.classList.toggle('hidden', !show);
    }

    modal.el.querySelector('#save-patient').addEventListener('click', (e) => {
      const name = $('#pf-name').value.trim();
      const phone = $('#pf-phone').value.trim();
      const age = parseInt($('#pf-age').value, 10);

      showError('name', !name);
      showError('phone', !phone);
      showError('age', !(age >= 0 && age <= 120));
      if (!name || !phone || !(age >= 0 && age <= 120)) {
        Toast.error('Missing details', 'Please fill in the highlighted fields.');
        return;
      }

      const btn = e.currentTarget;
      setLoading(btn, true, 'Saving…');

      setTimeout(() => {
        const data = {
          name,
          phone,
          email: $('#pf-email').value.trim() || '—',
          gender: $('#pf-gender').value,
          age,
          bloodGroup: $('#pf-blood').value,
          city: $('#pf-city').value.trim() || Store.state.clinic.city,
          doctorId: $('#pf-doctor').value,
          notes: $('#pf-notes').value.trim(),
        };

        let patient;
        if (editing) {
          patient = Object.assign(editing, data);
          Store.addActivity(patient.name + "'s record was updated.", 'pencil', 'info');
          Store.save();
          modal.close();
          Toast.success('✓ Patient updated', patient.name + "'s details have been saved.");
        } else {
          patient = Object.assign({ id: Utils.uid('p'), status: 'new', allergies: [], conditions: [] }, data);
          Store.state.patients.unshift(patient);
          Store.addNotification('New patient registered', patient.name + ' added to patient records', 'patient', 'patients');
          Store.addActivity(patient.name + ' was added as a new patient.', 'user-plus', 'brand');
          Store.save();
          modal.close();
          Toast.success('✓ Patient added successfully', patient.name + ' is now in your records.');
        }

        Layout.refreshBadge();
        if (typeof o.onCreated === 'function') o.onCreated(patient);
        else App.refresh();
      }, 700);
    });
  }

  /* ================================================================
     PATIENT QUICK VIEW (slide-over)
     ================================================================ */
  function openQuickView(id) {
    const p = Store.patient(id);
    if (!p) return;
    const last = Store.lastVisit(id);
    const upcoming = Store.appointmentsFor(id)
      .filter((a) => a.date >= Utils.today() && a.status !== 'completed' && a.status !== 'cancelled')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

    SlideOver.open({
      title: p.name,
      subtitle: p.gender + ' · ' + p.age + ' Years',
      width: 'lg',
      body:
        '<div class="flex items-center gap-4">' +
          Components.avatar(p.name, 'h-14 w-14') +
          '<div class="min-w-0">' +
            '<p class="text-lg font-bold text-ink">' + Utils.escape(p.name) + '</p>' +
            '<div class="mt-1">' + Components.patientBadge(p.status) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="mt-4 divide-y divide-line rounded-card border border-line px-4">' +
          Components.field('Phone', Utils.escape(p.phone), 'phone') +
          Components.field('Email', Utils.escape(p.email), 'mail') +
          Components.field('Assigned doctor', Utils.escape((Store.doctor(p.doctorId) || {}).name || '—'), 'stethoscope') +
          Components.field('Last visit', last ? Utils.formatDate(last.date) : 'No visit yet', 'history') +
          Components.field('Next appointment',
            upcoming ? Utils.formatDateRelative(upcoming.date) + ' · ' + Utils.formatTime(upcoming.time) : 'None scheduled', 'calendar-days') +
        '</div>',
      footer:
        '<div class="grid gap-2 sm:grid-cols-2">' +
          '<a href="patient-profile.html?id=' + p.id + '" class="btn-secondary btn-block">' + icon('user', 'h-4 w-4') + 'Full profile</a>' +
          '<button type="button" class="btn-primary btn-block" id="qv-book">' + icon('calendar-plus', 'h-4 w-4') + 'Book Appointment</button>' +
        '</div>',
      onMount(body, handle) {
        handle.el.querySelector('#qv-book').addEventListener('click', () => {
          handle.close();
          setTimeout(() => Appointments.openCreate({ patientId: p.id, doctorId: p.doctorId }), 200);
        });
      },
    });
  }

  /* ================================================================
     PATIENTS PAGE
     ================================================================ */
  function visiblePatients() {
    const q = filters.q.trim().toLowerCase();
    return Store.state.patients.filter((p) => {
      if (filters.status !== 'all' && p.status !== filters.status) return false;
      if (filters.doctorId !== 'all' && p.doctorId !== filters.doctorId) return false;
      if (q && !(p.name.toLowerCase().includes(q) || p.phone.replace(/\s/g, '').includes(q.replace(/\s/g, '')))) return false;
      return true;
    });
  }

  function tableRows(list) {
    return list.map((p) => {
      const last = Store.lastVisit(p.id);
      return (
        '<tr class="row-link" data-patient-row="' + p.id + '">' +
          '<td class="td">' +
            '<div class="flex items-center gap-3">' +
              Components.avatar(p.name, 'h-9 w-9') +
              '<div class="min-w-0">' +
                '<p class="truncate font-semibold text-ink">' + Utils.escape(p.name) + '</p>' +
                '<p class="truncate text-[12px] text-muted">' + Utils.escape(p.email) + '</p>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td class="td whitespace-nowrap text-muted">' + Utils.escape(p.gender) + ' · ' + p.age + '</td>' +
          '<td class="td whitespace-nowrap text-muted">' + Utils.escape(p.phone) + '</td>' +
          '<td class="td whitespace-nowrap text-muted">' + (last ? Utils.formatDate(last.date) : '—') + '</td>' +
          '<td class="td">' + Components.patientBadge(p.status) + '</td>' +
          '<td class="td text-right">' +
            '<span class="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700">View' + icon('chevron-right', 'h-4 w-4') + '</span>' +
          '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function cardRows(list) {
    return list.map((p) => {
      const last = Store.lastVisit(p.id);
      return (
        '<button type="button" data-patient-row="' + p.id + '" class="flex w-full items-center gap-3 border-b border-line px-4 py-4 text-left transition-colors last:border-0 hover:bg-brand-50/40">' +
          Components.avatar(p.name, 'h-11 w-11') +
          '<span class="min-w-0 flex-1">' +
            '<span class="flex items-center gap-2">' +
              '<span class="truncate text-sm font-semibold text-ink">' + Utils.escape(p.name) + '</span>' +
            '</span>' +
            '<span class="mt-0.5 block truncate text-[12px] text-muted">' + Utils.escape(p.gender) + ' · ' + p.age + ' yrs · ' + Utils.escape(p.phone) + '</span>' +
            '<span class="mt-1.5 flex items-center gap-2">' +
              Components.patientBadge(p.status) +
              '<span class="text-[11px] text-muted">' + (last ? 'Last visit ' + Utils.formatDate(last.date) : 'No visits yet') + '</span>' +
            '</span>' +
          '</span>' +
          '<span class="shrink-0 text-slate-300">' + icon('chevron-right', 'h-4 w-4') + '</span>' +
        '</button>'
      );
    }).join('');
  }

  function listCard() {
    const list = visiblePatients();
    if (!list.length) {
      return '<div class="card">' + Components.emptyState({
        icon: 'users',
        title: 'No patients found',
        message: "No patient record matches this search or filter.",
        action: 'Add Patient',
        actionId: 'empty-add-patient',
        actionIcon: 'user-plus',
      }) + '</div>';
    }
    return (
      '<div class="card overflow-hidden">' +
        Components.sectionHead(
          list.length + (list.length === 1 ? ' patient' : ' patients'),
          '<span class="hidden text-[13px] text-muted sm:block">Tap a row to open the full profile</span>'
        ) +
        // desktop table
        '<div class="hidden overflow-x-auto md:block">' +
          '<table class="w-full">' +
            '<thead><tr>' +
              '<th class="th">Patient</th><th class="th">Age</th><th class="th">Phone</th>' +
              '<th class="th">Last Visit</th><th class="th">Status</th><th class="th"></th>' +
            '</tr></thead>' +
            '<tbody>' + tableRows(list) + '</tbody>' +
          '</table>' +
        '</div>' +
        // mobile cards
        '<div class="md:hidden">' + cardRows(list) + '</div>' +
      '</div>'
    );
  }

  function renderPage() {
    const root = document.getElementById('page-content');
    root.innerHTML =
      Components.pageHead({
        title: 'Patients',
        sub: 'Keep patient information organized and easy to access.',
        action: '<button type="button" id="btn-add-patient" class="btn-primary w-full sm:w-auto">' +
                  icon('user-plus', 'h-4 w-4') + 'Add Patient' + '</button>',
      }) +
      '<div id="pt-filters" class="card mb-5 p-3 sm:p-4">' +
        '<div class="flex flex-col gap-3 sm:flex-row sm:items-center">' +
          '<div class="relative flex-1">' +
            '<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">' + icon('search', 'h-[18px] w-[18px]') + '</span>' +
            '<input id="pt-search" type="search" placeholder="Search by name or phone…" value="' + Utils.escape(filters.q) + '" class="input pl-10" aria-label="Search patients" />' +
          '</div>' +
          '<div class="grid grid-cols-2 gap-2 sm:flex">' +
            '<select id="pt-doctor" class="select sm:w-52" aria-label="Filter by doctor">' +
              '<option value="all">All doctors</option>' +
              Store.state.doctors.map((d) => '<option value="' + d.id + '"' + (filters.doctorId === d.id ? ' selected' : '') + '>' + Utils.escape(d.name) + '</option>').join('') +
            '</select>' +
            '<select id="pt-status" class="select sm:w-40" aria-label="Filter by status">' +
              '<option value="all">All statuses</option>' +
              '<option value="active"' + (filters.status === 'active' ? ' selected' : '') + '>Active</option>' +
              '<option value="new"' + (filters.status === 'new' ? ' selected' : '') + '>New</option>' +
              '<option value="inactive"' + (filters.status === 'inactive' ? ' selected' : '') + '>Inactive</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div id="patient-list">' + listCard() + '</div>';

    document.getElementById('btn-add-patient').addEventListener('click', () => openCreate({}));

    let t;
    document.getElementById('pt-search').addEventListener('input', (e) => {
      clearTimeout(t);
      const v = e.target.value;
      t = setTimeout(() => { filters.q = v; refreshList(); }, 180);
    });
    document.getElementById('pt-doctor').addEventListener('change', (e) => { filters.doctorId = e.target.value; refreshList(); });
    document.getElementById('pt-status').addEventListener('change', (e) => { filters.status = e.target.value; refreshList(); });

    bindList();
  }

  function refreshList() {
    const holder = document.getElementById('patient-list');
    if (!holder) return;
    holder.innerHTML = listCard();
    bindList();
  }

  function bindList() {
    const holder = document.getElementById('patient-list');
    if (!holder) return;
    holder.querySelectorAll('[data-patient-row]').forEach((el) =>
      el.addEventListener('click', () => {
        window.location.href = 'patient-profile.html?id=' + el.dataset.patientRow;
      })
    );
    const empty = holder.querySelector('#empty-add-patient');
    if (empty) empty.addEventListener('click', () => openCreate({}));
  }

  /* ================================================================
     PATIENT PROFILE PAGE
     ================================================================ */
  let profileTab = 'overview';

  function renderProfile() {
    const root = document.getElementById('page-content');
    const id = new URLSearchParams(window.location.search).get('id');
    const p = Store.patient(id) || Store.state.patients[0];

    if (!p) {
      root.innerHTML = '<div class="card">' + Components.emptyState({
        icon: 'users', title: 'Patient not found', message: 'This patient record is no longer available.',
      }) + '</div>';
      return;
    }

    const appts = Store.appointmentsFor(p.id);
    const invoices = Store.invoicesFor(p.id);
    const history = Store.state.history.filter((h) => h.patientId === p.id)
      .sort((a, b) => b.date.localeCompare(a.date));

    root.innerHTML =
      '<a href="patients.html" class="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-brand-700">' +
        icon('arrow-left', 'h-4 w-4') + 'Back to patients' +
      '</a>' +

      // header card
      '<div class="card card-pad">' +
        '<div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">' +
          '<div class="flex items-start gap-4">' +
            Components.avatar(p.name, 'h-16 w-16') +
            '<div class="min-w-0">' +
              '<h2 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">' + Utils.escape(p.name) + '</h2>' +
              '<p class="mt-0.5 text-sm text-muted">' + Utils.escape(p.gender) + ' &bull; ' + p.age + ' Years &bull; ' + Utils.escape(p.bloodGroup) + '</p>' +
              '<div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">' +
                Components.patientBadge(p.status) +
                '<a href="tel:' + Utils.escape(p.phone) + '" class="flex items-center gap-1.5 text-[13px] font-medium text-ink transition-colors hover:text-brand-700">' +
                  '<span class="text-slate-400">' + icon('phone', 'h-4 w-4') + '</span>' + Utils.escape(p.phone) + '</a>' +
                '<span class="flex items-center gap-1.5 text-[13px] font-medium text-ink">' +
                  '<span class="text-slate-400">' + icon('mail', 'h-4 w-4') + '</span>' + Utils.escape(p.email) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="grid gap-2 sm:grid-cols-2 lg:w-auto lg:shrink-0">' +
            '<button type="button" id="pp-book" class="btn-primary">' + icon('calendar-plus', 'h-4 w-4') + 'Book Appointment</button>' +
            '<button type="button" id="pp-edit" class="btn-secondary">' + icon('pencil', 'h-4 w-4') + 'Edit Patient</button>' +
          '</div>' +
        '</div>' +
        '<div class="mt-5">' +
          Components.tabs([
            { key: 'overview',    label: 'Overview' },
            { key: 'appointments',label: 'Appointments', count: appts.length },
            { key: 'history',     label: 'Medical History', count: history.length },
            { key: 'billing',     label: 'Billing', count: invoices.length },
          ], profileTab) +
        '</div>' +
      '</div>' +

      '<div id="pp-panel" class="mt-5"></div>';

    function panel() {
      if (profileTab === 'appointments') return appointmentsTab(appts);
      if (profileTab === 'history') return historyTab(history, p);
      if (profileTab === 'billing') return billingTab(invoices, p);
      return overviewTab(p, appts);
    }

    function paint() {
      document.getElementById('pp-panel').innerHTML = panel();
      document.getElementById('pp-panel').querySelectorAll('[data-appt]').forEach((b) =>
        b.addEventListener('click', () => Appointments.openDetails(b.dataset.appt)));
      document.getElementById('pp-panel').querySelectorAll('[data-invoice]').forEach((b) =>
        b.addEventListener('click', () => Billing.openInvoice(b.dataset.invoice)));
      const bookBtn = document.getElementById('pp-panel').querySelector('#pp-empty-book');
      if (bookBtn) bookBtn.addEventListener('click', () => Appointments.openCreate({ patientId: p.id, doctorId: p.doctorId }));
    }

    root.querySelectorAll('[data-tab]').forEach((b) =>
      b.addEventListener('click', () => {
        profileTab = b.dataset.tab;
        root.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('tab-active', x.dataset.tab === profileTab));
        paint();
      })
    );
    document.getElementById('pp-book').addEventListener('click', () =>
      Appointments.openCreate({ patientId: p.id, doctorId: p.doctorId }));
    document.getElementById('pp-edit').addEventListener('click', () =>
      openCreate({ patient: p, onCreated() { renderProfile(); } }));

    paint();
    App.setRefresh(renderProfile);
  }

  /* ---------- profile tabs ---------- */
  function overviewTab(p, appts) {
    const last = Store.lastVisit(p.id);
    const next = appts
      .filter((a) => a.date >= Utils.today() && (a.status === 'confirmed' || a.status === 'waiting' || a.status === 'in_progress'))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    const doctor = Store.doctor(p.doctorId);
    const outstanding = Store.invoicesFor(p.id).reduce((s, v) => s + (v.amount - v.paid), 0);

    const tags = (arr, tone) =>
      arr && arr.length
        ? arr.map((x) => '<span class="' + tone + '">' + Utils.escape(x) + '</span>').join(' ')
        : '<span class="text-sm text-slate-400">None recorded</span>';

    return (
      '<div class="grid gap-5 lg:grid-cols-3">' +
        '<div class="min-w-0 space-y-5 lg:col-span-2">' +
          '<div class="card overflow-hidden">' +
            Components.sectionHead('Next appointment') +
            (next
              ? Appointments.row(next, { showDate: true })
              : Components.emptyState({
                  icon: 'calendar-days',
                  title: 'No upcoming appointment',
                  message: p.name + ' has nothing scheduled right now.',
                  action: 'Book Appointment', actionId: 'pp-empty-book', actionIcon: 'calendar-plus',
                })) +
          '</div>' +
          '<div class="card overflow-hidden">' +
            Components.sectionHead('Recent visits') +
            (appts.filter((a) => a.status === 'completed').length
              ? appts.filter((a) => a.status === 'completed').slice(0, 4).map((a) => Appointments.row(a, { showDate: true })).join('')
              : Components.emptyState({ icon: 'history', title: 'No past visits', message: 'This patient has not been seen yet.' })) +
          '</div>' +
        '</div>' +

        '<div class="min-w-0 space-y-5">' +
          '<div class="card card-pad">' +
            '<h3 class="text-[15px] font-bold text-ink">Patient details</h3>' +
            '<div class="mt-1 divide-y divide-line">' +
              Components.field('Assigned doctor', doctor ? Utils.escape(doctor.name) + '<br><span class="text-[12px] font-normal text-muted">' + Utils.escape(doctor.specialization) + '</span>' : '—', 'stethoscope') +
              Components.field('Last visit', last ? Utils.formatDate(last.date) + '<br><span class="text-[12px] font-normal text-muted">' + Utils.formatTime(last.time) + ' · ' + Utils.escape(last.type) + '</span>' : 'No visit yet', 'history') +
              Components.field('City', Utils.escape(p.city), 'map-pin') +
              Components.field('Outstanding balance',
                outstanding > 0
                  ? '<span class="text-danger">' + Utils.money(outstanding) + '</span>'
                  : '<span class="text-success">All settled</span>', 'indian-rupee') +
            '</div>' +
          '</div>' +
          '<div class="card card-pad">' +
            '<h3 class="text-[15px] font-bold text-ink">Care notes</h3>' +
            '<div class="mt-3 space-y-3">' +
              '<div>' +
                '<p class="text-[12px] font-semibold uppercase tracking-wide text-muted">Known allergies</p>' +
                '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags(p.allergies, 'badge-warning') + '</div>' +
              '</div>' +
              '<div>' +
                '<p class="text-[12px] font-semibold uppercase tracking-wide text-muted">Ongoing conditions</p>' +
                '<div class="mt-1.5 flex flex-wrap gap-1.5">' + tags(p.conditions, 'badge-info') + '</div>' +
              '</div>' +
              '<div>' +
                '<p class="text-[12px] font-semibold uppercase tracking-wide text-muted">Notes</p>' +
                '<p class="mt-1.5 text-sm leading-relaxed text-ink">' + (p.notes ? Utils.escape(p.notes) : '<span class="text-slate-400">No notes yet.</span>') + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function appointmentsTab(appts) {
    if (!appts.length) {
      return '<div class="card">' + Components.emptyState({
        icon: 'calendar-days', title: 'No appointments yet',
        message: 'Appointments booked for this patient will appear here.',
        action: 'Book Appointment', actionId: 'pp-empty-book', actionIcon: 'calendar-plus',
      }) + '</div>';
    }
    return (
      '<div class="card overflow-hidden">' +
        Components.sectionHead('Appointment history', '<span class="badge-neutral">' + appts.length + ' total</span>') +
        appts.map((a) => Appointments.row(a, { showDate: true })).join('') +
      '</div>'
    );
  }

  function historyTab(history, p) {
    if (!history.length) {
      return '<div class="card">' + Components.emptyState({
        icon: 'file-text', title: 'No medical history recorded',
        message: 'Consultation notes for ' + p.name + ' will be listed here.',
      }) + '</div>';
    }
    return (
      '<div class="card overflow-hidden">' +
        Components.sectionHead('Medical history', null, 'Simple consultation notes recorded by the doctor.') +
        '<ol class="px-5 py-2 sm:px-6">' +
          history.map((h, i) =>
            '<li class="relative flex gap-4 pb-6 pt-4' + (i === history.length - 1 ? '' : '') + '">' +
              '<div class="flex flex-col items-center">' +
                '<span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">' + icon('file-text', 'h-[18px] w-[18px]') + '</span>' +
                (i === history.length - 1 ? '' : '<span class="mt-1 w-px flex-1 bg-line"></span>') +
              '</div>' +
              '<div class="min-w-0 flex-1">' +
                '<div class="flex flex-wrap items-center gap-x-3 gap-y-1">' +
                  '<p class="text-sm font-bold text-ink">' + Utils.escape(h.title) + '</p>' +
                  '<span class="badge-neutral">' + Utils.formatDate(h.date) + '</span>' +
                '</div>' +
                '<p class="mt-1 text-sm leading-relaxed text-muted">' + Utils.escape(h.detail) + '</p>' +
                '<p class="mt-1.5 text-[12px] text-slate-400">Recorded by ' + Utils.escape((Store.doctor(h.doctorId) || {}).name || '—') + '</p>' +
              '</div>' +
            '</li>').join('') +
        '</ol>' +
      '</div>'
    );
  }

  function billingTab(invoices, p) {
    if (!invoices.length) {
      return '<div class="card">' + Components.emptyState({
        icon: 'credit-card', title: 'No invoices yet',
        message: 'Payments raised for ' + p.name + ' will appear here.',
      }) + '</div>';
    }
    const total = invoices.reduce((s, v) => s + v.amount, 0);
    const due = invoices.reduce((s, v) => s + (v.amount - v.paid), 0);
    return (
      '<div class="space-y-5">' +
        '<div class="grid gap-4 sm:grid-cols-2">' +
          Components.stat({ label: 'Total billed', value: Utils.money(total), icon: 'file-text', tone: 'brand' }) +
          Components.stat({ label: 'Outstanding', value: Utils.money(due), icon: 'indian-rupee', tone: due > 0 ? 'warning' : 'success', hint: due > 0 ? 'Payment pending' : 'All payments settled' }) +
        '</div>' +
        '<div class="card overflow-hidden">' +
          Components.sectionHead('Invoices') +
          invoices.map((v) => Billing.row(v)).join('') +
        '</div>' +
      '</div>'
    );
  }

  /* ================================================================
     EXPORT
     ================================================================ */
  global.Patients = {
    renderPage,
    renderProfile,
    openCreate,
    openQuickView,
    refresh: refreshList,
    filters,
  };
})(window);
