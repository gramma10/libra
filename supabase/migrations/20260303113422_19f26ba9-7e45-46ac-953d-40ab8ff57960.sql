
CREATE TABLE public.product_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON public.product_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
