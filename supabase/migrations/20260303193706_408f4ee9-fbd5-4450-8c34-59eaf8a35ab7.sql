-- Drop the existing update policy that only checks owner_id
DROP POLICY IF EXISTS "Owners can update shop" ON public.shops;

-- Create a new policy that allows both owners and admins to update their shop
CREATE POLICY "Owners and admins can update shop"
ON public.shops
FOR UPDATE
USING (
  owner_id = auth.uid() 
  OR (id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
)
WITH CHECK (
  owner_id = auth.uid() 
  OR (id = get_user_shop_id(auth.uid()) AND has_role(auth.uid(), 'admin'::app_role))
);