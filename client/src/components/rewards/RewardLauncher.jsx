import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { Gift } from "lucide-react";
import { getMyRewards } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";
import SpinWheel from "./SpinWheel";

const AUTO_OPEN_SESSION_KEY = "darb_rewards_auto_opened_v1";

const markAutoOpenShown = (shownRef) => {
  shownRef.current = true;
  try {
    window.sessionStorage.setItem(AUTO_OPEN_SESSION_KEY, "true");
  } catch {
    // The in-memory guard still prevents repeat opening when storage is unavailable.
  }
};

export default function RewardLauncher() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const shownThisSession = useRef(false);
  const hiddenOnRoute = pathname === "/checkout";
  const rewardsQuery = useQuery({ queryKey: ["my-rewards"], queryFn: getMyRewards, enabled: isAuthenticated && !hiddenOnRoute, staleTime: 30_000 });
  const count = rewardsQuery.data?.data?.spinAvailableCount || 0;

  useEffect(() => {
    if (hiddenOnRoute || open || shownThisSession.current) return undefined;

    try {
      if (window.sessionStorage.getItem(AUTO_OPEN_SESSION_KEY)) {
        shownThisSession.current = true;
        return undefined;
      }
    } catch {
      // Continue with the in-memory session guard.
    }

    const timer = window.setTimeout(() => {
      markAutoOpenShown(shownThisSession);
      setOpen(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [hiddenOnRoute, open]);

  const openWheel = () => {
    markAutoOpenShown(shownThisSession);
    setOpen(true);
  };

  if (hiddenOnRoute) return null;
  return <>
    <button type="button" onClick={openWheel} className="reward-launcher-button fixed z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-darb-gold/40 bg-darb-green text-sm font-semibold text-darb-beige shadow-soft transition active:scale-[0.97]" aria-label={count ? `Darb rewards, ${count} spins available` : "Open Darb rewards"}><Gift size={18} /><span className="reward-launcher-label">Rewards</span>{count > 0 && <span className="absolute -end-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-darb-gold px-1 text-[10px] text-darb-green">{count}</span>}</button>
    {open && <SpinWheel onClose={() => setOpen(false)} />}
  </>;
}
