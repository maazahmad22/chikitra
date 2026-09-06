# CHIKITRA — Simplifying Clinic Management

**Everything your clinic needs, in one place.**

An interactive product demo of CHIKITRA, a clinic management platform. It is built to
be shown to doctors and clinic owners: every button works, every number updates, and
the whole thing runs in a browser with no server, no database and no sign-up.

> This is a **demo prototype**, not the production product. All data is fictional.
> The clinic (CarePoint Clinic), the doctors, the patients and the payments are made up.

---

## 1. Project overview

The demo answers four questions in about thirty seconds:

| Question | Where it is answered |
|---|---|
| What does CHIKITRA do? | The intro screen (`index.html`) |
| What does my day look like? | Dashboard — 4 numbers and today's schedule |
| Can I actually book and move appointments? | Appointments — 5-step booking, reschedule, status changes |
| Does it handle the rest of the clinic? | Patients, Staff, Attendance, Billing, Reports |

### What you can actually do

- **Book an appointment** through a 5-step flow: patient → doctor → date → time slot → confirm.
  Booked slots are disabled, the new appointment appears in the list, and the dashboard
  numbers change.
- **Move an appointment** — pick a new day, see the free slots for that day, confirm.
- **Change status** — Confirmed → Waiting → In Progress → Completed, or cancel.
- **Add a patient** and open a full profile with Overview / Appointments / Medical History / Billing.
- **Check a staff member in** with a simulated selfie and location step (no real camera, no real GPS).
- **Record a payment** and watch today's collected/pending totals move.
- **Search** across patients, appointments, staff and invoices (Ctrl / ⌘ + K).
- **Reset the demo** back to its original data before your next meeting.

---

## 2. Technology used

| Layer | Choice |
|---|---|
| Markup | HTML5, one file per screen |
| Styling | **Tailwind CSS 3** (real build, not a CDN script) |
| Behaviour | **Vanilla JavaScript** — no framework, no bundler |
| Storage | **localStorage** |
| Icons | Lucide icon paths, inlined as SVG (works offline) |
| Font | Inter, from Google Fonts |

No React, no Vue, no PHP, no MySQL, no Node backend. Opening the HTML file is enough
to run it.

---

## 3. Running the demo

The compiled stylesheet (`assets/css/tailwind.css`) is committed, so the fastest path is:

```
open index.html
```

Double-clicking `index.html` works. A local server is slightly better because some
browsers restrict `localStorage` on `file://` URLs:

```bash
npx serve .          # then open the printed URL
```

### Rebuilding the CSS (only if you edit styles or classes)

```bash
npm install          # once
npm run dev          # watch mode while you work
npm run build        # minified production build
```

`npm run build` reads `src/input.css`, scans the files listed in `tailwind.config.js`,
and writes `assets/css/tailwind.css`.

---

## 4. How the project is structured

```
chikitra-demo/
│
├── index.html                  Intro screen + optional demo login
│
├── pages/                      One file per screen. Each is a thin shell:
│   ├── dashboard.html            <div id="app"></div> plus script tags plus
│   ├── appointments.html         App.init('<page-key>')
│   ├── patients.html
│   ├── patient-profile.html
│   ├── doctors.html
│   ├── staff.html
│   ├── attendance.html
│   ├── billing.html
│   ├── reports.html
│   └── settings.html
│
├── assets/
│   ├── css/tailwind.css        Built output — do not edit by hand
│   ├── js/
│   │   ├── icons.js              Lucide icon paths → icon('bell', 'h-5 w-5')
│   │   ├── data.js               ★ all demo data + the localStorage store
│   │   ├── components.js         Small reusable UI builders (avatar, badge, stat…)
│   │   ├── toast.js              Toast notifications
│   │   ├── modal.js              Modals, slide-overs, confirm dialogs, button loading
│   │   ├── sidebar.js            The app shell: sidebar, header, drawer, notifications
│   │   ├── search.js             Global search
│   │   ├── appointments.js       Appointments page, booking, reschedule, status
│   │   ├── patients.js           Patient list, add patient, patient profile
│   │   ├── billing.js            Invoices and payments
│   │   ├── attendance.js         Attendance settings + simulated check-in
│   │   └── app.js                Bootstrap + dashboard, doctors, staff, reports, settings
│   └── images/
│       ├── logo/                 Brand mark
│       └── avatars/              (intentionally empty — see the note in that folder)
│
├── src/input.css               Tailwind source + the reusable component classes
├── tailwind.config.js          Brand colours, fonts, shadows, animations
├── postcss.config.js
├── package.json
└── README.md
```

