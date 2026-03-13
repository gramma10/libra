

## Add English / Greek Language Toggle

### Approach
Create a lightweight i18n system using React Context — no external library needed. A `LanguageProvider` will hold the current locale (`en` | `el`) and provide a `t()` translation function. A toggle button in the sidebar and on the auth page will switch between languages.

### What will be built

1. **Translation files** — `src/i18n/en.ts` and `src/i18n/el.ts` containing all UI strings organized by section (sidebar, calendar, clients, services, staff, settings, auth, booking widget, etc.)

2. **Language context** — `src/hooks/useLanguage.tsx` with:
   - `LanguageProvider` wrapping the app
   - `useLanguage()` hook returning `{ language, setLanguage, t }`
   - Persists selection to `localStorage`

3. **Language toggle button** — A small flag/globe button:
   - In **DashboardLayout sidebar** (bottom section, near sign-out)
   - On **AuthPage** (top-right corner)
   - Clicking toggles between EN ↔ EL

4. **Replace hardcoded strings** across all pages and components:
   - Sidebar labels (Calendar, Clients, Services, Employees, etc.)
   - Page titles and descriptions
   - Button labels (Save, Cancel, New Booking, Sign In, etc.)
   - Form labels and placeholders
   - Toast messages
   - Calendar date formatting (locale parameter: `"en-US"` → `language === "el" ? "el-GR" : "en-US"`)
   - Booking widget (public-facing)

### Files affected
- **New**: `src/i18n/en.ts`, `src/i18n/el.ts`, `src/hooks/useLanguage.tsx`
- **Modified**: `src/App.tsx` (wrap with LanguageProvider), `src/components/DashboardLayout.tsx`, `src/pages/AuthPage.tsx`, `src/pages/CalendarPage.tsx`, `src/pages/ClientsPage.tsx`, `src/pages/ServicesPage.tsx`, `src/pages/StaffPage.tsx`, `src/pages/InventoryPage.tsx`, `src/pages/ExpensesPage.tsx`, `src/pages/ReportsPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/MyStatsPage.tsx`, `src/pages/BookingWidget.tsx`, `src/pages/OnboardingPage.tsx`, `src/components/calendar/CalendarHeader.tsx`, `src/components/calendar/NewBookingDialog.tsx`, `src/components/calendar/EditBookingDialog.tsx`, and other calendar/component files

### Technical details
- Translation keys will be flat dot-notation strings: `t("sidebar.calendar")`, `t("auth.signIn")`
- Date locale strings (`toLocaleDateString`, `toLocaleString`) will use the language context to pass `"el-GR"` or `"en-US"`
- No new dependencies required

