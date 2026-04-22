-- Create appointment_services table to support multiple services per appointment
CREATE TABLE public.appointment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id),
  shop_id UUID NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_shop ON public.appointment_services(shop_id);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop members read appointment_services"
ON public.appointment_services
FOR SELECT
USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop members manage appointment_services"
ON public.appointment_services
FOR ALL
USING (shop_id = get_user_shop_id(auth.uid()))
WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Public read appointment_services booking"
ON public.appointment_services
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public insert appointment_services booking"
ON public.appointment_services
FOR INSERT
TO anon
WITH CHECK (true);