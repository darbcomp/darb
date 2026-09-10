import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, ImagePlus, Trash2 } from "lucide-react";
import { createOrder, previewOrder } from "../../api/orderApi";
import { getPublicSettings } from "../../api/settingsApi";
import { getMyRewards } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/useCart";
import { formatCurrency } from "../../utils/formatCurrency";
const MAX_PAYMENT_PROOF_SIZE = 10 * 1024 * 1024;
const ALLOWED_PAYMENT_PROOF_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];
const initialFormData = {
    name: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    notes: "",
    paymentMethod: "cash_on_delivery",
    couponCode: "",
    transferSenderName: "",
    isGift: false,
    giftMessage: "",
    birthday: "",
    entitlementId: "",
    marketingConsent: false,
};
const defaultSettings = {
    delivery: {
        defaultFee: 135,
        freeDeliveryThreshold: 0,
        estimatedDeliveryText: "3–5 business days",
    },
    paymentMethods: {
        cashOnDelivery: {
            enabled: true,
            label: "Cash on Delivery",
            instructions: "Pay when your Darb order arrives.",
            recipient: "",
            requireProof: false,
        },
        instapay: {
            enabled: true,
            label: "InstaPay",
            instructions: "Transfer the exact order total, then upload a screenshot of the successful transaction.",
            recipient: "+20 10 99589674",
            requireProof: true,
        },
        vodafoneCash: {
            enabled: true,
            label: "Vodafone Cash",
            instructions: "Transfer the full order total, then upload a screenshot of the successful transaction.",
            recipient: "+20 10 99589674",
            requireProof: true,
        },
        paymobCard: {
            enabled: false,
            label: "Card Payment",
            instructions: "Card payment will be available soon.",
            recipient: "",
            requireProof: false,
        },
    },
};
const paymentMethodMap = [
    {
        checkoutValue: "cash_on_delivery",
        settingsKey: "cashOnDelivery",
        fallbackLabel: "Cash on Delivery",
        fallbackDescription: "Pay when your Darb order arrives.",
    },
    {
        checkoutValue: "instapay",
        settingsKey: "instapay",
        fallbackLabel: "InstaPay",
        fallbackDescription: "Payment instructions will be confirmed by the store.",
    },
    {
        checkoutValue: "vodafone_cash",
        settingsKey: "vodafoneCash",
        fallbackLabel: "Vodafone Cash",
        fallbackDescription: "Wallet details will be added by the store.",
    },
    {
        checkoutValue: "paymob_card",
        settingsKey: "paymobCard",
        fallbackLabel: "Card Payment",
        fallbackDescription: "Card payment will be available soon.",
    },
];
function Checkout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { items, isEmpty, subtotal, productSavings, itemCount, clearCart } = useCart();
    const [formData, setFormData] = useState(initialFormData);
    const [appliedCouponCode, setAppliedCouponCode] = useState("");
    const [error, setError] = useState("");
    const [paymentProof, setPaymentProof] = useState(null);
    const paymentProofPreview = useMemo(() => (paymentProof ? URL.createObjectURL(paymentProof) : ""), [paymentProof]);
    useEffect(() => {
        return () => {
            if (paymentProofPreview) {
                URL.revokeObjectURL(paymentProofPreview);
            }
        };
    }, [paymentProofPreview]);
    /* =========================
       ORDER ITEMS
    ========================== */
    const checkoutItems = useMemo(() => {
        return items.map((item) => ({
            product: item.productId,
            slug: item.slug,
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            lineTotal: item.price * item.quantity,
            variant: item.variant,
        }));
    }, [items]);
    /* =========================
       STORE SETTINGS
    ========================== */
    const settingsQuery = useQuery({
        queryKey: ["public-settings"],
        queryFn: getPublicSettings,
        retry: 1,
    });
    const rewardsQuery = useQuery({ queryKey: ["my-rewards"], queryFn: getMyRewards, enabled: Boolean(user) });
    /* =========================
       ORDER PREVIEW
    ========================== */
    const previewQuery = useQuery({
        queryKey: ["checkout-preview", checkoutItems, appliedCouponCode, formData.entitlementId, formData.governorate],
        queryFn: () => previewOrder({
            items: checkoutItems,
            couponCode: appliedCouponCode,
            shippingAddress: { governorate: formData.governorate },
            entitlementId: formData.entitlementId,
        }),
        enabled: !isEmpty && checkoutItems.length > 0,
        retry: 1,
    });
    const settings = settingsQuery.data?.data ||
        defaultSettings;
    /* =========================
       AVAILABLE PAYMENT METHODS
    ========================== */
    const availablePaymentMethods = useMemo(() => {
        const methods = paymentMethodMap
            .map((method) => {
            const settingsMethod = settings.paymentMethods?.[method.settingsKey];
            return {
                key: method.checkoutValue,
                label: settingsMethod?.label ||
                    method.fallbackLabel,
                description: settingsMethod?.instructions ||
                    method.fallbackDescription,
                enabled: Boolean(settingsMethod?.enabled),
                recipient: settingsMethod?.recipient ||
                    "",
                requireProof: Boolean(settingsMethod?.requireProof),
            };
        })
            .filter((method) => method.enabled && method.key !== "paymob_card");
        if (methods.length === 0) {
            return [
                {
                    key: "cash_on_delivery",
                    label: "Cash on Delivery",
                    description: "Pay when your Darb order arrives.",
                    enabled: true,
                    recipient: "",
                    requireProof: false,
                },
            ];
        }
        return methods;
    }, [
        settings.paymentMethods,
    ]);
    /* =========================
       SELECTED PAYMENT METHOD
       
       Derive a valid method rather
       than setting state in useEffect.
    ========================== */
    const selectedPaymentMethodKey = useMemo(() => {
        const currentMethodIsAvailable = availablePaymentMethods.some((method) => method.key ===
            formData.paymentMethod);
        if (currentMethodIsAvailable) {
            return formData.paymentMethod;
        }
        return (availablePaymentMethods[0]
            ?.key || "");
    }, [
        availablePaymentMethods,
        formData.paymentMethod,
    ]);
    const selectedPaymentMethod = availablePaymentMethods.find((method) => method.key ===
        selectedPaymentMethodKey);
    /* =========================
       FALLBACK DELIVERY
    ========================== */
    const fallbackDeliveryFee = useMemo(() => {
        const defaultFee = Number(settings.delivery
            ?.defaultFee) || 0;
        const freeDeliveryThreshold = Number(settings.delivery
            ?.freeDeliveryThreshold) || 0;
        if (freeDeliveryThreshold >
            0 &&
            subtotal >=
                freeDeliveryThreshold) {
            return 0;
        }
        return defaultFee;
    }, [
        settings.delivery,
        subtotal,
    ]);
    /* =========================
       CALCULATED PRICING
    ========================== */
    const pricing = previewQuery.data?.data
        ?.pricing;
    const calculatedSubtotal = pricing?.subtotal ??
        subtotal;
    const calculatedDiscountTotal = pricing?.discountTotal ??
        0;
    const calculatedDeliveryFee = pricing?.deliveryFee ??
        fallbackDeliveryFee;
    const calculatedTotal = pricing?.total ??
        Math.max(calculatedSubtotal +
            calculatedDeliveryFee -
            calculatedDiscountTotal, 0);
    /* =========================
       CREATE ORDER
    ========================== */
    const orderMutation = useMutation({
        mutationFn: createOrder,
        onSuccess: (response) => {
            clearCart();
            navigate("/order-success", {
                replace: true,
                state: {
                    order: response?.data,
                    message: response?.message ||
                        "Order created successfully.",
                },
            });
        },
        onError: (err) => {
            setError(err.friendlyMessage ||
                "Failed to create order.");
        },
    });
    /* =========================
       FORM CHANGE
    ========================== */
    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value,
        }));
    };
    const handlePaymentProofChange = (event) => {
        const file = event.target.files?.[0] || null;
        if (!file) {
            return;
        }
        if (!ALLOWED_PAYMENT_PROOF_TYPES.includes(file.type)) {
            setError("Payment proof must be a JPG, PNG, or WEBP image.");
            event.target.value = "";
            return;
        }
        if (file.size > MAX_PAYMENT_PROOF_SIZE) {
            setError("Payment proof must be 10 MB or smaller.");
            event.target.value = "";
            return;
        }
        setError("");
        setPaymentProof(file);
        event.target.value = "";
    };
    const handleCopyRecipient = async () => {
        const recipient = selectedPaymentMethod?.recipient;
        if (!recipient) {
            return;
        }
        try {
            await navigator.clipboard.writeText(recipient);
        }
        catch {
            setError("Could not copy the payment number. Please copy it manually.");
        }
    };
    /* =========================
       COUPON
    ========================== */
    const handleApplyCoupon = () => {
        setFormData((current) => ({ ...current, entitlementId: "" }));
        setAppliedCouponCode(formData.couponCode
            .trim()
            .toUpperCase());
    };
    const handleRemoveCoupon = () => {
        setFormData((current) => ({
            ...current,
            couponCode: "",
        }));
        setAppliedCouponCode("");
    };
    /* =========================
       VALIDATION
    ========================== */
    const validateCheckout = () => {
        if (isEmpty) {
            return "Your cart is empty.";
        }
        if (!formData.name.trim()) {
            return "Full name is required.";
        }
        if (!formData.phone.trim()) {
            return "Phone number is required.";
        }
        if (!formData.governorate.trim()) {
            return "Governorate is required.";
        }
        if (!formData.city.trim()) {
            return "City is required.";
        }
        if (!formData.street.trim()) {
            return "Street address is required.";
        }
        if (!selectedPaymentMethodKey) {
            return "Payment method is required.";
        }
        if (selectedPaymentMethod?.requireProof &&
            !pricing) {
            return "Please wait until Darb confirms the final order total before making the transfer.";
        }
        if (selectedPaymentMethod?.requireProof &&
            !paymentProof) {
            return "Please upload the payment transaction screenshot.";
        }
        if (selectedPaymentMethod?.requireProof && !formData.transferSenderName.trim()) {
            return "Sender name is required for transfer payments.";
        }
        return "";
    };
    /* =========================
       ORDER PAYLOAD
    ========================== */
    const buildPayload = () => {
        const orderData = {
            customer: {
                name: formData.name.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim(),
            },
            shippingAddress: {
                governorate: formData.governorate.trim(),
                city: formData.city.trim(),
                street: formData.street.trim(),
                building: formData.building.trim(),
                floor: formData.floor.trim(),
                apartment: formData.apartment.trim(),
                notes: formData.notes.trim(),
            },
            items: checkoutItems,
            couponCode: appliedCouponCode,
            paymentMethod: selectedPaymentMethodKey,
            customerNotes: formData.notes.trim(),
            paymentSenderName: formData.transferSenderName.trim(),
            isGift: formData.isGift,
            giftMessage: formData.isGift ? formData.giftMessage.trim() : "",
            birthday: formData.birthday || null,
            entitlementId: formData.entitlementId || "",
            marketingConsent: formData.marketingConsent,
        };
        if (selectedPaymentMethod?.requireProof) {
            const payload = new FormData();
            payload.append("orderData", JSON.stringify(orderData));
            payload.append("paymentProof", paymentProof);
            return payload;
        }
        return orderData;
    };
    /* =========================
       SUBMIT
    ========================== */
    const handleSubmit = (event) => {
        event.preventDefault();
        const validationError = validateCheckout();
        if (validationError) {
            setError(validationError);
            return;
        }
        setError("");
        orderMutation.mutate(buildPayload());
    };
    /* =========================
       EMPTY CART
    ========================== */
    if (isEmpty) {
        return (<section className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Checkout
          </p>

          <h1 className="mt-2 font-display text-5xl">
            No scents selected yet
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
            Add your favorite
            Darb perfumes to the
            cart before continuing
            to checkout.
          </p>

          <Link to="/shop" className="mt-8 inline-flex rounded-full bg-darb-gold px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-beige">
            Shop Darb
          </Link>
        </div>
      </section>);
    }
    return (<section className="mx-auto max-w-7xl px-4 py-14">
      {/* =========================
            HEADER
        ========================== */}

      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Checkout
        </p>

        <h1 className="mt-2 font-display text-5xl text-darb-green">
          Complete your path
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-darb-muted">
          Add your delivery
          details and choose how
          you would like to pay.
        </p>
      </div>

      {/* =========================
            SETTINGS ERROR
        ========================== */}

      {settingsQuery.isError && (<div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Store settings could
          not be loaded, so
          checkout is using
          default values for now.
        </div>)}

      {/* =========================
            PREVIEW ERROR
        ========================== */}

      {previewQuery.isError && (<div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {previewQuery.error
                ?.friendlyMessage ||
                "Checkout preview could not be calculated. The final order will still be checked before creation."}
        </div>)}

      {/* =========================
            CHECKOUT FORM
        ========================== */}

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[1fr_390px]">
        {/* =========================
            LEFT SIDE
        ========================== */}

        <div className="space-y-6">
          {/* =========================
            CUSTOMER DETAILS
        ========================== */}

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              Customer Details
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Name */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Full Name *
                </label>

                <input name="name" value={formData.name} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Customer name"/>
              </div>

              {/* Phone */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Phone *
                </label>

                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="01xxxxxxxxx"/>
              </div>

              {/* Email */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Email
                </label>

                <input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="example@email.com"/>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">Birthday (optional)</label>
                <input name="birthday" value={formData.birthday} onChange={handleChange} type="date" className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" />
                <p className="mt-2 text-xs text-darb-muted">Darb might have something waiting for you.</p>
              </div>
            </div>
          </div>

          {/* =========================
            DELIVERY ADDRESS
        ========================== */}

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              Delivery Address
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Governorate */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Governorate *
                </label>

                <input name="governorate" value={formData.governorate} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Cairo, Giza..."/>
              </div>

              {/* City */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  City / Area *
                </label>

                <input name="city" value={formData.city} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Nasr City, Haram..."/>
              </div>

              {/* Street */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Street Address *
                </label>

                <input name="street" value={formData.street} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Street name and details"/>
              </div>

              {/* Building */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Building
                </label>

                <input name="building" value={formData.building} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Building number"/>
              </div>

              {/* Floor */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Floor
                </label>

                <input name="floor" value={formData.floor} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Floor"/>
              </div>

              {/* Apartment */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Apartment
                </label>

                <input name="apartment" value={formData.apartment} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Apartment"/>
              </div>

              {/* Notes */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Notes
                </label>

                <input name="notes" value={formData.notes} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Any delivery notes"/>
              </div>
            </div>

            {/* Delivery Info */}

            <div className="mt-5 rounded-2xl bg-darb-cream/70 p-4 text-sm leading-6 text-darb-muted">
              {settings.delivery
            ?.estimatedDeliveryText ||
            defaultSettings
                .delivery
                .estimatedDeliveryText}
              <p className="mt-2 text-xs">Egypt delivery only. You may inspect the package at delivery. Wrong or damaged/leaking items require photo or video proof and should be reported within 2 days or 1 day respectively.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <label className="flex cursor-pointer items-center gap-3 font-semibold text-darb-green">
              <input type="checkbox" name="isGift" checked={formData.isGift} onChange={handleChange} />
              This is a gift
            </label>
            {formData.isGift && (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-darb-green">Gift-card message (optional)</label>
                <textarea name="giftMessage" value={formData.giftMessage} onChange={handleChange} maxLength={500} rows={3} className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="Leave blank for an empty gift card" />
              </div>
            )}
          </div>

          {user && (rewardsQuery.data?.data?.available || []).length > 0 && (
            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-darb-beige p-6 shadow-soft">
              <h2 className="font-display text-3xl text-darb-green">Choose one reward</h2>
              <p className="mt-2 text-sm text-darb-muted">Darb promotions do not stack. Selecting a reward replaces coupons, offers, or bundle promotional pricing for this order.</p>
              <div className="mt-5 space-y-2">
                <label className="flex cursor-pointer gap-3 rounded-2xl bg-white/60 p-4 text-sm text-darb-green"><input type="radio" name="entitlementId" value="" checked={!formData.entitlementId} onChange={handleChange}/> Use the best available store promotion</label>
                {rewardsQuery.data.data.available.map((reward) => <label key={reward._id} className="flex cursor-pointer gap-3 rounded-2xl bg-white/60 p-4 text-sm text-darb-green"><input type="radio" name="entitlementId" value={reward._id} checked={formData.entitlementId === reward._id} onChange={(event) => { handleChange(event); setAppliedCouponCode(""); }}/> <span><strong>{reward.label}</strong>{reward.minSubtotal > 0 && <small className="block text-darb-muted">Minimum {formatCurrency(reward.minSubtotal)}</small>}</span></label>)}
              </div>
            </div>
          )}

          {/* =========================
            PAYMENT METHOD
        ========================== */}

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              Payment Method
            </h2>

            {settingsQuery.isLoading ? (<p className="mt-4 text-darb-muted">
                Loading payment
                methods...
              </p>) : (<div className="mt-6 grid gap-3">
                {availablePaymentMethods.map((method) => (<label key={method.key} className={`cursor-pointer rounded-2xl border p-4 transition ${selectedPaymentMethodKey ===
                    method.key
                    ? "border-darb-green bg-darb-green/5"
                    : "border-darb-gold/20 hover:border-darb-gold"}`}>
                      <div className="flex items-start gap-3">
                        <input type="radio" name="paymentMethod" value={method.key} checked={selectedPaymentMethodKey ===
                    method.key} onChange={handleChange} className="mt-1"/>

                        <div>
                          <p className="font-semibold text-darb-green">
                            {method.label}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-darb-muted">
                            {method.description}
                          </p>
                        </div>
                      </div>
                    </label>))}
              </div>)}

            {selectedPaymentMethod?.description && (<div className="mt-5 rounded-2xl bg-darb-cream/70 p-4 text-sm leading-6 text-darb-muted">
                <span className="font-semibold text-darb-green">
                  Payment instructions:
                </span>{" "}
                {selectedPaymentMethod.description}
              </div>)}

            {selectedPaymentMethod?.recipient && (<div className="mt-5 rounded-3xl border border-darb-gold/25 bg-darb-green p-5 text-darb-beige">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                  Transfer To
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-display text-3xl">
                    {selectedPaymentMethod.recipient}
                  </p>

                  <button type="button" onClick={handleCopyRecipient} className="inline-flex items-center gap-2 rounded-full border border-darb-gold/40 px-4 py-2 text-sm font-semibold text-darb-beige transition hover:bg-darb-gold hover:text-darb-green">
                    <Copy size={16}/>
                    Copy
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-white/10 px-4 py-3">
                  <span className="text-sm text-darb-beige/75">
                    Exact amount to transfer
                  </span>
                  <span className="font-semibold text-darb-gold">
                    {pricing
                ? formatCurrency(pricing.total)
                : "Confirming..."}
                  </span>
                </div>
              </div>)}

            {selectedPaymentMethod?.requireProof && (<div className="mt-5 rounded-3xl border border-darb-gold/25 bg-darb-cream/60 p-5">
                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-semibold text-darb-green">Sender name *</span>
                  <input name="transferSenderName" value={formData.transferSenderName} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none focus:border-darb-green" placeholder="Name used for the transfer" />
                </label>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-darb-green">
                      Transaction Screenshot *
                    </p>
                    <p className="mt-1 text-xs leading-5 text-darb-muted">
                      JPG, PNG, or WEBP up to 10 MB. Darb securely optimizes the screenshot before storing it for admin review.
                    </p>
                    {!pricing && (<p className="mt-2 text-xs font-semibold text-amber-700">
                        Wait for the server-confirmed total above before transferring.
                      </p>)}
                  </div>

                  {!paymentProof && (<label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black">
                      <ImagePlus size={17}/>
                      Upload Proof
                      <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handlePaymentProofChange} className="hidden"/>
                    </label>)}
                </div>

                {paymentProof && (<div className="mt-4 grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center">
                    <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-xl bg-darb-green sm:w-28">
                      {paymentProofPreview ? (<img src={paymentProofPreview} alt="Payment proof preview" className="h-full w-full object-contain"/>) : null}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-darb-green">
                        {paymentProof.name}
                      </p>
                      <p className="mt-1 text-xs text-darb-muted">
                        {(paymentProof.size / 1024 / 1024).toFixed(2)} MB · ready to upload
                      </p>
                    </div>

                    <button type="button" onClick={() => setPaymentProof(null)} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                      <Trash2 size={16}/>
                      Remove
                    </button>
                  </div>)}
              </div>)}
          </div>

          {/* =========================
            ERROR
        ========================== */}

          {error && (<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>)}

          <label className="flex items-start gap-3 rounded-2xl border border-darb-gold/20 bg-white p-4 text-sm leading-6 text-darb-muted">
            <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent} onChange={handleChange} className="mt-1" />
            Send me occasional Darb news, launches, and offers.
          </label>
        </div>

        {/* =========================
            ORDER SUMMARY
        ========================== */}

        <aside className="h-fit rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <h2 className="font-display text-3xl text-darb-green">
            Order Summary
          </h2>

          {/* Products */}

          <div className="mt-6 space-y-4">
            {items.map((item) => (<div key={item.cartItemId} className="flex gap-4 border-b border-darb-gold/10 pb-4 last:border-b-0">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-darb-green">
                    {item.image ? (<img src={item.image} alt={item.name} className="h-full w-full object-cover"/>) : (<p className="font-display text-sm text-darb-gold">
                        Darb
                      </p>)}
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-darb-green">
                      {item.name}
                    </p>

                    <p className="mt-1 text-xs text-darb-muted">
                      Qty:{" "}
                      {item.quantity}

                      {item.sizeLabel
                ? ` • ${item.sizeLabel}`
                : ""}
                    </p>
                  </div>

                  <p className="font-semibold text-darb-black">
                    {formatCurrency(item.price *
                item.quantity)}
                  </p>
                </div>))}
          </div>

          {/* =========================
            COUPON
        ========================== */}

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              Discount Code
            </label>

            <div className="flex gap-2">
              <input name="couponCode" value={formData.couponCode} onChange={handleChange} className="min-w-0 flex-1 rounded-full border border-darb-gold/30 px-5 py-3 uppercase outline-none transition focus:border-darb-green" placeholder="DARB10"/>

              <button type="button" onClick={handleApplyCoupon} disabled={previewQuery.isFetching} className="rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60">
                Apply
              </button>
            </div>

            {appliedCouponCode && (<button type="button" onClick={handleRemoveCoupon} className="mt-2 text-xs font-semibold text-darb-green underline">
                Remove coupon
              </button>)}

            {pricing?.coupon
            ?.message && (<p className={`mt-3 rounded-2xl px-4 py-3 text-xs font-semibold ${pricing.coupon
                .status ===
                "valid"
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-800"}`}>
                {pricing.coupon
                .message}
              </p>)}
          </div>

          {/* =========================
            RECALCULATING
        ========================== */}

          {previewQuery.isFetching && (<div className="mt-4 rounded-2xl bg-darb-cream/70 p-3 text-xs text-darb-muted">
              Recalculating checkout
              totals...
            </div>)}

          {/* =========================
            APPLIED DISCOUNTS
        ========================== */}

          {pricing?.discounts
            ?.length > 0 && (<div className="mt-5 rounded-2xl bg-darb-cream/70 p-4">
              <p className="text-sm font-semibold text-darb-green">
                Applied discounts
              </p>

              <div className="mt-3 space-y-2">
                {pricing.discounts.map((discount, index) => (<div key={`${discount.sourceType}-${discount.sourceId || index}`} className="flex justify-between gap-4 text-xs text-darb-muted">
                      <span>
                        {discount.title}

                        {discount.freeShipping
                    ? " • Free delivery"
                    : ""}
                      </span>

                      <span className="font-semibold text-darb-green">
                        {discount.amount >
                    0
                    ? `-${formatCurrency(discount.amount)}`
                    : "Free delivery"}
                      </span>
                    </div>))}
              </div>
            </div>)}

          <div className="my-6 border-t border-darb-gold/20"/>

          {/* =========================
            TOTAL BREAKDOWN
        ========================== */}

          <div className="space-y-4 text-sm">
            {/* Items */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                Items
              </span>

              <span className="font-semibold text-darb-black">
                {itemCount}
              </span>
            </div>

            {/* Subtotal */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                Subtotal
              </span>

              <span className="font-semibold text-darb-black">
                {formatCurrency(calculatedSubtotal)}
              </span>
            </div>

            {/* Product Savings */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                Product savings
              </span>

              <span className="font-semibold text-darb-green">
                {productSavings >
            0
            ? `-${formatCurrency(productSavings)}`
            : formatCurrency(0)}
              </span>
            </div>

            {/* Offers */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                Offers / coupons
              </span>

              <span className="font-semibold text-darb-green">
                {calculatedDiscountTotal >
            0
            ? `-${formatCurrency(calculatedDiscountTotal)}`
            : formatCurrency(0)}
              </span>
            </div>

            {/* Delivery */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                Delivery
              </span>

              <span className="font-semibold text-darb-black">
                {calculatedDeliveryFee >
            0
            ? formatCurrency(calculatedDeliveryFee)
            : "Free"}
              </span>
            </div>

            {/* Free Delivery Progress */}

            {Number(settings.delivery
            ?.freeDeliveryThreshold) >
            0 &&
            subtotal <
                Number(settings.delivery
                    .freeDeliveryThreshold) && (<div className="rounded-2xl bg-darb-cream/70 p-3 text-xs leading-5 text-darb-muted">
                  Add{" "}
                  <span className="font-semibold text-darb-green">
                    {formatCurrency(Number(settings.delivery
                .freeDeliveryThreshold) -
                subtotal)}
                  </span>{" "}
                  more to unlock
                  free delivery.
                </div>)}

            {/* Free Shipping Applied */}

            {pricing?.freeShipping && (<div className="rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">
                Free delivery
                applied.
              </div>)}
          </div>

          <div className="my-6 border-t border-darb-gold/20"/>

          {/* =========================
            FINAL TOTAL
        ========================== */}

          <div className="flex justify-between gap-4">
            <span className="font-semibold text-darb-green">
              Total
            </span>

            <span className="font-display text-3xl text-darb-green">
              {formatCurrency(calculatedTotal)}
            </span>
          </div>

          {/* =========================
            PLACE ORDER
        ========================== */}

          <button type="submit" disabled={orderMutation.isPending ||
            settingsQuery.isLoading ||
            previewQuery.isFetching} className="mt-6 flex w-full justify-center rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60">
            {orderMutation.isPending
            ? "Creating Order..."
            : "Place Order"}
          </button>

          {/* Back */}

          <Link to="/cart" className="mt-3 flex w-full justify-center rounded-full border border-darb-gold px-6 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15">
            Back to Cart
          </Link>
        </aside>
      </form>
    </section>);
}
export default Checkout;
