import { useEffect, useRef } from "react";

export default function useAdminEditorReveal(isOpen, revealKey = null) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const frame = window.requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      editor.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      editor.querySelector("input:not([type='hidden']):not([disabled]), select:not([disabled]), textarea:not([disabled])")?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, revealKey]);

  return editorRef;
}
