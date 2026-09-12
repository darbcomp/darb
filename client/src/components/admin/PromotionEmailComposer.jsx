import { useEffect, useId, useRef, useState } from "react";
import { Mail, Send, X } from "lucide-react";
import {
  previewPromotionEmail,
  sendPromotionEmail,
  sendPromotionTestEmail,
} from "../../api/adminApi";

const getError = (error) => error?.friendlyMessage || "Something went wrong. Please try again.";
const createRequestId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function PromotionEmailComposer({ promotionType, promotionId }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const sendRequestIdRef = useRef("");
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const trigger = triggerRef.current;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !sendingRef.current) {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      const focusTarget = previouslyFocused?.isConnected ? previouslyFocused : trigger;
      window.requestAnimationFrame(() => focusTarget?.focus());
    };
  }, [open]);

  const openComposer = async () => {
    setOpen(true);
    setLoading(true);
    setPreview(null);
    setError("");
    setNotice("");
    setConfirming(false);
    sendRequestIdRef.current = "";
    try {
      const response = await previewPromotionEmail({ type: promotionType, promotionId });
      setPreview(response.data);
      setSubject(response.data.subject);
      setMessage(response.data.message);
    } catch (requestError) { setError(getError(requestError)); }
    finally { setLoading(false); }
  };

  const handleTest = async () => {
    setSendingTest(true); setError(""); setNotice("");
    try {
      const response = await sendPromotionTestEmail({ type: promotionType, promotionId, subject, message });
      setNotice(response.message);
    } catch (requestError) { setError(getError(requestError)); }
    finally { setSendingTest(false); }
  };

  const handleSend = async () => {
    if (!confirming) { sendRequestIdRef.current = createRequestId(); setConfirming(true); setNotice(""); return; }
    setSending(true); setError(""); setNotice("");
    try {
      const response = await sendPromotionEmail({ type: promotionType, promotionId, subject, message, requestId: sendRequestIdRef.current });
      const result = response.data;
      setNotice(`${result.sentCount} sent/accepted for delivery. ${result.failedCount} failed.`);
      setConfirming(false);
      sendRequestIdRef.current = "";
      setPreview((current) => ({ ...current, eligibleCount: result.eligibleCount }));
    } catch (requestError) { setError(getError(requestError)); }
    finally { setSending(false); }
  };

  return (
    <>
      <button ref={triggerRef} type="button" onClick={openComposer} className="inline-flex items-center gap-2 rounded-full border border-darb-green/25 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-green">
        <Mail size={16} /> Email Customers
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) setOpen(false); }}>
          <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-2xl sm:rounded-[28px] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-darb-gold">Promotional email</p><h2 id={titleId} className="mt-1 font-display text-2xl text-darb-green">Email opted-in customers</h2></div>
              <button ref={closeButtonRef} type="button" aria-label="Close email composer" onClick={() => setOpen(false)} disabled={sending} className="rounded-full p-2 text-darb-muted hover:bg-darb-cream"><X size={20} /></button>
            </div>
            {loading && <p className="mt-6 text-sm text-darb-muted" role="status">Checking eligible recipients…</p>}
            {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
            {preview && (
              <div className="mt-6 space-y-5">
                <div className="rounded-2xl bg-darb-cream p-4"><p className="font-semibold text-darb-green">{preview.promotion.title}</p><p className="mt-1 text-sm text-darb-muted">{preview.promotion.summary}</p><p className="mt-3 text-sm font-bold text-darb-black">{preview.eligibleCount} opted-in recipient{preview.eligibleCount === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-darb-muted">Addresses remain private and are resolved by the server.</p></div>
                <label className="block text-sm font-semibold text-darb-black">Subject<input value={subject} maxLength={120} onChange={(event) => { setSubject(event.target.value); setConfirming(false); sendRequestIdRef.current = ""; }} className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-darb-green" /><span className="mt-1 block text-right text-xs text-darb-muted">{subject.length}/120</span></label>
                <label className="block text-sm font-semibold text-darb-black">Short message<textarea value={message} maxLength={1200} rows={6} onChange={(event) => { setMessage(event.target.value); setConfirming(false); sendRequestIdRef.current = ""; }} className="mt-2 w-full resize-y rounded-2xl border border-black/10 px-4 py-3 font-normal outline-none focus:border-darb-green" /><span className="mt-1 block text-right text-xs text-darb-muted">{message.length}/1200</span></label>
                <p className="text-xs leading-5 text-darb-muted">Every live email includes a secure unsubscribe link. Transactional account and order emails are unaffected.</p>
                {notice && <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p>}
                {confirming && <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">Confirm sending this promotion to {preview.eligibleCount} opted-in recipient{preview.eligibleCount === 1 ? "" : "s"}. This action sends immediately.</p>}
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={handleTest} disabled={sendingTest || sending || !subject.trim() || !message.trim()} className="rounded-full border border-darb-green px-5 py-3 text-sm font-semibold text-darb-green disabled:opacity-50">{sendingTest ? "Sending test…" : "Send test to admin"}</button>
                  <button type="button" onClick={handleSend} disabled={sending || sendingTest || !preview.allowed || preview.eligibleCount === 0 || !subject.trim() || !message.trim()} className="inline-flex items-center justify-center gap-2 rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige disabled:opacity-50"><Send size={16} />{sending ? "Sending…" : confirming ? "Confirm and send" : "Review final send"}</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default PromotionEmailComposer;
