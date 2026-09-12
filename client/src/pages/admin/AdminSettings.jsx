import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Save,
  Settings,
} from "lucide-react";

import {
  getAdminSettings,
  updateAdminSettings,
} from "../../api/adminApi";
import { useFeedback } from "../../context/FeedbackContext";

/* =========================
   DEFAULTS
========================= */

const INSTAPAY_RECIPIENT =
  "+20 10 99589674";

const INSTAPAY_INSTRUCTIONS =
  "Transfer the exact order total to the InstaPay number, then upload a screenshot of the successful transaction.";

const defaultForm = {
  storeName: "Darb",

  arabicName: "درب",

  tagline:
    "A scent for every path.",

  currency: "EGP",

  contact: {
    phone: "",
    whatsapp: "+20 10 99589674",
    email: "darbcomp@gmail.com",
    instagram: "https://www.instagram.com/darb1.0",
    facebook: "",
    tiktok: "https://www.tiktok.com/@darb1.0",
  },

  delivery: {
    defaultFee: "135",

    freeDeliveryThreshold:
      "0",

    estimatedDeliveryText:
      "3–5 business days",
    governorateFees: { cairo: "80", giza: "80", alexandria: "125", other: "135" },
  },

  paymentMethods: {
    cashOnDelivery: {
      enabled: true,

      label:
        "Cash on Delivery",

      instructions:
        "Pay when your Darb order arrives.",

      recipient: "",

      requireProof: false,
    },

    instapay: {
      enabled: true,

      label: "InstaPay",

      instructions:
        INSTAPAY_INSTRUCTIONS,

      recipient:
        INSTAPAY_RECIPIENT,

      requireProof: true,
    },

    vodafoneCash: {
      enabled: true,

      label:
        "Vodafone Cash",

      instructions: "Transfer the exact order total to the Vodafone Cash number, then upload a screenshot of the successful transaction.",

      recipient: INSTAPAY_RECIPIENT,

      requireProof: true,
    },

    paymobCard: {
      enabled: false,

      label:
        "Card Payment",

      instructions:
        "Card payment will be available soon.",

      recipient: "",

      requireProof: false,
    },
  },

  orderSettings: {
    allowGuestCheckout:
      true,

    autoConfirmPaidOrders:
      false,

    lowStockDefault: "3",
  },

  brand: {
    darkGreen: "#0F3D2E",
    beige: "#E7DCC9",
    softGold: "#C8A97E",
    black: "#1C1C1C",
    cream: "#F7F1E6",
  },

  seo: {
    metaTitle:
      "Darb Perfumes",

    metaDescription:
      "Darb is more than perfume — it is a journey, a memory in every step.",
  },
  marketingPixels: {
    meta: { enabled: false, id: "" },
    tiktok: { enabled: false, id: "" },
  },
};

/* =========================
   NORMALIZATION
========================= */

const normalizePaymentMethod = (
  method,
  defaults
) => ({
  enabled: Boolean(
    method?.enabled ??
      defaults.enabled
  ),

  label:
    method?.label ??
    defaults.label,

  instructions:
    method?.instructions ??
    defaults.instructions,

  recipient:
    method?.recipient ??
    defaults.recipient,

  requireProof: Boolean(
    method?.requireProof ??
      defaults.requireProof
  ),
});

