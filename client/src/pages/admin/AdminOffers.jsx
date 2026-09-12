import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Gift, Plus, Search, Trash2, X } from "lucide-react";
import {
  createAdminOffer,
  deleteAdminOffer,
  getAdminOffers,
  updateAdminOffer,
} from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";
import AdminPagination from "../../components/admin/AdminPagination";
import AdminEntitySelector from "../../components/admin/AdminEntitySelector";
import useAdminEditorReveal from "../../components/admin/useAdminEditorReveal";
import PromotionEmailComposer from "../../components/admin/PromotionEmailComposer";
import { useFeedback } from "../../context/FeedbackContext";

const emptyForm = {
  name: "",
  title: "",
  arabicTitle: "",
  description: "",
  arabicDescription: "",
  scope: "sitewide",
  discountType: "percentage",
  discountValue: "",
  products: [],
  categories: [],
  minQuantity: "1",
  minOrderValue: "",
  maxDiscountAmount: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  priority: "0",
  allowStacking: false,
  usageLimit: "",
};

const scopeOptions = [
  { label: "All Products", value: "sitewide" },
  { label: "Selected Categories", value: "category" },
  { label: "Selected Products", value: "product" },
  { label: "Free Shipping", value: "free_shipping" },
];

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

const offerToForm = (offer) => {
  return {
    name: offer.name || "",
    title: offer.title || "",
    arabicTitle: offer.arabicTitle || "",
    description: offer.description || "",
    arabicDescription: offer.arabicDescription || "",
    scope: offer.scope || offer.offerType || "sitewide",
    discountType: offer.discountType || "percentage",
    discountValue: offer.discountValue || "",
    products: relatedItemsToValues(offer.products),
    categories: relatedItemsToValues(offer.categories),
    minQuantity: offer.minQuantity || "1",
    minOrderValue: offer.minOrderValue || "",
    maxDiscountAmount: offer.maxDiscountAmount || "",
    startsAt: formatDateInput(offer.startsAt),
    endsAt: formatDateInput(offer.endsAt),
    isActive: Boolean(offer.isActive),
    priority: offer.priority || "0",
    allowStacking: Boolean(offer.allowStacking),
    usageLimit: offer.usageLimit || "",
  };
};

