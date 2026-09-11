import { useState } from "react";
import { Link } from "react-router-dom";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Package,
  ShoppingBag,
  UploadCloud,
} from "lucide-react";

import {
  getMyOrders,
  resubmitMyPaymentProof,
} from "../../api/orderApi";

import {
  formatCurrency,
} from "../../utils/formatCurrency";
import { buildOrderWhatsAppUrl } from "../../utils/whatsapp";
import { useLanguage } from "../../context/LanguageContext";
import { LocalizedPublicContent } from "../../components/common/InfoPageShell";

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
  status = ""
) =>
  status.replaceAll(
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

function PaymentProofPanel({
  order,
}) {
  const queryClient =
    useQueryClient();

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
    order.paymentProof || {
      status:
        "not_required",
    };

  const mutation =
    useMutation({
      mutationFn:
        resubmitMyPaymentProof,

      onSuccess: (
        response
      ) => {
        setFile(null);

        setError("");

        setMessage(
          response?.message ||
            "New payment proof submitted successfully."
        );

        queryClient.invalidateQueries({
          queryKey: [
            "my-orders",
          ],
        });
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
        orderId:
          order._id,

        file,
      });
    };

  if (
    !["instapay", "vodafone_cash"].includes(order.paymentMethod)
  ) {
    return null;
  }

  return (
    <LocalizedPublicContent><div className="mt-5 rounded-[1.25rem] border border-darb-gold/20 bg-darb-cream/45 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-darb-gold">
            {order.paymentMethod === "vodafone_cash" ? "Vodafone Cash Proof" : "InstaPay Proof"}
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
            was received and
            is waiting for
            Darb to review it.
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
            Your payment
            proof was
            approved. No
            further payment
            action is needed.
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

function MyOrders() {
  const { language, t } = useLanguage();
  const ordersQuery =
    useQuery({
      queryKey: [
        "my-orders",
      ],

      queryFn:
        getMyOrders,

      retry: 1,
    });

  const orders =
    ordersQuery.data
      ?.data || [];

  return (
    <LocalizedPublicContent><section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10 rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          {t("Account")}
        </p>

        <h1 className="mt-2 font-display text-5xl">
          {t("My Orders")}
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
          Follow every
          Darb order from
          the moment it
          begins until it
          reaches your
          door.
        </p>
      </div>

      {ordersQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">
            Loading your
            orders...
          </p>
        </div>
      )}

      {ordersQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load
            orders
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {ordersQuery
              .error
              ?.friendlyMessage ||
              "Orders are unavailable right now."}
          </p>
        </div>
      )}

      {!ordersQuery.isLoading &&
        !ordersQuery.isError &&
        orders.length ===
          0 && (
          <div className="rounded-[1.5rem] border border-darb-gold/25 bg-white p-8 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
              <ShoppingBag
                size={26}
              />
            </div>

            <h2 className="mt-6 font-display text-3xl text-darb-green">
              {t("No orders yet")}
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
              Your Darb
              order history
              will appear
              here after
              your first
              purchase.
            </p>

            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
            >
              {t("Shop")}
            </Link>
          </div>
        )}

      {!ordersQuery.isLoading &&
        !ordersQuery.isError &&
        orders.length >
          0 && (
          <div className="space-y-5">
            {orders.map(
              (order) => {
                const previewItems =
                  order.items?.slice(
                    0,
                    3
                  ) || [];

                const remainingItemsCount =
                  Math.max(
                    (order.items
                      ?.length ||
                      0) -
                      previewItems.length,
                    0
                  );

                return (
                  <article
                    key={
                      order._id
                    }
                    className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
                  >
                    <div className="grid gap-5 border-b border-darb-gold/10 p-6 lg:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-darb-green text-darb-beige">
                            <Package
                              size={
                                20
                              }
                            />
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                              Order
                            </p>

                            <h2 className="font-display text-3xl text-darb-green">
                              {
                                order.orderNumber
                              }
                            </h2>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-darb-muted">
                          Placed
                          on{" "}
                          {formatDate(
                            order.createdAt
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-start gap-3 lg:justify-end">
                          <StatusBadge
                            status={
                              order.orderStatus
                            }
                          />
                          <a href={buildOrderWhatsAppUrl(order.orderNumber, ["pending", "confirmed"].includes(order.orderStatus) ? "cancellation or order support" : "return, exchange, or order support")} target="_blank" rel="noreferrer" className="rounded-full border border-darb-green/25 px-3 py-1 text-xs font-semibold text-darb-green">
                            WhatsApp support
                          </a>

                        <StatusBadge
                          status={
                            order.paymentStatus
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-[1fr_260px]">
                      <div>
                        <div className="space-y-3">
                          {previewItems.map(
                            (
                              item,
                              index
                            ) => (
                              <div
                                key={`${order._id}-${
                                  item
                                    .productSnapshot
                                    ?.slug ||
                                  index
                                }`}
                                className="flex items-center gap-4 rounded-2xl bg-darb-cream/70 p-3"
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
                                        language === "ar" && item.productSnapshot.arabicName
                                          ? item.productSnapshot.arabicName
                                          : item.productSnapshot.name
                                      }
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <p className="font-display text-xs text-darb-gold">
                                      Darb
                                    </p>
                                  )}
                                </div>

                                <div className="flex-1">
                                  {(item.productSnapshot?.categoryName || item.productSnapshot?.arabicCategoryName) && (
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-darb-gold">
                                      {language === "ar" && item.productSnapshot?.arabicCategoryName
                                        ? item.productSnapshot.arabicCategoryName
                                        : item.productSnapshot.categoryName}
                                    </p>
                                  )}
                                  <p className="font-semibold text-darb-green">
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

                                    {item
                                      .productSnapshot
                                      ?.sizeLabel
                                      ? ` • ${item.productSnapshot.sizeLabel}`
                                      : ""}
                                  </p>
                                </div>

                                <p className="text-sm font-semibold text-darb-black">
                                  {formatCurrency(
                                    item.lineTotal
                                  )}
                                </p>
                              </div>
                            )
                          )}

                          {remainingItemsCount >
                            0 && (
                            <p className="text-sm font-semibold text-darb-muted">
                              +{" "}
                              {
                                remainingItemsCount
                              }{" "}
                              more
                              item
                              {remainingItemsCount ===
                              1
                                ? ""
                                : "s"}
                            </p>
                          )}
                        </div>

                        <PaymentProofPanel
                          order={
                            order
                          }
                        />
                      </div>

                      <div className="rounded-[1.25rem] border border-darb-gold/20 p-5">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between gap-4">
                            <span className="text-darb-muted">
                              Subtotal
                            </span>

                            <span className="font-semibold text-darb-black">
                              {formatCurrency(
                                order.subtotal
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-darb-muted">
                              Discount
                            </span>

                            <span className="font-semibold text-darb-green">
                              -
                              {formatCurrency(
                                order.discountTotal
                              )}
                            </span>
                          </div>

                          <div className="flex justify-between gap-4">
                            <span className="text-darb-muted">
                              Delivery
                            </span>

                            <span className="font-semibold text-darb-black">
                              {formatCurrency(
                                order.deliveryFee
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="my-4 border-t border-darb-gold/20" />

                        <div className="flex justify-between gap-4">
                          <span className="font-semibold text-darb-green">
                            Total
                          </span>

                          <span className="font-display text-2xl text-darb-green">
                            {formatCurrency(
                              order.total
                            )}
                          </span>
                        </div>

                        <p className="mt-4 text-xs capitalize text-darb-muted">
                          Payment:{" "}
                          {formatStatus(
                            order.paymentMethod
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
    </section></LocalizedPublicContent>
  );
}

export default MyOrders;
