import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { en, type TranslationKey } from "@/i18n/en";
import { el } from "@/i18n/el";

export type Language = "en" | "el";

const dictionaries: Record<Language, Record<string, string>> = { en, el };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  locale: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("app-language");
    return (saved === "el" ? "el" : "en") as Language;
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return dictionaries[language][key] || dictionaries.en[key] || key;
  }, [language]);

  const locale = language === "el" ? "el-GR" : "en-US";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, locale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
