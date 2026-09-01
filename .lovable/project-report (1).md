# Salon Management Platform — Analytical Project Report

*Prepared for a business audience. All technical concepts are explained in plain language.*

---

## 1. Executive Summary

This project is a **complete, multi-tenant business management platform for salons, barbershops, and beauty studios**. A single deployed application serves many independent shops — each shop has its own staff, clients, calendar, inventory, finances, and public online-booking page, fully isolated from every other shop on the platform.

It combines, in one place, what most salon owners today juggle across 4–5 separate tools:

- A **Fresha-style appointment calendar** for the front desk.
- A **public online booking widget** that customers use from their phones.
- A **Client CRM** with spending history, notes, and preferences.
- **Inventory and expense tracking** that feed directly into financial reports.
- An **automatic Net Profit engine** with charts.
- **SMS appointment reminders** and **email confirmations**, sent automatically.
- A **personal performance dashboard** for each staff member.
- Full **English / Greek** translation, optimized for the Greek market (Europe/Athens timezone, Greek SMS provider).

The product is published and live, runs on Lovable Cloud, and is built with a strong emphasis on data isolation, security, and zero-friction daily use.

---

## 2. Product Overview

### What it is
A web app accessible from any modern browser (desktop, tablet, phone). Each shop owner signs up, creates their shop, configures their services and staff, and immediately gets:

- A private back-office (calendar, CRM, inventory, reports, settings).
- A public booking page at a shareable link (`/book/your-shop-name`) that customers can use without creating an account.

### Who it is for
- **Shop owners** — get full visibility into bookings, money, stock, and staff performance.
- **Front-desk managers** — manage the daily calendar, clients, and inventory.
- **Stylists / staff** — see their own day and their personal stats and commissions.
- **End customers** — book online in under a minute, with no signup.

### Core value
- **One source of truth** for the entire business.
- **Automation** of the small repetitive tasks (reminders, confirmations, profit calculations, low-stock alerts, marking past appointments complete).
- **Mobile-first** so the team can work from a phone behind the counter.
- **Multilingual and timezone-correct** for Greek-speaking markets.

---

## 3. User Roles & Access

The platform uses a **3-tier role system**, enforced both in the interface and in the database.

| Role | Typical user | What they can do |
|---|---|---|
| **Admin** | Owner | Everything: shop settings, branding, staff & services, expenses, inventory, all financial reports, all bookings. |
| **Manager** | Front-desk manager | Daily operations: calendar, all clients, inventory, sales, bookings. Cannot edit core financial settings or expenses. |
| **Staff** | Stylist / barber | Own calendar, take bookings, view own performance and commissions. Cannot edit financials, inventory, or other staff. |

### Onboarding
- New shops require a **Creator Code** to be created (controls who can spin up new tenants on the platform).
- Staff accounts are **created directly by the admin** — no email invite links. The new staff member receives a temporary password and is forced to change it on first login.

### Login
- Email + password authentication on the `/auth` page.
- A central route guard ensures unauthenticated visitors never see internal pages.

---

## 4. Core Modules

### 4.1 Calendar & Scheduler
The heart of the product. Available views:

- **Day view** — vertical timeline of every staff column, drag-and-drop to move bookings.
- **3-day view** — compact multi-day overview.
- **Week view** — full week, ideal for planning.
- **Month view** — high-level density.

Click any empty slot to create a booking. Click any booking to view, edit, complete, mark as no-show, or cancel. Bookings snap to **15-minute slots**, and the system **prevents double-booking** the same staff member for overlapping times — guaranteed at the database level, not just in the interface.

### 4.2 Online Booking Widget (Public)
A public, mobile-first booking page lives at `https://<your-app>/book/<shop-slug>`. Customers:

1. Pick a service.
2. Pick a staff member (or "anyone available" — the system auto-assigns).
3. Pick a date (within a rolling 30-day window) and a free time slot.
4. Enter their name, phone, and email.
5. Confirm.

The shop's branding (logo, colors, hero image) is applied automatically. A confirmation email is sent immediately, and an SMS reminder is scheduled.

The widget never has direct access to client or appointment data — it only calls **secure server-side functions** that validate every input. This means an attacker cannot craft a request to read another shop's data through the booking page.

### 4.3 Client CRM
Every booking automatically creates or updates a client record (matched by phone number, scoped to that shop only). For each client the system tracks:

- Contact details (mobile, email, birthday, name day).
- **Lifetime spent** (auto-calculated from realized revenue).
- **Last visit** date.
- Free-text **personal preferences** and **technical notes** (e.g., color formula).
- Full appointment history.