const normalizeSettings = (
  settings = {}
) => ({
  storeName:
    settings.storeName ||
    defaultForm.storeName,

  arabicName:
    settings.arabicName ||
    defaultForm.arabicName,

  tagline:
    settings.tagline ||
    defaultForm.tagline,

  currency:
    settings.currency ||
    defaultForm.currency,

  contact: {
    phone:
      settings.contact?.phone ||
      "",

    whatsapp:
      settings.contact
        ?.whatsapp || "",

    email:
      settings.contact?.email ||
      "",

    instagram:
      settings.contact
        ?.instagram || "",

    facebook:
      settings.contact
        ?.facebook || "",

    tiktok:
      settings.contact?.tiktok ||
      "",
  },

  delivery: {
    defaultFee: String(
      settings.delivery
        ?.defaultFee ??
        "0"
    ),

    freeDeliveryThreshold:
      String(
        settings.delivery
          ?.freeDeliveryThreshold ??
          "0"
      ),

    estimatedDeliveryText:
      settings.delivery
        ?.estimatedDeliveryText ||
      defaultForm.delivery
        .estimatedDeliveryText,
    governorateFees: {
      cairo: String(settings.delivery?.governorateFees?.cairo ?? "80"),
      giza: String(settings.delivery?.governorateFees?.giza ?? "80"),
      alexandria: String(settings.delivery?.governorateFees?.alexandria ?? "125"),
      other: String(settings.delivery?.governorateFees?.other ?? "135"),
    },
  },

  paymentMethods: {
    cashOnDelivery:
      normalizePaymentMethod(
        settings.paymentMethods
          ?.cashOnDelivery,

        defaultForm
          .paymentMethods
          .cashOnDelivery
      ),

    instapay:
      normalizePaymentMethod(
        settings.paymentMethods
          ?.instapay,

        defaultForm
          .paymentMethods
          .instapay
      ),

    vodafoneCash:
      normalizePaymentMethod(
        settings.paymentMethods
          ?.vodafoneCash,

        defaultForm
          .paymentMethods
          .vodafoneCash
      ),

    paymobCard:
      normalizePaymentMethod(
        settings.paymentMethods
          ?.paymobCard,

        defaultForm
          .paymentMethods
          .paymobCard
      ),
  },

  orderSettings: {
    allowGuestCheckout:
      Boolean(
        settings.orderSettings
          ?.allowGuestCheckout ??
          true
      ),

    autoConfirmPaidOrders:
      Boolean(
        settings.orderSettings
          ?.autoConfirmPaidOrders ??
          false
      ),

    lowStockDefault:
      String(
        settings.orderSettings
          ?.lowStockDefault ??
          "3"
      ),
  },

  brand: {
    darkGreen:
      settings.brand
        ?.darkGreen ||
      defaultForm.brand
        .darkGreen,

    beige:
      settings.brand?.beige ||
      defaultForm.brand.beige,

    softGold:
      settings.brand
        ?.softGold ||
      defaultForm.brand
        .softGold,

    black:
      settings.brand?.black ||
      defaultForm.brand.black,

    cream:
      settings.brand?.cream ||
      defaultForm.brand.cream,
  },

  seo: {
    metaTitle:
      settings.seo
        ?.metaTitle ||
      defaultForm.seo
        .metaTitle,

    metaDescription:
      settings.seo
        ?.metaDescription ||
      defaultForm.seo
        .metaDescription,
  },
  marketingPixels: {
    meta: { enabled: Boolean(settings.marketingPixels?.meta?.enabled), id: settings.marketingPixels?.meta?.id || "" },
    tiktok: { enabled: Boolean(settings.marketingPixels?.tiktok?.enabled), id: settings.marketingPixels?.tiktok?.id || "" },
  },
});

/* =========================
   BUILD PAYLOAD
========================= */

const buildPayload = (
  form
) => ({
  ...form,

  delivery: {
    defaultFee:
      Number(
        form.delivery
          .defaultFee
      ) || 0,

    freeDeliveryThreshold:
      Number(
        form.delivery
          .freeDeliveryThreshold
      ) || 0,

    estimatedDeliveryText:
      form.delivery
        .estimatedDeliveryText,
    governorateFees: {
      cairo: Number(form.delivery.governorateFees.cairo) || 80,
      giza: Number(form.delivery.governorateFees.giza) || 80,
      alexandria: Number(form.delivery.governorateFees.alexandria) || 125,
      other: Number(form.delivery.governorateFees.other) || 135,
    },
  },

  paymentMethods: {
    cashOnDelivery: {
      ...form.paymentMethods
        .cashOnDelivery,

      enabled: Boolean(
        form.paymentMethods
          .cashOnDelivery
          .enabled
      ),

      requireProof:
        Boolean(
          form.paymentMethods
            .cashOnDelivery
            .requireProof
        ),
    },

    instapay: {
      ...form.paymentMethods
        .instapay,

      enabled: Boolean(
        form.paymentMethods
          .instapay.enabled
      ),

      requireProof:
        Boolean(
          form.paymentMethods
            .instapay
            .requireProof
        ),
    },

    vodafoneCash: {
      ...form.paymentMethods
        .vodafoneCash,

      enabled: Boolean(
        form.paymentMethods
          .vodafoneCash
          .enabled
      ),

      requireProof:
        Boolean(
          form.paymentMethods
            .vodafoneCash
            .requireProof
        ),
    },

    paymobCard: {
      ...form.paymentMethods
        .paymobCard,

      enabled: Boolean(
        form.paymentMethods
          .paymobCard.enabled
      ),

      requireProof:
        Boolean(
          form.paymentMethods
            .paymobCard
            .requireProof
        ),
    },
  },

  orderSettings: {
    allowGuestCheckout:
      Boolean(
        form.orderSettings
          .allowGuestCheckout
      ),

    autoConfirmPaidOrders:
      Boolean(
        form.orderSettings
          .autoConfirmPaidOrders
      ),

    lowStockDefault:
      Number(
        form.orderSettings
          .lowStockDefault
      ) || 3,
  },
});

