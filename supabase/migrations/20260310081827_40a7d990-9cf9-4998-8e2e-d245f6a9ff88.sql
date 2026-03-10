
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Function to auto-complete past appointments
CREATE OR REPLACE FUNCTION public.auto_complete_past_appointments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.appointments
  SET status = 'Completed', is_paid = true
  WHERE end_time < now()
    AND status IN ('Pending', 'Confirmed');
END;
$$;

-- Ensure the on_appointment_completed trigger exists on appointments table
DROP TRIGGER IF EXISTS trg_appointment_completed ON public.appointments;
CREATE TRIGGER trg_appointment_completed
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.on_appointment_completed();
