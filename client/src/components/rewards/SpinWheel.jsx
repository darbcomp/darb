import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, X } from "lucide-react";
import { spinReward } from "../../api/rewardApi";

export default function SpinWheel({ onClose }) {
  const queryClient = useQueryClient();
  const [rotation, setRotation] = useState(0);
  const mutation = useMutation({
    mutationFn: spinReward,
    onSuccess: (response) => {
      const rewardOrder = ["spin-5", "spin-musk-20", "spin-free-shipping-1800", "spin-extra-tester", "spin-next-10"];
      const resultIndex = Math.max(rewardOrder.indexOf(response?.data?.key), 0);
      setRotation(1440 + resultIndex * 72);
      queryClient.invalidateQueries({ queryKey: ["my-rewards"] });
    },
  });
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-darb-black/70 p-4" role="dialog" aria-modal="true" aria-label="Darb reward wheel">
    <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-darb-gold/30 bg-darb-cream p-6 text-center shadow-2xl sm:p-9">
      <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full border border-darb-gold/30 p-2 text-darb-green" aria-label="Close reward wheel"><X size={17}/></button>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-darb-gold">A new path</p>
      <h2 className="mt-2 font-display text-4xl text-darb-green">Your Darb reward</h2>
      <div className="relative mx-auto mt-7 h-64 w-64"><div className="absolute left-1/2 top-[-8px] z-10 -translate-x-1/2 border-x-[10px] border-t-[20px] border-x-transparent border-t-darb-gold"/><div className="grid h-full w-full place-items-center rounded-full border-[10px] border-darb-green shadow-soft transition-transform duration-[2200ms] ease-[cubic-bezier(.15,.75,.15,1)]" style={{ transform: `rotate(${rotation}deg)`, background: "conic-gradient(#0F3D2E 0 20%,#C8A97E 20% 40%,#E7DCC9 40% 60%,#0F3D2E 60% 80%,#C8A97E 80%)" }}><Gift className="rounded-full bg-darb-cream p-3 text-darb-green" size={54}/></div></div>
      {mutation.data ? <div className="mt-6 rounded-2xl bg-darb-green p-4 text-darb-beige"><strong>{mutation.data.data.label}</strong><p className="mt-1 text-xs text-darb-beige/70">Available in your account and at checkout.</p></div> : <p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-darb-muted">One spin, resolved securely by Darb. Closing now keeps it available for later.</p>}
      <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || Boolean(mutation.data)} className="mt-6 w-full rounded-full bg-darb-green px-6 py-3 font-semibold text-darb-beige disabled:opacity-60">{mutation.isPending ? "Finding your reward…" : mutation.data ? "Reward revealed" : "Spin once"}</button>
      {mutation.error && <p className="mt-3 text-sm text-red-700">{mutation.error.friendlyMessage || "The wheel is unavailable."}</p>}
    </div>
  </div>;
}
