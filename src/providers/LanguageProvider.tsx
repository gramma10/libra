import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { TranslationKey } from "@/i18n/en";
import {
  LanguageContext,
  getInitialLanguage,
  getLocale,
  getTranslation,
  persistLanguage,
  type Language,
} from "@/hooks/language-context";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    persistLanguage(lang);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    return getTranslation(language, key);
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    locale: getLocale(language),
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}