The CRM page provides search, filters, sortable columns, and CSV export. Calculations like LTV are computed locally for instant filtering performance.

### 4.4 Services & Staff Management
- **Services**: name, duration, price, category color (used to color-code calendar entries), and an optional list of products required (linked to inventory).
- **Staff**: name, contact, role, **commission rate**, active/inactive flag, and an optional link to a login user.

### 4.5 Inventory & Product Sales
- Track every product with cost price, retail price, current stock, minimum stock level, and SKU.
- **Restocking** automatically creates a corresponding expense entry (so cost of goods is reflected in profit).
- **Retail sales** through the "Sell Product" dialog reduce stock and create revenue entries.
- The system scans inventory in the background and raises **low-stock notifications** when items fall below their minimum.

### 4.6 Expenses & Financial Reports
- Categorized expense tracking (salaries, rent, supplies, restocking, other).
- Recurring expenses are supported.
- The **Reports page** is a full financial dashboard:
  - Revenue, expenses, **Net Profit**.
  - Charts (Recharts library) — revenue over time, revenue by service, payment method split.
  - **Daily AI summary** — a short narrative summary of yesterday's performance generated by the Lovable AI gateway.
- The Net Profit engine only counts **realized revenue** (paid, completed appointments + product sales), and subtracts all expenses in the date range — no double counting from restocks.

### 4.7 Staff "My Stats" Dashboard
Each staff member has a private page showing **their own** numbers only:
- Appointments completed, revenue generated, commissions earned, top services.
- Strict isolation: a staff member cannot see another staff member's stats.

### 4.8 Notifications
A dedicated in-app notifications table, scoped per shop. Used today for **low-stock alerts** with deduplication (one alert per product per day) and severity escalation (`critical` when stock hits zero). Built to be extended to other event types later.

### 4.9 Business Profile, Branding & Theme Customizer
- Shop name, logo upload, address, Google review URL.
- **Operating hours grid** per day of the week (open/close + closed flag), stored as JSON.
- **SMS configuration**: enable toggle, sender ID, provider API.
- **Theme customizer** — pick primary color, background, text color, font, hero image; all changes preview live and apply to the public booking widget.

### 4.10 Internationalization
- Full **English and Greek** translation via a React context (3-module pattern: shared / dashboard / booking).
- Language toggle persists across sessions.
- All dates, times, and numbers respect the **Europe/Athens** timezone by default.

---

## 5. Automated Background Operations

The platform does meaningful work **even when no one is logged in**.

| Job | Frequency | What it does |
|---|---|---|
| **SMS reminders** | Every 15 minutes | Sends reminders for appointments 50–70 minutes away via Apifon (Greek SMS provider). Up to 3 retries with exponential backoff (5, 15, 45 min). Honors each shop's SMS-enabled toggle. |
| **Email confirmations** | On booking | Sent immediately via Resend when a booking is created. |
| **Auto-completion** | Hourly | Marks past appointments as completed and paid if the shop has not done so manually. |
| **Low-stock scan** | Daily | Generates one in-app notification per product that is below its minimum stock, deduplicated per day. |
| **Daily revenue summary** | Daily | Computes yesterday's totals; powers the AI summary on the Reports page. |
| **Stale-retry reset** | Periodic | Resets any reminder retries that got stuck so they get one last chance. |

All of these run as scheduled tasks inside the database (`pg_cron`) and as serverless edge functions. Failure handling is deterministic and tested.

---

## 6. Security & Multi-Tenancy

This is one of the strongest aspects of the project.

- **Strict tenant isolation**: every important table carries a `shop_id` column. **Row Level Security** policies in the database make it physically impossible for a logged-in user from Shop A to read or modify any row belonging to Shop B — even if the application code had a bug.
- **Anonymous lockdown**: the public booking widget connects with the anonymous role, which has **zero direct access** to clients, appointments, or inventory. It can only call a small set of carefully-validated server functions.
- **Role-based restrictions**: Staff cannot insert expenses, inventory, or other staff — even in their own shop.
- **Concurrency-safe bookings**: a database-level guarantee prevents two parallel requests from booking the same staff member for the same time slot.
- **Automated cross-tenant test suite**: the project ships with an integration test that creates two real shops, three roles each, and tries every conceivable cross-tenant data-bleed attack, asserting they all fail.

---

## 7. Technology Stack

