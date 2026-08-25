import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Settings } from "lucide-react";
import { getAdminSettings, updateAdminSettings } from "../../api/adminApi";

const defaultForm = {
  storeName: "Darb",
  arabicName: "درب",
  tagline: "A scent for every path.",
  currency: "EGP",
  contact: {
    phone: "",
    whatsapp: "",
    email: "",
    instagram: "",
    facebook: "",
    tiktok: "",
  },
  delivery: {
    defaultFee: "0",
    freeDeliveryThreshold: "0",
    estimatedDeliveryText:
      "Delivery timing will be confirmed after placing the order.",
  },
  paymentMethods: {
    cashOnDelivery: {
      enabled: true,
      label: "Cash on Delivery",
      instructions: "Pay when your Darb order arrives.",
    },
    instapay: {
      enabled: false,
      label: "InstaPay",
      instructions: "",
    },
    vodafoneCash: {
      enabled: false,
      label: "Vodafone Cash",
      instructions: "",
    },
    paymobCard: {
      enabled: false,
      label: "Card Payment",
      instructions: "Card payment will be available soon.",
    },
  },
  orderSettings: {
    allowGuestCheckout: true,
    autoConfirmPaidOrders: false,
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
    metaTitle: "Darb Perfumes",
    metaDescription:
      "Darb is more than perfume — it is a journey, a memory in every step.",
  },
};

const normalizeSettings = (settings = {}) => {
  return {
    storeName: settings.storeName || defaultForm.storeName,
    arabicName: settings.arabicName || defaultForm.arabicName,
    tagline: settings.tagline || defaultForm.tagline,
    currency: settings.currency || defaultForm.currency,
    contact: {
      phone: settings.contact?.phone || "",
      whatsapp: settings.contact?.whatsapp || "",
      email: settings.contact?.email || "",
      instagram: settings.contact?.instagram || "",
      facebook: settings.contact?.facebook || "",
      tiktok: settings.contact?.tiktok || "",
    },
    delivery: {
      defaultFee: String(settings.delivery?.defaultFee ?? "0"),
      freeDeliveryThreshold: String(
        settings.delivery?.freeDeliveryThreshold ?? "0"
      ),
      estimatedDeliveryText:
        settings.delivery?.estimatedDeliveryText ||
        defaultForm.delivery.estimatedDeliveryText,
    },
    paymentMethods: {
      cashOnDelivery: {
        enabled: Boolean(
          settings.paymentMethods?.cashOnDelivery?.enabled ?? true
        ),
        label:
          settings.paymentMethods?.cashOnDelivery?.label ||
          defaultForm.paymentMethods.cashOnDelivery.label,
        instructions:
          settings.paymentMethods?.cashOnDelivery?.instructions ||
          defaultForm.paymentMethods.cashOnDelivery.instructions,
      },
      instapay: {
        enabled: Boolean(settings.paymentMethods?.instapay?.enabled ?? false),
        label:
          settings.paymentMethods?.instapay?.label ||
          defaultForm.paymentMethods.instapay.label,
        instructions: settings.paymentMethods?.instapay?.instructions || "",
      },
      vodafoneCash: {
        enabled: Boolean(
          settings.paymentMethods?.vodafoneCash?.enabled ?? false
        ),
        label:
          settings.paymentMethods?.vodafoneCash?.label ||
          defaultForm.paymentMethods.vodafoneCash.label,
        instructions:
          settings.paymentMethods?.vodafoneCash?.instructions || "",
      },
      paymobCard: {
        enabled: Boolean(settings.paymentMethods?.paymobCard?.enabled ?? false),
        label:
          settings.paymentMethods?.paymobCard?.label ||
          defaultForm.paymentMethods.paymobCard.label,
        instructions:
          settings.paymentMethods?.paymobCard?.instructions ||
          defaultForm.paymentMethods.paymobCard.instructions,
      },
    },
    orderSettings: {
      allowGuestCheckout: Boolean(
        settings.orderSettings?.allowGuestCheckout ?? true
      ),
      autoConfirmPaidOrders: Boolean(
        settings.orderSettings?.autoConfirmPaidOrders ?? false
      ),
      lowStockDefault: String(settings.orderSettings?.lowStockDefault ?? "3"),
    },
    brand: {
      darkGreen: settings.brand?.darkGreen || defaultForm.brand.darkGreen,
      beige: settings.brand?.beige || defaultForm.brand.beige,
      softGold: settings.brand?.softGold || defaultForm.brand.softGold,
      black: settings.brand?.black || defaultForm.brand.black,
      cream: settings.brand?.cream || defaultForm.brand.cream,
    },
    seo: {
      metaTitle: settings.seo?.metaTitle || defaultForm.seo.metaTitle,
      metaDescription:
        settings.seo?.metaDescription || defaultForm.seo.metaDescription,
    },
  };
};

