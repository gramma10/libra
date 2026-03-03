export interface ThemeSettings {
  primary_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  border_radius: string;
  hero_bg_type: string;
  hero_bg_value: string;
}

export const DEFAULT_THEME: ThemeSettings = {
  primary_color: "#000000",
  background_color: "#ffffff",
  text_color: "#333333",
  font_family: "Inter, sans-serif",
  border_radius: "0.5rem",
  hero_bg_type: "none",
  hero_bg_value: "",
};

export const THEME_PRESETS: { name: string; theme: ThemeSettings }[] = [
  {
    name: "Minimal White",
    theme: {
      primary_color: "#111111",
      background_color: "#ffffff",
      text_color: "#333333",
      font_family: "Inter, sans-serif",
      border_radius: "0.75rem",
      hero_bg_type: "none",
      hero_bg_value: "",
    },
  },
  {
    name: "Midnight Luxury",
    theme: {
      primary_color: "#c9a96e",
      background_color: "#0f0f0f",
      text_color: "#f0ece2",
      font_family: "'Playfair Display', serif",
      border_radius: "0.25rem",
      hero_bg_type: "none",
      hero_bg_value: "",
    },
  },
  {
    name: "Pastel Soft",
    theme: {
      primary_color: "#b07cc6",
      background_color: "#fdf6ff",
      text_color: "#4a3555",
      font_family: "'Quicksand', sans-serif",
      border_radius: "1.25rem",
      hero_bg_type: "none",
      hero_bg_value: "",
    },
  },
  {
    name: "Natural Earth",
    theme: {
      primary_color: "#6b8f71",
      background_color: "#faf8f5",
      text_color: "#3d3227",
      font_family: "Inter, sans-serif",
      border_radius: "0.5rem",
      hero_bg_type: "none",
      hero_bg_value: "",
    },
  },
];

export const FONT_OPTIONS = [
  { label: "Modern Sans (Inter)", value: "Inter, sans-serif" },
  { label: "Elegant Serif (Playfair Display)", value: "'Playfair Display', serif" },
  { label: "Playful (Quicksand)", value: "'Quicksand', sans-serif" },
];
