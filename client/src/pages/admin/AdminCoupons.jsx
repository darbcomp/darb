import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Plus,
  Search,
  TicketPercent,
  Trash2,
  X,
} from "lucide-react";
import {
  createAdminCoupon,
  deleteAdminCoupon,
  getAdminCoupons,
  updateAdminCoupon,
} from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminEntitySelector from "../../components/admin/AdminEntitySelector";
import useAdminEditorReveal from "../../components/admin/useAdminEditorReveal";
import { useFeedback } from "../../context/FeedbackContext";

const emptyForm = {
  code: "",
  name: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderValue: "",
  maxDiscountAmount: "",
  allowedProducts: [],
  excludedProducts: [],
  allowedCategories: [],
  excludedCategories: [],
  usageLimit: "",
  usedCount: "0",
  perCustomerLimit: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  allowWithOffers: true,
  allowWithBundles: true,
};

const discountTypes = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Free Shipping", value: "free_shipping" },
];

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const formatStatus = (value = "") => value.replaceAll("_", " ");

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const formatDateInput = (date) => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
};

const relatedItemsToValues = (items = []) => Array.isArray(items)
  ? items.map((item) => String(item?._id || item || "")).filter(Boolean)
  : [];

const couponToForm = (coupon) => {
  return {
    code: coupon.code || "",
    name: coupon.name || "",
    description: coupon.description || "",
    discountType: coupon.discountType || "percentage",
    discountValue: coupon.discountValue || "",
    minOrderValue: coupon.minOrderValue || "",
    maxDiscountAmount: coupon.maxDiscountAmount || "",
    allowedProducts: relatedItemsToValues(coupon.allowedProducts),
    excludedProducts: relatedItemsToValues(coupon.excludedProducts),
    allowedCategories: relatedItemsToValues(coupon.allowedCategories),
    excludedCategories: relatedItemsToValues(coupon.excludedCategories),
    usageLimit: coupon.usageLimit || "",
    usedCount: coupon.usedCount || "0",
    perCustomerLimit: coupon.perCustomerLimit || "",
    startsAt: formatDateInput(coupon.startsAt),
    endsAt: formatDateInput(coupon.endsAt),
    isActive: Boolean(coupon.isActive),
    allowWithOffers: Boolean(coupon.allowWithOffers),
    allowWithBundles: Boolean(coupon.allowWithBundles),
  };
};

const createPayload = (form) => {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    description: form.description.trim(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    minOrderValue: Number(form.minOrderValue) || 0,
    maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
    allowedProducts: form.allowedProducts,
    excludedProducts: form.excludedProducts,
    allowedCategories: form.allowedCategories,
    excludedCategories: form.excludedCategories,
    usageLimit: Number(form.usageLimit) || 0,
    perCustomerLimit: Number(form.perCustomerLimit) || 0,
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    isActive: Boolean(form.isActive),
    allowWithOffers: Boolean(form.allowWithOffers),
    allowWithBundles: Boolean(form.allowWithBundles),
  };
};

function ToggleField({ label, name, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3">
      <span className="text-sm font-semibold text-darb-green">{label}</span>

      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 accent-darb-green"
      />
    </label>
  );
}

