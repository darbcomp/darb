import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  PackageCheck,
  Truck,
} from "lucide-react";

import { getPublicSettings } from "../../api/settingsApi";
import InfoPageShell from "../../components/common/InfoPageShell";

function formatMoney(
  value,
  currency = "EGP"
) {
  return new Intl.NumberFormat(
    "en-EG",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }
  ).format(Number(value) || 0);
}

function InfoCard({
  icon: Icon,
  title,
  children,
}) {
  return (
    <article className="rounded-[1.75rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-darb-green text-darb-gold">
        <Icon
          size={20}
          strokeWidth={1.7}
        />
      </div>

      <h2 className="mt-6 font-display text-2xl text-darb-green">
        {title}
      </h2>

      <div className="mt-3 text-sm leading-7 text-darb-muted">
        {children}
      </div>
    </article>
  );
}

function ShippingDelivery() {
  const settingsQuery = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettings,
  });

  const settings =
    settingsQuery.data?.data ||
    settingsQuery.data ||
    {};

  const delivery =
    settings.delivery || {};

  const currency =
    settings.currency || "EGP";

  const fees = delivery.governorateFees || { cairo: 80, giza: 80, alexandria: 125, other: 135 };

  return (
    <InfoPageShell
      eyebrow="Customer Care"
      title="Shipping & Delivery"
      intro="From your cart to your door, here is what to know about the journey of a Darb order."
    >
      <div className="grid gap-5 md:grid-cols-3">
        <InfoCard
          icon={Clock3}
          title="Delivery Timing"
        >
          <p>
            {delivery.estimatedDeliveryText || "3–5 business days"} throughout Egypt.
          </p>
        </InfoCard>

        <InfoCard
          icon={Truck}
          title="Delivery Fee"
        >
          <p>
            Cairo {formatMoney(fees.cairo, currency)}, Giza {formatMoney(fees.giza, currency)}, Alexandria {formatMoney(fees.alexandria, currency)}, and all other governorates {formatMoney(fees.other, currency)}.
          </p>
        </InfoCard>

        <InfoCard
          icon={PackageCheck}
          title="Package Inspection"
        >
          <p>
            You may inspect the package at delivery. If a correct, undamaged order is rejected, the customer pays shipping; Darb covers shipping for a wrong or damaged item.
          </p>
        </InfoCard>
      </div>

      <div className="mt-10 rounded-[2rem] bg-darb-green p-7 text-darb-beige sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
          Before You Order
        </p>

        <h2 className="mt-3 font-display text-3xl">
          The final delivery
          details are always shown
          at checkout.
        </h2>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-darb-beige/65">
          Darb ships only inside Egypt. There is no general free-shipping threshold; a specific active bundle or reward may still provide free delivery.
          Cash on Delivery is available throughout Egypt with no extra COD charge. Delivery is currently handled through Egyptian Post; timing remains an estimate rather than a courier guarantee.
        </p>
      </div>
    </InfoPageShell>
  );
}

export default ShippingDelivery;