/* =========================
   SHARED COMPONENTS
========================= */

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-darb-green">
        {label}
      </label>

      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={
          placeholder
        }
        disabled={disabled}
        className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder = "",
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-darb-green">
        {label}
      </label>

      <textarea
        value={value}
        onChange={onChange}
        rows={3}
        placeholder={
          placeholder
        }
        className="w-full rounded-3xl border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
      />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  description = "",
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3">
      <div>
        <span className="block text-sm font-semibold text-darb-green">
          {label}
        </span>

        {description && (
          <span className="mt-1 block text-xs leading-5 text-darb-muted">
            {description}
          </span>
        )}
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 shrink-0 accent-darb-green"
      />
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
}) {
  return (
    <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
      <h2 className="font-display text-3xl text-darb-green">
        {title}
      </h2>

      {description && (
        <p className="mt-2 max-w-3xl leading-7 text-darb-muted">
          {description}
        </p>
      )}

      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}

function PaymentCard({
  title,

  enabled,
  onEnabledChange,

  label,
  onLabelChange,

  instructions,
  onInstructionsChange,

  recipient = "",
  onRecipientChange,

  requireProof = false,
  onRequireProofChange,

  showRecipient = false,
  showProof = false,

  notice = "",
}) {
  return (
    <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
      <ToggleField
        label={`Enable ${title}`}
        checked={
          enabled
        }
        onChange={
          onEnabledChange
        }
      />

      {notice && (
        <div className="mt-4 rounded-2xl border border-darb-gold/30 bg-white px-4 py-3 text-sm leading-6 text-darb-muted">
          {notice}
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TextInput
          label="Checkout Label"
          value={label}
          onChange={
            onLabelChange
          }
        />

        {showRecipient && (
          <TextInput
            label="Recipient Number / Account"
            value={
              recipient
            }
            onChange={
              onRecipientChange
            }
            placeholder="Payment destination"
          />
        )}

        <div
          className={
            showRecipient
              ? "md:col-span-2"
              : "md:col-span-1"
          }
        >
          <TextArea
            label="Customer Instructions"
            value={
              instructions
            }
            onChange={
              onInstructionsChange
            }
            placeholder="Instructions shown during checkout"
          />
        </div>

        {showProof && (
          <div className="md:col-span-2">
            <ToggleField
              label="Require Payment Proof"
              description="Customer must upload a transaction screenshot before the order can be submitted."
              checked={
                requireProof
              }
              onChange={
                onRequireProofChange
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   PAGE
========================= */

function AdminSettings() {
  const queryClient =
    useQueryClient();
  const { notify } = useFeedback();

  /*
    IMPORTANT:

    null means:
    "The admin hasn't edited anything yet."

    Therefore we can use data directly from
    React Query without setState inside useEffect.
  */
  const [
    editedForm,
    setEditedForm,
  ] = useState(null);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  /* =========================
     LOAD SETTINGS
  ========================= */

  const settingsQuery =
    useQuery({
      queryKey: [
        "admin-settings",
      ],

      queryFn:
        getAdminSettings,

      retry: 1,
    });

  /*
    No useEffect.

    When the API loads, normalizedServerForm
    automatically recalculates.
  */
  const normalizedServerForm =
    useMemo(
      () =>
        normalizeSettings(
          settingsQuery.data
            ?.data ||
            defaultForm
        ),
      [
        settingsQuery.data,
      ]
    );

  /*
    Once the admin edits something,
    editedForm takes over.

    Until then, use the latest server data.
  */
  const form =
    editedForm ??
    normalizedServerForm;

  /* =========================
     SAVE SETTINGS
  ========================= */

  const updateMutation =
    useMutation({
      mutationFn:
        updateAdminSettings,

      onSuccess: (
        response
      ) => {
        const savedForm =
          normalizeSettings(
            response?.data ||
              form
          );

        /*
          This is in the mutation callback,
          NOT inside useEffect, so the lint
          problem is gone.
        */
        setEditedForm(
          savedForm
        );

        queryClient.setQueryData(
          [
            "admin-settings",
          ],
          (current) => ({
            ...(current ||
              {}),

            success: true,

            data:
              response?.data ||
              current?.data,
          })
        );

        queryClient.invalidateQueries({
          queryKey: [
            "admin-dashboard",
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            "public-settings",
          ],
        });

        setMessage(
          ""
        );
        notify({ type: "success", title: "Settings saved", message: response?.message });

        setError("");
      },

      onError: (
        err
      ) => {
        setMessage("");

        setError(
          err.friendlyMessage ||
            "Failed to update settings."
        );
        notify({ type: "error", title: "Settings were not saved", message: err.friendlyMessage || "Please try again." });
      },
    });

  /* =========================
     FIELD HELPERS
  ========================= */

  const updateField = (
    field,
    value
  ) => {
    setEditedForm(
      (current) => ({
        ...(current ??
          form),

        [field]:
          value,
      })
    );
  };

  const updateNestedField = (
    section,
    field,
    value
  ) => {
    setEditedForm(
      (current) => {
        const base =
          current ??
          form;

        return {
          ...base,

          [section]: {
            ...base[
              section
            ],

            [field]:
              value,
          },
        };
      }
    );
  };

  const updatePaymentField = (
    method,
    field,
    value
  ) => {
    setEditedForm(
      (current) => {
        const base =
          current ??
          form;

        return {
          ...base,

          paymentMethods:
            {
              ...base.paymentMethods,

              [method]:
                {
                  ...base
                    .paymentMethods[
                    method
                  ],

                  [field]:
                    value,
                },
            },
        };
      }
    );
  };

  /* =========================
     SUBMIT
  ========================= */

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    updateMutation.mutate(
      buildPayload(form)
    );
  };

  /* =========================
     PAGE
  ========================= */

  return (
    <section className="admin-page admin-settings">
      {/* HEADER */}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Settings
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Manage Darb
            store
            information,
            delivery
            rules,
            payment
            methods, and
            brand
            defaults.
          </p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige shadow-soft">
          <Settings
            size={24}
          />
        </div>
      </div>

      {/* LOADING */}

      {settingsQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">
            Loading
            settings...
          </p>
        </div>
      )}

      {/* QUERY ERROR */}

      {settingsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not
            load
            settings
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {settingsQuery
              .error
              ?.friendlyMessage ||
              "Store settings are unavailable right now."}
          </p>
        </div>
      )}

      {!settingsQuery.isLoading &&
        !settingsQuery.isError && (
          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-8"
          >
            {/* MESSAGES */}

            {message && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-darb-green px-6 py-5 text-darb-beige">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">Owner settings</p>
              <h2 className="mt-2 font-display text-3xl">Store operations</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-darb-beige/80">
                Manage the details customers see and the settings used for everyday orders.
              </p>
            </div>

            {/* STORE IDENTITY */}

            <SectionCard
              title="Store Identity"
              description="Basic public information shown across the Darb storefront."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Store Name"
                  value={
                    form.storeName
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "storeName",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Arabic Name"
                  value={
                    form.arabicName
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "arabicName",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Currency"
                  value={
                    form.currency
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "currency",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Tagline"
                  value={
                    form.tagline
                  }
                  onChange={(
                    event
                  ) =>
                    updateField(
                      "tagline",
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </SectionCard>

            {/* CONTACT */}

            <SectionCard
              title="Contact Details"
              description="Customer-facing contact and social links."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <TextInput
                  label="Phone"
                  value={
                    form.contact
                      .phone
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "contact",
                      "phone",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="WhatsApp"
                  value={
                    form.contact
                      .whatsapp
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "contact",
                      "whatsapp",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Email"
                  value={
                    form.contact
                      .email
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "contact",
                      "email",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Instagram"
                  value={
                    form.contact
                      .instagram
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "contact",
                      "instagram",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Facebook"
                  value={
                    form.contact
                      .facebook
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "contact",
                      "facebook",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="TikTok"
                  value={
                    form.contact
                      .tiktok
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "contact",
                      "tiktok",
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </SectionCard>

            {/* DELIVERY */}

            <SectionCard
              title="Delivery"
              description="These values are used when Darb orders are calculated."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Default Delivery Fee"
                  type="number"
                  value={
                    form.delivery
                      .defaultFee
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "delivery",
                      "defaultFee",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Free Delivery Threshold"
                  type="number"
                  value={
                    form.delivery
                      .freeDeliveryThreshold
                  }
                  onChange={(
                    ) => updateNestedField("delivery", "freeDeliveryThreshold", "0")}
                  disabled
                />

                {[
                  ["cairo", "Cairo Fee"], ["giza", "Giza Fee"],
                  ["alexandria", "Alexandria Fee"], ["other", "Other Governorates Fee"],
                ].map(([key, label]) => (
                  <TextInput key={key} label={label} type="number" value={form.delivery.governorateFees[key]}
                    onChange={(event) => setEditedForm((current) => ({ ...(current || normalizedServerForm), delivery: { ...(current || normalizedServerForm).delivery, governorateFees: { ...(current || normalizedServerForm).delivery.governorateFees, [key]: event.target.value } } }))} />
                ))}

                <div className="md:col-span-2">
                  <TextArea
                    label="Estimated Delivery Text"
                    value={
                      form.delivery
                        .estimatedDeliveryText
                    }
                    onChange={(
                      event
                    ) =>
                      updateNestedField(
                        "delivery",
                        "estimatedDeliveryText",
                        event.target
                          .value
                      )
                    }
                  />
                </div>
              </div>
            </SectionCard>

            {/* PAYMENT METHODS */}

            <SectionCard
              title="Payment Methods"
              description="Control which payment options customers can use during checkout."
            >
              <div className="space-y-6">
                {/* CASH ON DELIVERY */}

                <PaymentCard
                  title="Cash on Delivery"
                  enabled={
                    form
                      .paymentMethods
                      .cashOnDelivery
                      .enabled
                  }
                  onEnabledChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "cashOnDelivery",
                      "enabled",
                      event.target
                        .checked
                    )
                  }
                  label={
                    form
                      .paymentMethods
                      .cashOnDelivery
                      .label
                  }
                  onLabelChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "cashOnDelivery",
                      "label",
                      event.target
                        .value
                    )
                  }
                  instructions={
                    form
                      .paymentMethods
                      .cashOnDelivery
                      .instructions
                  }
                  onInstructionsChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "cashOnDelivery",
                      "instructions",
                      event.target
                        .value
                    )
                  }
                />

                {/* INSTAPAY */}

                <PaymentCard
                  title="InstaPay"
                  enabled={
                    form
                      .paymentMethods
                      .instapay
                      .enabled
                  }
                  onEnabledChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "instapay",
                      "enabled",
                      event.target
                        .checked
                    )
                  }
                  label={
                    form
                      .paymentMethods
                      .instapay
                      .label
                  }
                  onLabelChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "instapay",
                      "label",
                      event.target
                        .value
                    )
                  }
                  instructions={
                    form
                      .paymentMethods
                      .instapay
                      .instructions
                  }
                  onInstructionsChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "instapay",
                      "instructions",
                      event.target
                        .value
                    )
                  }
                  recipient={
                    form
                      .paymentMethods
                      .instapay
                      .recipient
                  }
                  onRecipientChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "instapay",
                      "recipient",
                      event.target
                        .value
                    )
                  }
                  requireProof={
                    form
                      .paymentMethods
                      .instapay
                      .requireProof
                  }
                  onRequireProofChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "instapay",
                      "requireProof",
                      event.target
                        .checked
                    )
                  }
                  showRecipient
                  showProof
                  notice="Keep InstaPay disabled until the payment-proof checkout and admin verification flow is finished."
                />

                {/* VODAFONE CASH */}

                <PaymentCard
                  title="Vodafone Cash"
                  enabled={
                    form
                      .paymentMethods
                      .vodafoneCash
                      .enabled
                  }
                  onEnabledChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "vodafoneCash",
                      "enabled",
                      event.target
                        .checked
                    )
                  }
                  label={
                    form
                      .paymentMethods
                      .vodafoneCash
                      .label
                  }
                  onLabelChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "vodafoneCash",
                      "label",
                      event.target
                        .value
                    )
                  }
                  instructions={
                    form
                      .paymentMethods
                      .vodafoneCash
                      .instructions
                  }
                  onInstructionsChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "vodafoneCash",
                      "instructions",
                      event.target
                        .value
                    )
                  }
                  recipient={
                    form
                      .paymentMethods
                      .vodafoneCash
                      .recipient
                  }
                  onRecipientChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "vodafoneCash",
                      "recipient",
                      event.target
                        .value
                    )
                  }
                  requireProof={
                    form
                      .paymentMethods
                      .vodafoneCash
                      .requireProof
                  }
                  onRequireProofChange={(
                    event
                  ) =>
                    updatePaymentField(
                      "vodafoneCash",
                      "requireProof",
                      event.target
                        .checked
                    )
                  }
                  showRecipient
                  showProof
                />

              </div>
            </SectionCard>

            {/* ORDER SETTINGS */}

            <SectionCard
              title="Order Settings"
            >
              <div className="grid gap-4 md:grid-cols-3">
                <ToggleField
                  label="Allow Guest Checkout"
                  checked={
                    form
                      .orderSettings
                      .allowGuestCheckout
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "orderSettings",
                      "allowGuestCheckout",
                      event.target
                        .checked
                    )
                  }
                />

                <TextInput
                  label="Default Low Stock Alert"
                  type="number"
                  value={
                    form
                      .orderSettings
                      .lowStockDefault
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "orderSettings",
                      "lowStockDefault",
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </SectionCard>

            <details className="group overflow-hidden rounded-[1.75rem] border border-darb-gold/25 bg-white">
              <summary className="cursor-pointer list-none px-6 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-green">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">Advanced / Developer</p>
                    <h2 className="mt-1 font-display text-3xl text-darb-green">Technical storefront settings</h2>
                    <p className="mt-2 text-sm text-darb-muted">Brand tokens, analytics integrations, and SEO defaults. Most owners rarely need these controls.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-darb-gold/30 px-4 py-2 text-xs font-semibold text-darb-green group-open:bg-darb-green group-open:text-darb-beige">Open</span>
                </div>
              </summary>

              <div className="space-y-8 border-t border-darb-gold/20 p-5 sm:p-6">
            {/* BRAND */}

            <SectionCard
              title="Brand Colors"
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <TextInput
                  label="Dark Green"
                  value={
                    form.brand
                      .darkGreen
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "brand",
                      "darkGreen",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Beige"
                  value={
                    form.brand
                      .beige
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "brand",
                      "beige",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Soft Gold"
                  value={
                    form.brand
                      .softGold
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "brand",
                      "softGold",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Black"
                  value={
                    form.brand
                      .black
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "brand",
                      "black",
                      event.target
                        .value
                    )
                  }
                />

                <TextInput
                  label="Cream"
                  value={
                    form.brand
                      .cream
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "brand",
                      "cream",
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </SectionCard>

            {/* SEO */}

            <SectionCard title="Marketing Pixels">
              <p className="mb-4 text-sm leading-6 text-darb-muted">Dormant until an ID is present and the channel is enabled.</p>
              {[["meta", "Meta Pixel"], ["tiktok", "TikTok Pixel"]].map(([channel, label]) => (
                <div key={channel} className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <TextInput label={`${label} ID`} value={form.marketingPixels[channel].id} onChange={(event) => updateNestedField("marketingPixels", channel, { ...form.marketingPixels[channel], id: event.target.value })} />
                  <ToggleField label="Enabled" checked={form.marketingPixels[channel].enabled} onChange={(event) => updateNestedField("marketingPixels", channel, { ...form.marketingPixels[channel], enabled: event.target.checked })} />
                </div>
              ))}
            </SectionCard>

            {/* SEO */}

            <SectionCard
              title="SEO Defaults"
            >
              <div className="grid gap-4">
                <TextInput
                  label="Meta Title"
                  value={
                    form.seo
                      .metaTitle
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "seo",
                      "metaTitle",
                      event.target
                        .value
                    )
                  }
                />

                <TextArea
                  label="Meta Description"
                  value={
                    form.seo
                      .metaDescription
                  }
                  onChange={(
                    event
                  ) =>
                    updateNestedField(
                      "seo",
                      "metaDescription",
                      event.target
                        .value
                    )
                  }
                />
              </div>
            </SectionCard>
              </div>
            </details>

            {/* SAVE */}

            <div className="sticky bottom-5 z-10 rounded-[1.5rem] border border-darb-gold/20 bg-white/95 p-4 shadow-soft backdrop-blur">
              <button
                type="submit"
                disabled={
                  updateMutation.isPending
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
              >
                <Save
                  size={18}
                />

                {updateMutation.isPending
                  ? "Saving Settings..."
                  : "Save Settings"}
              </button>
            </div>
          </form>
        )}
    </section>
  );
}

export default AdminSettings;
