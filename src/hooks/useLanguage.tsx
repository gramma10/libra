import { useContext } from "react";
import { LanguageContext } from "@/hooks/language-context";

export { type Language, type LanguageContextType } from "@/hooks/language-context";

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
