import React, { createContext, useContext, useState, ReactNode } from "react";
import { translations } from "@/i18n/translations";

export type Language = "en" | "es" | "fr" | "de" | "jp" | "br" | "cn";

interface CurrencyConfig {
  code: string;
  symbol: string;
  rate: number;
  locale: string;
}

export const languageConfig: Record<Language, { name: string; flag: string; currency: CurrencyConfig }> = {
  en: {
    name: "English",
    flag: "🇺🇸",
    currency: { code: "USD", symbol: "$", rate: 1, locale: "en-US" },
  },
  es: {
    name: "Español",
    flag: "🇪🇸",
    currency: { code: "EUR", symbol: "€", rate: 0.92, locale: "es-ES" },
  },
  fr: {
    name: "Français",
    flag: "🇫🇷",
    currency: { code: "EUR", symbol: "€", rate: 0.92, locale: "fr-FR" },
  },
  de: {
    name: "Deutsch",
    flag: "🇩🇪",
    currency: { code: "EUR", symbol: "€", rate: 0.92, locale: "de-DE" },
  },
  jp: {
    name: "日本語",
    flag: "🇯🇵",
    currency: { code: "JPY", symbol: "¥", rate: 149.5, locale: "ja-JP" },
  },
  br: {
    name: "Português",
    flag: "🇧🇷",
    currency: { code: "BRL", symbol: "R$", rate: 4.97, locale: "pt-BR" },
  },
  cn: {
    name: "中文",
    flag: "🇨🇳",
    currency: { code: "CNY", symbol: "¥", rate: 7.24, locale: "zh-CN" },
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  formatPrice: (priceUSD: number) => string;
  currentCurrency: CurrencyConfig;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");

  const currentCurrency = languageConfig[language].currency;

  const formatPrice = (priceUSD: number): string => {
    const convertedPrice = priceUSD * currentCurrency.rate;
    return new Intl.NumberFormat(currentCurrency.locale, {
      style: "currency",
      currency: currentCurrency.code,
      minimumFractionDigits: currentCurrency.code === "JPY" ? 0 : 2,
      maximumFractionDigits: currentCurrency.code === "JPY" ? 0 : 2,
    }).format(convertedPrice);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, formatPrice, currentCurrency, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