### Why the pages are almost empty

Each page in `pages/` contains only `<div id="app"></div>` and a list of scripts. The
sidebar, header, mobile drawer and page body are all rendered by JavaScript
(`sidebar.js` → `Layout.mount()`). That means the navigation exists in exactly one
place: change a menu item once and every screen picks it up. There is no build step
or templating language involved.

Adding a screen takes three steps:

1. Copy any file in `pages/` and change the `App.init('…')` key at the bottom.
2. Add a title and subtitle for that key to `PAGES` in `sidebar.js`.
3. Add a render function for that key to `renderers` in `app.js`.

---

## 5. How Tailwind CSS is used

Tailwind utilities do the layout, spacing, colour, typography and responsive work
directly in the markup. Two things are lifted out of the markup:

**Brand tokens** live in `tailwind.config.js`, so colours are named rather than
hard-coded:

```js
brand: { 500: '#14B8A6', 600: '#0F766E', 700: '#115E59' },
canvas: '#F8FAFC',   ink: '#1E293B',   muted: '#64748B',   line: '#E5E7EB',
success: '#22C55E',  warning: '#F59E0B', danger: '#EF4444', info: '#3B82F6',
```

Use them as `bg-brand-600`, `text-muted`, `border-line`, and so on.

**Repeated patterns** live in `src/input.css` under `@layer components`, built from
`@apply`. This keeps class strings readable in the JavaScript that generates markup:

`.btn-primary` `.btn-secondary` `.btn-ghost` `.btn-danger` · `.card` `.card-pad` ·
`.input` `.select` `.textarea` `.label` · `.badge-success` `.badge-warning`
`.badge-danger` `.badge-info` `.badge-brand` `.badge-neutral` · `.nav-link` ·
`.th` `.td` `.row-link` · `.tab` · `.slot` · `.toggle` · `.skeleton` · `.step-dot`

Everything else is plain utilities. There are no hand-written media queries — responsive
behaviour comes from `sm:` `md:` `lg:` `xl:` prefixes.

> **Important:** most of the markup is produced by JavaScript, so
> `tailwind.config.js` scans `./assets/js/**/*.js` as well as the HTML. If you add a
> Tailwind class inside a `.js` file, rebuild the CSS or it will not exist.

### Responsive approach

Mobile is designed, not shrunk:

- The sidebar becomes a slide-out drawer with a backdrop.
- Tables (patients, staff, billing) are replaced by cards — not squeezed into a scroll box.
- Forms collapse to a single column.
- Buttons keep a 42–48px minimum height so they stay tappable.
- The header search collapses into an icon that opens a full-screen search sheet.

---

## 6. How dummy data works

**Everything is in `assets/js/data.js`.** That file is the one place to edit if you want
to re-skin the demo for a different clinic.

```js
const clinic = {
  name: 'CarePoint Clinic',
  phone: '+91 98765 43210',
  city: 'Bhagalpur',
  state: 'Bihar',
  country: 'India',
  slotMinutes: 15,      // controls the whole booking grid
};

const currentUser = {
  name: 'Dr. Rahul Sharma',
  role: 'Doctor',
  specialization: 'General Physician',
};
```

