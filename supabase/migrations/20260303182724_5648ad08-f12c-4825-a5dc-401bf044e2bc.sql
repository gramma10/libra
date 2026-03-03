
ALTER TABLE public.shops
ADD COLUMN theme_settings jsonb DEFAULT '{"primary_color": "#000000", "background_color": "#ffffff", "text_color": "#333333", "font_family": "Inter, sans-serif", "border_radius": "0.5rem", "hero_bg_type": "none", "hero_bg_value": ""}'::jsonb;