const buildPayload = (form) => {
  return {
    ...form,
    delivery: {
      defaultFee: Number(form.delivery.defaultFee) || 0,
      freeDeliveryThreshold: Number(form.delivery.freeDeliveryThreshold) || 0,
      estimatedDeliveryText: form.delivery.estimatedDeliveryText,
    },
    orderSettings: {
      allowGuestCheckout: Boolean(form.orderSettings.allowGuestCheckout),
      autoConfirmPaidOrders: Boolean(form.orderSettings.autoConfirmPaidOrders),
      lowStockDefault: Number(form.orderSettings.lowStockDefault) || 3,
    },
  };
};

function TextInput({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-darb-green">
        {label}
      </label>

      <input
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder = "" }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-darb-green">
        {label}
      </label>

      <textarea
        value={value}
        onChange={onChange}
        rows={3}
        placeholder={placeholder}
        className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
      />
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3">
      <span className="text-sm font-semibold text-darb-green">{label}</span>

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 accent-darb-green"
      />
    </label>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
      <h2 className="font-display text-3xl text-darb-green">{title}</h2>

      {description && (
        <p className="mt-2 max-w-3xl leading-7 text-darb-muted">
          {description}
        </p>
      )}

      <div className="mt-6">{children}</div>
    </div>
  );
}

