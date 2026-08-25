import InfoPageShell from "../../components/common/InfoPageShell";

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
            Darb may contact the
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
            Only payment methods
            currently displayed
            during checkout are
            available for an order.
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
            Delivery timing, fees
            and any free-delivery
            conditions are shown
            through the storefront
            based on Darb's current
            delivery settings.
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

        <Section
          number="07"
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
          number="08"
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