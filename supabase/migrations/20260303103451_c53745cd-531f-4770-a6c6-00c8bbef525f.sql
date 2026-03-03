
-- Create enums for expenses
CREATE TYPE public.expense_category AS ENUM ('Rent', 'Electricity', 'Water', 'Products', 'Salaries', 'Marketing', 'Other');
CREATE TYPE public.expense_status AS ENUM ('Paid', 'Pending');

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category expense_category NOT NULL DEFAULT 'Other',
  amount NUMERIC NOT NULL DEFAULT 0,
  status expense_status NOT NULL DEFAULT 'Pending',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Authenticated full access (consistent with other tables)
CREATE POLICY "Authenticated full access"
ON public.expenses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
