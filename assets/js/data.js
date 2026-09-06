/* ==================================================================
   data.js — CHIKITRA demo data + state store
   ------------------------------------------------------------------
   EVERYTHING you might want to change for a demo lives in this file:
   the clinic, the logged-in user, doctors, patients, appointments,
   staff, invoices and notifications.

   The app never mutates the seed directly. On first load the seed is
   copied into localStorage; from then on the copy is the live demo
   state. Settings -> "Reset Demo Data" restores this seed.
   ================================================================== */
(function (global) {
  'use strict';

  /* ================================================================
     1. DATE / FORMAT HELPERS
     ================================================================ */
  const pad = (n) => String(n).padStart(2, '0');

  const Utils = {
    /** 'YYYY-MM-DD' for a Date (local time, not UTC). */
    iso(d) {
      const x = d instanceof Date ? d : new Date(d);
      return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    },
    today() {
      return Utils.iso(new Date());
    },
    addDays(isoDate, days) {
      const d = new Date(isoDate + 'T00:00:00');
      d.setDate(d.getDate() + days);
      return Utils.iso(d);
    },
    /** 0 = Sunday … 6 = Saturday */
    weekday(isoDate) {
      return new Date(isoDate + 'T00:00:00').getDay();
    },
    weekdayKey(isoDate) {
      return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][Utils.weekday(isoDate)];
    },
    /** Monday-first start of the week containing isoDate. */
    startOfWeek(isoDate) {
      const day = Utils.weekday(isoDate);
      return Utils.addDays(isoDate, day === 0 ? -6 : 1 - day);
    },
    /** '12 Aug 2026' */
    formatDate(isoDate) {
      const d = new Date(isoDate + 'T00:00:00');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    },
    /** 'Today' / 'Tomorrow' / 'Yesterday' / '12 Aug 2026' */
    formatDateRelative(isoDate) {
      const t = Utils.today();
      if (isoDate === t) return 'Today';
      if (isoDate === Utils.addDays(t, 1)) return 'Tomorrow';
      if (isoDate === Utils.addDays(t, -1)) return 'Yesterday';
      return Utils.formatDate(isoDate);
    },
    /** 'Mon, 12 Aug' */
    formatDateShort(isoDate) {
      const d = new Date(isoDate + 'T00:00:00');
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
    },
    /** '09:00' -> '09:00 AM' */
    formatTime(hhmm) {
      if (!hhmm) return '';
      const [h, m] = hhmm.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 === 0 ? 12 : h % 12;
      return `${pad(hour)}:${pad(m)} ${suffix}`;
    },
    toMinutes(hhmm) {
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + m;
    },
    fromMinutes(mins) {
      return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
    },
    /** 12500 -> '₹12,500' */
    money(amount) {
      return '₹' + Number(amount || 0).toLocaleString('en-IN');
    },
    /** 'Rahul Kumar' -> 'RK' */
    initials(name) {
      return String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
    },
    /** Deterministic avatar tint so a person keeps the same colour everywhere. */
    tint(seed) {
      const palette = [
        'bg-brand-100 text-brand-700',
        'bg-blue-100 text-blue-700',
        'bg-amber-100 text-amber-700',
        'bg-violet-100 text-violet-700',
        'bg-rose-100 text-rose-700',
        'bg-emerald-100 text-emerald-700',
        'bg-cyan-100 text-cyan-700',
        'bg-indigo-100 text-indigo-700',
      ];
      let h = 0;
      for (let i = 0; i < String(seed).length; i++) h = (h * 31 + String(seed).charCodeAt(i)) >>> 0;
      return palette[h % palette.length];
    },
    escape(str) {
      return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },
    /** 'in 2 hours' / '25 min ago' from an ISO timestamp. */
    timeAgo(ts) {
      const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
      if (diff < 1) return 'Just now';
      if (diff < 60) return `${diff} min ago`;
      const hrs = Math.round(diff / 60);
      if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
      const days = Math.round(hrs / 24);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    },
    greeting() {
      const h = new Date().getHours();
      if (h < 12) return 'Good Morning';
      if (h < 17) return 'Good Afternoon';
      return 'Good Evening';
    },
    uid(prefix) {
      return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    },
  };

  /* ================================================================
     2. STATUS VOCABULARY
     Status is never communicated by colour alone — every badge also
     carries a label, and most carry an icon.
     ================================================================ */
  const APPOINTMENT_STATUS = {
    confirmed:   { label: 'Confirmed',    badge: 'badge-brand',   dot: 'bg-brand-500',  icon: 'check-circle' },
    waiting:     { label: 'Waiting',      badge: 'badge-warning', dot: 'bg-warning',    icon: 'clock' },
    in_progress: { label: 'In Progress',  badge: 'badge-info',    dot: 'bg-info',       icon: 'play' },
    completed:   { label: 'Completed',    badge: 'badge-success', dot: 'bg-success',    icon: 'check' },
    cancelled:   { label: 'Cancelled',    badge: 'badge-danger',  dot: 'bg-danger',     icon: 'ban' },
  };

  const INVOICE_STATUS = {
    paid:    { label: 'Paid',    badge: 'badge-success', icon: 'check-circle' },
    partial: { label: 'Partial', badge: 'badge-warning', icon: 'alert-circle' },
    pending: { label: 'Pending', badge: 'badge-danger',  icon: 'clock' },
  };

  /* ================================================================
     3. SEED DATA  —  edit anything below to re-skin the demo
     ================================================================ */

  const clinic = {
    name: 'CarePoint Clinic',
    tagline: 'Family Health & General Medicine',
    phone: '+91 98765 43210',
    email: 'hello@carepointclinic.demo',
    address: 'Adampur, Station Road',
    city: 'Bhagalpur',
    state: 'Bihar',
    country: 'India',
    slotMinutes: 15,
  };

  const currentUser = {
    id: 'd1',
    name: 'Dr. Rahul Sharma',
    shortName: 'Dr. Rahul',
    role: 'Doctor',
    specialization: 'General Physician',
    email: 'doctor@chikitra.demo',
  };

  const doctors = [
    {
      id: 'd1',
      name: 'Dr. Rahul Sharma',
      specialization: 'General Physician',
      qualification: 'MBBS, MD (General Medicine)',
      experience: '12 years',
      fee: 500,
      phone: '+91 98765 43210',
      email: 'rahul.sharma@carepointclinic.demo',
      room: 'Room 1',
      schedule: {
        mon: { start: '09:00', end: '14:00' },
        tue: { start: '09:00', end: '14:00' },
        wed: { start: '09:00', end: '14:00' },
        thu: { start: '10:00', end: '15:00' },
        fri: { start: '09:00', end: '13:00' },
        sat: { start: '09:00', end: '12:00' },
        sun: { start: '09:00', end: '13:30' }, // Sunday OPD — keeps the demo complete on any day
      },
    },
    {
      id: 'd2',
      name: 'Dr. Sunita Rao',
      specialization: 'Pediatrician',
      qualification: 'MBBS, DCH',
      experience: '9 years',
      fee: 600,
      phone: '+91 98765 43211',
      email: 'sunita.rao@carepointclinic.demo',
      room: 'Room 2',
      schedule: {
        mon: { start: '09:30', end: '13:30' },
        tue: { start: '09:30', end: '13:30' },
        wed: null,
        thu: { start: '09:30', end: '13:30' },
        fri: { start: '09:30', end: '13:30' },
        sat: { start: '10:00', end: '12:00' },
        sun: null,
      },
    },
    {
      id: 'd3',
      name: 'Dr. Vikram Bhatt',
      specialization: 'Dermatologist',
      qualification: 'MBBS, MD (Dermatology)',
      experience: '7 years',
      fee: 700,
      phone: '+91 98765 43212',
      email: 'vikram.bhatt@carepointclinic.demo',
      room: 'Room 3',
      schedule: {
        mon: { start: '10:00', end: '13:00' },
        tue: null,
        wed: { start: '10:00', end: '13:00' },
        thu: { start: '10:00', end: '13:00' },
        fri: null,
        sat: { start: '10:00', end: '13:00' },
        sun: null,
      },
    },
  ];

  const patients = [
    { id: 'p1',  name: 'Rahul Kumar',   gender: 'Male',   age: 32, phone: '+91 98111 22334', email: 'rahul.kumar@example.com',  bloodGroup: 'O+',  city: 'Bhagalpur', status: 'active', doctorId: 'd1', allergies: ['Dust'],       conditions: ['Seasonal allergy'],  notes: 'Prefers morning appointments. Follows up every 3 months.' },
    { id: 'p2',  name: 'Priya Singh',   gender: 'Female', age: 28, phone: '+91 98111 22335', email: 'priya.singh@example.com',  bloodGroup: 'B+',  city: 'Bhagalpur', status: 'active', doctorId: 'd1', allergies: [],             conditions: ['Migraine'],          notes: 'Reschedules often — confirm by phone a day before.' },
    { id: 'p3',  name: 'Amit Kumar',    gender: 'Male',   age: 45, phone: '+91 98111 22336', email: 'amit.kumar@example.com',   bloodGroup: 'A+',  city: 'Naugachia', status: 'active', doctorId: 'd1', allergies: ['Penicillin'], conditions: ['Hypertension'],      notes: 'On regular BP medication. Monthly review.' },
    { id: 'p4',  name: 'Neha Sharma',   gender: 'Female', age: 34, phone: '+91 98111 22337', email: 'neha.sharma@example.com',  bloodGroup: 'O-',  city: 'Bhagalpur', status: 'active', doctorId: 'd1', allergies: [],             conditions: [],                    notes: 'Annual health check due next quarter.' },
    { id: 'p5',  name: 'Vikram Singh',  gender: 'Male',   age: 52, phone: '+91 98111 22338', email: 'vikram.singh@example.com', bloodGroup: 'AB+', city: 'Sultanganj',status: 'active', doctorId: 'd1', allergies: [],             conditions: ['Type 2 diabetes'],   notes: 'Quarterly sugar review. Diet counselling shared.' },
    { id: 'p6',  name: 'Anjali Verma',  gender: 'Female', age: 26, phone: '+91 98111 22339', email: 'anjali.verma@example.com', bloodGroup: 'B-',  city: 'Bhagalpur', status: 'active', doctorId: 'd2', allergies: ['Pollen'],     conditions: [],                    notes: 'New to the clinic. Registered this month.' },
    { id: 'p7',  name: 'Kavita Mishra', gender: 'Female', age: 41, phone: '+91 98111 22340', email: 'kavita.mishra@example.com',bloodGroup: 'A-',  city: 'Bhagalpur', status: 'active', doctorId: 'd3', allergies: [],             conditions: ['Eczema'],            notes: 'Skin review every 6 weeks.' },
    { id: 'p8',  name: 'Arjun Nair',    gender: 'Male',   age: 30, phone: '+91 98111 22341', email: 'arjun.nair@example.com',   bloodGroup: 'O+',  city: 'Bhagalpur', status: 'active', doctorId: 'd1', allergies: [],             conditions: [],                    notes: 'Works night shifts — prefers late slots.' },
    { id: 'p9',  name: 'Meera Joshi',   gender: 'Female', age: 60, phone: '+91 98111 22342', email: 'meera.joshi@example.com',  bloodGroup: 'B+',  city: 'Naugachia', status: 'active', doctorId: 'd1', allergies: ['Sulfa drugs'],conditions: ['Arthritis'],         notes: 'Comes with attendant. Ground floor room preferred.' },
    { id: 'p10', name: 'Sanjay Yadav',  gender: 'Male',   age: 47, phone: '+91 98111 22343', email: 'sanjay.yadav@example.com', bloodGroup: 'A+',  city: 'Bhagalpur', status: 'active', doctorId: 'd1', allergies: [],             conditions: ['Acidity'],           notes: 'Prefers WhatsApp reminders.' },
    { id: 'p11', name: 'Pooja Rani',    gender: 'Female', age: 23, phone: '+91 98111 22344', email: 'pooja.rani@example.com',   bloodGroup: 'O+',  city: 'Bhagalpur', status: 'new',    doctorId: 'd2', allergies: [],             conditions: [],                    notes: 'First visit registered this week.' },
    { id: 'p12', name: 'Deepak Mehta',  gender: 'Male',   age: 36, phone: '+91 98111 22345', email: 'deepak.mehta@example.com', bloodGroup: 'AB-', city: 'Sultanganj',status: 'inactive',doctorId:'d1', allergies: [],             conditions: [],                    notes: 'No visit in the last 8 months.' },
  ];

  const staff = [
    { id: 's1', name: 'Rohan Gupta',   role: 'Receptionist',    department: 'Front Desk',  phone: '+91 90000 11101', email: 'rohan.gupta@carepointclinic.demo',   status: 'active',   shift: '09:00 – 17:00', joined: '2024-03-11' },
    { id: 's2', name: 'Sneha Verma',   role: 'Nurse',           department: 'General',     phone: '+91 90000 11102', email: 'sneha.verma@carepointclinic.demo',   status: 'active',   shift: '08:30 – 16:30', joined: '2023-11-02' },
    { id: 's3', name: 'Rahul Kumar',   role: 'Receptionist',    department: 'Front Desk',  phone: '+91 90000 11103', email: 'rahul.kumar@carepointclinic.demo',   status: 'active',   shift: '12:00 – 20:00', joined: '2025-01-20' },
    { id: 's4', name: 'Manish Tiwari', role: 'Lab Technician',  department: 'Diagnostics', phone: '+91 90000 11104', email: 'manish.tiwari@carepointclinic.demo', status: 'active',   shift: '09:00 – 17:00', joined: '2024-07-15' },
    { id: 's5', name: 'Ritu Anand',    role: 'Pharmacist',      department: 'Pharmacy',    phone: '+91 90000 11105', email: 'ritu.anand@carepointclinic.demo',    status: 'on_leave', shift: '10:00 – 18:00', joined: '2024-09-01' },
    { id: 's6', name: 'Vinod Kumar',   role: 'Housekeeping',    department: 'Facility',    phone: '+91 90000 11106', email: 'vinod.kumar@carepointclinic.demo',   status: 'active',   shift: '07:00 – 15:00', joined: '2023-05-19' },
  ];

  /** Simple, fictional, non-sensitive medical notes for the demo. */
  const medicalHistory = {
    p1: [
      { date: -35,  title: 'Seasonal allergic rhinitis', detail: 'Antihistamine advised for 5 days. Improved on review.', doctorId: 'd1' },
      { date: -120, title: 'Routine health check',       detail: 'All basic parameters within normal range.',            doctorId: 'd1' },
    ],
    p2: [
      { date: -21,  title: 'Migraine follow-up',         detail: 'Trigger diary reviewed. Continue current plan.',       doctorId: 'd1' },
      { date: -75,  title: 'Migraine — first consult',   detail: 'Advised regular sleep schedule and hydration.',        doctorId: 'd1' },
    ],
    p3: [
      { date: -30,  title: 'Blood pressure review',      detail: 'Readings stable. Medication continued unchanged.',     doctorId: 'd1' },
      { date: -60,  title: 'Blood pressure review',      detail: 'Advised reduced salt intake and daily walk.',          doctorId: 'd1' },
    ],
    p5: [
      { date: -45,  title: 'Diabetes review',            detail: 'Diet plan shared. Quarterly review scheduled.',        doctorId: 'd1' },
    ],
    p7: [
      { date: -42,  title: 'Eczema review',              detail: 'Moisturiser routine advised. Responding well.',        doctorId: 'd3' },
    ],
    p9: [
      { date: -28,  title: 'Joint pain review',          detail: 'Physiotherapy exercises demonstrated.',                doctorId: 'd1' },
    ],
  };

  /* ---- Today's book: 24 appointments across 3 doctors -------------
     12 completed · 1 in progress · 3 waiting · 8 upcoming (confirmed)
     ---------------------------------------------------------------- */
  const todayBook = [
    // Dr. Rahul Sharma — Room 1
    { p: 'p1',  d: 'd1', t: '09:00', s: 'completed',   type: 'Follow-up',    reason: 'Allergy follow-up' },
    { p: 'p2',  d: 'd1', t: '09:15', s: 'completed',   type: 'Consultation', reason: 'Headache' },
    { p: 'p3',  d: 'd1', t: '09:30', s: 'completed',   type: 'Follow-up',    reason: 'BP review' },
    { p: 'p4',  d: 'd1', t: '09:45', s: 'completed',   type: 'Consultation', reason: 'Fever and cold' },
    { p: 'p5',  d: 'd1', t: '10:00', s: 'completed',   type: 'Follow-up',    reason: 'Sugar review' },
    { p: 'p6',  d: 'd1', t: '10:30', s: 'completed',   type: 'Consultation', reason: 'General weakness' },
    { p: 'p8',  d: 'd1', t: '11:00', s: 'completed',   type: 'Consultation', reason: 'Body ache' },
    { p: 'p9',  d: 'd1', t: '11:15', s: 'in_progress', type: 'Follow-up',    reason: 'Joint pain review' },
    { p: 'p10', d: 'd1', t: '11:30', s: 'waiting',     type: 'Consultation', reason: 'Acidity' },
    { p: 'p11', d: 'd1', t: '11:45', s: 'waiting',     type: 'New Visit',    reason: 'First consultation' },
    { p: 'p12', d: 'd1', t: '12:15', s: 'confirmed',   type: 'Consultation', reason: 'General check-up' },
    { p: 'p1',  d: 'd1', t: '12:45', s: 'confirmed',   type: 'Follow-up',    reason: 'Report review' },
    { p: 'p7',  d: 'd1', t: '13:15', s: 'confirmed',   type: 'Consultation', reason: 'Cough' },
    // Dr. Sunita Rao — Room 2
    { p: 'p2',  d: 'd2', t: '09:30', s: 'completed',   type: 'Consultation', reason: 'Child vaccination query' },
    { p: 'p11', d: 'd2', t: '10:00', s: 'completed',   type: 'New Visit',    reason: 'Routine check' },
    { p: 'p4',  d: 'd2', t: '10:30', s: 'completed',   type: 'Follow-up',    reason: 'Nutrition review' },
    { p: 'p6',  d: 'd2', t: '11:00', s: 'completed',   type: 'Consultation', reason: 'Skin rash' },
    { p: 'p8',  d: 'd2', t: '11:30', s: 'waiting',     type: 'Consultation', reason: 'Throat pain' },
    { p: 'p9',  d: 'd2', t: '12:00', s: 'confirmed',   type: 'Follow-up',    reason: 'Vitamin review' },
    { p: 'p12', d: 'd2', t: '12:30', s: 'confirmed',   type: 'Consultation', reason: 'Routine check' },
    // Dr. Vikram Bhatt — Room 3
    { p: 'p3',  d: 'd3', t: '10:00', s: 'completed',   type: 'Consultation', reason: 'Skin allergy' },
    { p: 'p10', d: 'd3', t: '11:30', s: 'confirmed',   type: 'Follow-up',    reason: 'Rash review' },
    { p: 'p5',  d: 'd3', t: '12:00', s: 'confirmed',   type: 'Consultation', reason: 'Hair fall' },
    { p: 'p7',  d: 'd3', t: '12:30', s: 'confirmed',   type: 'Follow-up',    reason: 'Eczema review' },
  ];

  /** Past + upcoming appointments, expressed as day offsets from today. */
  const otherBook = [
    { p: 'p1',  d: 'd1', off: -14, t: '10:30', s: 'completed', type: 'Follow-up',    reason: 'Allergy review' },
    { p: 'p1',  d: 'd1', off: -35, t: '09:30', s: 'completed', type: 'Consultation', reason: 'Sneezing, watery eyes' },
    { p: 'p2',  d: 'd1', off: -21, t: '11:00', s: 'completed', type: 'Follow-up',    reason: 'Migraine review' },
    { p: 'p2',  d: 'd1', off: -30, t: '11:00', s: 'cancelled', type: 'Follow-up',    reason: 'Patient unavailable' },
    { p: 'p3',  d: 'd1', off: -30, t: '09:15', s: 'completed', type: 'Follow-up',    reason: 'BP review' },
    { p: 'p5',  d: 'd1', off: -45, t: '10:00', s: 'completed', type: 'Follow-up',    reason: 'Sugar review' },
    { p: 'p7',  d: 'd3', off: -42, t: '10:30', s: 'completed', type: 'Follow-up',    reason: 'Eczema review' },
    { p: 'p9',  d: 'd1', off: -28, t: '12:00', s: 'completed', type: 'Consultation', reason: 'Joint pain' },
    { p: 'p4',  d: 'd1', off: 1,   t: '09:30', s: 'confirmed', type: 'Consultation', reason: 'Health check-up' },
    { p: 'p3',  d: 'd1', off: 1,   t: '10:00', s: 'confirmed', type: 'Follow-up',    reason: 'BP review' },
    { p: 'p6',  d: 'd2', off: 1,   t: '10:30', s: 'confirmed', type: 'Follow-up',    reason: 'Rash review' },
    { p: 'p8',  d: 'd1', off: 2,   t: '11:00', s: 'confirmed', type: 'Consultation', reason: 'Routine check' },
    { p: 'p11', d: 'd2', off: 3,   t: '10:00', s: 'confirmed', type: 'Follow-up',    reason: 'Review' },
  ];

  /** Invoices for today: ₹12,500 billed · ₹8,000 collected · ₹4,500 pending */
  const todayInvoices = [
    { no: 'INV-1024', p: 'p1',  amount: 500,  paid: 500,  items: [['Consultation fee', 500]] },
    { no: 'INV-1025', p: 'p2',  amount: 750,  paid: 0,    items: [['Consultation fee', 500], ['Dressing', 250]] },
    { no: 'INV-1026', p: 'p3',  amount: 1200, paid: 500,  items: [['Consultation fee', 500], ['Blood pressure profile', 700]] },
    { no: 'INV-1027', p: 'p4',  amount: 900,  paid: 900,  items: [['Consultation fee', 500], ['Basic blood test', 400]] },
    { no: 'INV-1028', p: 'p5',  amount: 1500, paid: 1500, items: [['Consultation fee', 500], ['Sugar profile', 1000]] },
    { no: 'INV-1029', p: 'p6',  amount: 650,  paid: 0,    items: [['Consultation fee', 600], ['Injection charge', 50]] },
    { no: 'INV-1030', p: 'p8',  amount: 2200, paid: 2200, items: [['Consultation fee', 500], ['Full body profile', 1700]] },
    { no: 'INV-1031', p: 'p9',  amount: 1800, paid: 0,    items: [['Consultation fee', 500], ['Vitamin panel', 1300]] },
    { no: 'INV-1032', p: 'p11', amount: 450,  paid: 450,  items: [['Registration', 100], ['Consultation fee', 350]] },
    { no: 'INV-1033', p: 'p10', amount: 1300, paid: 700,  items: [['Consultation fee', 500], ['Procedure charge', 800]] },
    { no: 'INV-1034', p: 'p7',  amount: 1250, paid: 1250, items: [['Consultation fee', 700], ['Skin patch test', 550]] },
  ];

  const pastInvoices = [
    { no: 'INV-0987', p: 'p1',  off: -14, amount: 500,  paid: 500,  items: [['Consultation fee', 500]] },
    { no: 'INV-0942', p: 'p1',  off: -35, amount: 800,  paid: 800,  items: [['Consultation fee', 500], ['Allergy test', 300]] },
    { no: 'INV-0965', p: 'p2',  off: -21, amount: 500,  paid: 500,  items: [['Consultation fee', 500]] },
    { no: 'INV-0951', p: 'p3',  off: -30, amount: 1100, paid: 1100, items: [['Consultation fee', 500], ['ECG', 600]] },
    { no: 'INV-0930', p: 'p5',  off: -45, amount: 1500, paid: 1500, items: [['Consultation fee', 500], ['Sugar profile', 1000]] },
    { no: 'INV-0933', p: 'p7',  off: -42, amount: 900,  paid: 900,  items: [['Consultation fee', 700], ['Ointment', 200]] },
  ];

  const seedNotifications = [
    { title: 'New appointment created', body: 'Deepak Mehta — Today, 12:15 PM',      type: 'appointment', mins: 18,  read: false, link: 'appointments' },
    { title: 'Appointment rescheduled', body: 'Priya Singh moved to 09:15 AM',        type: 'appointment', mins: 55,  read: false, link: 'appointments' },
    { title: 'Payment received',        body: '₹500 from Rahul Kumar — INV-1024',     type: 'billing',     mins: 92,  read: false, link: 'billing' },
    { title: 'Employee checked in',     body: 'Rohan Gupta at 09:02 AM',              type: 'attendance',  mins: 190, read: true,  link: 'attendance' },
    { title: 'New patient registered',  body: 'Pooja Rani added to patient records',  type: 'patient',     mins: 260, read: true,  link: 'patients' },
  ];

  const seedActivity = [
    { text: 'Rahul Kumar checked in.',                     icon: 'user',           tone: 'brand',   mins: 12 },
    { text: "Priya Singh's appointment was rescheduled.",  icon: 'rotate-ccw',     tone: 'info',    mins: 40 },
    { text: 'Payment of ₹500 received from Rahul Kumar.',  icon: 'indian-rupee',   tone: 'success', mins: 68 },
    { text: 'Consultation completed for Arjun Nair.',      icon: 'check-circle',   tone: 'success', mins: 95 },
    { text: 'Rohan Gupta checked in for the day.',         icon: 'clipboard-check',tone: 'brand',   mins: 190 },
  ];

  /* ----------------------------------------------------------------
     The previous six days are generated rather than typed out, so the
     weekly report always shows a working clinic instead of six empty
     bars — whatever day the demo is opened on. The generator is
     deterministic, so the same demo produces the same history.
     ---------------------------------------------------------------- */
  const HISTORY_REASONS = [
    ['Consultation', 'Fever and cold'], ['Consultation', 'Body ache'],
    ['Consultation', 'Cough'], ['Consultation', 'Stomach pain'],
    ['Follow-up', 'BP review'], ['Follow-up', 'Sugar review'],
    ['Follow-up', 'Report review'], ['Follow-up', 'Routine review'],
    ['New Visit', 'First consultation'], ['Consultation', 'Skin rash'],
    ['Consultation', 'Headache'], ['Follow-up', 'Medication review'],
  ];

  const EXTRA_SERVICES = [
    null, null, null,
    ['Basic blood test', 400], ['Dressing', 250], ['Injection charge', 50],
    ['ECG', 600], ['Sugar profile', 1000],
  ];

  /** Small deterministic PRNG so the generated week never shuffles. */
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function generateWeek(today, startIndex) {
    const rand = rng(20260906);
    const appointments = [];
    const invoices = [];
    let n = startIndex;
    let invNo = 700;

    for (let off = -6; off <= -1; off++) {
      const date = Utils.addDays(today, off);
      const key = Utils.weekdayKey(date);

      doctors.forEach((doc) => {
        const win = doc.schedule[key];
        if (!win) return;
        for (let m = Utils.toMinutes(win.start); m < Utils.toMinutes(win.end); m += clinic.slotMinutes) {
          if (rand() > 0.62) continue;                       // ~62% of slots were used
          const patient = patients[Math.floor(rand() * patients.length)];
          const [type, reason] = HISTORY_REASONS[Math.floor(rand() * HISTORY_REASONS.length)];
          const cancelled = rand() < 0.05;                    // a few no-shows, as in real life
          const time = Utils.fromMinutes(m);

          appointments.push({
            id: 'a' + (++n), patientId: patient.id, doctorId: doc.id, date, time,
            duration: clinic.slotMinutes, type, reason,
            status: cancelled ? 'cancelled' : 'completed',
            createdAt: new Date(Date.now() + off * 86400000 - 86400000).toISOString(), notes: '',
          });

          if (cancelled) continue;
          const extra = EXTRA_SERVICES[Math.floor(rand() * EXTRA_SERVICES.length)];
          const items = [{ name: 'Consultation fee', price: doc.fee }];
          if (extra) items.push({ name: extra[0], price: extra[1] });
          const amount = items.reduce((s, it) => s + it.price, 0);
          const unpaid = rand() < 0.12;                       // a little still outstanding
          invoices.push({
            id: 'INV-0' + (++invNo), patientId: patient.id, date, amount,
            paid: unpaid ? 0 : amount, items,
            status: unpaid ? 'pending' : 'paid',
            method: unpaid ? '—' : 'Cash',
          });
        }
      });
    }
    return { appointments, invoices, lastIndex: n };
  }

  /* ================================================================
     4. SEED BUILDER
     ================================================================ */
  function buildSeed() {
    const today = Utils.today();
    let n = 0;
    const appointments = [];

    todayBook.forEach((a) => {
      appointments.push({
        id: 'a' + (++n), patientId: a.p, doctorId: a.d, date: today, time: a.t,
        duration: clinic.slotMinutes, type: a.type, reason: a.reason, status: a.s,
        createdAt: new Date(Date.now() - 86400000).toISOString(), notes: '',
      });
    });

    otherBook.forEach((a) => {
      appointments.push({
        id: 'a' + (++n), patientId: a.p, doctorId: a.d, date: Utils.addDays(today, a.off), time: a.t,
        duration: clinic.slotMinutes, type: a.type, reason: a.reason, status: a.s,
        createdAt: new Date(Date.now() - Math.abs(a.off) * 86400000 - 86400000).toISOString(), notes: '',
      });
    });

    // the generated previous week
    const week = generateWeek(today, n);
    n = week.lastIndex;
    week.appointments.forEach((a) => appointments.push(a));

    const invoices = [];
    week.invoices.forEach((v) => invoices.push(v));
    todayInvoices.forEach((v) => {
      invoices.push({
        id: v.no, patientId: v.p, date: today, amount: v.amount, paid: v.paid,
        items: v.items.map(([name, price]) => ({ name, price })),
        status: v.paid >= v.amount ? 'paid' : v.paid > 0 ? 'partial' : 'pending',
        method: v.paid > 0 ? 'Cash' : '—',
      });
    });
    pastInvoices.forEach((v) => {
      invoices.push({
        id: v.no, patientId: v.p, date: Utils.addDays(today, v.off), amount: v.amount, paid: v.paid,
        items: v.items.map(([name, price]) => ({ name, price })),
        status: v.paid >= v.amount ? 'paid' : v.paid > 0 ? 'partial' : 'pending',
        method: 'Cash',
      });
    });

    const history = [];
    Object.keys(medicalHistory).forEach((pid) => {
      medicalHistory[pid].forEach((h, i) => {
        history.push({
          id: `h_${pid}_${i}`, patientId: pid, date: Utils.addDays(today, h.date),
          title: h.title, detail: h.detail, doctorId: h.doctorId,
        });
      });
    });

    const notifications = seedNotifications.map((x, i) => ({
      id: 'n' + (i + 1), title: x.title, body: x.body, type: x.type, link: x.link,
      read: x.read, at: new Date(Date.now() - x.mins * 60000).toISOString(),
    }));

    const activity = seedActivity.map((x, i) => ({
      id: 'act' + (i + 1), text: x.text, icon: x.icon, tone: x.tone,
      at: new Date(Date.now() - x.mins * 60000).toISOString(),
    }));

    return {
      version: 1,
      seededOn: today,
      clinic: JSON.parse(JSON.stringify(clinic)),
      currentUser: JSON.parse(JSON.stringify(currentUser)),
      doctors: JSON.parse(JSON.stringify(doctors)),
      patients: JSON.parse(JSON.stringify(patients)),
      staff: JSON.parse(JSON.stringify(staff)),
      appointments,
      invoices,
      history,
      notifications,
      activity,
      attendance: {
        settings: { required: true, selfie: true, location: true },
        records: [
          { id: 'at1', staffId: 's1', date: today, checkIn: '09:02', checkOut: null, status: 'present', location: 'Bhagalpur, Bihar' },
          { id: 'at2', staffId: 's2', date: today, checkIn: '08:34', checkOut: null, status: 'present', location: 'Bhagalpur, Bihar' },
          { id: 'at3', staffId: 's4', date: today, checkIn: '09:11', checkOut: null, status: 'present', location: 'Bhagalpur, Bihar' },
          { id: 'at4', staffId: 's6', date: today, checkIn: '07:05', checkOut: null, status: 'present', location: 'Bhagalpur, Bihar' },
          { id: 'at5', staffId: 's5', date: today, checkIn: null,    checkOut: null, status: 'leave',   location: '—' },
        ],
      },
      session: { loggedIn: false },
    };
  }

  /* ================================================================
     5. STORE — localStorage-backed demo state
     ================================================================ */
  const KEY = 'chikitra.demo.v1';
  const listeners = {};

  const Store = {
    state: null,

    load() {
      let saved = null;
      try {
        const raw = global.localStorage.getItem(KEY);
        if (raw) saved = JSON.parse(raw);
      } catch (e) {
        saved = null; // private mode / storage blocked — fall back to memory
      }
      // Re-seed if missing, from an older schema, or seeded on a previous day
      // (keeps "Today" genuinely today whenever the demo is reopened).
      if (!saved || saved.version !== 1 || saved.seededOn !== Utils.today()) {
        this.state = buildSeed();
        if (saved && saved.session) this.state.session = saved.session;
        this.save();
      } else {
        this.state = saved;
      }
      return this.state;
    },

    save() {
      try {
        global.localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (e) { /* storage unavailable — demo still works in memory */ }
      this.emit('change', this.state);
      return this.state;
    },

    reset() {
      const session = this.state && this.state.session;
      this.state = buildSeed();
      if (session) this.state.session = session;
      this.save();
      return this.state;
    },

    on(evt, fn) {
      (listeners[evt] = listeners[evt] || []).push(fn);
    },
    emit(evt, payload) {
      (listeners[evt] || []).forEach((fn) => fn(payload));
    },

    /* ---------- selectors ---------- */
    patient(id)  { return this.state.patients.find((p) => p.id === id); },
    doctor(id)   { return this.state.doctors.find((d) => d.id === id); },
    staffMember(id) { return this.state.staff.find((s) => s.id === id); },
    appointment(id) { return this.state.appointments.find((a) => a.id === id); },
    invoice(id)  { return this.state.invoices.find((v) => v.id === id); },

    appointmentsOn(date, doctorId) {
      return this.state.appointments
        .filter((a) => a.date === date && a.status !== 'cancelled')
        .filter((a) => !doctorId || a.doctorId === doctorId)
        .sort((a, b) => a.time.localeCompare(b.time));
    },

    appointmentsFor(patientId) {
      return this.state.appointments
        .filter((a) => a.patientId === patientId)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    },

    invoicesFor(patientId) {
      return this.state.invoices
        .filter((v) => v.patientId === patientId)
        .sort((a, b) => b.date.localeCompare(a.date));
    },

    lastVisit(patientId) {
      const done = this.state.appointments
        .filter((a) => a.patientId === patientId && a.status === 'completed')
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
      return done.length ? done[0] : null;
    },

    /** Consulting window for a doctor on a date, or null when closed. */
    window(doctorId, date) {
      const doc = this.doctor(doctorId);
      return doc ? doc.schedule[Utils.weekdayKey(date)] || null : null;
    },

    /**
     * Slot grid for a doctor on a date: [{time, booked, appointment}]
     * Free slots come from the consulting window; already-booked times are
     * always included even if they fall outside it, so an appointment can
     * never disappear from a day view because the hours changed.
     */
    slots(doctorId, date) {
      const doc = this.doctor(doctorId);
      if (!doc) return [];
      const win = this.window(doctorId, date);
      const taken = {};
      this.appointmentsOn(date, doctorId).forEach((a) => { taken[a.time] = a; });

      const times = new Set(Object.keys(taken));
      if (win) {
        const step = this.state.clinic.slotMinutes;
        for (let m = Utils.toMinutes(win.start); m < Utils.toMinutes(win.end); m += step) {
          times.add(Utils.fromMinutes(m));
        }
      }
      return Array.from(times).sort().map((time) => ({
        time, booked: !!taken[time], appointment: taken[time] || null,
      }));
    },

    /* ---------- today's numbers (always derived, never hard-coded) ---------- */
    todayStats() {
      const today = Utils.today();
      const list = this.state.appointments.filter((a) => a.date === today && a.status !== 'cancelled');
      const billed = this.state.invoices.filter((v) => v.date === today);
      return {
        total: list.length,
        upcoming: list.filter((a) => a.status === 'confirmed').length,
        waiting: list.filter((a) => a.status === 'waiting').length,
        inProgress: list.filter((a) => a.status === 'in_progress').length,
        completed: list.filter((a) => a.status === 'completed').length,
        revenue: billed.reduce((s, v) => s + v.amount, 0),
        collected: billed.reduce((s, v) => s + v.paid, 0),
        pending: billed.reduce((s, v) => s + (v.amount - v.paid), 0),
      };
    },

    /* ---------- writes ---------- */
    addNotification(title, body, type, link) {
      this.state.notifications.unshift({
        id: Utils.uid('n'), title, body, type: type || 'info', link: link || null,
        read: false, at: new Date().toISOString(),
      });
      this.state.notifications = this.state.notifications.slice(0, 25);
    },

    addActivity(text, iconName, tone) {
      this.state.activity.unshift({
        id: Utils.uid('act'), text, icon: iconName || 'activity',
        tone: tone || 'brand', at: new Date().toISOString(),
      });
      this.state.activity = this.state.activity.slice(0, 20);
    },

    unreadCount() {
      return this.state.notifications.filter((n) => !n.read).length;
    },
  };

  /* ================================================================
     6. EXPORTS
     ================================================================ */
  global.Utils = Utils;
  global.Store = Store;
  global.APPOINTMENT_STATUS = APPOINTMENT_STATUS;
  global.INVOICE_STATUS = INVOICE_STATUS;
  global.DEMO_SEED = { clinic, currentUser, doctors, patients, staff };
})(window);
