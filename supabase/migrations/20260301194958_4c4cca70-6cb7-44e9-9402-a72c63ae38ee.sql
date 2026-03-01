-- Allow public booking widget to insert new clients
CREATE POLICY "Public insert clients" ON public.clients FOR INSERT WITH CHECK (true);

-- Allow public booking widget to update client email
CREATE POLICY "Public update clients" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public booking widget to read clients for phone lookup
CREATE POLICY "Public read clients" ON public.clients FOR SELECT USING (true);