Below those you will find `doctors`, `patients`, `staff`, `medicalHistory`, `todayBook`
(today's 24 appointments), `otherBook` (past and future appointments), `todayInvoices`,
`pastInvoices`, `seedNotifications` and `seedActivity`.

Three things are worth knowing:

**Dates are relative, so the demo never goes stale.** Nothing stores a literal date.
`todayBook` is placed on whatever today is, and `otherBook` uses day offsets
(`off: -14` means fourteen days ago). Open the demo in six months and it is still
"today".

**The dashboard numbers are calculated, not typed.** `24 / 8 / 3 / ₹12,500` come from
`Store.todayStats()`, which counts the actual appointment and invoice records. Book an
appointment and the 24 becomes 25 — because it really is counting.

**A booked appointment is always visible.** Free slots come from the doctor's
consulting hours, but any already-booked time is shown even if it falls outside those
hours, so an appointment can never vanish from a day view.

**The previous six days are generated, not typed.** `generateWeek()` fills the last
week with a realistic book — roughly 16–29 appointments a day, mostly completed, a few
cancellations, and matching invoices — so the Reports page shows a working clinic
instead of six empty bars. It runs off a fixed seed, so the same demo always produces
the same history, and it never touches today's numbers.

### Changing the data

- **Rename the clinic or doctor:** edit `clinic` and `currentUser`, then click
  *Reset Demo Data* (or edit them live on the Settings page).
- **Add a patient:** add an object to `patients` with a unique `id`.
- **Add an appointment for today:** add a line to `todayBook` —
  `{ p: 'p4', d: 'd1', t: '10:15', s: 'confirmed', type: 'Follow-up', reason: 'BP review' }`
  where `p` is a patient id, `d` a doctor id, `t` a 24-hour time and `s` a status.
- **Change consulting hours:** edit `schedule` on the doctor. The booking grid,
  the "Available" rows and the Doctors page all follow it automatically.
- **Change slot length:** set `clinic.slotMinutes` to 10, 20, 30…

After editing `data.js`, reload and click **Reset Demo Data** so the saved copy is
rebuilt from your new seed.

---

## 7. How localStorage works

On first load the seed is copied into `localStorage` under the key
**`chikitra.demo.v1`**. From then on that copy is the live demo state, and every change
is written straight back to it:

- new appointments and reschedules
- appointment status changes
- new and edited patients
- payments recorded against invoices
- attendance settings and check-ins / check-outs
- notifications, read state, and the activity feed
- clinic and doctor details edited in Settings

So you can book an appointment on the Appointments page, walk to the Dashboard, and see
the count go up — the pages are separate HTML files sharing one store.

The store re-seeds itself in three situations: the key is missing, it was written by an
older version of the demo, or it was seeded on an **earlier calendar day**. That last
rule is what keeps "Today" genuinely today whenever you reopen the demo.

If `localStorage` is unavailable (private browsing, blocked site data), the demo still
runs — the state just lives in memory for that session instead.

### Resetting the demo

**Settings → Demo data → Reset Demo Data**, or the profile menu in the top-right corner.
A confirmation dialog appears first; confirming restores the original CarePoint Clinic
data and reloads the page.

Worth doing before every live demo, so you always start from the same clean 24
appointments.

---

## 8. Accessibility notes

- Status is never communicated by colour alone — every badge carries a text label,
  and most carry an icon.
- All interactive elements have visible focus rings.
- Modals and slide-overs trap focus, close on `Escape`, and return focus where it came from.
- Icon-only buttons carry `aria-label`; the toggles use `role="switch"` with `aria-checked`.
- Body text stays at readable sizes, and tap targets keep a comfortable minimum height.

---

## 9. Known limits of this demo

Deliberate, so nobody is surprised in front of a doctor:

- No real login. Any email and password opens the demo.
- No real camera or GPS in the attendance flow — both steps are simulated.
- Printing an invoice shows a toast rather than a print dialog.
- Reports cover a simple 7-day summary, not full analytics.
- Data lives in one browser. It is not shared between devices or people.
