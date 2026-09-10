import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Check,
  EyeOff,
  Pencil,
  Plus,
  ShieldCheck,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  createAdminReview,
  deleteAdminReview,
  getAdminProducts,
  getAdminReviews,
  updateAdminReview,
} from "../../api/adminApi";

const todayInputValue = () =>
  new Date().toISOString().slice(0, 10);

const emptyForm = {
  displayName: "",
  rating: 5,
  text: "",
  productId: "",
  fragranceName: "",
  reviewDate: todayInputValue(),
  status: "approved",
  imageFile: null,
  removeImage: false,
};

const statusOptions = [
  {
    label: "All statuses",
    value: "",
  },
  {
    label: "Pending",
    value: "pending",
  },
  {
    label: "Approved",
    value: "approved",
  },
  {
    label: "Hidden",
    value: "hidden",
  },
];

const sourceOptions = [
  {
    label: "All sources",
    value: "",
  },
  {
    label: "Customer",
    value: "customer",
  },
  {
    label: "Admin",
    value: "admin",
  },
];

const getStatusClasses = (status) => {
  if (status === "approved") {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (status === "hidden") {
    return "bg-gray-100 text-gray-700 border-gray-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function RatingStars({
  rating = 0,
  size = 17,
}) {
  return (
    <div
      className="flex items-center gap-1 text-darb-gold"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({
        length: 5,
      }).map((_, index) => (
        <Star
          key={index}
          size={size}
          strokeWidth={1.7}
          fill={
            index < Number(rating)
              ? "currentColor"
              : "none"
          }
        />
      ))}
    </div>
  );
}

