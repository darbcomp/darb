import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, X } from "lucide-react";
import { claimGuestOrderSpin, getMyRewards, spinReward } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

const rewardOrder = ["spin-5", "spin-musk-20", "spin-free-shipping-1800", "spin-extra-tester", "spin-next-10"];
const guestRewardKey = "darb_guest_rewards";
const rewardSegments = ["5% off", "20% Musk", "Free shipping", "Free extra tester", "10% next order"];

function storedGuestRewards() {
  try { return JSON.parse(localStorage.getItem(guestRewardKey) || "[]"); } catch { return []; }
}

export default function SpinWheel({ onClose }) {
  const { isAuthenticated } = useAuth();
  const { isArabic, t } = useLanguage();
  const queryClient = useQueryClient();
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [guestRewards, setGuestRewards] = useState(storedGuestRewards);

  const rewardsQuery = useQuery({ queryKey: ["my-rewards"], queryFn: getMyRewards, enabled: isAuthenticated, staleTime: 15_000 });
  const availableSpins = rewardsQuery.data?.data?.spins?.filter((spin) => spin.status === "available") || [];

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab") return undefined;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return undefined;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return undefined;
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const reveal = (response) => {
    const reward = response?.data;
    const resultIndex = Math.max(rewardOrder.indexOf(reward?.key), 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setRotation((current) => {
      const desired = 360 - (resultIndex * 72 + 36);
      const delta = ((desired - (current % 360)) + 360) % 360;
      return current + (reduced ? delta : 1440 + delta);
    });
    window.setTimeout(() => setResult(reward), reduced ? 0 : 1750);
    return reward;
  };

  const spinMutation = useMutation({
    mutationFn: (grantId) => spinReward(grantId),
    onSuccess: (response) => {
      reveal(response);
      queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
    },
  });
  const guestMutation = useMutation({
    mutationFn: () => claimGuestOrderSpin(phone.trim()),
    onSuccess: (response) => {
      const reward = reveal(response);
      if (reward) {
        const next = [{ ...reward, claimedAt: new Date().toISOString() }, ...guestRewards].slice(0, 10);
        setGuestRewards(next);
        localStorage.setItem(guestRewardKey, JSON.stringify(next));
      }
    },
  });
  const pending = spinMutation.isPending || guestMutation.isPending;
  const error = spinMutation.error || guestMutation.error;

  const resetResult = () => {
    setResult(null);
    spinMutation.reset();
    guestMutation.reset();
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-darb-black/75 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section ref={dialogRef} className="relative my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-darb-gold/35 bg-darb-cream p-6 text-center shadow-2xl sm:p-9" role="dialog" aria-modal="true" aria-labelledby="reward-wheel-title">
      <button ref={closeRef} type="button" onClick={onClose} className="absolute end-5 top-5 rounded-full border border-darb-gold/30 p-2 text-darb-green transition hover:bg-darb-gold/10 motion-reduce:transition-none" aria-label={t("Close reward wheel")}><X size={17}/></button>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">{t("Darb rewards")}</p>
      <h2 id="reward-wheel-title" className="mt-2 font-display text-4xl text-darb-green">{t("A turn along the path.")}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-darb-muted">{t("Every result is chosen securely by Darb and saved before it appears here.")}</p>

      <div className="relative mx-auto mt-7 h-72 w-72 max-w-full" aria-label={t("Reward wheel with five possible outcomes")}><div className="absolute left-1/2 top-[-10px] z-20 -translate-x-1/2 border-x-[11px] border-t-[23px] border-x-transparent border-t-darb-gold drop-shadow" aria-hidden="true"/><div className="relative h-full w-full rounded-full border-[10px] border-darb-green shadow-soft transition-transform duration-[1800ms] ease-[cubic-bezier(.15,.75,.15,1)] motion-reduce:transition-none" style={{ transform: `rotate(${rotation}deg)`, background: "conic-gradient(#0F3D2E 0 20%,#C8A97E 20% 40%,#EFE6D7 40% 60%,#537365 60% 80%,#D7BE98 80%)" }} aria-hidden="true">
        {rewardSegments.map((label, index) => <span key={label} className={`absolute left-1/2 top-1/2 w-24 -translate-x-1/2 -translate-y-1/2 text-center font-bold leading-[1.15] ${isArabic ? "text-[9px]" : "text-[10px]"} ${[1, 2, 4].includes(index) ? "text-darb-green" : "text-darb-cream"}`} style={{ transform: `translate(-50%, -50%) rotate(${index * 72 + 36}deg) translateY(-91px) rotate(-${index * 72 + 36}deg)` }}>{t(label)}</span>)}
        <span className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-darb-green bg-darb-cream"><Gift className="text-darb-green" size={25}/></span>
      </div></div>

      {result ? <div className="mt-6 rounded-2xl bg-darb-green p-5 text-darb-beige" aria-live="polite"><p className="text-xs uppercase tracking-[0.2em] text-darb-gold">{t("Your reward")}</p><strong className="mt-2 block font-display text-2xl">{t(result.label)}</strong>{result.code && <p className="mt-3 font-mono text-lg tracking-wider text-darb-gold">{result.code}</p>}<p className="mt-2 text-xs text-darb-beige/70">{t("Saved and ready for its eligible checkout.")}</p></div> : null}

      {isAuthenticated ? <div className="mt-6">
        {rewardsQuery.isSuccess && availableSpins.length === 0 ? <div className="rounded-[1.5rem] border border-darb-gold/30 bg-darb-surface px-5 py-6 text-center sm:px-7" role="status">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-darb-gold/40 bg-darb-cream text-darb-green" aria-hidden="true"><Gift size={19} strokeWidth={1.6}/></span>
          <h3 className="mt-4 font-display text-2xl text-darb-green">{t("No spins are waiting right now.")}</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-darb-muted">{t("You’ll earn a new spin after an eligible order is confirmed.")}</p>
        </div> : <>
          <p className="text-sm text-darb-muted">{t(rewardsQuery.isLoading ? "Checking your available spins…" : `${availableSpins.length} spin${availableSpins.length === 1 ? "" : "s"} available`)}</p>
          <button type="button" onClick={() => { resetResult(); spinMutation.mutate(availableSpins[0]?._id); }} disabled={pending || !availableSpins.length || Boolean(result)} className="mt-4 min-h-12 w-full rounded-full bg-darb-green px-6 font-semibold text-darb-beige disabled:cursor-not-allowed disabled:opacity-50">{t(pending ? "Finding your reward…" : result ? "Reward revealed" : "Spin")}</button>
          {result && availableSpins.length > 1 && <button type="button" onClick={resetResult} className="mt-3 text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4">{t("Reveal another available spin")}</button>}
        </>}
      </div> : <div className="mt-7 rounded-[1.5rem] bg-darb-surface p-5 text-start sm:p-6"><h3 className="font-display text-2xl text-darb-green">{t("Ordered as a guest?")}</h3><p className="mt-2 text-sm leading-6 text-darb-muted">{t("Use the phone number from a confirmed Darb order.")}</p><label htmlFor="guest-spin-phone" className="mt-4 block text-xs font-semibold text-darb-green">{t("Phone used for your order")}</label><input id="guest-spin-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className="mt-2 w-full rounded-full border border-darb-gold/35 bg-darb-cream px-5 py-3 outline-none" /><button type="button" onClick={() => { resetResult(); guestMutation.mutate(); }} disabled={pending || phone.trim().length < 11 || Boolean(result)} className="mt-4 min-h-12 w-full rounded-full bg-darb-green px-6 font-semibold text-darb-beige disabled:cursor-not-allowed disabled:opacity-50">{t(pending ? "Checking your order…" : result ? "Reward revealed" : "Claim order spin")}</button>{result && <button type="button" onClick={resetResult} className="mt-3 w-full text-center text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4">{t("Claim another confirmed-order spin")}</button>}{guestRewards.length > 0 && <p className="mt-4 text-xs text-darb-muted">{t("Your latest guest reward is kept on this device so its code survives a refresh.")}</p>}</div>}
      {error && <p className="mt-4 text-sm text-red-700" role="alert">{t(error.friendlyMessage || "No eligible spin is available for those details.")}</p>}
    </section>
  </div>;
}
