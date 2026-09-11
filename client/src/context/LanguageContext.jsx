/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { translateToArabic } from "../i18n/ar";

const LanguageContext = createContext(null);
const STORAGE_KEY = "darb_language";

const readInitialLanguage = () => {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
};

export function LanguageProvider({ children }) {
  const location = useLocation();
  const [language, setLanguageState] = useState(readInitialLanguage);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const effectiveLanguage = isAdminRoute ? "en" : language;

  const setLanguage = useCallback((nextLanguage) => {
    const next = nextLanguage === "ar" ? "ar" : "en";
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const next = current === "ar" ? "en" : "ar";
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = effectiveLanguage;
    root.dir = effectiveLanguage === "ar" ? "rtl" : "ltr";
    document.body.dir = root.dir;
    document.body.classList.toggle("darb-arabic", effectiveLanguage === "ar");
  }, [effectiveLanguage]);

  const t = useCallback(
    (value) =>
      effectiveLanguage === "ar" ? translateToArabic(value) : value,
    [effectiveLanguage]
  );

  const value = useMemo(
    () => ({
      language,
      effectiveLanguage,
      isArabic: effectiveLanguage === "ar",
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, effectiveLanguage, setLanguage, toggleLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }
  return context;
}