function AdminReviews() {
  const queryClient =
    useQueryClient();

  const [filters, setFilters] =
    useState({
      search: "",
      status: "",
      source: "",
    });

  const [formOpen, setFormOpen] =
    useState(false);

  const [
    editingReview,
    setEditingReview,
  ] = useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [formError, setFormError] =
    useState("");

  const queryParams = useMemo(() => {
    const params = {
      limit: 40,
    };

    if (filters.search.trim()) {
      params.search =
        filters.search.trim();
    }

    if (filters.status) {
      params.status =
        filters.status;
    }

    if (filters.source) {
      params.source =
        filters.source;
    }

    return params;
  }, [filters]);

  const reviewsQuery = useQuery({
    queryKey: [
      "admin-reviews",
      queryParams,
    ],

    queryFn: () =>
      getAdminReviews(
        queryParams
      ),

    retry: 1,
  });

  const productsQuery = useQuery({
    queryKey: [
      "admin-review-products",
    ],

    queryFn: () =>
      getAdminProducts({
        limit: 100,
      }),

    retry: 1,
  });

  const createMutation =
    useMutation({
      mutationFn:
        createAdminReview,

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "admin-reviews",
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            "public-reviews",
          ],
        });

        closeForm();
      },

      onError: (error) => {
        setFormError(
          error.friendlyMessage ||
            "Failed to create review."
        );
      },
    });

  const editMutation =
    useMutation({
      mutationFn:
        updateAdminReview,

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "admin-reviews",
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            "public-reviews",
          ],
        });

        closeForm();
      },

      onError: (error) => {
        setFormError(
          error.friendlyMessage ||
            "Failed to update review."
        );
      },
    });

  const statusMutation =
    useMutation({
      mutationFn:
        updateAdminReview,

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "admin-reviews",
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            "public-reviews",
          ],
        });
      },
    });

  const deleteMutation =
    useMutation({
      mutationFn:
        deleteAdminReview,

      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            "admin-reviews",
          ],
        });

        queryClient.invalidateQueries({
          queryKey: [
            "public-reviews",
          ],
        });
      },
    });

  const reviews =
    reviewsQuery.data?.data || [];

  const pagination =
    reviewsQuery.data?.pagination;

  const products =
    productsQuery.data?.data || [];

  const pendingCount =
    reviews.filter(
      (review) =>
        review.status === "pending"
    ).length;

  const approvedCount =
    reviews.filter(
      (review) =>
        review.status === "approved"
    ).length;

  const customerCount =
    reviews.filter(
      (review) =>
        review.source === "customer"
    ).length;

  const handleFilterChange = (
    event
  ) => {
    const { name, value } =
      event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      source: "",
    });
  };

  const openCreateForm = () => {
    setEditingReview(null);

    setForm({
      ...emptyForm,
      reviewDate:
        todayInputValue(),
    });

    setFormError("");
    setFormOpen(true);
  };

  const openEditForm = (
    review
  ) => {
    if (
      review.source !== "admin"
    ) {
      return;
    }

    setEditingReview(review);

    setForm({
      displayName:
        review.displayName || "",

      rating:
        review.rating || 5,

      text:
        review.text || "",

      productId:
        review.product?._id ||
        "",

      fragranceName:
        review.fragranceName ||
        review.product?.name ||
        "",

      reviewDate:
        review.reviewDate
          ? new Date(
              review.reviewDate
            )
              .toISOString()
              .slice(0, 10)
          : todayInputValue(),

      status:
        review.status ||
        "approved",
      imageFile: null,
      removeImage: false,
    });

    setFormError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingReview(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleFormChange = (
    event
  ) => {
    const { name, value, files, type, checked } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: files?.[0] || (type === "checkbox" ? checked : value),
    }));
  };

  const validateForm = () => {
    if (
      !form.displayName.trim()
    ) {
      return "Display name is required.";
    }

    if (
      Number(form.rating) < 1 ||
      Number(form.rating) > 5
    ) {
      return "Rating must be between 1 and 5.";
    }

    if (
      form.text.trim().length < 5
    ) {
      return "Review text is too short.";
    }

    return "";
  };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      setFormError(
        validationError
      );

      return;
    }

    setFormError("");

    const values = {
      displayName:
        form.displayName.trim(),

      rating:
        Number(form.rating),

      text:
        form.text.trim(),

      productId:
        form.productId || "",

      fragranceName:
        form.productId
          ? ""
          : form.fragranceName.trim(),

      reviewDate:
        form.reviewDate,

      status: form.status,
    };
    const payload = new FormData();
    Object.entries(values).forEach(([key, value]) => payload.append(key, value));
    if (form.imageFile) payload.append("image", form.imageFile);
    if (form.removeImage) payload.append("removeImage", "true");

    if (editingReview) {
      editMutation.mutate({
        reviewId:
          editingReview._id,

        payload,
      });

      return;
    }

    createMutation.mutate(
      payload
    );
  };

  const changeStatus = (
    review,
    status
  ) => {
    statusMutation.mutate({
      reviewId: review._id,

      payload: {
        status,
      },
    });
  };

  const handleDelete = (
    review
  ) => {
    const confirmed =
      window.confirm(
        `Delete the review from "${review.displayName}"?`
      );

    if (!confirmed) return;

    deleteMutation.mutate(
      review._id
    );
  };

  const isSubmitting =
    createMutation.isPending ||
    editMutation.isPending;

  return (
    <section>
      {/* Page heading */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Reviews
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            Approve real customer
            experiences and manage
            manually added Darb
            testimonials.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreateForm
          }
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus size={18} />

          Add Manual Review
        </button>
      </div>

      {/* Statistics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
            Total
          </p>

          <p className="mt-2 font-display text-4xl text-darb-green">
            {pagination?.total ??
              reviews.length}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
            Pending
          </p>

          <p className="mt-2 font-display text-4xl text-darb-green">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
            Approved
          </p>

          <p className="mt-2 font-display text-4xl text-darb-green">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
            Customer
          </p>

          <p className="mt-2 font-display text-4xl text-darb-green">
            {customerCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
          <input
            name="search"
            value={
              filters.search
            }
            onChange={
              handleFilterChange
            }
            placeholder="Search name, review, fragrance..."
            className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
          />

          <select
            name="status"
            value={
              filters.status
            }
            onChange={
              handleFilterChange
            }
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            {statusOptions.map(
              (option) => (
                <option
                  key={
                    option.label
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <select
            name="source"
            value={
              filters.source
            }
            onChange={
              handleFilterChange
            }
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            {sourceOptions.map(
              (option) => (
                <option
                  key={
                    option.label
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-darb-gold/30 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Manual review form */}
      {formOpen && (
        <div className="mb-8 overflow-hidden rounded-[1.75rem] border border-darb-gold/25 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-darb-gold/20 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">
                {editingReview
                  ? "Edit"
                  : "Create"}
              </p>

              <h2 className="mt-1 font-display text-3xl text-darb-green">
                Manual Review
              </h2>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-darb-gold/30 text-darb-green transition hover:bg-darb-gold/10"
              aria-label="Close review form"
            >
              <X size={18} />
            </button>
          </div>

          <form
            onSubmit={
              handleSubmit
            }
            className="p-6"
          >
            {formError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Display Name *
                </label>

                <input
                  name="displayName"
                  value={
                    form.displayName
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="Customer name"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Rating *
                </label>

                <select
                  name="rating"
                  value={
                    form.rating
                  }
                  onChange={
                    handleFormChange
                  }
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  <option value="5">
                    5 Stars
                  </option>

                  <option value="4">
                    4 Stars
                  </option>

                  <option value="3">
                    3 Stars
                  </option>

                  <option value="2">
                    2 Stars
                  </option>

                  <option value="1">
                    1 Star
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Darb Fragrance
                </label>

                <select
                  name="productId"
                  value={
                    form.productId
                  }
                  onChange={
                    handleFormChange
                  }
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  <option value="">
                    No linked product
                  </option>

                  {products.map(
                    (product) => (
                      <option
                        key={
                          product._id
                        }
                        value={
                          product._id
                        }
                      >
                        {
                          product.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Custom Fragrance
                </label>

                <input
                  name="fragranceName"
                  value={
                    form.fragranceName
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    Boolean(
                      form.productId
                    )
                  }
                  placeholder={
                    form.productId
                      ? "Using selected product"
                      : "Optional fragrance name"
                  }
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Review Date
                </label>

                <input
                  type="date"
                  name="reviewDate"
                  value={
                    form.reviewDate
                  }
                  onChange={
                    handleFormChange
                  }
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Status
                </label>

                <select
                  name="status"
                  value={
                    form.status
                  }
                  onChange={
                    handleFormChange
                  }
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  <option value="approved">
                    Approved
                  </option>

                  <option value="pending">
                    Pending
                  </option>

                  <option value="hidden">
                    Hidden
                  </option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Review *
                </label>

                <textarea
                  name="text"
                  value={
                    form.text
                  }
                  onChange={
                    handleFormChange
                  }
                  rows={5}
                  placeholder="Write the review..."
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-4 outline-none transition focus:border-darb-green"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">Review photo (optional)</label>
                <input type="file" name="imageFile" accept="image/jpeg,image/png,image/webp,image/avif" onChange={handleFormChange} className="w-full rounded-2xl border border-darb-gold/30 px-4 py-3 text-sm" />
                {editingReview?.media?.type === "image" && editingReview.media.url && (
                  <label className="mt-3 flex items-center gap-2 text-sm text-darb-muted"><input type="checkbox" name="removeImage" checked={form.removeImage} onChange={handleFormChange} /> Remove current photo</label>
                )}
                <p className="mt-2 text-xs text-darb-muted">Images only; public video reviews are added through Darb's controlled media workflow.</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-darb-cream/70 px-5 py-4 text-sm leading-6 text-darb-muted">
              Manual reviews are
              intentionally not marked
              as Verified Purchase.
              Verification can only come
              from a real Darb customer
              order.
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  isSubmitting
                }
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingReview
                    ? "Save Changes"
                    : "Create Review"}
              </button>

              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-full border border-darb-gold/40 px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/10"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {reviewsQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">
            Loading reviews...
          </p>
        </div>
      )}

      {/* Error */}
      {reviewsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load
            reviews
          </h2>

          <p className="mt-3 text-red-700">
            {reviewsQuery.error
              ?.friendlyMessage ||
              "Reviews are unavailable right now."}
          </p>
        </div>
      )}

      {/* Empty */}
      {!reviewsQuery.isLoading &&
        !reviewsQuery.isError &&
        reviews.length === 0 && (
          <div className="rounded-[1.75rem] border border-darb-gold/20 bg-white p-10 text-center shadow-soft">
            <Star
              size={30}
              className="mx-auto text-darb-gold"
            />

            <h2 className="mt-5 font-display text-3xl text-darb-green">
              No reviews yet
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-darb-muted">
              Customer reviews and
              manual Darb reviews will
              appear here.
            </p>
          </div>
        )}

      {/* Review list */}
      {!reviewsQuery.isLoading &&
        !reviewsQuery.isError &&
        reviews.length > 0 && (
          <div className="space-y-5">
            {reviews.map(
              (review) => (
                <article
                  key={
                    review._id
                  }
                  className="rounded-[1.75rem] border border-darb-gold/20 bg-white p-5 shadow-soft sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getStatusClasses(
                            review.status
                          )}`}
                        >
                          {
                            review.status
                          }
                        </span>

                        <span className="rounded-full bg-darb-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-darb-green">
                          {review.source ===
                          "customer"
                            ? "Customer"
                            : "Admin"}
                        </span>

                        {review.isVerifiedPurchase && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-darb-gold/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-darb-green">
                            <ShieldCheck
                              size={
                                13
                              }
                            />

                            Verified Purchase
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4">
                        <RatingStars
                          rating={
                            review.rating
                          }
                        />

                        <span className="text-xs text-darb-muted">
                          {formatDate(
                            review.reviewDate ||
                              review.createdAt
                          )}
                        </span>
                      </div>

                      <h2 className="mt-4 font-display text-2xl text-darb-green sm:text-3xl">
                        {
                          review.displayName
                        }
                      </h2>

                      <p className="mt-3 max-w-3xl whitespace-pre-line text-sm leading-7 text-darb-muted sm:text-base">
                        “{review.text}”
                      </p>

                      {(review.product
                        ?.name ||
                        review.fragranceName) && (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
                          {review.product
                            ?.name ||
                            review.fragranceName}
                        </p>
                      )}

                      {review.source ===
                        "customer" && (
                        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-darb-gold/15 pt-4 text-xs text-darb-muted">
                          {review.order
                            ?.orderNumber && (
                            <span>
                              Order:{" "}
                              <strong className="text-darb-green">
                                {
                                  review
                                    .order
                                    .orderNumber
                                }
                              </strong>
                            </span>
                          )}

                          {review.customer
                            ?.email && (
                            <span>
                              {
                                review
                                  .customer
                                  .email
                              }
                            </span>
                          )}

                          {review.customer
                            ?.phone && (
                            <span>
                              {
                                review
                                  .customer
                                  .phone
                              }
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-wrap content-start gap-2 lg:w-[220px] lg:justify-end">
                      {review.status !==
                        "approved" && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(
                              review,
                              "approved"
                            )
                          }
                          disabled={
                            statusMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-4 py-2 text-xs font-semibold text-darb-beige transition hover:bg-darb-black disabled:opacity-50"
                        >
                          <Check
                            size={
                              15
                            }
                          />

                          Approve
                        </button>
                      )}

                      {review.status !==
                        "hidden" && (
                        <button
                          type="button"
                          onClick={() =>
                            changeStatus(
                              review,
                              "hidden"
                            )
                          }
                          disabled={
                            statusMutation.isPending
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-darb-gold/35 px-4 py-2 text-xs font-semibold text-darb-green transition hover:bg-darb-gold/10 disabled:opacity-50"
                        >
                          <EyeOff
                            size={
                              15
                            }
                          />

                          Hide
                        </button>
                      )}

                      {review.source ===
                        "admin" && (
                        <button
                          type="button"
                          onClick={() =>
                            openEditForm(
                              review
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-darb-gold/35 px-4 py-2 text-xs font-semibold text-darb-green transition hover:bg-darb-gold/10"
                        >
                          <Pencil
                            size={
                              15
                            }
                          />

                          Edit
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            review
                          )
                        }
                        disabled={
                          deleteMutation.isPending
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2
                          size={
                            15
                          }
                        />

                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
    </section>
  );
}

export default AdminReviews;
