import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, ImagePlus, Trash2 } from "lucide-react";
import { createOrder, previewOrder } from "../../api/orderApi";
import { getPublicSettings } from "../../api/settingsApi";
import { getMyRewards } from "../../api/rewardApi";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/useCart";
import { useFeedback } from "../../context/FeedbackContext";
import { useLanguage } from "../../context/LanguageContext";
import { formatCurrency } from "../../utils/formatCurrency";
import { getOfferCustomerTitle } from "../../utils/productOffers";
import { EGYPT_GOVERNORATES, getGovernorateLabel } from "../../constants/egyptGovernorates";
import { createOrderRequestId } from "../../utils/orderRequestId";
import {
    createObjectUrlManager,
    getSelectedImageMimeType,
    prepareImagePickerInput,
    snapshotSelectedImageFile,
} from "../../utils/selectedImageFile";
import { reportUploadDiagnostic } from "../../api/clientDiagnosticsApi";
import { createUploadDiagnosticId, getPlatformCategory, getSafeFileExtension } from "../../utils/uploadDiagnosticPayload";
import {
    createMarketingEventId,
    getMetaBrowserContext,
    normalizeEcommercePayload,
    trackMarketingEvent,
    trackMarketingEventOnce,
} from "../../utils/marketingEvents";
const MAX_PAYMENT_PROOF_SIZE = 10 * 1024 * 1024;
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
        defaultFee: 100,
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
    const { notify } = useFeedback();
    const { language, t } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();
    const { items, isEmpty, subtotal, productSavings, itemCount, clearCart } = useCart();
    const [formData, setFormData] = useState(initialFormData);
    const [appliedCouponCode, setAppliedCouponCode] = useState("");
    const [error, setError] = useState("");
    const [paymentProof, setPaymentProof] = useState(null);
    const [paymentProofError, setPaymentProofError] = useState("");
    const [paymentProofPreview, setPaymentProofPreview] = useState("");
    const [paymentProofPreviewFailed, setPaymentProofPreviewFailed] = useState(false);
    const [isPaymentProofReading, setIsPaymentProofReading] = useState(false);
    const [paymentProofPreviewManager] = useState(() => createObjectUrlManager());
    const [isProofDragging, setIsProofDragging] = useState(false);
    const [copyStatus, setCopyStatus] = useState("idle");
    const orderRequestIdRef = useRef(createOrderRequestId());
    const copyResetRef = useRef(null);
    const checkoutFormRef = useRef(null);
    const paymentProofSelectionRef = useRef(0);
    const pendingPaymentProofDiagnosticRef = useRef(null);
    useEffect(() => () => {
        paymentProofSelectionRef.current += 1;
        paymentProofPreviewManager.clear();
    }, [paymentProofPreviewManager]);
    useEffect(() => () => window.clearTimeout(copyResetRef.current), []);
    useEffect(() => {
        if (!user) return;
        // Account details arrive asynchronously and should only fill untouched fields.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((current) => ({
            ...current,
            name: current.name || user.name || "",
            email: current.email || user.email || "",
            phone: current.phone || user.phone || "",
        }));
    }, [user]);
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
    const previewPhone = useDeferredValue(formData.phone.trim());
    /* =========================
       ORDER PREVIEW
    ========================== */
    const previewQuery = useQuery({
        queryKey: ["checkout-preview", checkoutItems, appliedCouponCode, formData.entitlementId, formData.governorate, previewPhone],
        queryFn: () => previewOrder({
            items: checkoutItems,
            couponCode: appliedCouponCode,
            customer: { phone: previewPhone },
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
    const checkoutEventPayload = useMemo(() => normalizeEcommercePayload({
        items,
        value: calculatedTotal,
    }), [calculatedTotal, items]);

    useEffect(() => {
        if (isEmpty) return;
        trackMarketingEventOnce(`initiate-checkout:${location.key}`, "InitiateCheckout", checkoutEventPayload);
    }, [checkoutEventPayload, isEmpty, location.key]);
    /* =========================
       CREATE ORDER
    ========================== */
    const orderMutation = useMutation({
        mutationFn: ({ payload, uploadDiagnosticId, requestId }) => createOrder(payload, { uploadDiagnosticId, requestId }),
        onSuccess: (response, variables) => {
            const order = response?.data;
            const purchasePayload = normalizeEcommercePayload({
                items: order?.items || [],
                value: order?.total,
                contentName: order?.orderNumber || "",
            });
            if (order) {
                trackMarketingEvent("Purchase", { ...purchasePayload, order_id: order.orderNumber }, {
                    eventId: response?.metaEventId || variables.purchaseEventId,
                    mirrorMeta: false,
                });
            }
            clearCart();
            orderRequestIdRef.current = createOrderRequestId();
            navigate("/order-success", {
                replace: true,
                state: {
                    order: response?.data,
                    message: response?.message ||
                        "Order created successfully.",
                },
            });
        },
        onError: (err, variables) => {
            const isNetworkFailure = err?.isNetworkError || !err?.response;
            if (isNetworkFailure && variables?.uploadDiagnosticId) {
                reportUploadDiagnostic({
                    diagnosticId: variables.uploadDiagnosticId,
                    source: variables.uploadSource,
                    phase: "order_network_error",
                    platform: getPlatformCategory(),
                    authenticated: Boolean(user),
                    requestId: variables.requestId,
                    httpStatus: 0,
                });
            }
            const message = isNetworkFailure
                ? "Your cart and checkout details are still here. Check your connection and try again."
                : err.friendlyMessage || "Failed to create order.";
            setError(message);
            notify({
                type: "error",
                title: t(isNetworkFailure ? "Couldn’t reach Darb" : "Order could not be placed"),
                message: t(isNetworkFailure ? message : err.friendlyMessage || "Please try again."),
            });
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
    const revokePaymentProofPreview = () => {
        paymentProofPreviewManager.clear();
        setPaymentProofPreview("");
    };
    const clearPaymentProof = () => {
        paymentProofSelectionRef.current += 1;
        revokePaymentProofPreview();
        setPaymentProof(null);
        setPaymentProofPreviewFailed(false);
        setPaymentProofError("");
        setIsPaymentProofReading(false);
    };
    const emitPaymentProofDiagnostic = (diagnosticId, source, phase, details = {}) => {
        reportUploadDiagnostic({
            diagnosticId,
            source,
            phase,
            platform: getPlatformCategory(),
            authenticated: Boolean(user),
            ...details,
        });
    };
    const preparePaymentProofPicker = (input, source) => {
        const diagnosticId = createUploadDiagnosticId();
        pendingPaymentProofDiagnosticRef.current = { diagnosticId, source };
        prepareImagePickerInput(input);
        emitPaymentProofDiagnostic(diagnosticId, source, "picker_opened");
    };
    const selectPaymentProof = async (file, { diagnosticId = createUploadDiagnosticId(), source = "checkout_initial" } = {}) => {
        if (!file) {
            return;
        }
        const selection = ++paymentProofSelectionRef.current;
        const diagnosticBase = {
            extension: getSafeFileExtension(file.name),
            reportedMime: String(file.type || "").trim().toLowerCase() || undefined,
            size: file.size,
        };
        emitPaymentProofDiagnostic(diagnosticId, source, "file_selected", diagnosticBase);
        emitPaymentProofDiagnostic(diagnosticId, source, "validation_started", diagnosticBase);
        const selectedType = getSelectedImageMimeType(file);
        if (!selectedType) {
            emitPaymentProofDiagnostic(diagnosticId, source, "validation_failed", diagnosticBase);
            setPaymentProofError("Choose a JPG, PNG, or WEBP screenshot.");
            notify({ type: "warning", title: t("Unsupported screenshot"), message: t("Choose a JPG, PNG, or WEBP screenshot.") });
            return;
        }
        if (file.size > MAX_PAYMENT_PROOF_SIZE) {
            emitPaymentProofDiagnostic(diagnosticId, source, "validation_failed", { ...diagnosticBase, normalizedMime: selectedType });
            setPaymentProofError("Choose a screenshot that is 10 MB or smaller.");
            notify({ type: "warning", title: t("Screenshot is too large"), message: t("Choose a screenshot that is 10 MB or smaller.") });
            return;
        }
        setIsPaymentProofReading(true);
        let stableProof = null;
        try {
            stableProof = await snapshotSelectedImageFile(file, {
                onPhase: (phase, details) => emitPaymentProofDiagnostic(diagnosticId, source, phase, {
                    ...diagnosticBase,
                    normalizedMime: selectedType,
                    ...details,
                }),
            });
        }
        catch {
            // Customer-facing feedback deliberately hides browser/content-provider internals.
        }
        if (selection !== paymentProofSelectionRef.current) return;
        setIsPaymentProofReading(false);
        if (!stableProof) {
            revokePaymentProofPreview();
            setPaymentProof(null);
            setPaymentProofPreviewFailed(false);
            setPaymentProofError("Please choose the image again.");
            notify({ type: "warning", title: t("Could not read this screenshot"), message: t("Please choose the image again.") });
            return;
        }

        revokePaymentProofPreview();
        let previewUrl = "";
        try {
            previewUrl = paymentProofPreviewManager.replace(stableProof.blob);
            emitPaymentProofDiagnostic(diagnosticId, source, "preview_created", { ...diagnosticBase, normalizedMime: selectedType });
        }
        catch {
            setPaymentProofPreviewFailed(true);
            emitPaymentProofDiagnostic(diagnosticId, source, "preview_failed", { ...diagnosticBase, normalizedMime: selectedType });
        }
        setPaymentProofPreview(previewUrl);
        setPaymentProofPreviewFailed(!previewUrl);
        setPaymentProofError("");
        setPaymentProof({ ...stableProof, diagnosticId, diagnosticSource: source });
    };
    const handlePaymentProofChange = (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0] || null;
        const pending = pendingPaymentProofDiagnosticRef.current || {
            diagnosticId: createUploadDiagnosticId(),
            source: input.dataset.uploadSource || "checkout_initial",
        };
        pendingPaymentProofDiagnosticRef.current = null;
        void selectPaymentProof(file, pending);
    };
    const handlePaymentProofDrop = (event) => {
        event.preventDefault();
        setIsProofDragging(false);
        void selectPaymentProof(event.dataTransfer.files?.[0] || null, {
            diagnosticId: createUploadDiagnosticId(),
            source: "checkout_drop",
        });
    };
    const handleCopyRecipient = async () => {
        const recipient = selectedPaymentMethod?.recipient;
        if (!recipient) {
            return;
        }
        try {
            await navigator.clipboard.writeText(recipient);
            setCopyStatus("copied");
            notify({ type: "success", title: t("Copied") });
            window.clearTimeout(copyResetRef.current);
            copyResetRef.current = window.setTimeout(() => setCopyStatus("idle"), 1800);
        }
        catch {
            setCopyStatus("failed");
            setError("Could not copy the payment number. Please copy it manually.");
            notify({ type: "error", title: t("Could not copy"), message: t("Please copy the payment number manually.") });
            window.clearTimeout(copyResetRef.current);
            copyResetRef.current = window.setTimeout(() => setCopyStatus("idle"), 2000);
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
            return { message: "Your cart is empty.", field: "" };
        }
        if (!formData.name.trim()) {
            return { message: "Full name is required.", field: "name" };
        }
        if (!formData.phone.trim()) {
            return { message: "Phone number is required.", field: "phone" };
        }
        if (!formData.governorate.trim()) {
            return { message: "Governorate is required.", field: "governorate" };
        }
        if (!formData.city.trim()) {
            return { message: "City is required.", field: "city" };
        }
        if (!formData.street.trim()) {
            return { message: "Street address is required.", field: "street" };
        }
        if (!selectedPaymentMethodKey) {
            return { message: "Payment method is required.", field: "paymentMethod" };
        }
        if (selectedPaymentMethod?.requireProof &&
            !pricing) {
            return { message: "Please wait until Darb confirms the final order total before making the transfer.", field: "paymentMethod" };
        }
        if (selectedPaymentMethod?.requireProof &&
            !paymentProof) {
            return { message: "Please upload the payment transaction screenshot.", field: "paymentProof" };
        }
        if (selectedPaymentMethod?.requireProof && !formData.transferSenderName.trim()) {
            return { message: "Sender name is required for transfer payments.", field: "transferSenderName" };
        }
        return null;
    };
    /* =========================
       ORDER PAYLOAD
    ========================== */
    const buildPayload = (trackingContext) => {
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
            requestId: orderRequestIdRef.current,
            marketingConsent: formData.marketingConsent,
            ...(trackingContext ? { trackingContext } : {}),
        };
        if (selectedPaymentMethod?.requireProof) {
            const payload = new FormData();
            payload.append("orderData", JSON.stringify(orderData));
            payload.append("paymentProof", paymentProof.blob, paymentProof.name);
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
            setError("");
            notify({ type: "warning", title: t("Complete your checkout"), message: t(validationError.message) });
            window.requestAnimationFrame(() => {
                const selector = validationError.field === "paymentProof"
                    ? "#payment-proof"
                    : validationError.field ? `[name="${validationError.field}"]` : "";
                const field = selector ? checkoutFormRef.current?.querySelector(selector) : null;
                const scrollTarget = validationError.field === "paymentProof"
                    ? checkoutFormRef.current?.querySelector("#payment-proof-section")
                    : field;
                scrollTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
                field?.focus({ preventScroll: true });
            });
            return;
        }
        setError("");
        trackMarketingEvent("AddPaymentInfo", checkoutEventPayload);
        const purchaseEventId = createMarketingEventId();
        const trackingContext = getMetaBrowserContext(purchaseEventId);
        const uploadDiagnosticId = paymentProof?.diagnosticId || "";
        const uploadSource = paymentProof?.diagnosticSource || "checkout_initial";
        if (uploadDiagnosticId) {
            emitPaymentProofDiagnostic(uploadDiagnosticId, uploadSource, "order_submit_started", {
                requestId: orderRequestIdRef.current,
            });
        }
        orderMutation.mutate({
            payload: buildPayload(trackingContext),
            purchaseEventId,
            uploadDiagnosticId,
            uploadSource,
            requestId: orderRequestIdRef.current,
        });
    };
    /* =========================
       EMPTY CART
    ========================== */
    if (isEmpty) {
        return (<section className="mx-auto max-w-7xl px-4 py-14">
        <div className="rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            {t("Checkout")}
          </p>

          <h1 className="mt-2 font-display text-5xl">
            {t("No scents selected yet")}
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
            {t("Add your favorite Darb perfumes to the cart before continuing to checkout.")}
          </p>

          <Link to="/shop" className="mt-8 inline-flex rounded-full bg-darb-gold px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-beige">
            {t("Shop Darb")}
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
          {t("Checkout")}
        </p>

        <h1 className="mt-2 font-display text-5xl text-darb-green">
          {t("Complete your path")}
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-darb-muted">
          {t("Add your delivery details and choose how you would like to pay.")}
        </p>
      </div>

      {/* =========================
            SETTINGS ERROR
        ========================== */}

      {settingsQuery.isError && (<div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {t("Store settings could not be loaded, so checkout is using default values for now.")}
        </div>)}

      {/* =========================
            PREVIEW ERROR
        ========================== */}

      {previewQuery.isError && (<div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {t(previewQuery.error?.friendlyMessage || "Checkout preview could not be calculated. The final order will still be checked before creation.")}
        </div>)}

      {/* =========================
            CHECKOUT FORM
        ========================== */}

      <form ref={checkoutFormRef} onSubmit={handleSubmit} className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
        {/* =========================
            LEFT SIDE
        ========================== */}

        <div className="min-w-0 space-y-6">
          {/* =========================
            CUSTOMER DETAILS
        ========================== */}

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              {t("Customer Details")}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Name */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Full Name")} *
                </label>

                <input name="name" value={formData.name} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Customer name")}/>
              </div>

              {/* Phone */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Phone")} *
                </label>

                <input name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="01xxxxxxxxx"/>
              </div>

              {/* Email */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Email")}
                </label>

                <input name="email" value={formData.email} onChange={handleChange} type="email" className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder="example@email.com"/>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">{t("Birthday (optional)")}</label>
                <input name="birthday" value={formData.birthday} onChange={handleChange} type="date" className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" />
                <p className="mt-2 text-xs text-darb-muted">{t("Darb might have something waiting for you.")}</p>
              </div>
            </div>
          </div>

          {/* =========================
            DELIVERY ADDRESS
        ========================== */}

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              {t("Delivery Address")}
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {/* Governorate */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Governorate")} *
                </label>

                <select name="governorate" value={formData.governorate} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green">
                  <option value="">{t("Select a governorate")}</option>
                  {EGYPT_GOVERNORATES.map((governorate) => (
                    <option key={governorate.value} value={governorate.value}>
                      {getGovernorateLabel(governorate, language)}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("City / Area")} *
                </label>

                <input name="city" value={formData.city} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Nasr City, Haram...")}/>
              </div>

              {/* Street */}

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Street Address")} *
                </label>

                <input name="street" value={formData.street} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Street name and details")}/>
              </div>

              {/* Building */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Building")}
                </label>

                <input name="building" value={formData.building} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Building number")}/>
              </div>

              {/* Floor */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Floor")}
                </label>

                <input name="floor" value={formData.floor} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Floor")}/>
              </div>

              {/* Apartment */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Apartment")}
                </label>

                <input name="apartment" value={formData.apartment} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Apartment")}/>
              </div>

              {/* Notes */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  {t("Notes")}
                </label>

                <input name="notes" value={formData.notes} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Any delivery notes")}/>
              </div>
            </div>

          </div>

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <label className="flex cursor-pointer items-center gap-3 font-semibold text-darb-green">
              <input type="checkbox" name="isGift" checked={formData.isGift} onChange={handleChange} />
              {t("This is a gift")}
            </label>
            {formData.isGift && (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-semibold text-darb-green">{t("Gift-card message (optional)")}</label>
                <textarea name="giftMessage" value={formData.giftMessage} onChange={handleChange} maxLength={500} rows={3} className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green" placeholder={t("Leave blank for an empty gift card")} />
              </div>
            )}
          </div>

          {user && (rewardsQuery.data?.data?.available || []).length > 0 && (
            <div className="rounded-[1.5rem] border border-darb-gold/45 bg-darb-green p-6 text-darb-beige shadow-soft">
              <h2 className="font-display text-3xl text-darb-beige">{t("Choose one reward")}</h2>
              <p className="mt-2 text-sm text-darb-beige/75">{t("Darb promotions do not stack. Selecting a reward replaces coupons, offers, or bundle promotional pricing for this order.")}</p>
              <div className="mt-5 space-y-2">
                <label className="flex cursor-pointer gap-3 rounded-2xl border border-darb-gold/25 bg-white/10 p-4 text-sm text-darb-beige transition hover:bg-white/15"><input type="radio" name="entitlementId" value="" checked={!formData.entitlementId} onChange={handleChange} className="mt-0.5 accent-darb-gold"/> {t("Use the best available store promotion")}</label>
                {rewardsQuery.data.data.available.map((reward) => <label key={reward._id} className={`flex gap-3 rounded-2xl border border-darb-gold/25 bg-white/10 p-4 text-sm text-darb-beige transition ${reward.locked ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:bg-white/15"}`}><input type="radio" name="entitlementId" value={reward._id} checked={formData.entitlementId === reward._id} disabled={reward.locked} onChange={(event) => { handleChange(event); setAppliedCouponCode(""); }} className="mt-0.5 accent-darb-gold"/> <span><strong>{t(reward.label)}</strong>{reward.locked && <small className="block text-darb-gold">{t("Unlocks after your next order")}</small>}{reward.minSubtotal > 0 && <small className="block text-darb-gold">{t("Minimum")} {formatCurrency(reward.minSubtotal)}</small>}</span></label>)}
              </div>
            </div>
          )}

          {/* =========================
            PAYMENT METHOD
        ========================== */}

          <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
            <h2 className="font-display text-3xl text-darb-green">
              {t("Payment Method")}
            </h2>

            {settingsQuery.isLoading ? (<p className="mt-4 text-darb-muted">
                {t("Loading payment methods...")}
              </p>) : (<div className="mt-6 border-y border-darb-gold/25">
                {availablePaymentMethods.map((method) => (<label key={method.key} className={`block cursor-pointer border-b border-darb-gold/15 px-1 py-4 transition last:border-0 ${selectedPaymentMethodKey ===
                    method.key
                    ? "bg-darb-green/5 px-4"
                    : "hover:bg-darb-surface/50 hover:px-4"}`}>
                      <div className="flex items-start gap-3">
                        <input type="radio" name="paymentMethod" value={method.key} checked={selectedPaymentMethodKey ===
                    method.key} onChange={handleChange} className="mt-1"/>

                        <div>
                          <p className="font-semibold text-darb-green">
                            {t(method.label)}
                          </p>

                          <p className="mt-1 text-sm leading-6 text-darb-muted">
                            {t(method.description)}
                          </p>
                        </div>
                      </div>
                    </label>))}
              </div>)}

            {selectedPaymentMethod?.description && (<div className="mt-5 rounded-2xl bg-darb-cream/70 p-4 text-sm leading-6 text-darb-muted">
                <span className="font-semibold text-darb-green">
                  {t("Payment instructions:")}
                </span>{" "}
                {t(selectedPaymentMethod.description)}
              </div>)}

            {selectedPaymentMethod?.recipient && (<div className="mt-5 rounded-3xl border border-darb-gold/25 bg-darb-green p-5 text-darb-beige">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                  {t("Transfer To")}
                </p>

                <div className="mt-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <p className="max-w-full break-all font-display text-2xl sm:text-3xl" dir="ltr">
                    {selectedPaymentMethod.recipient}
                  </p>

                  <button type="button" onClick={handleCopyRecipient} className="inline-flex min-w-[7.25rem] items-center justify-center gap-2 rounded-full border border-darb-gold/40 px-4 py-2 text-sm font-semibold text-darb-beige transition hover:bg-darb-gold hover:text-darb-green active:scale-[0.97]">
                    {copyStatus === "copied" ? <Check size={16}/> : <Copy size={16}/>}
                    {t(copyStatus === "copied" ? "Copied" : "Copy")}
                  </button>
                  <span className="sr-only" aria-live="polite">{copyStatus === "copied" ? t("Payment number copied") : copyStatus === "failed" ? t("Payment number could not be copied") : ""}</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3">
                  <span className="min-w-0 text-sm text-darb-beige/75">
                    {t("Exact amount to transfer")}
                  </span>
                  <span className="font-semibold text-darb-gold">
                    {pricing
                ? formatCurrency(pricing.total)
                : t("Confirming...")}
                  </span>
                </div>
              </div>)}

            {selectedPaymentMethod?.requireProof && (<div id="payment-proof-section" className="mt-5 min-w-0 border-t border-darb-gold/25 pt-5">
                <label className="mb-4 block">
                  <span className="mb-2 block text-sm font-semibold text-darb-green">{t("Sender name")} *</span>
                  <input name="transferSenderName" value={formData.transferSenderName} onChange={handleChange} className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none focus:border-darb-green" placeholder={t("Name used for the transfer")} />
                </label>

                <p className="font-semibold text-darb-green">{t("Transaction Screenshot")} *</p>
                {!paymentProof ? (<label onDragEnter={() => setIsProofDragging(true)} onDragLeave={() => setIsProofDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={handlePaymentProofDrop} className={`mt-3 flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed px-6 py-10 text-center transition focus-within:ring-2 focus-within:ring-darb-gold focus-within:ring-offset-2 ${isProofDragging ? "border-darb-green bg-darb-green/10" : "border-darb-gold/55 bg-darb-surface/60 hover:border-darb-green hover:bg-darb-surface"}`}>
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-darb-green text-darb-beige"><ImagePlus size={24} aria-hidden="true"/></span>
                    <span className="mt-4 font-semibold text-darb-green">{t("Choose screenshot")}</span>
                    <span id="payment-proof-help" className="mt-2 max-w-md text-xs leading-5 text-darb-muted">{t("Upload a clear screenshot of the successful transfer.")}</span>
                    <span id="payment-proof-requirements" className="mt-1 text-[11px] text-darb-muted">{t("JPG, PNG or WebP, up to 10 MB.")}</span>
                    <span className="mt-2 text-[11px] text-darb-muted">{t("You can also drag and drop the file here.")}</span>
                    <input id="payment-proof" data-upload-source="checkout_initial" aria-describedby="payment-proof-help payment-proof-requirements payment-proof-error" type="file" onClick={(event) => preparePaymentProofPicker(event.currentTarget, "checkout_initial")} onChange={handlePaymentProofChange} className="sr-only"/>
                  </label>) : (<div className="mt-3 grid min-h-64 gap-5 rounded-[1.25rem] border border-darb-gold/40 bg-darb-surface/60 p-5 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                    <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-darb-green text-center text-sm text-darb-beige sm:w-40">
                      {paymentProofPreview && !paymentProofPreviewFailed ? (<img src={paymentProofPreview} onError={() => {
                        setPaymentProofPreviewFailed(true);
                        if (paymentProof?.diagnosticId) emitPaymentProofDiagnostic(paymentProof.diagnosticId, paymentProof.diagnosticSource, "preview_failed", { normalizedMime: paymentProof.type, size: paymentProof.size });
                      }} alt={t("Payment proof preview")} className="h-full w-full object-contain"/>) : <span className="px-4">{t("Preview unavailable")}</span>}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold text-darb-green">{paymentProof.name}</p>
                      <p className="mt-1 text-xs text-darb-muted">{(paymentProof.size / 1024 / 1024).toFixed(2)} MB · {t("ready with your order")}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:flex-col">
                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-darb-gold/40 px-4 py-2 text-sm font-semibold text-darb-green transition hover:bg-darb-cream focus-within:ring-2 focus-within:ring-darb-gold"><span>{t("Change")}</span><input data-upload-source="checkout_change" aria-label={t("Change transaction screenshot")} type="file" onClick={(event) => preparePaymentProofPicker(event.currentTarget, "checkout_change")} onChange={handlePaymentProofChange} className="sr-only"/></label>
                      <button type="button" onClick={clearPaymentProof} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"><Trash2 size={16}/>{t("Remove")}</button>
                    </div>
                  </div>)}
                {paymentProofError && <p id="payment-proof-error" className="mt-2 text-sm font-semibold text-red-700" role="alert">{t(paymentProofError)}</p>}
                {!pricing && (<p className="mt-2 text-xs font-semibold text-amber-700">{t("Wait for the server-confirmed total above before transferring.")}</p>)}
              </div>)}
          </div>

          {/* =========================
            ERROR
        ========================== */}

          {error && (<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {t(error)}
            </div>)}

          <label className="flex items-start gap-3 rounded-2xl border border-darb-gold/20 bg-white p-4 text-sm leading-6 text-darb-muted">
            <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent} onChange={handleChange} className="mt-1" />
            {t("Send me occasional Darb news, launches, and offers.")}
          </label>
        </div>

        {/* =========================
            ORDER SUMMARY
        ========================== */}

        <aside className="min-w-0 h-fit rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <h2 className="font-display text-3xl text-darb-green">
            {t("Order Summary")}
          </h2>

          {/* Products */}

          <div className="mt-6 space-y-4">
            {items.map((item) => {
              const localizedName = language === "ar" && item.arabicName ? item.arabicName : item.name;
              const localizedCategory = language === "ar" && item.arabicCategoryName ? item.arabicCategoryName : item.categoryName;
              return (<div key={item.cartItemId} className="flex min-w-0 gap-3 border-b border-darb-gold/10 pb-4 last:border-b-0 sm:gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-darb-green">
                    {item.image ? (<img src={item.image} alt={localizedName} className="h-full w-full object-cover"/>) : (<p className="font-display text-sm text-darb-gold">
                        Darb
                      </p>)}
                  </div>

                  <div className="min-w-0 flex-1">
                    {localizedCategory && <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-darb-gold">{localizedCategory}</p>}
                    <p className="break-words font-semibold text-darb-green">
                      {localizedName}
                    </p>

                    <p className="mt-1 text-xs text-darb-muted">
                      {t("Qty:")}{" "}
                      {item.quantity}

                      {item.sizeLabel
                ? ` • ${item.sizeLabel}`
                : ""}
                    </p>
                  </div>

                  <p className="shrink-0 text-end text-sm font-semibold text-darb-black sm:text-base">
                    {formatCurrency(item.price *
                item.quantity)}
                  </p>
                </div>);
            })}
          </div>

          {/* =========================
            COUPON
        ========================== */}

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              {t("Discount Code")}
            </label>

            <div className="flex gap-2">
              <input name="couponCode" value={formData.couponCode} onChange={handleChange} className="min-w-0 flex-1 rounded-full border border-darb-gold/30 px-5 py-3 uppercase outline-none transition focus:border-darb-green" placeholder="DARB10"/>

              <button type="button" onClick={handleApplyCoupon} disabled={previewQuery.isFetching} className="rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60">
                {t("Apply")}
              </button>
            </div>

            {appliedCouponCode && (<button type="button" onClick={handleRemoveCoupon} className="mt-2 text-xs font-semibold text-darb-green underline">
                {t("Remove coupon")}
              </button>)}

            {pricing?.coupon
            ?.message && (<p className={`mt-3 rounded-2xl px-4 py-3 text-xs font-semibold ${pricing.coupon
                .status ===
                "valid"
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-800"}`}>
                {t(pricing.coupon.message)}
              </p>)}
          </div>

          {/* =========================
            RECALCULATING
        ========================== */}

          {previewQuery.isFetching && (<div className="mt-4 rounded-2xl bg-darb-cream/70 p-3 text-xs text-darb-muted">
              {t("Recalculating checkout totals...")}
            </div>)}

          {/* =========================
            APPLIED DISCOUNTS
        ========================== */}

          {pricing?.discounts
            ?.length > 0 && (<div className="mt-5 rounded-2xl bg-darb-cream/70 p-4">
              <p className="text-sm font-semibold text-darb-green">
                {t("Applied discounts")}
              </p>

              <div className="mt-3 space-y-2">
                {pricing.discounts.map((discount, index) => (<div key={`${discount.sourceType}-${discount.sourceId || index}`} className="flex justify-between gap-4 text-xs text-darb-muted">
                      <span>
                        {getOfferCustomerTitle(discount, language)}

                        {discount.freeShipping
                    ? " • " + t("Free delivery")
                    : ""}
                      </span>

                      <span className="font-semibold text-darb-green">
                        {discount.amount >
                    0
                    ? `-${formatCurrency(discount.amount)}`
                    : t("Free delivery")}
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
                {t("Items")}
              </span>

              <span className="font-semibold text-darb-black">
                {itemCount}
              </span>
            </div>

            {/* Subtotal */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                {t("Subtotal")}
              </span>

              <span className="font-semibold text-darb-black">
                {formatCurrency(calculatedSubtotal)}
              </span>
            </div>

            {/* Product Savings */}

            <div className="flex justify-between gap-4">
              <span className="text-darb-muted">
                {t("Product savings")}
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
                {t("Offers / coupons")}
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
                {t("Delivery")}
              </span>

              <span className="font-semibold text-darb-black">
                {calculatedDeliveryFee >
            0
            ? formatCurrency(calculatedDeliveryFee)
            : t("Free")}
              </span>
            </div>

            {/* Free Delivery Progress */}

            {Number(settings.delivery
            ?.freeDeliveryThreshold) >
            0 &&
            subtotal <
                Number(settings.delivery
                    .freeDeliveryThreshold) && (<div className="rounded-2xl bg-darb-cream/70 p-3 text-xs leading-5 text-darb-muted">
                  {t("Add")}{" "}
                  <span className="font-semibold text-darb-green">
                    {formatCurrency(Number(settings.delivery
                .freeDeliveryThreshold) -
                subtotal)}
                  </span>{" "}
                  {t("more to unlock free delivery.")}
                </div>)}

            {/* Free Shipping Applied */}

            {pricing?.freeShipping && (<div className="rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">
                {t("Free delivery applied.")}
              </div>)}
          </div>

          <div className="my-6 border-t border-darb-gold/20"/>

          {/* =========================
            FINAL TOTAL
        ========================== */}

          <div className="flex justify-between gap-4">
            <span className="font-semibold text-darb-green">
              {t("Total")}
            </span>

            <span className="font-display text-3xl text-darb-green">
              {formatCurrency(calculatedTotal)}
            </span>
          </div>

          {/* =========================
            PLACE ORDER
        ========================== */}

          <button type="submit" disabled={orderMutation.isPending || isPaymentProofReading ||
            settingsQuery.isLoading ||
            previewQuery.isFetching} className="mt-6 flex w-full justify-center rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60">
            {orderMutation.isPending
            ? t("Creating Order...")
            : t("Place Order")}
          </button>

          {/* Back */}

          <Link to="/cart" className="mt-3 flex w-full justify-center rounded-full border border-darb-gold px-6 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15">
            {t("Back to Cart")}
          </Link>
        </aside>
      </form>
    </section>);
}
export default Checkout;
