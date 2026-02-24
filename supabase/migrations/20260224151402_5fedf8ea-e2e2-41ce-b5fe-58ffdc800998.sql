
-- Enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'No-Show', 'Completed');

-- Enum for payment method
CREATE TYPE public.payment_method AS ENUM ('Cash', 'Card', 'Revolut', 'Stripe');

-- Enum for theme style
CREATE TYPE public.theme_style AS ENUM ('Minimal', 'Industrial', 'Modern', 'Classic');

-- 1. Clients
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_mobile TEXT NOT NULL,
  email TEXT,
  birthday DATE,
  nameday_date DATE,
  tech_notes TEXT DEFAULT '',
  personal_preferences TEXT DEFAULT '',
  last_visit TIMESTAMPTZ,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category_color TEXT NOT NULL DEFAULT '#000000',
  required_products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Inventory
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  sku TEXT DEFAULT '',
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  retail_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  staff_id UUID,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'Pending',
  internal_notes TEXT DEFAULT '',
  is_paid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'Cash',
  amount_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  staff_commission DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Business Settings
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL DEFAULT 'My Salon',
  logo_url TEXT DEFAULT '',
  brand_color_primary TEXT NOT NULL DEFAULT '#000000',
  theme_style theme_style NOT NULL DEFAULT 'Minimal',
  google_review_url TEXT DEFAULT '',
  sms_provider_api TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

-- RLS: Allow authenticated users full access (single-salon model)
CREATE POLICY "Authenticated full access" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON public.business_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for services and business_settings (for the booking widget)
CREATE POLICY "Public read services" ON public.services FOR SELECT TO anon USING (true);
CREATE POLICY "Public read settings" ON public.business_settings FOR SELECT TO anon USING (true);

-- Allow anon to insert appointments (booking widget)
CREATE POLICY "Public insert appointments" ON public.appointments FOR INSERT TO anon WITH CHECK (true);

-- ==========================================
-- TRIGGER: On appointment completed → update client total_spent + deduct inventory
-- ==========================================

CREATE OR REPLACE FUNCTION public.on_appointment_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _service RECORD;
  _product JSONB;
  _product_id UUID;
  _qty INTEGER;
BEGIN
  -- Only fire when status changes TO 'Completed'
  IF NEW.status = 'Completed' AND (OLD.status IS DISTINCT FROM 'Completed') THEN
    -- Get the service
    SELECT * INTO _service FROM public.services WHERE id = NEW.service_id;

    IF _service IS NOT NULL THEN
      -- 1. Update client total_spent
      UPDATE public.clients
      SET total_spent = total_spent + _service.price,
          last_visit = now()
      WHERE id = NEW.client_id;

      -- 2. Deduct inventory based on required_products
      -- Expected format: [{"product_id": "uuid", "quantity": 1}, ...]
      IF _service.required_products IS NOT NULL AND jsonb_array_length(_service.required_products) > 0 THEN
        FOR _product IN SELECT * FROM jsonb_array_elements(_service.required_products)
        LOOP
          _product_id := (_product.value->>'product_id')::UUID;
          _qty := COALESCE((_product.value->>'quantity')::INTEGER, 1);

          UPDATE public.inventory
          SET current_stock = GREATEST(current_stock - _qty, 0)
          WHERE id = _product_id;
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appointment_completed
AFTER UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.on_appointment_completed();
