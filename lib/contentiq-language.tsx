"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { Lang } from "@/lib/contentiq-app-copy";

type LanguageContextValue = {
  lang: Lang;
  locale: "pl-PL" | "en-US";
  isPolish: boolean;
  text: (polish: string, english: string) => string;
};

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  locale: "en-US",
  isPolish: false,
  text: (_polish, english) => english,
});

export function LanguageProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("ciq-language", lang);
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      locale: lang === "pl" ? "pl-PL" : "en-US",
      isPolish: lang === "pl",
      text: (polish, english) => (lang === "pl" ? polish : english),
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useContentIQLanguage() {
  return useContext(LanguageContext);
}

