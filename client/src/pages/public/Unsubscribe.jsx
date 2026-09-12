import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { unsubscribeFromMarketing } from "../../api/marketingApi";

function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [state, setState] = useState(token ? "loading" : "invalid");
  useEffect(() => {
    if (!token) return undefined;
    unsubscribeFromMarketing(token).then(() => setState("success")).catch(() => setState("invalid"));
    return undefined;
  }, [token]);
  return <main className="grid min-h-[65vh] place-items-center bg-darb-cream px-5 py-16"><section className="w-full max-w-xl rounded-[28px] border border-darb-green/10 bg-white p-8 text-center sm:p-12"><p className="font-display text-3xl text-darb-green">Darb / درب</p>{state === "loading" ? <p className="mt-5 text-darb-muted" role="status">Updating your preferences…</p> : state === "success" ? <><h1 className="mt-6 font-display text-3xl text-darb-black">You’ve been unsubscribed.</h1><p className="mt-4 leading-7 text-darb-muted">You will no longer receive Darb promotional emails. You may still receive transactional emails about your account and orders.</p><p className="mt-5 text-sm text-darb-muted" dir="rtl">تم إلغاء اشتراكك في الرسائل الترويجية. ستظل رسائل الحساب والطلبات تصل إليك.</p></> : <><h1 className="mt-6 font-display text-3xl text-darb-black">This link is invalid or expired.</h1><p className="mt-4 text-darb-muted">No preferences were changed.</p></>}</section></main>;
}

export default Unsubscribe;
