import InfoPageShell from "../../components/common/InfoPageShell";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { claimPolicyReward } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";

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

function TermsConditions() {
  const { isAuthenticated } = useAuth();
  const rewardMutation = useMutation({ mutationFn: claimPolicyReward });
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
          <div className="pt-6 text-center opacity-70 transition hover:opacity-100">
            <p className="font-display text-lg text-darb-green">You followed the quieter path.</p>
            {isAuthenticated ? (
              <button type="button" disabled={rewardMutation.isPending || rewardMutation.isSuccess} onClick={() => rewardMutation.mutate()} className="mt-2 text-xs underline decoration-darb-gold underline-offset-4">
                {rewardMutation.isSuccess ? "A 10% path reward is now in your account for 7 days." : rewardMutation.isPending ? "Opening the path..." : "Claim the hidden path"}
              </button>
            ) : <Link to="/login" className="mt-2 inline-block text-xs underline decoration-darb-gold underline-offset-4">Sign in to follow it</Link>}
            {rewardMutation.isError && <p className="mt-2 text-xs text-darb-muted">{rewardMutation.error?.friendlyMessage || "This path has already been followed."}</p>}
          </div>
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
