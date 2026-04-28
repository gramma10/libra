-- =====================================================================
-- 1. PUBLIC BOOKING ENDPOINTS (replace direct anon access to PII tables)
-- =====================================================================

-- Returns only the time ranges already booked for a shop's staff on a date.
-- No client data, no notes, no PII.
CREATE OR REPLACE FUNCTION public.public_get_booked_slots(
  _shop_slug TEXT,
  _date DATE
)
RETURNS TABLE (
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  staff_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _shop_id UUID;
BEGIN
  SELECT id INTO _shop_id FROM public.shops WHERE slug = _shop_slug LIMIT 1;
  IF _shop_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.start_time, a.end_time, a.staff_id
  FROM public.appointments a
  WHERE a.shop_id = _shop_id
    AND a.status <> 'Cancelled'
    AND a.start_time >= _date::timestamptz
    AND a.start_time < (_date + INTERVAL '1 day')::timestamptz;
END;
$$;

-- Look up a client by phone within ONE shop. Returns minimal fields only.
CREATE OR REPLACE FUNCTION public.public_lookup_client(
  _shop_slug TEXT,
  _phone TEXT,
  _phone_normalized TEXT
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  _shop_id UUID;
BEGIN
  SELECT s.id INTO _shop_id FROM public.shops s WHERE s.slug = _shop_slug LIMIT 1;
  IF _shop_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT c.id, c.first_name, c.last_name, c.email
  FROM public.clients c
  WHERE c.shop_id = _shop_id
    AND (c.phone_mobile = _phone OR c.phone_mobile = _phone_normalized)
  LIMIT 1;
END;
$$;

-- Atomically create/update a client and book an appointment within one shop.
-- Returns the newly created appointment id (or raises on conflict / invalid shop).
CREATE OR REPLACE FUNCTION public.public_create_booking(
  _shop_slug TEXT,
  _service_id UUID,
  _staff_id UUID,
  _start_time TIMESTAMPTZ,
  _end_time TIMESTAMPTZ,
  _first_name TEXT,
  _last_name TEXT,
  _email TEXT,
  _phone TEXT,
  _phone_normalized TEXT
)
RETURNS TABLE (
  appointment_id UUID,
  client_id UUID,
  shop_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id UUID;
  _client_id UUID;
  _appt_id UUID;
BEGIN
  SELECT id INTO _shop_id FROM public.shops WHERE slug = _shop_slug LIMIT 1;
  IF _shop_id IS NULL THEN
    RAISE EXCEPTION 'Shop not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Verify the service belongs to this shop (prevents cross-tenant injection)
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = _service_id AND shop_id = _shop_id) THEN
    RAISE EXCEPTION 'Service does not belong to this shop' USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Verify staff (if provided) belongs to this shop
  IF _staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.staff WHERE id = _staff_id AND shop_id = _shop_id
  ) THEN
    RAISE EXCEPTION 'Staff does not belong to this shop' USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Find or upsert client (scoped to this shop)
  SELECT c.id INTO _client_id
  FROM public.clients c
  WHERE c.shop_id = _shop_id
    AND (c.phone_mobile = _phone OR c.phone_mobile = _phone_normalized)
  LIMIT 1;

  IF _client_id IS NULL THEN
    INSERT INTO public.clients (shop_id, first_name, last_name, phone_mobile, email)
    VALUES (_shop_id, _first_name, COALESCE(_last_name, ''), COALESCE(_phone_normalized, _phone), _email)
    RETURNING id INTO _client_id;
  ELSE
    UPDATE public.clients
    SET first_name = _first_name,
        last_name = COALESCE(_last_name, ''),
        email = _email
    WHERE id = _client_id AND shop_id = _shop_id;
  END IF;

  -- Create the appointment. Exclusion constraint prevents double-booking.
  INSERT INTO public.appointments (shop_id, client_id, service_id, staff_id, start_time, end_time)
  VALUES (_shop_id, _client_id, _service_id, _staff_id, _start_time, _end_time)
  RETURNING id INTO _appt_id;

  RETURN QUERY SELECT _appt_id, _client_id, _shop_id;
END;
$$;

-- Restrict execute to anon + authenticated only (these are the only callers)
REVOKE ALL ON FUNCTION public.public_get_booked_slots(TEXT, DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_lookup_client(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.public_create_booking(TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_booked_slots(TEXT, DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_lookup_client(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_create_booking(TEXT, UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- =====================================================================
-- 2. REMOVE BROAD ANON ACCESS TO PII TABLES
-- =====================================================================

-- appointments: drop all anon policies (replaced by RPCs above)
DROP POLICY IF EXISTS "Public read appointments booking" ON public.appointments;
DROP POLICY IF EXISTS "Public insert appointments booking" ON public.appointments;

-- clients: drop all anon policies (replaced by RPCs above)
DROP POLICY IF EXISTS "Public read clients booking" ON public.clients;
DROP POLICY IF EXISTS "Public insert clients booking" ON public.clients;
DROP POLICY IF EXISTS "Public update clients booking" ON public.clients;

-- appointment_services: drop overly broad anon policies
DROP POLICY IF EXISTS "Public read appointment_services booking" ON public.appointment_services;
DROP POLICY IF EXISTS "Public insert appointment_services booking" ON public.appointment_services;

-- =====================================================================
-- 3. RESTRICT AUTHENTICATED-ONLY POLICIES TO `authenticated` ROLE
--    (was {public} which includes anon — defense in depth)
-- =====================================================================

-- appointments
DROP POLICY IF EXISTS "Shop members read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Shop members manage appointments" ON public.appointments;

CREATE POLICY "Shop members read appointments"
  ON public.appointments
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop members manage appointments"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

-- clients
DROP POLICY IF EXISTS "Shop members read clients" ON public.clients;
DROP POLICY IF EXISTS "Admins managers manage clients" ON public.clients;

CREATE POLICY "Shop members read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins managers manage clients"
  ON public.clients
  FOR ALL
  TO authenticated
  USING (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
  WITH CHECK (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- appointment_services
DROP POLICY IF EXISTS "Shop members read appointment_services" ON public.appointment_services;
DROP POLICY IF EXISTS "Shop members manage appointment_services" ON public.appointment_services;

CREATE POLICY "Shop members read appointment_services"
  ON public.appointment_services
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop members manage appointment_services"
  ON public.appointment_services
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

-- transactions
DROP POLICY IF EXISTS "Shop members read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Shop members manage transactions" ON public.transactions;

CREATE POLICY "Shop members read transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Shop members manage transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()));

-- staff (keep public booking SELECT, lock down management)
DROP POLICY IF EXISTS "Shop members read staff" ON public.staff;
DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;

CREATE POLICY "Shop members read staff"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins manage staff"
  ON public.staff
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- inventory
DROP POLICY IF EXISTS "Shop members read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins managers manage inventory" ON public.inventory;

CREATE POLICY "Shop members read inventory"
  ON public.inventory
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins managers manage inventory"
  ON public.inventory
  FOR ALL
  TO authenticated
  USING (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
  WITH CHECK (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- product_sales
DROP POLICY IF EXISTS "Shop members read product_sales" ON public.product_sales;
DROP POLICY IF EXISTS "Admins managers manage product_sales" ON public.product_sales;

CREATE POLICY "Shop members read product_sales"
  ON public.product_sales
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins managers manage product_sales"
  ON public.product_sales
  FOR ALL
  TO authenticated
  USING (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
  WITH CHECK (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- expenses
DROP POLICY IF EXISTS "Admins manage expenses" ON public.expenses;

CREATE POLICY "Admins manage expenses"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Shop members read expenses"
  ON public.expenses
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

-- services (keep public read for booking widget)
DROP POLICY IF EXISTS "Shop members read services" ON public.services;
DROP POLICY IF EXISTS "Admins manage services" ON public.services;

CREATE POLICY "Shop members read services"
  ON public.services
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins manage services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- business_settings (keep public read for booking widget)
DROP POLICY IF EXISTS "Shop members read settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins manage settings" ON public.business_settings;

CREATE POLICY "Shop members read settings"
  ON public.business_settings
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins manage settings"
  ON public.business_settings
  FOR ALL
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (shop_id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role));

-- shop_members
DROP POLICY IF EXISTS "Members can read own shop members" ON public.shop_members;
DROP POLICY IF EXISTS "Users read own membership" ON public.shop_members;
DROP POLICY IF EXISTS "Admins manage shop members" ON public.shop_members;

CREATE POLICY "Members can read own shop members"
  ON public.shop_members
  FOR SELECT
  TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Users read own membership"
  ON public.shop_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins manage shop members"
  ON public.shop_members
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) AND shop_id = get_user_shop_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND shop_id = get_user_shop_id(auth.uid()));

-- shops (keep public read for slug-based booking, lock down owner mgmt)
DROP POLICY IF EXISTS "Members can read own shop" ON public.shops;
DROP POLICY IF EXISTS "Owners and admins can update shop" ON public.shops;

CREATE POLICY "Members can read own shop"
  ON public.shops
  FOR SELECT
  TO authenticated
  USING (id = get_user_shop_id(auth.uid()));

CREATE POLICY "Owners and admins can update shop"
  ON public.shops
  FOR UPDATE
  TO authenticated
  USING ((owner_id = auth.uid()) OR (id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK ((owner_id = auth.uid()) OR (id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role)));

-- =====================================================================
-- 4. EXPLICIT DENY for anon on the locked-down tables (defense in depth).
--    With no permissive anon policy + RLS enabled, access is already denied,
--    but a restrictive policy makes the intent explicit and protects against
--    accidental future grants.
-- =====================================================================

CREATE POLICY "Deny anon all on appointments"
  ON public.appointments
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on clients"
  ON public.clients
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on appointment_services"
  ON public.appointment_services
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on transactions"
  ON public.transactions
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on inventory"
  ON public.inventory
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on product_sales"
  ON public.product_sales
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on expenses"
  ON public.expenses
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Deny anon all on shop_members"
  ON public.shop_members
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);