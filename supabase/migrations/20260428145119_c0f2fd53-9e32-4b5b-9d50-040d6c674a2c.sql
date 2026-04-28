-- 1. Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_severity_chk CHECK (severity IN ('info','warning','critical')),
  CONSTRAINT notifications_dedupe_unique UNIQUE (shop_id, dedupe_key)
);

CREATE INDEX idx_notifications_shop_unread ON public.notifications (shop_id, is_read, is_dismissed, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon all on notifications"
  ON public.notifications AS RESTRICTIVE FOR ALL TO anon
  USING (false) WITH CHECK (false);

CREATE POLICY "Shop members read notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (shop_id = get_user_shop_id(auth.uid()));

CREATE POLICY "Admins managers update notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  )
  WITH CHECK (
    shop_id = get_user_shop_id(auth.uid())
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- 2. Retry tracking on appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reminder_last_error TEXT,
  ADD COLUMN IF NOT EXISTS reminder_next_retry_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_reminder_window
  ON public.appointments (start_time, reminder_sent, status)
  WHERE reminder_sent = false;

-- 3. Low-stock scan function
CREATE OR REPLACE FUNCTION public.scan_low_stock_and_notify()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today TEXT := to_char(now() AT TIME ZONE 'Europe/Athens', 'YYYY-MM-DD');
  _inserted INTEGER := 0;
  _row RECORD;
  _key TEXT;
BEGIN
  FOR _row IN
    SELECT id, shop_id, product_name, current_stock, min_stock_level
    FROM public.inventory
    WHERE min_stock_level > 0
      AND current_stock <= min_stock_level
  LOOP
    _key := 'low_stock:' || _row.id::text || ':' || _today;

    INSERT INTO public.notifications
      (shop_id, type, severity, title, body, payload, dedupe_key)
    VALUES (
      _row.shop_id,
      'low_stock',
      CASE WHEN _row.current_stock = 0 THEN 'critical' ELSE 'warning' END,
      'Low stock: ' || _row.product_name,
      _row.product_name || ' is at ' || _row.current_stock || ' (min ' || _row.min_stock_level || ')',
      jsonb_build_object(
        'inventory_id', _row.id,
        'current_stock', _row.current_stock,
        'min_stock_level', _row.min_stock_level
      ),
      _key
    )
    ON CONFLICT (shop_id, dedupe_key) DO UPDATE
      SET payload = EXCLUDED.payload,
          severity = EXCLUDED.severity,
          body = EXCLUDED.body,
          updated_at = now();

    _inserted := _inserted + 1;
  END LOOP;

  RETURN _inserted;
END;
$$;

-- 4. Reset stale reminder retries (older than 1 day, never succeeded)
CREATE OR REPLACE FUNCTION public.reset_stale_reminder_retries()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  UPDATE public.appointments
  SET reminder_attempts = 0,
      reminder_last_error = NULL,
      reminder_next_retry_at = NULL
  WHERE reminder_sent = false
    AND reminder_attempts > 0
    AND start_time < now() - INTERVAL '1 day';
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

-- 5. Cron schedules
SELECT cron.schedule(
  'scan-low-stock-hourly',
  '5 * * * *',
  $$ SELECT public.scan_low_stock_and_notify(); $$
);

SELECT cron.schedule(
  'reset-stale-reminder-retries-daily',
  '15 3 * * *',
  $$ SELECT public.reset_stale_reminder_retries(); $$
);
