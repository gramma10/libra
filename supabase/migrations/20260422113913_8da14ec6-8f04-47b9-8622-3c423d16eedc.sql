-- Add recurrence support to expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS recurrence_interval text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;

-- Validation: only allow specific recurrence values
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_recurrence_interval_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_recurrence_interval_check
  CHECK (recurrence_interval IN ('none','monthly','bimonthly','quarterly','yearly'));

CREATE INDEX IF NOT EXISTS idx_expenses_recurrence_parent ON public.expenses(recurrence_parent_id);
CREATE INDEX IF NOT EXISTS idx_expenses_recurrence_interval ON public.expenses(recurrence_interval) WHERE recurrence_interval <> 'none';