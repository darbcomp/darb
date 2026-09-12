import { useEffect, useMemo, useRef, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Check,
  EyeOff,
  ImagePlus,
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
import AdminPagination from "../../components/admin/AdminPagination";
import useAdminEditorReveal from "../../components/admin/useAdminEditorReveal";
import { useFeedback } from "../../context/FeedbackContext";

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
  manualVerifiedPurchase: false,
};

const statusOptions = [
  {
    label: "All",
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
    label: "Rejected",
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
  const { confirm, notify } = useFeedback();
  const [page, setPage] = useState(1);

  const [filters, setFilters] =
    useState({
      search: "",
      status: "pending",
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
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const imageInputRef = useRef(null);
  const imagePreviewUrlRef = useRef("");
  const isCustomerReviewEdit = editingReview?.source === "customer";
  const editorRef = useAdminEditorReveal(formOpen, editingReview?._id || "new");

  useEffect(() => {
    return () => {
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
        imagePreviewUrlRef.current = "";
      }
    };
  }, []);

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 10,
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
  }, [filters, page]);

  const reviewsQuery = useQuery({
    queryKey: [
      "admin-reviews",
      queryParams,
    ],

    queryFn: () =>
      getAdminReviews(
        queryParams
      ),

    placeholderData: keepPreviousData,
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
        notify({ type: "success", title: "Review created" });
      },

      onError: (error) => {
        setFormError(
          error.friendlyMessage ||
            "Failed to create review."
        );
        notify({ type: "error", title: "Review was not created", message: error.friendlyMessage || "Please try again." });
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
        notify({ type: "success", title: "Review updated" });
      },

      onError: (error) => {
        setFormError(
          error.friendlyMessage ||
            "Failed to update review."
        );
        notify({ type: "error", title: "Review was not updated", message: error.friendlyMessage || "Please try again." });
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
        notify({ type: "success", title: "Review status updated" });

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
        notify({ type: "success", title: "Review deleted" });
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
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      source: "",
    });
    setPage(1);
  };

  const openCreateForm = () => {
    setEditingReview(null);

    setForm({
      ...emptyForm,
      reviewDate:
        todayInputValue(),
    });

    setFormError("");
    setImageFile(null);
    setRemoveImage(false);
    setFormOpen(true);
  };

  const openEditForm = (
    review
  ) => {
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

      manualVerifiedPurchase:
        Boolean(review.isVerifiedPurchase),
    });

    setFormError("");
    setImageFile(null);
    setRemoveImage(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = "";
    }
    setFormOpen(false);
    setEditingReview(null);
    setForm(emptyForm);
    setFormError("");
    setImageFile(null);
    setRemoveImage(false);
    setImagePreviewUrl("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    imagePreviewUrlRef.current = objectUrl;
    setImagePreviewUrl(objectUrl);
    setImageFile(file);
    setRemoveImage(false);
    event.target.value = "";
  };

  const clearImage = () => {
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = "";
    }
    setImagePreviewUrl("");
    setImageFile(null);
    setRemoveImage(Boolean(editingReview?.media?.url));
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

    if (!isCustomerReviewEdit && imageFile) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        return "Review image must be JPG, PNG or WebP.";
      }
      if (imageFile.size > 5 * 1024 * 1024) {
        return "Review image must be 5 MB or smaller.";
      }
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

    const payload = new FormData();
    payload.append("displayName", form.displayName.trim());
    payload.append("rating", String(Number(form.rating)));
    payload.append("text", form.text.trim());
    payload.append("reviewDate", form.reviewDate);
    payload.append("status", form.status);
    if (!isCustomerReviewEdit) {
      payload.append("productId", form.productId || "");
      payload.append(
        "fragranceName",
        form.productId ? "" : form.fragranceName.trim()
      );
      payload.append("manualVerifiedPurchase", String(form.manualVerifiedPurchase));
      if (imageFile) payload.append("image", imageFile);
      if (removeImage) payload.append("removeImage", "true");
    }

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

  const handleDelete = async (
    review
  ) => {
    const confirmed = await confirm({
      title: "Delete review?",
      body: `The review from “${review.displayName}” will be permanently removed.`,
      confirmLabel: "Delete review",
      variant: "destructive",
    });

    if (!confirmed) return;

    deleteMutation.mutate(
      review._id
    );
  };

  const isSubmitting =
    createMutation.isPending ||
    editMutation.isPending;

  return (
    <section className="admin-page">
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
      <div className="mb-8 grid gap-0 border-y border-darb-gold/25 sm:grid-cols-2 xl:grid-cols-4">
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
        <div className="mb-4 flex flex-wrap gap-2" aria-label="Review status filters">
          {statusOptions.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              onClick={() => {
                setFilters((current) => ({ ...current, status: option.value }));
                setPage(1);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filters.status === option.value
                  ? "bg-darb-green text-darb-beige"
                  : "border border-darb-gold/30 text-darb-green hover:bg-darb-gold/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr_auto]">
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
        <div ref={editorRef} className="mb-8 scroll-mt-32 overflow-hidden rounded-[1.75rem] border border-darb-gold/25 bg-white shadow-soft">
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

            {isCustomerReviewEdit ? (
              <section className="mb-6 rounded-3xl border border-darb-gold/20 bg-darb-cream/45 p-5">
                <div className="flex items-center gap-2 text-darb-green">
                  <ShieldCheck size={18} />
                  <h3 className="font-display text-2xl">Purchase relationship</h3>
                </div>
                <p className="mt-2 text-sm leading-6 text-darb-muted">
                  Customer-submitted purchase links are read-only in the admin editor.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-darb-gold/20 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-darb-muted">Order</p>
                    <p className="mt-1 font-semibold text-darb-green">{editingReview.order?.orderNumber || "Not linked"}</p>
                  </div>
                  <div className="rounded-2xl border border-darb-gold/20 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-darb-muted">Product</p>
                    <p className="mt-1 font-semibold text-darb-green">{editingReview.product?.name || editingReview.fragranceName || "Not linked"}</p>
                  </div>
                  <div className="rounded-2xl border border-darb-gold/20 bg-white p-4">
                    <p className="text-xs uppercase tracking-wider text-darb-muted">Purchase status</p>
                    <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-darb-green">
                      {editingReview.isVerifiedPurchase && <ShieldCheck size={15} />}
                      {editingReview.isVerifiedPurchase ? "Verified Purchase" : "Not verified"}
                    </p>
                  </div>
                </div>
              </section>
            ) : null}

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

              {!isCustomerReviewEdit && <>
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
              </>}

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
                    Rejected
                  </option>
                </select>
              </div>

              {!isCustomerReviewEdit && (
                <label className="flex items-start gap-3 rounded-2xl border border-darb-gold/25 bg-darb-cream/45 px-5 py-4 md:col-span-2">
                  <input
                    type="checkbox"
                    name="manualVerifiedPurchase"
                    checked={form.manualVerifiedPurchase}
                    onChange={handleFormChange}
                    className="mt-1 h-4 w-4 rounded border-darb-gold text-darb-green focus:ring-darb-green"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-darb-green">Verified Purchase</span>
                    <span className="mt-1 block text-sm leading-6 text-darb-muted">
                      Mark this when Darb has confirmed this customer purchased before the website.
                    </span>
                  </span>
                </label>
              )}

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

            </div>

            {isCustomerReviewEdit ? (
              <section className="mt-6">
                <p className="mb-2 block text-sm font-semibold text-darb-green">Review image</p>
                {editingReview.media?.type === "image" && editingReview.media.url ? (
                  <div className="rounded-3xl border border-darb-gold/25 bg-darb-cream/45 p-4">
                    <img
                      src={editingReview.media.url}
                      alt={editingReview.media.alt || `Review by ${editingReview.displayName}`}
                      className="h-40 w-full max-w-sm rounded-2xl object-cover"
                    />
                    <p className="mt-3 text-xs text-darb-muted">Customer-submitted image · Read only</p>
                  </div>
                ) : (
                  <p className="rounded-2xl bg-darb-cream/70 px-5 py-4 text-sm text-darb-muted">No customer image was submitted.</p>
                )}
              </section>
            ) : (
            <section className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-darb-green">
                Review image
              </label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="sr-only"
                aria-label="Choose review image"
              />

              {(imagePreviewUrl || (!removeImage && editingReview?.media?.url)) ? (
                <div className="flex flex-col gap-4 rounded-3xl border border-darb-gold/25 bg-darb-cream/45 p-4 sm:flex-row sm:items-center">
                  <img
                    src={imagePreviewUrl || editingReview.media.url}
                    alt="Review upload preview"
                    className="h-28 w-full rounded-2xl object-cover sm:w-32"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-darb-green">
                      {imageFile?.name || "Current review image"}
                    </p>
                    <p className="mt-1 text-xs text-darb-muted">JPG, PNG or WebP, up to 5 MB.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="rounded-full border border-darb-gold/35 bg-white px-4 py-2 text-xs font-semibold text-darb-green"
                      >
                        Replace image
                      </button>
                      <button
                        type="button"
                        onClick={clearImage}
                        className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700"
                      >
                        Remove image
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-3xl border border-dashed border-darb-gold/45 bg-darb-cream/45 px-6 py-8 text-center transition hover:border-darb-gold hover:bg-darb-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-green"
                >
                  <ImagePlus size={28} className="text-darb-gold" />
                  <span className="mt-3 font-semibold text-darb-green">Add review image</span>
                  <span className="mt-1 text-xs text-darb-muted">JPG, PNG or WebP, up to 5 MB</span>
                  <span className="mt-3 rounded-full bg-darb-green px-4 py-2 text-xs font-semibold text-darb-beige">Browse</span>
                </button>
              )}
            </section>
            )}

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
          <div className="admin-record-list border-y border-darb-gold/25">
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
                          {review.status === "hidden" ? "rejected" : review.status}
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

                      {review.media?.type === "image" && review.media.url && (
                        <img
                          src={review.media.url}
                          alt={review.media.alt || `Review by ${review.displayName}`}
                          className="mt-5 max-h-64 w-full max-w-md rounded-2xl border border-darb-gold/20 object-cover"
                        />
                      )}

                      {(review.product
                        ?.name ||
                        review.fragranceName) && (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-darb-gold">
                          {review.product
                            ?.name ||
                            review.fragranceName}
                        </p>
                      )}

                      {(review.order?.orderNumber || review.customer?.email || review.customer?.phone) && (
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

                          Reject
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditForm(review)}
                        className="inline-flex items-center gap-2 rounded-full border border-darb-gold/35 px-4 py-2 text-xs font-semibold text-darb-green transition hover:bg-darb-gold/10"
                      >
                        <Pencil size={15} />
                        Edit
                      </button>

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
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50"
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
      <AdminPagination page={page} pages={pagination?.pages || 1} onPageChange={setPage} />
    </section>
  );
}

export default AdminReviews;
