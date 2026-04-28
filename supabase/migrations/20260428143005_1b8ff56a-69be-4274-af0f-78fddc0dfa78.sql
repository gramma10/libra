-- =========================================================
-- 1. CHECK CONSTRAINTS: non-negative monetary / quantity values
-- =========================================================

-- Services: price >= 0, duration > 0
ALTER TABLE public.services
  ADD CONSTRAINT services_price_non_negative CHECK (price >= 0),
  ADD CONSTRAINT services_duration_positive CHECK (duration > 0);

-- Appointment services
ALTER TABLE public.appointment_services
  ADD CONSTRAINT appt_services_price_non_negative CHECK (price >= 0),
  ADD CONSTRAINT appt_services_duration_non_negative CHECK (duration >= 0);

-- Inventory: prices and stock non-negative
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_cost_price_non_negative CHECK (cost_price >= 0),
  ADD CONSTRAINT inventory_retail_price_non_negative CHECK (retail_price >= 0),
  ADD CONSTRAINT inventory_current_stock_non_negative CHECK (current_stock >= 0),
  ADD CONSTRAINT inventory_min_stock_non_negative CHECK (min_stock_level >= 0);

-- Product sales: positive quantity, non-negative amounts
ALTER TABLE public.product_sales
  ADD CONSTRAINT product_sales_quantity_positive CHECK (quantity > 0),
  ADD CONSTRAINT product_sales_unit_price_non_negative CHECK (unit_price >= 0),
  ADD CONSTRAINT product_sales_total_non_negative CHECK (total_amount >= 0);

-- Expenses: positive amount
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_amount_positive CHECK (amount > 0);

-- Transactions: non-negative monetary amounts
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_total_non_negative CHECK (amount_total >= 0),
  ADD CONSTRAINT transactions_staff_commission_non_negative CHECK (staff_commission >= 0);

-- Staff commission rate sane (0 - 1 expected as decimal, or 0-100 if percent — allow 0..100 to be safe)
ALTER TABLE public.staff
  ADD CONSTRAINT staff_commission_rate_range CHECK (commission_rate >= 0 AND commission_rate <= 100);

-- Appointments: end_time after start_time
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_time_order CHECK (end_time > start_time);

-- =========================================================
-- 2. FOREIGN KEYS — referential integrity
-- (Use ON DELETE RESTRICT for protected refs, SET NULL where safe, CASCADE for child rows)
-- =========================================================

-- shop_members -> shops (cascade if shop deleted)
ALTER TABLE public.shop_members
  ADD CONSTRAINT shop_members_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- business_settings -> shops
ALTER TABLE public.business_settings
  ADD CONSTRAINT business_settings_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- staff -> shops
ALTER TABLE public.staff
  ADD CONSTRAINT staff_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- services -> shops
ALTER TABLE public.services
  ADD CONSTRAINT services_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- inventory -> shops
ALTER TABLE public.inventory
  ADD CONSTRAINT inventory_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- clients -> shops
ALTER TABLE public.clients
  ADD CONSTRAINT clients_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- expenses -> shops
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;

-- product_sales -> shops, inventory
ALTER TABLE public.product_sales
  ADD CONSTRAINT product_sales_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  ADD CONSTRAINT product_sales_inventory_fk
    FOREIGN KEY (inventory_id) REFERENCES public.inventory(id) ON DELETE RESTRICT;

-- invitations -> shops, staff
ALTER TABLE public.invitations
  ADD CONSTRAINT invitations_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  ADD CONSTRAINT invitations_staff_fk
    FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

-- appointments -> shops, clients, staff, services
-- Service deletion is BLOCKED via trigger below (only when future appointments exist).
-- Past appointments should be preserved if a service is removed; therefore SET NULL on service.
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  ADD CONSTRAINT appointments_client_fk
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ADD CONSTRAINT appointments_staff_fk
    FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE SET NULL,
  ADD CONSTRAINT appointments_service_fk
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

-- appointment_services -> appointments, services, shops
ALTER TABLE public.appointment_services
  ADD CONSTRAINT appt_services_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  ADD CONSTRAINT appt_services_appointment_fk
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE,
  ADD CONSTRAINT appt_services_service_fk
    FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE RESTRICT;

-- transactions -> shops, appointments
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_shop_fk
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE,
  ADD CONSTRAINT transactions_appointment_fk
    FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE RESTRICT;

-- =========================================================
-- 3. SOFT-DELETE SAFETY: block deleting a service used by FUTURE appointments
-- =========================================================
CREATE OR REPLACE FUNCTION public.prevent_service_delete_if_future_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _future_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _future_count
  FROM public.appointments
  WHERE service_id = OLD.id
    AND end_time > now()
    AND status IN ('Pending', 'Confirmed');

  IF _future_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete service: % future appointment(s) still reference it. Cancel or reassign them first.', _future_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Same check for appointment_services line items in the future
  SELECT COUNT(*) INTO _future_count
  FROM public.appointment_services aps
  JOIN public.appointments a ON a.id = aps.appointment_id
  WHERE aps.service_id = OLD.id
    AND a.end_time > now()
    AND a.status IN ('Pending', 'Confirmed');

  IF _future_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete service: % future appointment line-item(s) still reference it.', _future_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_service_delete ON public.services;
CREATE TRIGGER trg_prevent_service_delete
BEFORE DELETE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.prevent_service_delete_if_future_appointments();

-- =========================================================
-- 4. SOFT-DELETE SAFETY: block deleting a staff member with FUTURE appointments
-- =========================================================
CREATE OR REPLACE FUNCTION public.prevent_staff_delete_if_future_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _future_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _future_count
  FROM public.appointments
  WHERE staff_id = OLD.id
    AND end_time > now()
    AND status IN ('Pending', 'Confirmed');

  IF _future_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete staff: % future appointment(s) still assigned. Reassign or cancel them first.', _future_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_staff_delete ON public.staff;
CREATE TRIGGER trg_prevent_staff_delete
BEFORE DELETE ON public.staff
FOR EACH ROW
EXECUTE FUNCTION public.prevent_staff_delete_if_future_appointments();

-- =========================================================
-- 5. SOFT-DELETE SAFETY: block deleting a client with FUTURE appointments
-- (FK is RESTRICT, but emit a friendlier error.)
-- =========================================================
CREATE OR REPLACE FUNCTION public.prevent_client_delete_if_future_appointments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _future_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO _future_count
  FROM public.appointments
  WHERE client_id = OLD.id
    AND end_time > now()
    AND status IN ('Pending', 'Confirmed');

  IF _future_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete client: % future appointment(s) booked. Cancel them first.', _future_count
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_delete ON public.clients;
CREATE TRIGGER trg_prevent_client_delete
BEFORE DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_delete_if_future_appointments();