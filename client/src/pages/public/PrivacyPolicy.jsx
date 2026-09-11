import InfoPageShell from "../../components/common/InfoPageShell";

function PolicySection({
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

function PrivacyPolicy() {
  return (
    <InfoPageShell
      eyebrow="Darb"
      title="Privacy Policy"
      intro="Your privacy matters throughout the Darb journey. This page explains the information used when you browse the store, create an account, place an order, submit a review, or contact Darb."
    >
      <div className="rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-9">
        <PolicySection
          number="01"
          title="Information You Provide"
        >
          <p>
            When you use Darb, you may provide information such as your name,
            phone number, email address, delivery details, and account
            information.
          </p>

          <p>
            This information may be provided when you create an account, place
            an order, join a waitlist, submit a review, or contact the Darb
            team.
          </p>
        </PolicySection>

        <PolicySection
          number="02"
          title="Order Information"
        >
          <p>
            When you place an order, Darb stores the information needed to
            process and manage that order. This can include the products
            purchased, delivery information, order status, payment method, and
            payment status.
          </p>

          <p>
            Order information is used to fulfil purchases, provide customer
            support, and keep customers updated about their orders.
          </p>
        </PolicySection>

        <PolicySection
          number="03"
          title="How Your Information Is Used"
        >
          <p>
            Darb may use customer information to operate the online store,
            process orders, manage accounts, provide customer support, send
            order-related updates, and improve the shopping experience.
          </p>

          <p>
            Information may also be used where necessary to protect the
            security and proper operation of the website.
          </p>
        </PolicySection>

        <PolicySection
          number="04"
          title="Payments"
        >
          <p>
            Darb may offer different payment methods depending on the current
            store settings.
          </p>

          <p>
            When an external payment provider is used, some payment processing
            may take place through that provider. Darb does not need to display
            or expose sensitive payment information publicly on the storefront.
          </p>
          <p>For InstaPay or Vodafone Cash, Darb stores the sender name and securely hosted screenshot proof needed for manual payment review. Private storage identifiers are not exposed in public order responses.</p>
        </PolicySection>

        <PolicySection
          number="05"
          title="Account & Browser Data"
        >
          <p>
            Darb may use essential browser storage or cookies to support
            features such as authentication, the shopping cart, saved
            preferences, and website security.
          </p>

          <p>
            These technologies help the website remember important session
            information and keep core store functionality working correctly.
          </p>
        </PolicySection>

        <PolicySection
          number="06"
          title="Reviews"
        >
          <p>
            Customer reviews may be checked against Darb order records before
            receiving a Verified Purchase label.
          </p>

          <p>
            Only information intended for public display, such as the review,
            rating, public display name, and selected fragrance, may appear on
            the storefront.
          </p>

          <p>
            Private details such as phone numbers, email addresses, delivery
            addresses, and internal order information are not shown publicly
            as part of a review.
          </p>
          <p>If you choose to upload a review image, it may appear publicly with the approved review. Darb-controlled video testimonials may also be displayed.</p>
        </PolicySection>

        <PolicySection
          number="07"
          title="Order Tracking"
        >
          <p>
            Public order tracking requires both the Darb order number and the
            phone number used when placing that order.
          </p>

          <p>
            These details are used to verify the request before tracking
            information is displayed.
          </p>
        </PolicySection>

        <PolicySection
          number="08"
          title="Information Sharing"
        >
          <p>
            Customer information may be shared with service providers only
            where needed to operate the store, process payments, deliver
            orders, host the website, or provide related services.
          </p>

          <p>
            Darb does not make private customer order or account information
            publicly available.
          </p>
        </PolicySection>

        <PolicySection
          number="09"
          title="Data Security"
        >
          <p>
            Darb uses reasonable technical and operational measures to protect
            customer information and restrict access to private store data.
          </p>

          <p>
            No online service can guarantee absolute security, but Darb aims to
            handle customer information responsibly and only for legitimate
            store purposes.
          </p>
        </PolicySection>

        <PolicySection number="10" title="Optional Personalization & Marketing">
          <p>A birthday or date of birth is collected only if you voluntarily provide it and may be used to personalize your Darb experience, offers, or gifts. It is not displayed publicly.</p>
          <p>Email marketing is optional and only used when you select the marketing consent checkbox. Essential order and account messages do not depend on marketing consent.</p>
          <p>Meta Pixel or TikTok Pixel operates only when configured and enabled. When the required configuration is absent or disabled, those pixels do not operate.</p>
          <p>Darb may use configured analytics and advertising technologies, including Meta Pixel and server-side conversion measurement, to understand site activity and measure advertising effectiveness.</p>
        </PolicySection>

        <PolicySection
          number="11"
          title="Questions About Your Information"
        >
          <p>
            If you have questions about information connected to your Darb
            account or order, contact Darb at darbcomp@gmail.com or through the Contact page. Darb operates in Egypt and does not publish a customer-service physical address.
          </p>
        </PolicySection>
      </div>

      <div className="mt-10 rounded-[2rem] bg-darb-green p-7 text-darb-beige sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
          Your Privacy
        </p>

        <h2 className="mt-3 font-display text-3xl">
          Your journey should stay yours.
        </h2>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-darb-beige/65">
          Darb uses customer information to support the shopping experience,
          manage orders, and provide customer care. Private account and order
          details are not intended for public display.
        </p>
      </div>
    </InfoPageShell>
  );
}

export default PrivacyPolicy;
