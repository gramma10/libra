
-- =============================================
-- MULTI-TENANT SaaS MIGRATION
-- =============================================

-- 1. CREATE SHOPS TABLE
CREATE TABLE public.shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Salon',
  slug text UNIQUE NOT NULL,
  address text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 2. CREATE SHOP_MEMBERS TABLE (replaces user_roles for shop context)
CREATE TABLE public.shop_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, shop_id)
);
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;

-- 3. CREATE INVITATIONS TABLE
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  invite_code text UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- 4. ADD shop_id TO ALL EXISTING TABLES (nullable first)
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.services ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.inventory ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.appointments ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.expenses ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.clients ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.business_settings ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.product_sales ADD COLUMN shop_id uuid REFERENCES public.shops(id);
ALTER TABLE public.transactions ADD COLUMN shop_id uuid REFERENCES public.shops(id);

-- 5. CREATE DEFAULT SHOP & MIGRATE EXISTING DATA
INSERT INTO public.shops (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'My Salon', 'my-salon');

UPDATE public.staff SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.services SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.inventory SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.appointments SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.expenses SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.clients SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.business_settings SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.product_sales SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;
UPDATE public.transactions SET shop_id = '00000000-0000-0000-0000-000000000001' WHERE shop_id IS NULL;

-- Make NOT NULL after data migration
ALTER TABLE public.staff ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.services ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.appointments ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.product_sales ALTER COLUMN shop_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN shop_id SET NOT NULL;

-- 6. MIGRATE user_roles → shop_members
INSERT INTO public.shop_members (user_id, shop_id, role)
SELECT user_id, '00000000-0000-0000-0000-000000000001', role
FROM public.user_roles
ON CONFLICT DO NOTHING;

-- Set shop owner
UPDATE public.shops SET owner_id = (
  SELECT user_id FROM public.shop_members
  WHERE shop_id = '00000000-0000-0000-0000-000000000001' AND role = 'admin'
  LIMIT 1
) WHERE id = '00000000-0000-0000-0000-000000000001';

-- 7. SECURITY DEFINER FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_shop_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM public.shop_members WHERE user_id = _user_id LIMIT 1
$$;

-- Update has_role to use shop_members
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_members
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.shop_members WHERE user_id = _user_id LIMIT 1
$$;

