import {
  useState,
} from "react";

import {
  useMutation,
} from "@tanstack/react-query";

import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  PackageSearch,
  Search,
  UploadCloud,
} from "lucide-react";

import {
  getGuestPaymentProofStatus,
  resubmitGuestPaymentProof,
  trackOrder,
} from "../../api/orderApi";

import {
  formatCurrency,
} from "../../utils/formatCurrency";
import { buildOrderWhatsAppUrl } from "../../utils/whatsapp";
import { LocalizedPublicContent } from "../../components/common/InfoPageShell";
import { useLanguage } from "../../context/LanguageContext";

const MAX_PAYMENT_PROOF_SIZE =
  10 * 1024 * 1024;

const ALLOWED_PAYMENT_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const statusStyles = {
  pending:
    "bg-yellow-50 text-yellow-700 border-yellow-200",

  confirmed:
    "bg-blue-50 text-blue-700 border-blue-200",

  processing:
    "bg-purple-50 text-purple-700 border-purple-200",

  shipped:
    "bg-indigo-50 text-indigo-700 border-indigo-200",

  delivered:
    "bg-green-50 text-green-700 border-green-200",

  cancelled:
    "bg-red-50 text-red-700 border-red-200",

  paid:
    "bg-green-50 text-green-700 border-green-200",

  failed:
    "bg-red-50 text-red-700 border-red-200",

  refunded:
    "bg-gray-50 text-gray-700 border-gray-200",

  submitted:
    "bg-yellow-50 text-yellow-700 border-yellow-200",

  approved:
    "bg-green-50 text-green-700 border-green-200",

  rejected:
    "bg-red-50 text-red-700 border-red-200",

  not_required:
    "bg-gray-50 text-gray-700 border-gray-200",
};

const formatStatus = (
  value = ""
) =>
  value.replaceAll(
    "_",
    " "
  );

const formatDate = (
  date
) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat(
    "en-EG",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  ).format(
    new Date(date)
  );
};

const getTrackedOrder = (
  response
) => {
  const data =
    response?.data ??
    response;

  return (
    data?.order ??
    data ??
    null
  );
};

