-- =====================================================================
-- STORAGE ISOLATION: business_assets bucket
--
-- The original policies (20260302203945) allowed INSERT / UPDATE / DELETE
-- on any object in `business_assets` with no role restriction and no owner
-- check, so ANY caller (including anon) could overwrite or delete another
-- shop's logo.
--
-- New rule: writes require an authenticated user who is a member of the
-- shop whose id is the FIRST PATH SEGMENT of the object name, e.g.
--   <shop_id>/logo-1717171717.png
-- Public READ stays as-is (the bucket is public and logos are embedded in
-- confirmation emails and on the public booking page).
-- =====================================================================

-- Cast helper that never raises on malformed input (object names are
-- arbitrary text, so a bare ::uuid cast inside a policy could error out).
CREATE OR REPLACE FUNCTION public.safe_uuid(_t text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
BEGIN
  RETURN _t::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

DROP POLICY IF EXISTS "Auth upload business assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth update business assets" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete business assets" ON storage.objects;

-- Re-runnable: drop our own policies first so this file can be applied twice.
DROP POLICY IF EXISTS "Shop members upload business assets" ON storage.objects;
DROP POLICY IF EXISTS "Shop members update business assets" ON storage.objects;
DROP POLICY IF EXISTS "Shop members delete business assets" ON storage.objects;

CREATE POLICY "Shop members upload business assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business_assets'
  AND public.is_shop_member(auth.uid(), public.safe_uuid(split_part(name, '/', 1)))
);

CREATE POLICY "Shop members update business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business_assets'
  AND public.is_shop_member(auth.uid(), public.safe_uuid(split_part(name, '/', 1)))
)
WITH CHECK (
  bucket_id = 'business_assets'
  AND public.is_shop_member(auth.uid(), public.safe_uuid(split_part(name, '/', 1)))
);

CREATE POLICY "Shop members delete business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business_assets'
  AND public.is_shop_member(auth.uid(), public.safe_uuid(split_part(name, '/', 1)))
);
