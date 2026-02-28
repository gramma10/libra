
-- Add reminder_sent to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS reminder_sent boolean NOT NULL DEFAULT false;

-- Add SMS fields to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS apifon_sender_id text DEFAULT '';
