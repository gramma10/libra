

## Plan: Booking Widget Barber Selection, Time Slot Availability, and Clickable Appointments

### Three Features

**1. Barber Selection in Online Booking Widget (`BookingWidget.tsx`)**

Add a new "barber" step between "service" and "date" in the booking flow:
- Flow becomes: Service -> Barber -> Date -> Time -> Info -> Confirm
- Fetch active staff from the database on mount
- Display barber cards with name and role
- Store `selectedStaff` and include `staff_id` in the appointment insert
- Show selected barber name in the confirmation summary

**2. Time Slot Availability in Booking Widget (`BookingWidget.tsx`)**

When the user picks a date (and has already selected a barber + service):
- Fetch existing appointments for that barber on that date from the database
- For each TIME_SLOT, check if booking a service of the selected duration would overlap with any existing appointment for that staff member
- Disable (grey out, non-clickable) any time slots that conflict
- Show a visual indicator like "Booked" or reduced opacity + cursor-not-allowed

**3. Clickable/Editable Appointments in Calendar DayView (`DayView.tsx` + new `EditBookingDialog.tsx`)**

When an appointment block is clicked in the calendar:
- Open a new `EditBookingDialog` component (similar structure to `NewBookingDialog`)
- Pre-populate all fields: client info (read-only or editable), service, staff, time, status, internal notes
- Allow changing: service, staff, time, status (Pending/Confirmed/Completed/Cancelled/No-Show), internal notes, is_paid toggle
- Allow deleting the appointment
- On save, update the appointment record and refresh the calendar

### Files to Create
- `src/components/calendar/EditBookingDialog.tsx` -- Edit/view dialog for existing appointments

### Files to Modify
- `src/pages/BookingWidget.tsx` -- Add barber step, fetch staff, fetch appointments for availability, disable booked slots
- `src/components/calendar/DayView.tsx` -- Add `onAppointmentClick` callback prop, attach it to appointment blocks
- `src/pages/CalendarPage.tsx` -- Wire up `EditBookingDialog`, pass appointment click handler, manage edit dialog state

### No Database Changes Required
All tables and columns needed already exist (staff, appointments with staff_id, status enum, etc.).

### Technical Details

**Booking Widget flow change:**
```text
Current:  service -> date -> time -> info -> confirm
New:      service -> barber -> date -> time -> info -> confirm
```

**Availability check query:**
```typescript
supabase.from("appointments")
  .select("start_time, end_time")
  .eq("staff_id", selectedStaff.id)
  .gte("start_time", dayStart.toISOString())
  .lte("start_time", dayEnd.toISOString())
```

Then for each time slot, check overlap: a slot is unavailable if any existing appointment's `[start, end)` range overlaps with the proposed `[slotStart, slotStart + duration)`.

**DayView appointment click:** Add an `onAppointmentClick: (appointment: any) => void` prop. Each appointment block gets `onClick={() => onAppointmentClick(appt)}`.

**EditBookingDialog:** Uses the same phone-lookup pattern as `NewBookingDialog` but starts pre-filled. Includes a status dropdown with all enum values, an internal notes textarea, is_paid checkbox, and a delete button with confirmation.

