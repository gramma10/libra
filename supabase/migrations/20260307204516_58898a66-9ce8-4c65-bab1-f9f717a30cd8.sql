DROP TRIGGER IF EXISTS trg_send_appointment_email ON public.appointments;
DROP FUNCTION IF EXISTS public.notify_appointment_email();