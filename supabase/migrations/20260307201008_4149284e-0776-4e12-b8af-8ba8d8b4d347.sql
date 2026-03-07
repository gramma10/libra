
-- Create a trigger function that calls the edge function via pg_net
CREATE OR REPLACE FUNCTION public.notify_appointment_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payload jsonb;
  _url text;
BEGIN
  _payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'client_id', NEW.client_id,
      'shop_id', NEW.shop_id,
      'staff_id', NEW.staff_id,
      'service_id', NEW.service_id,
      'start_time', NEW.start_time,
      'end_time', NEW.end_time,
      'status', NEW.status
    )
  );

  _url := current_setting('app.settings.supabase_url', true);
  IF _url IS NULL OR _url = '' THEN
    _url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1);
  END IF;

  PERFORM net.http_post(
    url := _url || '/functions/v1/send-appointment-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1)
    ),
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS trg_send_appointment_email ON public.appointments;
CREATE TRIGGER trg_send_appointment_email
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_email();