const createPayload = (form) => {
  return {
    name: form.name.trim(),
    title: form.title.trim(),
    arabicTitle: form.arabicTitle.trim(),
    description: form.description.trim(),
    arabicDescription: form.arabicDescription.trim(),
    scope: form.scope,
    offerType: form.scope,
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    products: form.products,
    categories: form.categories,
    minQuantity: Number(form.minQuantity) || 1,
    minOrderValue: Number(form.minOrderValue) || 0,
    maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    isActive: Boolean(form.isActive),
    priority: Number(form.priority) || 0,
    allowStacking: Boolean(form.allowStacking),
    usageLimit: Number(form.usageLimit) || 0,
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

function AdminOffers() {
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    scope: "",
    discountType: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const editorRef = useAdminEditorReveal(isFormOpen, editingOffer?._id || "new");

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 10,
    };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    if (filters.scope) params.scope = filters.scope;
    if (filters.discountType) params.discountType = filters.discountType;

    return params;
  }, [filters, page]);

  const offersQuery = useQuery({
    queryKey: ["admin-offers", queryParams],
    queryFn: () => getAdminOffers(queryParams),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createAdminOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeForm();
      notify({ type: "success", title: "Offer created" });
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to create offer.");
      notify({ type: "error", title: "Offer was not created", message: error.friendlyMessage || "Please try again." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeForm();
      notify({ type: "success", title: "Offer updated" });
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to update offer.");
      notify({ type: "error", title: "Offer was not updated", message: error.friendlyMessage || "Please try again." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-offers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      notify({ type: "success", title: "Offer deactivated" });
    },
    onError: (error) => notify({ type: "error", title: "Could not deactivate offer", message: error.friendlyMessage || "Please try again." }),
  });

  const offers = offersQuery.data?.data || [];
  const pagination = offersQuery.data?.pagination;
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
      scope: "",
      discountType: "",
    });
    setPage(1);
  };

  const openCreateForm = () => {
    setEditingOffer(null);
    setForm(emptyForm);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (offer) => {
    setEditingOffer(offer);
    setForm(offerToForm(offer));
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingOffer(null);
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
    if (!form.name.trim()) return "Offer name is required.";

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

    if (form.scope === "product" && form.products.length === 0) {
      return "Product offers need at least one product.";
    }

    if (
      form.scope === "category" &&
      form.categories.length === 0
    ) {
      return "Category offers need at least one category.";
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

    if (editingOffer) {
      updateMutation.mutate({
        offerId: editingOffer._id,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDeactivate = async (offer) => {
    const confirmed = await confirm({ title: "Deactivate offer?", body: `“${offer.name}” will stop applying at checkout.`, confirmLabel: "Deactivate", variant: "destructive" });

    if (!confirmed) return;

    deleteMutation.mutate(offer._id);
  };

  const getOfferValueText = (offer) => {
    if (offer.discountType === "free_shipping") return "Free Shipping";

    if (offer.discountType === "percentage") {
      return `${offer.discountValue}%`;
    }

    return formatCurrency(offer.discountValue);
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Offers
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Manage automatic Darb offers for products, categories, sitewide
            discounts, launch campaigns, and free shipping.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus size={18} />
          Add Offer
        </button>
      </div>

      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted"
            />

            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search offer name, title, description..."
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
            name="scope"
            value={filters.scope}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            <option value="">All scopes</option>
            {scopeOptions.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
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
                {editingOffer ? "Edit Offer" : "New Offer"}
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingOffer ? editingOffer.name : "Create Offer"}
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
                  Offer Name *
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Example: Launch Offer"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Public Title
                </label>

                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Example: 20% Off All Scents"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Public Title — Arabic
                </label>
                <input
                  name="arabicTitle"
                  value={form.arabicTitle}
                  onChange={handleFormChange}
                  dir="rtl"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="عنوان العرض بالعربية"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Scope
                </label>

                <select
                  name="scope"
                  value={form.scope}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  {scopeOptions.map((scope) => (
                    <option key={scope.value} value={scope.value}>
                      {scope.label}
                    </option>
                  ))}
                </select>
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
                    placeholder={form.discountType === "percentage" ? "20" : "150"}
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Minimum Quantity
                </label>

                <input
                  name="minQuantity"
                  value={form.minQuantity}
                  onChange={handleFormChange}
                  type="number"
                  min="1"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="1"
                />
              </div>

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
                  Priority
                </label>

                <input
                  name="priority"
                  value={form.priority}
                  onChange={handleFormChange}
                  type="number"
                  min="0"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="0"
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
                  placeholder="Describe the automatic offer"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Description — Arabic
                </label>
                <textarea
                  name="arabicDescription"
                  value={form.arabicDescription}
                  onChange={handleFormChange}
                  rows={3}
                  dir="rtl"
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="وصف العرض بالعربية"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                  <h3 className="font-display text-2xl text-darb-green">
                    Targeting Rules
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-darb-muted">Choose who receives this offer using readable storefront names.</p>

                  <div className="mt-5">
                    {form.scope === "sitewide" && <p className="rounded-2xl bg-white px-4 py-3 text-sm text-darb-muted">Applies to all products.</p>}
                    {form.scope === "product" && <AdminEntitySelector type="product" label="Selected products" value={form.products} initialOptions={editingOffer?.products || []} onChange={(products) => setForm((current) => ({ ...current, products }))} />}
                    {form.scope === "category" && <AdminEntitySelector type="category" label="Selected categories" value={form.categories} initialOptions={editingOffer?.categories || []} onChange={(categories) => setForm((current) => ({ ...current, categories }))} />}
                    {form.scope === "free_shipping" && <p className="rounded-2xl bg-white px-4 py-3 text-sm text-darb-muted">Applies storewide when the offer is eligible.</p>}
                  </div>
                </div>
              </div>

              <ToggleField
                label="Active"
                name="isActive"
                checked={form.isActive}
                onChange={handleFormChange}
              />

              <div className="rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3 text-sm text-darb-muted">Darb applies one promotional benefit per order.</div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingOffer
                    ? "Save Changes"
                    : "Create Offer"}
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

      {offersQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading offers...</p>
        </div>
      )}

      {offersQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load offers
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {offersQuery.error?.friendlyMessage ||
              "Admin offers are unavailable right now."}
          </p>
        </div>
      )}

      {!offersQuery.isLoading && !offersQuery.isError && offers.length === 0 && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
            <Gift size={24} />
          </div>

          <h2 className="mt-6 font-display text-3xl text-darb-green">
            No offers found
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            Offers will appear here once MongoDB is connected and admin creates
            the first automatic campaign.
          </p>
        </div>
      )}

      {!offersQuery.isLoading && !offersQuery.isError && offers.length > 0 && (
        <div>
          <div className="mb-4 flex justify-end text-sm text-darb-muted">
            Showing {offers.length} of {pagination?.total || offers.length}
          </div>

          <div className="admin-record-list border-y border-darb-gold/25">
            {offers.map((offer) => {
              const isExpired =
                offer.endsAt && new Date(offer.endsAt) < new Date();

              return (
                <article
                  key={offer._id}
                  className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold capitalize text-darb-green">
                            {formatStatus(offer.scope || offer.offerType)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              offer.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {offer.isActive ? "Active" : "Inactive"}
                          </span>

                          {isExpired && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Expired
                            </span>
                          )}

                          {offer.allowStacking && (
                            <span className="rounded-full bg-darb-gold/20 px-3 py-1 text-xs font-semibold text-darb-green">
                              Stackable
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 font-display text-3xl text-darb-green">
                          {offer.name}
                        </h2>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-darb-muted">
                          {offer.description ||
                            offer.title ||
                            "No description yet."}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-darb-green px-5 py-4 text-center text-darb-beige">
                        <p className="text-xs uppercase tracking-[0.2em] text-darb-gold">
                          Value
                        </p>

                        <p className="mt-1 font-display text-2xl">
                          {getOfferValueText(offer)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-darb-muted sm:grid-cols-2">
                      <p>
                        Discount type:{" "}
                        <span className="font-semibold capitalize text-darb-black">
                          {formatStatus(offer.discountType)}
                        </span>
                      </p>

                      <p>
                        Priority:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.priority || 0}
                        </span>
                      </p>

                      <p>
                        Min quantity:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.minQuantity || 1}
                        </span>
                      </p>

                      <p>
                        Min order:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.minOrderValue > 0
                            ? formatCurrency(offer.minOrderValue)
                            : "No minimum"}
                        </span>
                      </p>

                      <p>
                        Max discount:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.maxDiscountAmount > 0
                            ? formatCurrency(offer.maxDiscountAmount)
                            : "Unlimited"}
                        </span>
                      </p>

                      <p>
                        Usage limit:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.usageLimit > 0 ? offer.usageLimit : "Unlimited"}
                        </span>
                      </p>

                      <p>
                        Starts:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(offer.startsAt)}
                        </span>
                      </p>

                      <p>
                        Ends:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(offer.endsAt)}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-darb-cream/70 p-4 text-sm text-darb-muted">
                      <p>
                        Categories:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.categories?.length > 0
                            ? offer.categories
                                .map((category) => category.name || category.slug)
                                .join(", ")
                            : "All / not limited"}
                        </span>
                      </p>

                      <p className="mt-2">
                        Products:{" "}
                        <span className="font-semibold text-darb-black">
                          {offer.products?.length > 0
                            ? offer.products
                                .map((product) => product.name || product.slug)
                                .join(", ")
                            : "All / not limited"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <PromotionEmailComposer promotionType="offer" promotionId={offer._id} />
                      <button
                        type="button"
                        onClick={() => openEditForm(offer)}
                        className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                      >
                        <Edit size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeactivate(offer)}
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

export default AdminOffers;
