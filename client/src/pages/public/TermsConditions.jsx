import InfoPageShell from "../../components/common/InfoPageShell";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { claimPolicyReward } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

function Section({
  number,
  title,
  children,
}) {
  return (
    <section className="border-b border-darb-gold/20 py-8 first:pt-0 last:border-0">
      <div className="grid gap-4 sm:grid-cols-[70px_1fr]">
        <p className="font-display text-2xl text-darb-gold">
          {number}
        </p>

        <div>
          <h2 className="font-display text-3xl text-darb-green">
            {title}
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-darb-muted">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function PolicyReward() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const rewardMutation = useMutation({ mutationFn: claimPolicyReward });
  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab") return undefined;
      const focusable = dialogRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [open]);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="ms-auto mt-5 block rounded-full p-2 text-darb-gold/55 transition hover:bg-darb-gold/10 hover:text-darb-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-darb-gold" aria-label={t("Open a hidden Darb detail")}><Gift size={15} /></button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-darb-black/60 p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="policy-reward-title" className="relative w-full max-w-md rounded-[1.75rem] border border-darb-gold/30 bg-darb-cream p-7 text-center shadow-2xl sm:p-9">
        <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="absolute end-4 top-4 rounded-full p-2 text-darb-green" aria-label={t("Close reward reveal")}><X size={18} /></button>
        <Gift className="mx-auto text-darb-gold" size={25} aria-hidden="true" />
        <h2 id="policy-reward-title" className="mt-3 font-display text-3xl text-darb-green">{t("A quieter path found you.")}</h2>
        <p className="mt-3 text-sm text-darb-muted">{t("You've uncovered 10% off.")}</p>
        {isAuthenticated ? <button type="button" disabled={rewardMutation.isPending || rewardMutation.isSuccess} onClick={() => rewardMutation.mutate()} className="mt-6 min-h-12 w-full rounded-full bg-darb-green px-6 text-sm font-semibold text-darb-beige disabled:opacity-60">{t(rewardMutation.isSuccess ? "Reward claimed" : rewardMutation.isPending ? "Claiming…" : "Claim reward")}</button> : <Link to="/login" className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-darb-green px-6 text-sm font-semibold text-darb-beige">{t("Sign in to claim")}</Link>}
        <div className="mt-3 min-h-5 text-xs text-darb-muted" aria-live="polite">{rewardMutation.isSuccess && t("Valid for 7 days and ready in your account.")}{rewardMutation.isError && t(rewardMutation.error?.friendlyMessage || "This reward is no longer available.")}</div>
      </section>
    </div>}
  </>;
}

function TermsConditions() {
  return (
    <InfoPageShell
      eyebrow="Darb"
      title="Terms & Conditions"
      intro="These terms describe the general conditions for browsing Darb and placing orders through the online store."
    >
      <div className="rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-9">
        <Section
          number="01"
          title="Using Darb"
        >
          <p>
            You may browse the
            storefront, view Darb
            fragrances and use the
            available customer
            features for personal
            shopping purposes.
          </p>
        </Section>

        <Section
          number="02"
          title="Products & Availability"
        >
          <p>
            Product availability,
            pricing, offers and
            stock can change over
            time. The information
            shown when an order is
            submitted is used to
            calculate that order.
          </p>
        </Section>

        <Section
          number="03"
          title="Orders"
        >
          <p>
            Placing an order
            submits a purchase
            request using the
            customer and delivery
            information provided at
            checkout.
          </p>

          <p>
            An order is accepted when Darb confirms it. Darb may contact the
            customer if an order
            requires clarification
            or if an issue affects
            fulfilment.
          </p>
        </Section>

        <Section
          number="04"
          title="Payments"
        >
          <p>
            Launch payment methods are Cash on Delivery, InstaPay and Vodafone Cash. Transfer orders remain Pending until Darb approves the submitted payment proof.
            Payment status is
            recorded separately
            from the order delivery
            status.
          </p>
        </Section>

        <Section
          number="05"
          title="Shipping"
        >
          <p>
            Darb ships only within Egypt. Delivery is normally 3–5 business days; the final fee is shown at checkout. Customers may inspect the package at delivery.
          </p>
        </Section>

        <Section
          number="06"
          title="Returns & Exchanges"
        >
          <p>
            Return or exchange
            requests are reviewed
            according to the
            current Darb policy and
            the circumstances of
            the order. See the
            Returns & Exchanges
            page for the request
            process.
          </p>
        </Section>

        <Section number="07" title="Cancellation">
          <p>Pending and Confirmed orders may be cancelled through Darb support. Once an order is Shipped or handed to the courier, cancellation is no longer available. Refunds, where applicable, are handled manually via InstaPay with a target of three days.</p>
        </Section>

        <Section number="08" title="Rewards & Promotions">
          <p>Only one promotional benefit can apply to an order. Rewards are account-bound, subject to their displayed eligibility and expiry, and cannot be exchanged for cash.</p>
          <PolicyReward />
        </Section>

        <Section
          number="09"
          title="Accounts"
        >
          <p>
            Customers are
            responsible for
            providing accurate
            information when
            creating an account or
            placing an order and
            for protecting access
            to their account.
          </p>
        </Section>

        <Section
          number="10"
          title="Questions"
        >
          <p>
            Questions about an
            order, product or these
            terms can be sent
            through the Darb
            Contact page.
          </p>
        </Section>
      </div>
    </InfoPageShell>
  );
}

export default TermsConditions;