| Layer | Choice | Why it matters |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript | Modern, fast, type-safe. |
| UI | Tailwind CSS + shadcn-ui + Radix primitives | Consistent, accessible components. |
| Charts | Recharts | Financial visualizations. |
| Backend | Lovable Cloud (managed Postgres + Auth + Edge Functions + Storage) | No separate infra to manage. |
| Scheduled jobs | `pg_cron` inside the database | Reliable, deterministic. |
| AI | Lovable AI Gateway (Gemini / GPT models) | Daily revenue summaries, no extra API key. |
| SMS | Apifon | Greek-market SMS delivery. |
| Email | Resend | Transactional confirmations. |
| Testing | Vitest + Supabase JS client | Unit, RBAC, and background-jobs suites. |

---

## 8. Data Model Snapshot

The database has 14 main tables, all (except auth-internal tables) isolated by `shop_id`.

| Table | What it holds |
|---|---|
| `shops` | One row per business: name, slug, owner, theme. |
| `shop_members` | Which user belongs to which shop, with role. |
| `user_roles` | Role assignments (admin / manager / staff). |
| `business_settings` | Per-shop config: name, logo, hours, SMS settings. |
| `staff` | Staff members of a shop, with commission rate. |
| `services` | Services offered, with duration, price, color. |
| `clients` | Customer records, scoped per shop. |
| `appointments` | Bookings, with reminder retry tracking. |
| `appointment_services` | Line items for multi-service bookings. |
| `inventory` | Products with stock and price info. |
| `product_sales` | Retail sales of inventory. |
| `expenses` | Categorized expenses, with recurrence. |
| `transactions` | Payment records linked to appointments. |
| `notifications` | In-app alerts (e.g., low stock), deduplicated. |

---

## 9. Quality & Testing

The project includes three independent test suites:

1. **Unit tests** (`src/test/**`) — components and utilities.
2. **RBAC integration tests** (`src/test/rbac/**`) — live tests against the real backend that seed two shops with three roles each and verify cross-tenant isolation, role enforcement, anonymous lockdown, and resistance to forged inputs in the public booking flow.
3. **Background-jobs tests** (`src/test/jobs/**`) — verify low-stock deduplication, severity escalation, the SMS reminder time window, and the retry / backoff logic.

---

## 10. Design System

A deliberate **minimalist, Fresha-/Apple-inspired aesthetic**:

- Light background, generous spacing, rounded corners (`rounded-xl` / `rounded-2xl`), subtle glassmorphism.
- Typography: **Inter / Geist** — never serif.
- Centralized color tokens (HSL) in the design system, so re-theming a single shop or the whole platform is straightforward.
- **Responsive**: mobile uses bottom drawers and vertical stacking; tables scroll horizontally on small screens; the calendar and booking widget are mobile-first.

---

## 11. Operational Defaults & Conventions

- **Timezone**: Europe/Athens by default; dates extracted from the device's local clock to avoid UTC drift.
- **Booking grid**: 15-minute slots.
- **Booking horizon**: customers can book up to 30 days ahead.
- **Operating hours**: enforced — slots outside open hours are not offered.
- **Client identity**: phone-first. New bookings upsert clients by mobile number, scoped to the shop. Email is mandatory on the public widget.

---

## 12. Deployment

- Hosted on Lovable Cloud.
- **Preview URL**: `https://id-preview--b15bf064-008a-4e43-a823-18a48d0d83f6.lovable.app`
- **Published URL**: `https://style-stage-system.lovable.app`
- Edge functions deploy automatically with every change — no manual release step.

---

## 13. Strengths & Notable Choices

- **Security-first architecture.** Multi-tenant isolation is enforced at the database, with an automated test suite that actively tries to break it.
- **Truly multi-tenant SaaS shape**, not a single-tenant app retrofitted.
- **Automation that genuinely saves time**: reminders, email confirmations, auto-completion, low-stock alerts, AI daily summary.
- **One unified financial engine** that prevents the most common salon-software bug: double-counting between restocks, sales, and appointments.
- **Localized for the Greek market** (language, timezone, SMS provider) without losing English support.
- **Mobile-first** in the parts that matter most (calendar and public booking).

---

## 14. Potential Next Steps (neutral, not recommendations to act on now)

- A **notifications inbox UI** to surface the existing low-stock alerts (the data layer is already built).
- **Customer accounts** for the public booking widget (today bookings are guest-only).
- **Loyalty / repeat-visit rewards** layered on top of the existing CRM data.
- **Multi-location** support for a single owner (today, one user belongs to one shop).
- An **owner-level analytics view** comparing performance across staff and time ranges in more depth.

---

*End of report.*
