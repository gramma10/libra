
-- Add operating_hours JSONB column to business_settings
ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS operating_hours jsonb DEFAULT '[
  {"day":"Monday","open":"09:00","close":"20:00","isClosed":false},
  {"day":"Tuesday","open":"09:00","close":"20:00","isClosed":false},
  {"day":"Wednesday","open":"09:00","close":"20:00","isClosed":false},
  {"day":"Thursday","open":"09:00","close":"20:00","isClosed":false},
  {"day":"Friday","open":"09:00","close":"20:00","isClosed":false},
  {"day":"Saturday","open":"09:00","close":"17:00","isClosed":false},
  {"day":"Sunday","open":"09:00","close":"17:00","isClosed":true}
]'::jsonb;

-- Create storage bucket for business assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('business_assets', 'business_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to business_assets bucket
CREATE POLICY "Public read business assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'business_assets');

-- Allow authenticated users to upload to business_assets
CREATE POLICY "Auth upload business assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'business_assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Auth update business assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'business_assets')
WITH CHECK (bucket_id = 'business_assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Auth delete business assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'business_assets');
