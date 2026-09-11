/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { useLanguage } from "./LanguageContext";

const FeedbackContext = createContext(null);
const icons = { success: CheckCircle2, error: AlertCircle, info: Info, warning: TriangleAlert };
let nextToastId = 0;

function Toast({ toast, remove }) {
  const { t } = useLanguage();
  const timerRef = useRef(null);
  const startTimer = useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (toast.duration !== 0) timerRef.current = window.setTimeout(() => remove(toast.id), toast.duration || 4500);
  }, [remove, toast.duration, toast.id]);

  useEffect(() => {
    startTimer();
    return () => window.clearTimeout(timerRef.current);
  }, [startTimer]);

  const Icon = icons[toast.type] || Info;
  const tone = toast.type === "error" ? "border-red-300 text-red-800" : toast.type === "warning" ? "border-amber-300 text-amber-900" : "border-darb-gold/45 text-darb-green";

  return <div role={toast.type === "error" ? "alert" : "status"} onMouseEnter={() => window.clearTimeout(timerRef.current)} onMouseLeave={startTimer} onFocus={() => window.clearTimeout(timerRef.current)} onBlur={startTimer} className={`pointer-events-auto flex w-full items-start gap-3 rounded-[1rem] border bg-darb-cream px-4 py-3 shadow-soft ${tone}`}>
    <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
    <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{t(toast.title)}</p>{toast.message && <p className="mt-1 text-xs leading-5 opacity-75">{t(toast.message)}</p>}</div>
    <button type="button" onClick={() => remove(toast.id)} className="rounded-full p-1 transition hover:bg-darb-gold/15" aria-label={t("Close notification")}><X size={15} /></button>
  </div>;
}

function ConfirmationDialog({ request, close }) {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const [inputValue, setInputValue] = useState(request.defaultValue || "");
  const destructive = request.variant === "destructive";

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    window.setTimeout(() => cancelRef.current?.focus(), 0);
    const onKeyDown = (event) => {
      if (event.key === "Escape") return close(false);
      if (event.key !== "Tab") return undefined;
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable?.length) return undefined;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return undefined;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); previouslyFocused?.focus?.(); };
  }, [close, request]);

  return <div className="fixed inset-0 z-[120] grid place-items-center bg-darb-black/60 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close(false)}>
    <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body" className="w-full max-w-md rounded-[1.5rem] border border-darb-gold/35 bg-darb-cream p-6 shadow-2xl sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">{t("Please confirm")}</p>
      <h2 id="confirm-title" className="mt-2 font-display text-3xl text-darb-green">{t(request.title)}</h2>
      <p id="confirm-body" className="mt-3 text-sm leading-6 text-darb-muted">{t(request.body)}</p>
      {request.inputLabel && <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold text-darb-green">{t(request.inputLabel)}</span><textarea value={inputValue} onChange={(event) => setInputValue(event.target.value)} rows="3" className="w-full rounded-xl border border-darb-gold/35 bg-white px-4 py-3 outline-none focus:border-darb-green" placeholder={t(request.inputPlaceholder || "")} /></label>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button ref={cancelRef} type="button" onClick={() => close(false)} className="rounded-full border border-darb-gold/40 px-5 py-2.5 text-sm font-semibold text-darb-green transition hover:bg-darb-surface">{t("Cancel")}</button>
        <button type="button" onClick={() => close(request.inputLabel ? inputValue : true)} className={`rounded-full border px-5 py-2.5 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${destructive ? "border-red-700 bg-red-700 hover:border-red-800 hover:bg-red-800 focus-visible:outline-red-700" : "border-darb-green bg-darb-green hover:border-darb-black hover:bg-darb-black focus-visible:outline-darb-green"}`}>{t(request.confirmLabel || "Confirm")}</button>
      </div>
    </section>
  </div>;
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [request, setRequest] = useState(null);
  const remove = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);
  const notify = useCallback((input) => {
    const toast = typeof input === "string" ? { title: input, type: "info" } : input;
    const id = ++nextToastId;
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    return id;
  }, []);
  const confirm = useCallback((options) => new Promise((resolve) => setRequest({ ...options, id: ++nextToastId, resolve })), []);
  const closeConfirmation = useCallback((value) => {
    setRequest((current) => { current?.resolve(value); return null; });
  }, []);
  const value = useMemo(() => ({ notify, confirm, dismiss: remove }), [confirm, notify, remove]);

  return <FeedbackContext.Provider value={value}>
    {children}
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[130] ms-auto flex w-auto max-w-sm flex-col gap-3 sm:inset-x-auto sm:end-5 sm:top-5" aria-live="polite" aria-relevant="additions removals">
      {toasts.map((toast) => <Toast key={toast.id} toast={toast} remove={remove} />)}
    </div>
    {request && <ConfirmationDialog key={request.id} request={request} close={closeConfirmation} />}
  </FeedbackContext.Provider>;
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useFeedback must be used inside FeedbackProvider.");
  return context;
}
