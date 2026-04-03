import { createContext } from "react";
import { en, type TranslationKey } from "@/i18n/en";
import { el } from "@/i18n/el";

export type Language = "en" | "el";

const dictionaries: Record<Language, Record<string, string>> = { en, el };

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  locale: string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";

  const saved = window.localStorage.getItem("app-language");
  return saved === "el" ? "el" : "en";
};

export const persistLanguage = (lang: Language) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("app-language", lang);
  }
};

export const getTranslation = (language: Language, key: TranslationKey): string => {
  return dictionaries[language][key] || dictionaries.en[key] || key;
};

export const getLocale = (language: Language) => {
  return language === "el" ? "el-GR" : "en-US";
};