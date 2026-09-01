-- =====================================================================
-- FRANCHISE VIEW — RLS supports multi-shop admins
--
-- The previous policies used get_user_shop_id(auth.uid()), which returns a
-- single shop via LIMIT 1. That breaks for users who belong to 2+ shops.
-- Replace every shop-membership predicate with row-level membership checks
-- so a user with multiple shop_members rows can read/write data in any of
-- their shops.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Membership predicates
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_shop_member(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_members
    WHERE user_id = _user_id AND shop_id = _shop_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_shop_admin(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_members
    WHERE user_id = _user_id AND shop_id = _shop_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_shop_admin_or_manager(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_members
    WHERE user_id = _user_id AND shop_id = _shop_id AND role IN ('admin','manager')
  )
$$;

-- ---------------------------------------------------------------------
-- 2. Rewrite policies — read membership per row
-- ---------------------------------------------------------------------

-- shops
DROP POLICY IF EXISTS "Members can read own shop" ON public.shops;
DROP POLICY IF EXISTS "Owners and admins can update shop" ON public.shops;

CREATE POLICY "Members can read own shop"
  ON public.shops FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), id));

CREATE POLICY "Owners and admins can update shop"
  ON public.shops FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_shop_admin(auth.uid(), id))
  WITH CHECK (owner_id = auth.uid() OR public.is_shop_admin(auth.uid(), id));

-- shop_members
DROP POLICY IF EXISTS "Members can read own shop members" ON public.shop_members;
DROP POLICY IF EXISTS "Admins manage shop members" ON public.shop_members;

CREATE POLICY "Members can read own shop members"
  ON public.shop_members FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins manage shop members"
  ON public.shop_members FOR ALL TO authenticated
  USING (public.is_shop_admin(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));

-- invitations
DROP POLICY IF EXISTS "Admins manage invitations" ON public.invitations;

CREATE POLICY "Admins manage invitations"
  ON public.invitations FOR ALL TO authenticated
  USING (public.is_shop_admin(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));

-- staff
DROP POLICY IF EXISTS "Shop members read staff" ON public.staff;
DROP POLICY IF EXISTS "Admins manage staff" ON public.staff;

CREATE POLICY "Shop members read staff"
  ON public.staff FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins manage staff"
  ON public.staff FOR ALL TO authenticated
  USING (public.is_shop_admin(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));

-- services
DROP POLICY IF EXISTS "Shop members read services" ON public.services;
DROP POLICY IF EXISTS "Admins manage services" ON public.services;

CREATE POLICY "Shop members read services"
  ON public.services FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins manage services"
  ON public.services FOR ALL TO authenticated
  USING (public.is_shop_admin(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));

-- inventory
DROP POLICY IF EXISTS "Shop members read inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins managers manage inventory" ON public.inventory;

CREATE POLICY "Shop members read inventory"
  ON public.inventory FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins managers manage inventory"
  ON public.inventory FOR ALL TO authenticated
  USING (public.is_shop_admin_or_manager(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin_or_manager(auth.uid(), shop_id));

-- appointments
DROP POLICY IF EXISTS "Shop members read appointments" ON public.appointments;
DROP POLICY IF EXISTS "Shop members manage appointments" ON public.appointments;

CREATE POLICY "Shop members read appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members manage appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- appointment_services
DROP POLICY IF EXISTS "Shop members read appointment_services" ON public.appointment_services;
DROP POLICY IF EXISTS "Shop members manage appointment_services" ON public.appointment_services;

CREATE POLICY "Shop members read appointment_services"
  ON public.appointment_services FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members manage appointment_services"
  ON public.appointment_services FOR ALL TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- expenses
DROP POLICY IF EXISTS "Shop members read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins manage expenses" ON public.expenses;

CREATE POLICY "Shop members read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.is_shop_admin(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));

-- clients
DROP POLICY IF EXISTS "Shop members read clients" ON public.clients;
DROP POLICY IF EXISTS "Admins managers manage clients" ON public.clients;

CREATE POLICY "Shop members read clients"
  ON public.clients FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins managers manage clients"
  ON public.clients FOR ALL TO authenticated
  USING (public.is_shop_admin_or_manager(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin_or_manager(auth.uid(), shop_id));

-- business_settings
DROP POLICY IF EXISTS "Shop members read settings" ON public.business_settings;
DROP POLICY IF EXISTS "Admins manage settings" ON public.business_settings;

CREATE POLICY "Shop members read settings"
  ON public.business_settings FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins manage settings"
  ON public.business_settings FOR ALL TO authenticated
  USING (public.is_shop_admin(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin(auth.uid(), shop_id));

-- product_sales
DROP POLICY IF EXISTS "Shop members read product_sales" ON public.product_sales;
DROP POLICY IF EXISTS "Admins managers manage product_sales" ON public.product_sales;

CREATE POLICY "Shop members read product_sales"
  ON public.product_sales FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins managers manage product_sales"
  ON public.product_sales FOR ALL TO authenticated
  USING (public.is_shop_admin_or_manager(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin_or_manager(auth.uid(), shop_id));

-- transactions
DROP POLICY IF EXISTS "Shop members read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Shop members manage transactions" ON public.transactions;

CREATE POLICY "Shop members read transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Shop members manage transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_member(auth.uid(), shop_id));

-- notifications
DROP POLICY IF EXISTS "Shop members read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins managers update notifications" ON public.notifications;

CREATE POLICY "Shop members read notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_shop_member(auth.uid(), shop_id));

CREATE POLICY "Admins managers update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_shop_admin_or_manager(auth.uid(), shop_id))
  WITH CHECK (public.is_shop_admin_or_manager(auth.uid(), shop_id));
