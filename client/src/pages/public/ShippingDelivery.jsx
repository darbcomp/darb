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

  const defaultFee =
    Number(
      delivery.defaultFee
    ) || 0;

  const freeThreshold =
    Number(
      delivery.freeDeliveryThreshold
    ) || 0;

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
            {delivery.estimatedDeliveryText ||
              "Delivery timing is confirmed after placing your order."}
          </p>
        </InfoCard>

        <InfoCard
          icon={Truck}
          title="Delivery Fee"
        >
          <p>
            {defaultFee > 0
              ? `The standard delivery fee is ${formatMoney(
                  defaultFee,
                  currency
                )}.`
              : "Any applicable delivery fee is shown during checkout before your order is placed."}
          </p>
        </InfoCard>

        <InfoCard
          icon={PackageCheck}
          title="Free Delivery"
        >
          <p>
            {freeThreshold > 0
              ? `Orders reaching ${formatMoney(
                  freeThreshold,
                  currency
                )} qualify for free delivery.`
              : "If a free-delivery offer applies to your order, it will be reflected automatically at checkout."}
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
          Delivery fees and
          available payment
          methods can change based
          on the current Darb store
          settings and any active
          offers.
        </p>
      </div>
    </InfoPageShell>
  );
}

export default ShippingDelivery;