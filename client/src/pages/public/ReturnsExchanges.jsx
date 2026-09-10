import {
  CheckCircle2,
  MessageCircle,
  PackageSearch,
} from "lucide-react";

import InfoPageShell from "../../components/common/InfoPageShell";

const steps = [
  {
    icon: MessageCircle,
    number: "01",
    title: "Contact Darb",
    text: "Get in touch through the Contact page and tell us what happened.",
  },
  {
    icon: PackageSearch,
    number: "02",
    title: "Share Your Order",
    text: "Include your Darb order number and a clear description of the item or issue.",
  },
  {
    icon: CheckCircle2,
    number: "03",
    title: "Receive Next Steps",
    text: "The Darb team will confirm eligibility, the available solution, and any next steps for your request.",
  },
];

function ReturnsExchanges() {
  return (
    <InfoPageShell
      eyebrow="Customer Care"
      title="Returns & Exchanges"
      intro="If something about your order is not right, Darb will review the request with you and guide you through the next step."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {steps.map(
          ({
            icon: Icon,
            number,
            title,
            text,
          }) => (
            <article
              key={number}
              className="rounded-[1.75rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-7"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-darb-green text-darb-gold">
                  <Icon
                    size={19}
                    strokeWidth={
                      1.7
                    }
                  />
                </div>

                <span className="font-display text-2xl text-darb-gold/40">
                  {number}
                </span>
              </div>

              <h2 className="mt-6 font-display text-2xl text-darb-green">
                {title}
              </h2>

              <p className="mt-3 text-sm leading-7 text-darb-muted">
                {text}
              </p>
            </article>
          )
        )}
      </div>

      <div className="mt-10 rounded-[2rem] bg-darb-green p-7 text-darb-beige sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
          Please Note
        </p>

        <div className="mt-4 max-w-3xl space-y-3 text-sm leading-7 text-darb-beige/65">
          <p>Wrong products must be reported within 2 days; damaged or leaking products within 1 day. Photo or video proof is required. For Darb-fault cases, Darb covers shipping and the customer may choose a refund or exchange.</p>
          <p>The normal exchange window is 10 days. Genuine-problem returns may be requested within 5 days, subject to the shorter wrong/damaged reporting windows. For a non-fault rejection or exchange, the customer pays shipping.</p>
          <p>Refunds are handled manually via InstaPay with a processing target of 3 days. Contact Darb through WhatsApp; no automatic refunds are issued through the account.</p>
        </div>
      </div>
    </InfoPageShell>
  );
}

export default ReturnsExchanges;