-- Shop creation helper (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_shop(_name text, _slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id uuid;
BEGIN
  INSERT INTO public.shops (name, slug, owner_id)
  VALUES (_name, _slug, auth.uid())
  RETURNING id INTO _shop_id;

  INSERT INTO public.shop_members (user_id, shop_id, role)
  VALUES (auth.uid(), _shop_id, 'admin');

  INSERT INTO public.business_settings (shop_id, shop_name)
  VALUES (_shop_id, _name);

  RETURN _shop_id;
END;
$$;

-- Invitation acceptance helper (bypasses RLS)
CREATE OR REPLACE FUNCTION public.accept_invitation(_invite_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv RECORD;
BEGIN
  SELECT * INTO _inv FROM public.invitations
  WHERE invite_code = _invite_code AND status = 'pending' AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  INSERT INTO public.shop_members (user_id, shop_id, role)
  VALUES (auth.uid(), _inv.shop_id, 'staff')
  ON CONFLICT (user_id, shop_id) DO NOTHING;

  UPDATE public.staff SET user_id = auth.uid() WHERE id = _inv.staff_id;
  UPDATE public.invitations SET status = 'accepted' WHERE id = _inv.id;

  RETURN jsonb_build_object('shop_id', _inv.shop_id, 'staff_id', _inv.staff_id);
END;
$$;

-- 8. DROP OLD RLS POLICIES
DROP POLICY IF EXISTS "Admins full access to staff" ON public.staff;
DROP POLICY IF EXISTS "Authenticated can read staff" ON public.staff;
DROP POLICY IF EXISTS "Public read staff" ON public.staff;

DROP POLICY IF EXISTS "Authenticated full access" ON public.services;
DROP POLICY IF EXISTS "Public read services" ON public.services;

DROP POLICY IF EXISTS "Authenticated full access" ON public.inventory;

DROP POLICY IF EXISTS "Authenticated full access" ON public.appointments;
DROP POLICY IF EXISTS "Public insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public read appointments" ON public.appointments;

DROP POLICY IF EXISTS "Admins full access to expenses" ON public.expenses;

DROP POLICY IF EXISTS "Authenticated full access" ON public.clients;
DROP POLICY IF EXISTS "Public insert clients" ON public.clients;
DROP POLICY IF EXISTS "Public read clients" ON public.clients;
DROP POLICY IF EXISTS "Public update clients" ON public.clients;

DROP POLICY IF EXISTS "Authenticated full access" ON public.business_settings;
DROP POLICY IF EXISTS "Public read settings" ON public.business_settings;

DROP POLICY IF EXISTS "Authenticated full access" ON public.product_sales;
DROP POLICY IF EXISTS "Authenticated full access" ON public.transactions;

-- 9. NEW TENANT-ISOLATED RLS POLICIES

-- SHOPS
CREATE POLICY "Members can read own shop" ON public.shops FOR SELECT
  USING (id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Owners can update shop" ON public.shops FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Auth users can create shops" ON public.shops FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "Public can read shops by slug" ON public.shops FOR SELECT
  TO anon USING (true);

-- SHOP_MEMBERS
CREATE POLICY "Members can read own shop members" ON public.shop_members FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Users read own membership" ON public.shop_members FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Admins manage shop members" ON public.shop_members FOR ALL
  USING (public.has_role(auth.uid(), 'admin') AND shop_id = public.get_user_shop_id(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND shop_id = public.get_user_shop_id(auth.uid()));

-- INVITATIONS
CREATE POLICY "Admins manage invitations" ON public.invitations FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read valid invitations" ON public.invitations FOR SELECT
  TO anon USING (status = 'pending' AND expires_at > now());
CREATE POLICY "Auth read valid invitations" ON public.invitations FOR SELECT
  TO authenticated USING (status = 'pending' AND expires_at > now());

-- STAFF
CREATE POLICY "Shop members read staff" ON public.staff FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Admins manage staff" ON public.staff FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read staff for booking" ON public.staff FOR SELECT
  TO anon USING (true);

-- SERVICES
CREATE POLICY "Shop members read services" ON public.services FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Admins manage services" ON public.services FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read services for booking" ON public.services FOR SELECT
  TO anon USING (true);

-- INVENTORY
CREATE POLICY "Shop members read inventory" ON public.inventory FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Admins managers manage inventory" ON public.inventory FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- APPOINTMENTS
CREATE POLICY "Shop members read appointments" ON public.appointments FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Shop members manage appointments" ON public.appointments FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Public insert appointments booking" ON public.appointments FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "Public read appointments booking" ON public.appointments FOR SELECT
  TO anon USING (true);

-- EXPENSES
CREATE POLICY "Admins manage expenses" ON public.expenses FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- CLIENTS
CREATE POLICY "Shop members read clients" ON public.clients FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Admins managers manage clients" ON public.clients FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));
CREATE POLICY "Public insert clients booking" ON public.clients FOR INSERT
  TO anon WITH CHECK (true);
CREATE POLICY "Public read clients booking" ON public.clients FOR SELECT
  TO anon USING (true);
CREATE POLICY "Public update clients booking" ON public.clients FOR UPDATE
  TO anon USING (true) WITH CHECK (true);

-- BUSINESS_SETTINGS
CREATE POLICY "Shop members read settings" ON public.business_settings FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Admins manage settings" ON public.business_settings FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public read settings booking" ON public.business_settings FOR SELECT
  TO anon USING (true);

-- PRODUCT_SALES
CREATE POLICY "Shop members read product_sales" ON public.product_sales FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Admins managers manage product_sales" ON public.product_sales FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));

-- TRANSACTIONS
CREATE POLICY "Shop members read transactions" ON public.transactions FOR SELECT
  USING (shop_id = public.get_user_shop_id(auth.uid()));
CREATE POLICY "Shop members manage transactions" ON public.transactions FOR ALL
  USING (shop_id = public.get_user_shop_id(auth.uid()))
  WITH CHECK (shop_id = public.get_user_shop_id(auth.uid()));