function AdminCoupons() {
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    discountType: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const editorRef = useAdminEditorReveal(isFormOpen, editingCoupon?._id || "new");

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 10,
    };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    if (filters.discountType) params.discountType = filters.discountType;

    return params;
  }, [filters, page]);

  const couponsQuery = useQuery({
    queryKey: ["admin-coupons", queryParams],
    queryFn: () => getAdminCoupons(queryParams),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createAdminCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeForm();
      notify({ type: "success", title: "Coupon created" });
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to create coupon.");
      notify({ type: "error", title: "Coupon was not created", message: error.friendlyMessage || "Please try again." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeForm();
      notify({ type: "success", title: "Coupon updated" });
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to update coupon.");
      notify({ type: "error", title: "Coupon was not updated", message: error.friendlyMessage || "Please try again." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      notify({ type: "success", title: "Coupon deactivated" });
    },
    onError: (error) => notify({ type: "error", title: "Could not deactivate coupon", message: error.friendlyMessage || "Please try again." }),
  });

  const coupons = couponsQuery.data?.data || [];
  const pagination = couponsQuery.data?.pagination;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

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
      discountType: "",
    });
    setPage(1);
  };

  const openCreateForm = () => {
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (coupon) => {
    setEditingCoupon(coupon);
    setForm(couponToForm(coupon));
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCoupon(null);
    setForm(emptyForm);
    setFormError("");
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateForm = () => {
    if (!form.code.trim()) return "Coupon code is required.";

    if (form.discountType !== "free_shipping") {
      if (!form.discountValue || Number(form.discountValue) <= 0) {
        return "Discount value is required.";
      }
    }

    if (
      form.discountType === "percentage" &&
      Number(form.discountValue) > 100
    ) {
      return "Percentage discount cannot be more than 100%.";
    }

    return "";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");

    const payload = createPayload(form);

    if (editingCoupon) {
      updateMutation.mutate({
        couponId: editingCoupon._id,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDeactivate = async (coupon) => {
    const confirmed = await confirm({ title: "Deactivate coupon?", body: `“${coupon.code}” will no longer work at checkout.`, confirmLabel: "Deactivate", variant: "destructive" });

    if (!confirmed) return;

    deleteMutation.mutate(coupon._id);
  };

  const getCouponValueText = (coupon) => {
    if (coupon.discountType === "free_shipping") return "Free Shipping";

    if (coupon.discountType === "percentage") {
      return `${coupon.discountValue}%`;
    }

    return formatCurrency(coupon.discountValue);
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Coupons
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Create and manage discount codes for Darb campaigns, special
            customers, free shipping, and launch offers.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus size={18} />
          Add Coupon
        </button>
      </div>

      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted"
            />

            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search code, name, description..."
              className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
            />
          </div>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            {statusOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            name="discountType"
            value={filters.discountType}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            <option value="">All discount types</option>
            {discountTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-full border border-darb-gold/40 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
          >
            Reset
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div ref={editorRef} className="mb-8 scroll-mt-32 rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
                {editingCoupon ? "Edit Coupon" : "New Coupon"}
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingCoupon ? editingCoupon.code : "Create Coupon"}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-darb-gold/40 p-3 text-darb-green transition hover:bg-darb-gold/15"
              aria-label="Close form"
            >
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Coupon Code *
                </label>

                <input
                  name="code"
                  value={form.code}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 uppercase outline-none transition focus:border-darb-green"
                  placeholder="DARB10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Coupon Name
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Launch Discount"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Discount Type
                </label>

                <select
                  name="discountType"
                  value={form.discountType}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  {discountTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {form.discountType !== "free_shipping" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-darb-green">
                    Discount Value *
                  </label>

                  <input
                    name="discountValue"
                    value={form.discountValue}
                    onChange={handleFormChange}
                    type="number"
                    min="0"
                    className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                    placeholder={form.discountType === "percentage" ? "10" : "100"}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Minimum Order Value
                </label>

                <input
                  name="minOrderValue"
                  value={form.minOrderValue}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Max Discount Amount
                </label>

                <input
                  name="maxDiscountAmount"
                  value={form.maxDiscountAmount}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="0 means unlimited"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Usage Limit
                </label>

                <input
                  name="usageLimit"
                  value={form.usageLimit}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="0 means unlimited"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Used count
                </label>

                <input
                  name="usedCount"
                  value={form.usedCount}
                  type="number"
                  min="0"
                  readOnly
                  className="w-full cursor-not-allowed rounded-full border border-darb-gold/20 bg-darb-cream/80 px-5 py-3 text-darb-muted outline-none"
                  placeholder="0"
                />
                <p className="mt-2 text-xs text-darb-muted">Updated automatically when customers use this coupon.</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Per Customer Limit
                </label>

                <input
                  name="perCustomerLimit"
                  value={form.perCustomerLimit}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="0 means unlimited"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Starts At
                </label>

                <input
                  name="startsAt"
                  value={form.startsAt}
                  onChange={handleFormChange}
                  type="date"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Ends At
                </label>

                <input
                  name="endsAt"
                  value={form.endsAt}
                  onChange={handleFormChange}
                  type="date"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Internal or public description"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                  <h3 className="font-display text-2xl text-darb-green">
                    Product / Category Rules
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-darb-muted">Leave allowed lists empty for all products. Exclusions always take priority.</p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <AdminEntitySelector type="product" label="Allowed products" value={form.allowedProducts} initialOptions={editingCoupon?.allowedProducts || []} onChange={(allowedProducts) => setForm((current) => ({ ...current, allowedProducts }))} />
                    <AdminEntitySelector type="product" label="Excluded products" value={form.excludedProducts} initialOptions={editingCoupon?.excludedProducts || []} onChange={(excludedProducts) => setForm((current) => ({ ...current, excludedProducts }))} />
                    <AdminEntitySelector type="category" label="Allowed categories" value={form.allowedCategories} initialOptions={editingCoupon?.allowedCategories || []} onChange={(allowedCategories) => setForm((current) => ({ ...current, allowedCategories }))} />
                    <AdminEntitySelector type="category" label="Excluded categories" value={form.excludedCategories} initialOptions={editingCoupon?.excludedCategories || []} onChange={(excludedCategories) => setForm((current) => ({ ...current, excludedCategories }))} />
                  </div>
                </div>
              </div>

              <ToggleField
                label="Active"
                name="isActive"
                checked={form.isActive}
                onChange={handleFormChange}
              />

              <div className="rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3 text-sm text-darb-muted">Darb applies one promotional benefit per order. Coupon stacking is not available.</div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingCoupon
                    ? "Save Changes"
                    : "Create Coupon"}
              </button>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-full border border-darb-gold/40 px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {couponsQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading coupons...</p>
        </div>
      )}

      {couponsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load coupons
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {couponsQuery.error?.friendlyMessage ||
              "Admin coupons are unavailable right now."}
          </p>
        </div>
      )}

      {!couponsQuery.isLoading && !couponsQuery.isError && coupons.length === 0 && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
            <TicketPercent size={24} />
          </div>

          <h2 className="mt-6 font-display text-3xl text-darb-green">
            No coupons found
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            Coupons will appear here once MongoDB is connected and admin creates
            the first discount code.
          </p>
        </div>
      )}

      {!couponsQuery.isLoading && !couponsQuery.isError && coupons.length > 0 && (
        <div>
          <div className="mb-4 flex justify-end text-sm text-darb-muted">
            Showing {coupons.length} of {pagination?.total || coupons.length}
          </div>

          <div className="admin-record-list border-y border-darb-gold/25">
            {coupons.map((coupon) => {
              const isExpired =
                coupon.endsAt && new Date(coupon.endsAt) < new Date();

              return (
                <article
                  key={coupon._id}
                  className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold uppercase text-darb-green">
                            {coupon.code}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              coupon.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {coupon.isActive ? "Active" : "Inactive"}
                          </span>

                          {isExpired && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Expired
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 font-display text-3xl text-darb-green">
                          {coupon.name || coupon.code}
                        </h2>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-darb-muted">
                          {coupon.description || "No description yet."}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-darb-green px-5 py-4 text-center text-darb-beige">
                        <p className="text-xs uppercase tracking-[0.2em] text-darb-gold">
                          Value
                        </p>
                        <p className="mt-1 font-display text-2xl">
                          {getCouponValueText(coupon)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-darb-muted sm:grid-cols-2">
                      <p>
                        Type:{" "}
                        <span className="font-semibold capitalize text-darb-black">
                          {formatStatus(coupon.discountType)}
                        </span>
                      </p>

                      <p>
                        Min order:{" "}
                        <span className="font-semibold text-darb-black">
                          {coupon.minOrderValue > 0
                            ? formatCurrency(coupon.minOrderValue)
                            : "No minimum"}
                        </span>
                      </p>

                      <p>
                        Max discount:{" "}
                        <span className="font-semibold text-darb-black">
                          {coupon.maxDiscountAmount > 0
                            ? formatCurrency(coupon.maxDiscountAmount)
                            : "Unlimited"}
                        </span>
                      </p>

                      <p>
                        Usage:{" "}
                        <span className="font-semibold text-darb-black">
                          {coupon.usedCount || 0}
                          {coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ""}
                        </span>
                      </p>

                      <p>
                        Starts:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(coupon.startsAt)}
                        </span>
                      </p>

                      <p>
                        Ends:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(coupon.endsAt)}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-darb-cream/70 p-4 text-sm text-darb-muted">
                      <p>
                        Allowed categories:{" "}
                        <span className="font-semibold text-darb-black">
                          {coupon.allowedCategories?.length > 0
                            ? coupon.allowedCategories
                                .map((category) => category.name || category.slug)
                                .join(", ")
                            : "All"}
                        </span>
                      </p>

                      <p className="mt-2">
                        Allowed products:{" "}
                        <span className="font-semibold text-darb-black">
                          {coupon.allowedProducts?.length > 0
                            ? coupon.allowedProducts
                                .map((product) => product.name || product.slug)
                                .join(", ")
                            : "All"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(coupon)}
                        className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                      >
                        <Edit size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeactivate(coupon)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 size={16} />
                        Deactivate
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
      <AdminPagination page={pagination?.page || page} pages={pagination?.pages || 1} onPageChange={setPage} />
    </section>
  );
}

export default AdminCoupons;
