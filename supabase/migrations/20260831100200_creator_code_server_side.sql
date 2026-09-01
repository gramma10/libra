-- =====================================================================
-- CREATOR CODE: move the "who may create a shop" check out of the browser.
--
-- Before this migration the code was a plain constant in
-- src/pages/OnboardingPage.tsx, visible to anyone reading the JS bundle,
-- and public.create_shop(text, text) enforced nothing at all — so any
-- signed-in user could create unlimited tenants by calling the RPC directly.
--
-- Now: codes live hashed in public.creator_codes (no RLS policy at all, so
-- PostgREST can never read it), and create_shop validates the code itself.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.creator_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash  text NOT NULL,
  label      text NOT NULL DEFAULT '',
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on with ZERO policies => unreachable through the API for every role.
-- Only SECURITY DEFINER functions below can read it.
ALTER TABLE public.creator_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.creator_codes FROM PUBLIC, anon, authenticated;

-- Seed the code that was previously hard-coded in the frontend so existing
-- onboarding keeps working unchanged. Rotate it with:
--   INSERT INTO public.creator_codes (code_hash, label)
--   VALUES (extensions.crypt('<new code>', extensions.gen_salt('bf')), 'rotated');
--   UPDATE public.creator_codes SET is_active = false WHERE label = 'legacy-frontend-constant';
INSERT INTO public.creator_codes (code_hash, label)
SELECT extensions.crypt('patata@@1938', extensions.gen_salt('bf')), 'legacy-frontend-constant'
WHERE NOT EXISTS (
  SELECT 1 FROM public.creator_codes WHERE label = 'legacy-frontend-constant'
);

-- ---------------------------------------------------------------------
-- Replace create_shop. The 2-arg version MUST be dropped, otherwise it
-- survives as an overload and remains callable without a code.
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_shop(text, text);

CREATE OR REPLACE FUNCTION public.create_shop(
  _name         text,
  _slug         text,
  _creator_code text,
  _address      text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_id uuid;
  _uid     uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _creator_code IS NULL OR btrim(_creator_code) = '' THEN
    RAISE EXCEPTION 'Invalid creator code' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.creator_codes cc
    WHERE cc.is_active
      AND cc.code_hash = extensions.crypt(_creator_code, cc.code_hash)
  ) THEN
    RAISE EXCEPTION 'Invalid creator code' USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO public.shops (name, slug, owner_id, address)
  VALUES (_name, _slug, _uid, NULLIF(btrim(COALESCE(_address, '')), ''))
  RETURNING id INTO _shop_id;

  INSERT INTO public.shop_members (user_id, shop_id, role)
  VALUES (_uid, _shop_id, 'admin');

  INSERT INTO public.business_settings (shop_id, shop_name)
  VALUES (_shop_id, _name);

  RETURN _shop_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_shop(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_shop(text, text, text, text) TO authenticated;
