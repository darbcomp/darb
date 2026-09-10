import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import { translateToArabic } from "../i18n/ar";

const LanguageContext = createContext(null);
const STORAGE_KEY = "darb_language";
const textOriginals = new WeakMap();
const attributeOriginals = new WeakMap();
const TRANSLATABLE_ATTRIBUTES = ["placeholder", "aria-label", "title"];

const readInitialLanguage = () => {
  if (typeof window === "undefined") return "en";
  return window.localStorage.getItem(STORAGE_KEY) === "ar" ? "ar" : "en";
};

const skippedElement = (element, isAdminRoute) => {
  if (isAdminRoute || !element) return true;
  if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName)) return true;
  return Boolean(
    element.closest?.(
      ".admin-workspace, [data-darb-no-translate='true'], [data-darb-no-translate]"
    )
  );
};

const translateTextNode = (node, language, isAdminRoute) => {
  const parent = node.parentElement;
  if (!parent || skippedElement(parent, isAdminRoute)) return;

  const current = node.nodeValue || "";
  let original = textOriginals.get(node);

  if (
    original === undefined ||
    (language === "ar" &&
      current !== original &&
      current !== translateToArabic(original))
  ) {
    original = current;
    textOriginals.set(node, original);
  }

  const next = language === "ar" ? translateToArabic(original) : original;
  if (next !== current) node.nodeValue = next;
};

const translateElementAttributes = (element, language, isAdminRoute) => {
  if (!(element instanceof Element) || skippedElement(element, isAdminRoute)) {
    return;
  }

  let originals = attributeOriginals.get(element);
  if (!originals) {
    originals = new Map();
    attributeOriginals.set(element, originals);
  }

  TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;

    const current = element.getAttribute(attribute) || "";
    let original = originals.get(attribute);

    if (
      original === undefined ||
      (language === "ar" &&
        current !== original &&
        current !== translateToArabic(original))
    ) {
      original = current;
      originals.set(attribute, original);
    }

    const next = language === "ar" ? translateToArabic(original) : original;
    if (next !== current) element.setAttribute(attribute, next);
  });
};

const translateTree = (root, language, isAdminRoute) => {
  if (!root) return;

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root, language, isAdminRoute);
    return;
  }

  if (!(root instanceof Element) && root !== document.getElementById("root")) {
    return;
  }

  if (root instanceof Element) {
    translateElementAttributes(root, language, isAdminRoute);
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let textNode = textWalker.nextNode();
  while (textNode) {
    translateTextNode(textNode, language, isAdminRoute);
    textNode = textWalker.nextNode();
  }

  if (root.querySelectorAll) {
    root.querySelectorAll("*").forEach((element) => {
      translateElementAttributes(element, language, isAdminRoute);
    });
  }
};

export function LanguageProvider({ children }) {
  const location = useLocation();
  const [language, setLanguageState] = useState(readInitialLanguage);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const effectiveLanguage = isAdminRoute ? "en" : language;

  const setLanguage = (nextLanguage) => {
    const next = nextLanguage === "ar" ? "ar" : "en";
    setLanguageState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  useEffect(() => {
    const root = document.documentElement;
    root.lang = effectiveLanguage === "ar" ? "ar" : "en";
    root.dir = effectiveLanguage === "ar" ? "rtl" : "ltr";
    document.body.dir = root.dir;
    document.body.classList.toggle("darb-arabic", effectiveLanguage === "ar");

    const appRoot = document.getElementById("root");
    translateTree(appRoot, effectiveLanguage, isAdminRoute);

    if (effectiveLanguage !== "ar" || !appRoot) return undefined;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target, "ar", false);
          return;
        }

        if (mutation.type === "attributes") {
          translateElementAttributes(mutation.target, "ar", false);
          return;
        }

        mutation.addedNodes.forEach((node) => {
          translateTree(node, "ar", false);
        });
      });
    });

    observer.observe(appRoot, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });

    return () => observer.disconnect();
  }, [effectiveLanguage, isAdminRoute, location.pathname]);

  const value = useMemo(
    () => ({
      language,
      effectiveLanguage,
      isArabic: effectiveLanguage === "ar",
      setLanguage,
      toggleLanguage,
      t: (value) =>
        effectiveLanguage === "ar" ? translateToArabic(value) : value,
    }),
    [language, effectiveLanguage]
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