function AdminSettings() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState(defaultForm);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings,
    retry: 1,
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminSettings,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      setMessage(response?.message || "Settings updated successfully.");
      setError("");
    },
    onError: (err) => {
      setMessage("");
      setError(err.friendlyMessage || "Failed to update settings.");
    },
  });

  useEffect(() => {
    if (settingsQuery.data?.data) {
      setForm(normalizeSettings(settingsQuery.data.data));
    }
  }, [settingsQuery.data]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateNestedField = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
  };

  const updatePaymentField = (method, field, value) => {
    setForm((current) => ({
      ...current,
      paymentMethods: {
        ...current.paymentMethods,
        [method]: {
          ...current.paymentMethods[method],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    updateMutation.mutate(buildPayload(form));
  };

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Settings
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Manage Darb store information, delivery rules, payment instructions,
            and brand defaults.
          </p>
        </div>

        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige shadow-soft">
          <Settings size={24} />
        </div>
      </div>

      {settingsQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading settings...</p>
        </div>
      )}

      {settingsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load settings
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {settingsQuery.error?.friendlyMessage ||
              "Store settings are unavailable right now."}
          </p>
        </div>
      )}

      {!settingsQuery.isLoading && !settingsQuery.isError && (
        <form onSubmit={handleSubmit} className="space-y-8">
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

          <SectionCard
            title="Store Identity"
            description="Basic public information shown across the Darb storefront."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Store Name"
                value={form.storeName}
                onChange={(event) => updateField("storeName", event.target.value)}
              />

              <TextInput
                label="Arabic Name"
                value={form.arabicName}
                onChange={(event) => updateField("arabicName", event.target.value)}
              />

              <TextInput
                label="Currency"
                value={form.currency}
                onChange={(event) => updateField("currency", event.target.value)}
              />

              <TextInput
                label="Tagline"
                value={form.tagline}
                onChange={(event) => updateField("tagline", event.target.value)}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Contact Details"
            description="Customer-facing contact and social links."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextInput
                label="Phone"
                value={form.contact.phone}
                onChange={(event) =>
                  updateNestedField("contact", "phone", event.target.value)
                }
              />

              <TextInput
                label="WhatsApp"
                value={form.contact.whatsapp}
                onChange={(event) =>
                  updateNestedField("contact", "whatsapp", event.target.value)
                }
              />

              <TextInput
                label="Email"
                value={form.contact.email}
                onChange={(event) =>
                  updateNestedField("contact", "email", event.target.value)
                }
              />

              <TextInput
                label="Instagram"
                value={form.contact.instagram}
                onChange={(event) =>
                  updateNestedField("contact", "instagram", event.target.value)
                }
              />

              <TextInput
                label="Facebook"
                value={form.contact.facebook}
                onChange={(event) =>
                  updateNestedField("contact", "facebook", event.target.value)
                }
              />

              <TextInput
                label="TikTok"
                value={form.contact.tiktok}
                onChange={(event) =>
                  updateNestedField("contact", "tiktok", event.target.value)
                }
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Delivery"
            description="These values are used when orders are created."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Default Delivery Fee"
                type="number"
                value={form.delivery.defaultFee}
                onChange={(event) =>
                  updateNestedField("delivery", "defaultFee", event.target.value)
                }
              />

              <TextInput
                label="Free Delivery Threshold"
                type="number"
                value={form.delivery.freeDeliveryThreshold}
                onChange={(event) =>
                  updateNestedField(
                    "delivery",
                    "freeDeliveryThreshold",
                    event.target.value
                  )
                }
              />

              <div className="md:col-span-2">
                <TextArea
                  label="Estimated Delivery Text"
                  value={form.delivery.estimatedDeliveryText}
                  onChange={(event) =>
                    updateNestedField(
                      "delivery",
                      "estimatedDeliveryText",
                      event.target.value
                    )
                  }
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Payment Methods"
            description="Enable or disable checkout payment options and add instructions."
          >
            <div className="space-y-6">
              <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                <ToggleField
                  label="Enable Cash on Delivery"
                  checked={form.paymentMethods.cashOnDelivery.enabled}
                  onChange={(event) =>
                    updatePaymentField(
                      "cashOnDelivery",
                      "enabled",
                      event.target.checked
                    )
                  }
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Label"
                    value={form.paymentMethods.cashOnDelivery.label}
                    onChange={(event) =>
                      updatePaymentField(
                        "cashOnDelivery",
                        "label",
                        event.target.value
                      )
                    }
                  />

                  <TextInput
                    label="Instructions"
                    value={form.paymentMethods.cashOnDelivery.instructions}
                    onChange={(event) =>
                      updatePaymentField(
                        "cashOnDelivery",
                        "instructions",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                <ToggleField
                  label="Enable InstaPay"
                  checked={form.paymentMethods.instapay.enabled}
                  onChange={(event) =>
                    updatePaymentField(
                      "instapay",
                      "enabled",
                      event.target.checked
                    )
                  }
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Label"
                    value={form.paymentMethods.instapay.label}
                    onChange={(event) =>
                      updatePaymentField(
                        "instapay",
                        "label",
                        event.target.value
                      )
                    }
                  />

                  <TextInput
                    label="Instructions"
                    value={form.paymentMethods.instapay.instructions}
                    onChange={(event) =>
                      updatePaymentField(
                        "instapay",
                        "instructions",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                <ToggleField
                  label="Enable Vodafone Cash"
                  checked={form.paymentMethods.vodafoneCash.enabled}
                  onChange={(event) =>
                    updatePaymentField(
                      "vodafoneCash",
                      "enabled",
                      event.target.checked
                    )
                  }
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Label"
                    value={form.paymentMethods.vodafoneCash.label}
                    onChange={(event) =>
                      updatePaymentField(
                        "vodafoneCash",
                        "label",
                        event.target.value
                      )
                    }
                  />

                  <TextInput
                    label="Instructions"
                    value={form.paymentMethods.vodafoneCash.instructions}
                    onChange={(event) =>
                      updatePaymentField(
                        "vodafoneCash",
                        "instructions",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                <ToggleField
                  label="Enable Card Payment"
                  checked={form.paymentMethods.paymobCard.enabled}
                  onChange={(event) =>
                    updatePaymentField(
                      "paymobCard",
                      "enabled",
                      event.target.checked
                    )
                  }
                />

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <TextInput
                    label="Label"
                    value={form.paymentMethods.paymobCard.label}
                    onChange={(event) =>
                      updatePaymentField(
                        "paymobCard",
                        "label",
                        event.target.value
                      )
                    }
                  />

                  <TextInput
                    label="Instructions"
                    value={form.paymentMethods.paymobCard.instructions}
                    onChange={(event) =>
                      updatePaymentField(
                        "paymobCard",
                        "instructions",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Order Settings">
            <div className="grid gap-4 md:grid-cols-3">
              <ToggleField
                label="Allow Guest Checkout"
                checked={form.orderSettings.allowGuestCheckout}
                onChange={(event) =>
                  updateNestedField(
                    "orderSettings",
                    "allowGuestCheckout",
                    event.target.checked
                  )
                }
              />

              <ToggleField
                label="Auto Confirm Paid Orders"
                checked={form.orderSettings.autoConfirmPaidOrders}
                onChange={(event) =>
                  updateNestedField(
                    "orderSettings",
                    "autoConfirmPaidOrders",
                    event.target.checked
                  )
                }
              />

              <TextInput
                label="Default Low Stock Alert"
                type="number"
                value={form.orderSettings.lowStockDefault}
                onChange={(event) =>
                  updateNestedField(
                    "orderSettings",
                    "lowStockDefault",
                    event.target.value
                  )
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="Brand Colors">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <TextInput
                label="Dark Green"
                value={form.brand.darkGreen}
                onChange={(event) =>
                  updateNestedField("brand", "darkGreen", event.target.value)
                }
              />

              <TextInput
                label="Beige"
                value={form.brand.beige}
                onChange={(event) =>
                  updateNestedField("brand", "beige", event.target.value)
                }
              />

              <TextInput
                label="Soft Gold"
                value={form.brand.softGold}
                onChange={(event) =>
                  updateNestedField("brand", "softGold", event.target.value)
                }
              />

              <TextInput
                label="Black"
                value={form.brand.black}
                onChange={(event) =>
                  updateNestedField("brand", "black", event.target.value)
                }
              />

              <TextInput
                label="Cream"
                value={form.brand.cream}
                onChange={(event) =>
                  updateNestedField("brand", "cream", event.target.value)
                }
              />
            </div>
          </SectionCard>

          <SectionCard title="SEO Defaults">
            <div className="grid gap-4">
              <TextInput
                label="Meta Title"
                value={form.seo.metaTitle}
                onChange={(event) =>
                  updateNestedField("seo", "metaTitle", event.target.value)
                }
              />

              <TextArea
                label="Meta Description"
                value={form.seo.metaDescription}
                onChange={(event) =>
                  updateNestedField(
                    "seo",
                    "metaDescription",
                    event.target.value
                  )
                }
              />
            </div>
          </SectionCard>

          <div className="sticky bottom-5 z-10 rounded-[1.5rem] border border-darb-gold/20 bg-white/95 p-4 shadow-soft backdrop-blur">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              <Save size={18} />
              {updateMutation.isPending ? "Saving Settings..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default AdminSettings;