function StatusBadge({
  status,
}) {
  const { t } = useLanguage();
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
        statusStyles[
          status
        ] ||
        "bg-gray-50 text-gray-700 border-gray-200"
      }`}
    >
      {t(formatStatus(status))}
    </span>
  );
}

function GuestPaymentProofPanel({
  orderNumber,
  phone,
  paymentProofData,
  onProofUpdated,
}) {
  const [
    file,
    setFile,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const proof =
    paymentProofData
      ?.paymentProof || {
      status:
        "not_required",
    };

  const mutation =
    useMutation({
      mutationFn:
        resubmitGuestPaymentProof,

      onSuccess:
        async (
          response
        ) => {
          setFile(null);

          setError("");

          setMessage(
            response?.message ||
              "New payment proof submitted successfully."
          );

          try {
            const refreshed =
              await getGuestPaymentProofStatus(
                {
                  orderNumber,
                  phone,
                }
              );

            onProofUpdated(
              refreshed?.data ||
                refreshed ||
                null
            );
          } catch {
            onProofUpdated({
              ...paymentProofData,

              paymentProof:
                response?.data
                  ?.paymentProof || {
                  status:
                    "submitted",
                },
            });
          }
        },

      onError: (
        err
      ) => {
        setMessage("");

        setError(
          err.friendlyMessage ||
            "Failed to upload the new payment proof."
        );
      },
    });

  const handleFileChange = (
    event
  ) => {
    const selected =
      event.target
        .files?.[0] ||
      null;

    setError("");
    setMessage("");

    if (!selected) {
      setFile(null);
      return;
    }

    if (
      !ALLOWED_PAYMENT_PROOF_TYPES.includes(
        selected.type
      )
    ) {
      setFile(null);

      setError(
        "Payment proof must be JPG, PNG, or WEBP."
      );

      event.target.value =
        "";

      return;
    }

    if (
      selected.size >
      MAX_PAYMENT_PROOF_SIZE
    ) {
      setFile(null);

      setError(
        "Payment proof must be 10 MB or smaller."
      );

      event.target.value =
        "";

      return;
    }

    setFile(selected);

    event.target.value =
      "";
  };

  const handleSubmit =
    () => {
      setError("");
      setMessage("");

      if (!file) {
        setError(
          "Choose the new transaction screenshot first."
        );

        return;
      }

      mutation.mutate({
        orderNumber,
        phone,
        file,
      });
    };

  if (
    !["instapay", "vodafone_cash"].includes(paymentProofData?.paymentMethod)
  ) {
    return null;
  }

  return (
    <LocalizedPublicContent><div className="mt-6 rounded-[1.5rem] border border-darb-gold/20 bg-darb-cream/45 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-darb-gold">
            {paymentProofData?.paymentMethod === "vodafone_cash" ? "Vodafone Cash Proof" : "InstaPay Proof"}
          </p>

          <p className="mt-2 text-sm font-semibold text-darb-green">
            Payment proof
            status
          </p>
        </div>

        <StatusBadge
          status={
            proof.status ||
            "not_required"
          }
        />
      </div>

      {proof.status ===
        "submitted" && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm leading-6 text-yellow-800">
          <UploadCloud
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            Your screenshot
            is waiting for
            Darb to review
            it. You do not
            need to upload
            another one
            right now.
          </p>
        </div>
      )}

      {proof.status ===
        "approved" && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-800">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>
            Your InstaPay
            payment proof
            was approved.
            No further
            payment action
            is needed.
          </p>
        </div>
      )}

      {proof.status ===
        "rejected" && (
        <div className="mt-4">
          <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Your previous
                proof was
                rejected.
              </p>

              <p className="mt-1">
                {proof.rejectionReason ||
                  "Please upload a clearer screenshot of the successful transaction."}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-darb-gold/20 bg-white p-4">
            <p className="text-sm font-semibold text-darb-green">
              Upload a new
              screenshot
            </p>

            <p className="mt-1 text-xs leading-5 text-darb-muted">
              JPG, PNG, or
              WEBP. Maximum
              10 MB.
            </p>

            <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-dashed border-darb-gold/40 bg-darb-cream/50 px-4 py-4 transition hover:border-darb-green">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                  <ImagePlus
                    size={18}
                  />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-darb-green">
                    Choose
                    payment
                    proof
                  </p>

                  <p className="truncate text-xs text-darb-muted">
                    {file?.name ||
                      "No file selected"}
                  </p>
                </div>
              </div>

              <span className="shrink-0 rounded-full border border-darb-gold/30 bg-white px-3 py-2 text-xs font-semibold text-darb-green">
                Browse
              </span>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

            {error && (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {message && (
              <p className="mt-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={
                handleSubmit
              }
              disabled={
                mutation.isPending
              }
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <UploadCloud
                size={17}
              />

              {mutation.isPending
                ? "Uploading..."
                : "Submit New Proof"}
            </button>
          </div>
        </div>
      )}
    </div></LocalizedPublicContent>
  );
}

function TrackOrder() {
  const { language } = useLanguage();
  const [
    form,
    setForm,
  ] = useState({
    orderNumber: "",
    phone: "",
  });

  const [
    trackedOrder,
    setTrackedOrder,
  ] = useState(null);

  const [
    paymentProofData,
    setPaymentProofData,
  ] = useState(null);

  const [
    error,
    setError,
  ] = useState("");

  const trackingMutation =
    useMutation({
      mutationFn:
        async (
          payload
        ) => {
          const trackingResponse =
            await trackOrder(
              payload
            );

          const proofResponse =
            await getGuestPaymentProofStatus(
              payload
            );

          return {
            trackingResponse,
            proofResponse,
          };
        },

      onSuccess: ({
        trackingResponse,
        proofResponse,
      }) => {
        setTrackedOrder(
          getTrackedOrder(
            trackingResponse
          )
        );

        setPaymentProofData(
          proofResponse?.data ||
            proofResponse ||
            null
        );

        setError("");
      },

      onError: (
        err
      ) => {
        setTrackedOrder(
          null
        );

        setPaymentProofData(
          null
        );

        setError(
          err.friendlyMessage ||
            "We could not find that order. Check the order number and phone number."
        );
      },
    });

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    const orderNumber =
      form.orderNumber
        .trim()
        .toUpperCase();

    const phone =
      form.phone.trim();

    if (
      !orderNumber ||
      !phone
    ) {
      setError(
        "Enter both your order number and checkout phone number."
      );

      return;
    }

    setError("");

    trackingMutation.mutate({
      orderNumber,
      phone,
    });
  };

  const displayOrder =
    trackedOrder ||
    paymentProofData;

  const items =
    trackedOrder?.items ||
    [];

  return (
    <LocalizedPublicContent><section className="mx-auto max-w-6xl px-4 py-14">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Your Darb
            Journey
          </p>

          <h1 className="mt-2 font-display text-5xl text-darb-green">
            Track Order
          </h1>

          <p className="mt-4 max-w-xl leading-7 text-darb-muted">
            Enter the exact
            order number and
            the phone number
            used at checkout.
          </p>

          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-darb-green">
                Order Number
              </span>

              <input
                name="orderNumber"
                value={
                  form.orderNumber
                }
                onChange={
                  handleChange
                }
                placeholder="DARB-1001"
                autoComplete="off"
                className="w-full rounded-full border border-darb-gold/30 px-5 py-3 uppercase outline-none transition focus:border-darb-green"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold text-darb-green">
                Checkout
                Phone Number
              </span>

              <input
                name="phone"
                value={
                  form.phone
                }
                onChange={
                  handleChange
                }
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                autoComplete="tel"
                className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              />
            </label>

            {error && (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={
                trackingMutation.isPending
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search
                size={17}
              />

              {trackingMutation.isPending
                ? "Finding Order..."
                : "Track Order"}
            </button>
          </form>
        </div>

        <div>
          {!displayOrder && (
            <div className="flex min-h-[360px] items-center justify-center rounded-[2rem] border border-darb-gold/20 bg-darb-cream/55 p-8 text-center">
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                  <PackageSearch
                    size={
                      27
                    }
                  />
                </div>

                <h2 className="mt-5 font-display text-3xl text-darb-green">
                  Follow the
                  path
                </h2>

                <p className="mx-auto mt-3 max-w-md leading-7 text-darb-muted">
                  Your current
                  order and
                  payment
                  status will
                  appear here
                  after you
                  verify the
                  order
                  details.
                </p>
              </div>
            </div>
          )}

          {displayOrder && (
            <div className="rounded-[2rem] border border-darb-gold/20 bg-white p-6 shadow-soft sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                    Order
                  </p>

                  <h2 className="mt-1 font-display text-4xl text-darb-green">
                    {displayOrder.orderNumber ||
                      form.orderNumber.toUpperCase()}
                  </h2>

                  {trackedOrder?.createdAt && (
                    <p className="mt-2 text-sm text-darb-muted">
                      Placed on{" "}
                      {formatDate(
                        trackedOrder.createdAt
                      )}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {displayOrder.orderStatus && (
                    <StatusBadge
                      status={
                        displayOrder.orderStatus
                      }
                    />
                  )}
                  <a href={buildOrderWhatsAppUrl(displayOrder.orderNumber, ["pending", "confirmed"].includes(displayOrder.orderStatus) ? "cancellation or order support" : "return, exchange, or order support")} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-darb-green/25 px-4 py-2 text-sm font-semibold text-darb-green">
                    WhatsApp support
                  </a>

                  {displayOrder.paymentStatus && (
                    <StatusBadge
                      status={
                        displayOrder.paymentStatus
                      }
                    />
                  )}
                </div>
              </div>

              {items.length >
                0 && (
                <div className="mt-6 space-y-3">
                  {items.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={`${
                          item
                            .productSnapshot
                            ?.slug ||
                          index
                        }-${index}`}
                        className="flex items-center gap-4 rounded-2xl bg-darb-cream/65 p-3"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-darb-green">
                          {item
                            .productSnapshot
                            ?.image ? (
                            <img
                              src={
                                item
                                  .productSnapshot
                                  .image
                              }
                              alt={
                                (language === "ar" && item.productSnapshot.arabicName
                                  ? item.productSnapshot.arabicName
                                  : item.productSnapshot.name) ||
                                "Darb product"
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="font-display text-xs text-darb-gold">
                              Darb
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {(item.productSnapshot?.categoryName || item.productSnapshot?.arabicCategoryName) && (
                            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-darb-gold">
                              {language === "ar" && item.productSnapshot?.arabicCategoryName
                                ? item.productSnapshot.arabicCategoryName
                                : item.productSnapshot.categoryName}
                            </p>
                          )}
                          <p className="truncate font-semibold text-darb-green">
                            {(language === "ar" && item.productSnapshot?.arabicName
                              ? item.productSnapshot.arabicName
                              : item.productSnapshot?.name) ||
                              "Darb Product"}
                          </p>

                          <p className="mt-1 text-xs text-darb-muted">
                            Qty:{" "}
                            {
                              item.quantity
                            }
                          </p>
                        </div>

                        {item.lineTotal !==
                          undefined && (
                          <p className="text-sm font-semibold text-darb-black">
                            {formatCurrency(
                              item.lineTotal
                            )}
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-darb-gold/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-darb-gold">
                    Payment
                    Method
                  </p>

                  <p className="mt-2 text-sm font-semibold capitalize text-darb-green">
                    {formatStatus(
                      displayOrder.paymentMethod ||
                        ""
                    ) ||
                      "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-darb-gold/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-darb-gold">
                    Order Total
                  </p>

                  <p className="mt-2 font-display text-2xl text-darb-green">
                    {displayOrder.total !==
                    undefined
                      ? formatCurrency(
                          displayOrder.total
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              <GuestPaymentProofPanel
                orderNumber={form.orderNumber
                  .trim()
                  .toUpperCase()}
                phone={form.phone.trim()}
                paymentProofData={
                  paymentProofData
                }
                onProofUpdated={
                  setPaymentProofData
                }
              />
            </div>
          )}
        </div>
      </div>
    </section></LocalizedPublicContent>
  );
}

export default TrackOrder;
