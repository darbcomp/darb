import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Gift } from "lucide-react";
import { getMyRewards } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";
import SpinWheel from "./SpinWheel";

export default function RewardLauncher() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const rewardsQuery = useQuery({ queryKey: ["my-rewards"], queryFn: getMyRewards, enabled: isAuthenticated, staleTime: 30_000 });
  const count = rewardsQuery.data?.data?.spinAvailableCount || 0;
  return <>
    <button type="button" onClick={() => setOpen(true)} className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-darb-gold/40 bg-darb-green px-4 text-sm font-semibold text-darb-beige shadow-soft transition hover:-translate-y-0.5 hover:bg-darb-black active:translate-y-0" aria-label={count ? `Darb rewards, ${count} spins available` : "Open Darb rewards"}><Gift size={17} /><span>Rewards</span>{count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-darb-gold px-1 text-[10px] text-darb-green">{count}</span>}</button>
    {open && <SpinWheel onClose={() => setOpen(false)} />}
  </>;
}
