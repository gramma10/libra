-- Required for GiST exclusion constraints on UUID + tstzrange
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop if a previous version exists, then add the exclusion constraint.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    shop_id  WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status <> 'Cancelled' AND staff_id IS NOT NULL);

-- Supporting index for overlap lookups by staff + time
CREATE INDEX IF NOT EXISTS idx_appointments_staff_time
  ON public.appointments (staff_id, start_time, end_time)
  WHERE status <> 'Cancelled';