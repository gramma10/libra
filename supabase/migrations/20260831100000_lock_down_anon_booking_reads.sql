-- =====================================================================
-- TENANT ISOLATION: remove blanket anon SELECT access to shops / staff /
-- services / business_settings.
--
-- Before this migration the public booking widget relied on four policies
-- with `USING (true)`, which let ANY anonymous caller read those tables for
-- EVERY shop on the platform (staff phone numbers, emails, commission_rate,
-- per-shop SMS sender configuration, ...).
--
-- Replacement: one SECURITY DEFINER RPC that resolves a shop by slug and
-- returns ONLY the fields the booking widget needs, for that ONE shop.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.public_get_booking_bootstrap(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id uuid;
  _shop_name text;
  _shop_slug text;
  _theme jsonb;
BEGIN
  SELECT s.id, s.name, s.slug, s.theme_settings
    INTO _shop_id, _shop_name, _shop_slug, _theme
  FROM public.shops s
  WHERE s.slug = _slug
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'shop', jsonb_build_object(
      'id', _shop_id,
      'name', _shop_name,
      'slug', _shop_slug,
      'theme_settings', _theme
    ),
    'settings', (
      SELECT jsonb_build_object(
        'logo_url', bs.logo_url,
        'shop_name', bs.shop_name,
        'operating_hours', bs.operating_hours
      )
      FROM public.business_settings bs
      WHERE bs.shop_id = _shop_id
      LIMIT 1
    ),
    'services', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'service_name', s.service_name,
          'duration', s.duration,
          'price', s.price,
          'category_color', s.category_color
        ) ORDER BY s.service_name
      )
      FROM public.services s
      WHERE s.shop_id = _shop_id
    ), '[]'::jsonb),
    'staff', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', st.id,
          'first_name', st.first_name,
          'last_name', st.last_name,
          'role', st.role
        ) ORDER BY st.first_name
      )
      FROM public.staff st
      WHERE st.shop_id = _shop_id
        AND st.is_active = true
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_booking_bootstrap(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_get_booking_bootstrap(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Drop the blanket anon read policies. The `authenticated` shop-member
-- policies created in 20260507120000_franchise_rls.sql are untouched.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read staff for booking"   ON public.staff;
DROP POLICY IF EXISTS "Public read services for booking" ON public.services;
DROP POLICY IF EXISTS "Public read settings booking"     ON public.business_settings;
DROP POLICY IF EXISTS "Public can read shops by slug"    ON public.shops;

-- ---------------------------------------------------------------------
-- Explicit deny for anon (defense in depth, same pattern as
-- 20260428143610). With no permissive anon policy these tables are already
-- closed; the RESTRICTIVE policy makes that intent explicit and survives an
-- accidental future GRANT. Only the `anon` role is affected.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Deny anon all on shops" ON public.shops;
CREATE POLICY "Deny anon all on shops"
  ON public.shops AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon all on staff" ON public.staff;
CREATE POLICY "Deny anon all on staff"
  ON public.staff AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon all on services" ON public.services;
CREATE POLICY "Deny anon all on services"
  ON public.services AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "Deny anon all on business_settings" ON public.business_settings;
CREATE POLICY "Deny anon all on business_settings"
  ON public.business_settings AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);
