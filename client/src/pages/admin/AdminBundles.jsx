import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, ImagePlus, PackagePlus, Plus, Search, Trash2, X } from "lucide-react";
import {
  createAdminBundle,
  deleteAdminBundle,
  getAdminBundles,
  updateAdminBundle,
} from "../../api/adminApi";
import { formatCurrency } from "../../utils/formatCurrency";

const emptyForm = {
  name: "",
  title: "",
  arabicTitle: "",
  description: "",
  arabicDescription: "",
  bundleType: "any_products",
  requiredQuantity: "2",
  specificItems: "",
  allowedProducts: "",
  allowedCategories: "",
  discountType: "percentage",
  discountValue: "",
  fixedBundlePrice: "",
  minOrderValue: "",
  maxApplications: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  priority: "0",
  allowCouponStacking: false,
  usageLimit: "",
  freeDelivery: false,
  image: null,
  imageFile: null,
  removeImage: false,
};

const bundleTypes = [
  { label: "Any Products", value: "any_products" },
  { label: "Specific Products", value: "specific_products" },
  { label: "Category Products", value: "category_products" },
];

const discountTypes = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed Amount", value: "fixed" },
  { label: "Fixed Bundle Price", value: "fixed_bundle_price" },
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

const splitCommaText = (value = "") => {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const relatedItemsToText = (items = []) => {
  if (!Array.isArray(items)) return "";

  return items
    .map((item) => item.slug || item.sku || item.name || item._id)
    .filter(Boolean)
    .join(", ");
};

const specificItemsToText = (items = []) => {
  if (!Array.isArray(items)) return "";

  return items
    .map((item) => {
      const product = item.product;
      const productRef =
        product?.slug || product?.sku || product?.name || product?._id || product;

      if (!productRef) return "";

      return `${productRef}:${item.quantity || 1}`;
    })
    .filter(Boolean)
    .join(", ");
};

const parseSpecificItems = (value = "") => {
  return splitCommaText(value)
    .map((item) => {
      const [product, quantity] = item.split(":").map((part) => part.trim());

      if (!product) return null;

      return {
        product,
        quantity: Number(quantity) || 1,
      };
    })
    .filter(Boolean);
};

const bundleToForm = (bundle) => {
  return {
    name: bundle.name || "",
    title: bundle.title || "",
    arabicTitle: bundle.arabicTitle || "",
    description: bundle.description || "",
    arabicDescription: bundle.arabicDescription || "",
    bundleType: bundle.bundleType || "any_products",
    requiredQuantity: bundle.requiredQuantity || "2",
    specificItems: specificItemsToText(bundle.specificItems),
    allowedProducts: relatedItemsToText(bundle.allowedProducts),
    allowedCategories:
      relatedItemsToText(bundle.allowedCategories) ||
      relatedItemsToText(bundle.categories),
    discountType: bundle.discountType || "percentage",
    discountValue: bundle.discountValue || "",
    fixedBundlePrice: bundle.fixedBundlePrice || "",
    minOrderValue: bundle.minOrderValue || "",
    maxApplications: bundle.maxApplications || "",
    startsAt: formatDateInput(bundle.startsAt),
    endsAt: formatDateInput(bundle.endsAt),
    isActive: Boolean(bundle.isActive),
    priority: bundle.priority || "0",
    allowCouponStacking: Boolean(bundle.allowCouponStacking),
    usageLimit: bundle.usageLimit || "",
    freeDelivery: Boolean(bundle.freeDelivery),
    image: bundle.image || null,
    imageFile: null,
    removeImage: false,
  };
};

const createPayload = (form) => {
  const values = {
    name: form.name.trim(),
    title: form.title.trim(),
    arabicTitle: form.arabicTitle.trim(),
    description: form.description.trim(),
    arabicDescription: form.arabicDescription.trim(),
    bundleType: form.bundleType,
    requiredQuantity: Number(form.requiredQuantity) || 2,
    specificItems: parseSpecificItems(form.specificItems),
    allowedProducts: splitCommaText(form.allowedProducts),
    allowedCategories: splitCommaText(form.allowedCategories),
    categories: splitCommaText(form.allowedCategories),
    discountType: form.discountType,
    discountValue: Number(form.discountValue) || 0,
    fixedBundlePrice: Number(form.fixedBundlePrice) || 0,
    minOrderValue: Number(form.minOrderValue) || 0,
    maxApplications: Number(form.maxApplications) || 0,
    startsAt: form.startsAt || null,
    endsAt: form.endsAt || null,
    isActive: Boolean(form.isActive),
    priority: Number(form.priority) || 0,
    allowCouponStacking: false,
    usageLimit: Number(form.usageLimit) || 0,
    freeDelivery: Boolean(form.freeDelivery),
    removeImage: Boolean(form.removeImage),
  };
  if (!form.imageFile && !form.removeImage) return values;
  const payload = new FormData();
  Object.entries(values).forEach(([key, value]) => payload.append(key, typeof value === "object" ? JSON.stringify(value) : String(value ?? "")));
  if (form.imageFile) payload.append("image", form.imageFile);
  return payload;
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

function AdminBundles() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    bundleType: "",
    discountType: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const bundleImagePreview = useMemo(() => form.imageFile ? URL.createObjectURL(form.imageFile) : "", [form.imageFile]);
  useEffect(() => () => { if (bundleImagePreview) URL.revokeObjectURL(bundleImagePreview); }, [bundleImagePreview]);

  const queryParams = useMemo(() => {
    const params = {
      limit: 40,
    };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.status) params.status = filters.status;
    if (filters.bundleType) params.bundleType = filters.bundleType;
    if (filters.discountType) params.discountType = filters.discountType;

    return params;
  }, [filters]);

  const bundlesQuery = useQuery({
    queryKey: ["admin-bundles", queryParams],
    queryFn: () => getAdminBundles(queryParams),
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createAdminBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeForm();
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to create bundle.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
      closeForm();
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to update bundle.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-bundles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });

  const bundles = bundlesQuery.data?.data || [];
  const pagination = bundlesQuery.data?.pagination;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      status: "",
      bundleType: "",
      discountType: "",
    });
  };

  const openCreateForm = () => {
    setEditingBundle(null);
    setForm(emptyForm);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (bundle) => {
    setEditingBundle(bundle);
    setForm(bundleToForm(bundle));
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBundle(null);
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

  const selectBundleImage = (file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Bundle image must be a JPG, PNG, or WEBP file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Bundle image must be 5 MB or smaller.");
      return;
    }
    setFormError("");
    setForm((current) => ({ ...current, imageFile: file, removeImage: false }));
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Bundle name is required.";

    if (Number(form.requiredQuantity) < 2) {
      return "Bundle required quantity should be at least 2.";
    }

    if (
      form.bundleType === "specific_products" &&
      parseSpecificItems(form.specificItems).length === 0
    ) {
      return "Specific-products bundles need specific items like product-slug:1, another-product:1.";
    }

    if (
      form.bundleType === "category_products" &&
      splitCommaText(form.allowedCategories).length === 0
    ) {
      return "Category bundles need at least one category slug, name, or ID.";
    }

    if (form.discountType === "fixed_bundle_price") {
      if (!form.fixedBundlePrice || Number(form.fixedBundlePrice) <= 0) {
        return "Fixed bundle price is required.";
      }
    }

    if (
      form.discountType !== "free_shipping" &&
      form.discountType !== "fixed_bundle_price"
    ) {
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

    if (editingBundle) {
      updateMutation.mutate({
        bundleId: editingBundle._id,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDeactivate = (bundle) => {
    const confirmed = window.confirm(
      `Deactivate bundle "${bundle.name}"? It will stop applying to checkout.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(bundle._id);
  };

  const getBundleValueText = (bundle) => {
    if (bundle.discountType === "free_shipping") return "Free Shipping";

    if (bundle.discountType === "fixed_bundle_price") {
      return formatCurrency(bundle.fixedBundlePrice);
    }

    if (bundle.discountType === "percentage") {
      return `${bundle.discountValue}%`;
    }

    return formatCurrency(bundle.discountValue);
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Bundles
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Create bundle deals for Darb scents, like buy any 2, category
            bundles, or fixed-price perfume sets.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus size={18} />
          Add Bundle
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
              placeholder="Search bundle name, title, description..."
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
            name="bundleType"
            value={filters.bundleType}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            <option value="">All bundle types</option>
            {bundleTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
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
        <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
                {editingBundle ? "Edit Bundle" : "New Bundle"}
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingBundle ? editingBundle.name : "Create Bundle"}
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
                  Bundle Name *
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Example: Darb Duo"
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
                  placeholder="Example: Buy Any 2 and Save"
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
                  placeholder="عنوان الباقة بالعربية"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Bundle Type
                </label>

                <select
                  name="bundleType"
                  value={form.bundleType}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  {bundleTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Required Quantity
                </label>

                <input
                  name="requiredQuantity"
                  value={form.requiredQuantity}
                  onChange={handleFormChange}
                  type="number"
                  min="2"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="2"
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

              {form.discountType !== "free_shipping" &&
                form.discountType !== "fixed_bundle_price" && (
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
                      placeholder={
                        form.discountType === "percentage" ? "15" : "100"
                      }
                    />
                  </div>
                )}

              {form.discountType === "fixed_bundle_price" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-darb-green">
                    Fixed Bundle Price *
                  </label>

                  <input
                    name="fixedBundlePrice"
                    value={form.fixedBundlePrice}
                    onChange={handleFormChange}
                    type="number"
                    min="0"
                    className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                    placeholder="999"
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
                  Max Applications
                </label>

                <input
                  name="maxApplications"
                  value={form.maxApplications}
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
                  placeholder="Describe the bundle"
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
                  placeholder="وصف الباقة بالعربية"
                />
              </div>

              <div className="rounded-3xl border border-darb-gold/20 bg-darb-surface/70 p-5 md:col-span-2 xl:col-span-3">
                <p className="text-sm font-semibold text-darb-green">Bundle image</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-[10rem_1fr] sm:items-center">
                  {(bundleImagePreview || (form.image?.url && !form.removeImage)) && <div className="relative"><img src={bundleImagePreview || form.image.url} alt={form.name || "Bundle preview"} className="aspect-square w-40 rounded-2xl object-cover" /><button type="button" onClick={() => setForm((current) => ({ ...current, imageFile: null, removeImage: true }))} className="absolute right-2 top-2 rounded-full bg-darb-cream p-2 text-red-700 shadow" aria-label="Remove bundle image"><Trash2 size={15} /></button></div>}
                  <label onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); selectBundleImage(event.dataTransfer.files?.[0]); }} className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-darb-gold/40 bg-darb-cream px-4 text-center transition hover:border-darb-green"><ImagePlus size={24} className="text-darb-green" /><span className="mt-2 font-semibold text-darb-green">Drop or browse</span><span className="mt-1 text-xs text-darb-muted">JPG / PNG / WEBP · 5 MB max</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { selectBundleImage(event.target.files?.[0]); event.target.value = ""; }} className="sr-only" /></label>
                </div>
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <div className="rounded-3xl border border-darb-gold/20 bg-darb-cream/60 p-5">
                  <h3 className="font-display text-2xl text-darb-green">
                    Bundle Rules
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-darb-muted">
                    Use slugs, SKUs, names, or IDs. For specific bundles, write
                    items like: men-placeholder-01:1, musk-placeholder-02:1
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-darb-green">
                        Specific Items
                      </label>

                      <input
                        name="specificItems"
                        value={form.specificItems}
                        onChange={handleFormChange}
                        className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                        placeholder="product-slug:1, another-product:1"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-darb-green">
                        Allowed Products
                      </label>

                      <input
                        name="allowedProducts"
                        value={form.allowedProducts}
                        onChange={handleFormChange}
                        className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                        placeholder="product slugs, SKUs, names, IDs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-semibold text-darb-green">
                        Allowed Categories
                      </label>

                      <input
                        name="allowedCategories"
                        value={form.allowedCategories}
                        onChange={handleFormChange}
                        className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                        placeholder="men, women, unisex, musk"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <ToggleField
                label="Active"
                name="isActive"
                checked={form.isActive}
                onChange={handleFormChange}
              />

              <ToggleField label="Free Delivery" name="freeDelivery" checked={form.freeDelivery} onChange={handleFormChange} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingBundle
                    ? "Save Changes"
                    : "Create Bundle"}
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

      {bundlesQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading bundles...</p>
        </div>
      )}

      {bundlesQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load bundles
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {bundlesQuery.error?.friendlyMessage ||
              "Admin bundles are unavailable right now."}
          </p>
        </div>
      )}

      {!bundlesQuery.isLoading && !bundlesQuery.isError && bundles.length === 0 && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
            <PackagePlus size={24} />
          </div>

          <h2 className="mt-6 font-display text-3xl text-darb-green">
            No bundles found
          </h2>

          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            Bundles will appear here once MongoDB is connected and admin creates
            the first Darb set offer.
          </p>
        </div>
      )}

      {!bundlesQuery.isLoading && !bundlesQuery.isError && bundles.length > 0 && (
        <div>
          <div className="mb-4 flex justify-end text-sm text-darb-muted">
            Showing {bundles.length} of {pagination?.total || bundles.length}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {bundles.map((bundle) => {
              const isExpired =
                bundle.endsAt && new Date(bundle.endsAt) < new Date();

              return (
                <article
                  key={bundle._id}
                  className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
                >
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold capitalize text-darb-green">
                            {formatStatus(bundle.bundleType)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              bundle.isActive
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {bundle.isActive ? "Active" : "Inactive"}
                          </span>

                          {isExpired && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Expired
                            </span>
                          )}

                          {bundle.allowCouponStacking && (
                            <span className="rounded-full bg-darb-gold/20 px-3 py-1 text-xs font-semibold text-darb-green">
                              Coupon Stack
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 font-display text-3xl text-darb-green">
                          {bundle.name}
                        </h2>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-darb-muted">
                          {bundle.description ||
                            bundle.title ||
                            "No description yet."}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-darb-green px-5 py-4 text-center text-darb-beige">
                        <p className="text-xs uppercase tracking-[0.2em] text-darb-gold">
                          Value
                        </p>

                        <p className="mt-1 font-display text-2xl">
                          {getBundleValueText(bundle)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-darb-muted sm:grid-cols-2">
                      <p>
                        Discount type:{" "}
                        <span className="font-semibold capitalize text-darb-black">
                          {formatStatus(bundle.discountType)}
                        </span>
                      </p>

                      <p>
                        Required qty:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.requiredQuantity || 2}
                        </span>
                      </p>

                      <p>
                        Priority:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.priority || 0}
                        </span>
                      </p>

                      <p>
                        Min order:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.minOrderValue > 0
                            ? formatCurrency(bundle.minOrderValue)
                            : "No minimum"}
                        </span>
                      </p>

                      <p>
                        Max applications:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.maxApplications > 0
                            ? bundle.maxApplications
                            : "Unlimited"}
                        </span>
                      </p>

                      <p>
                        Usage limit:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.usageLimit > 0 ? bundle.usageLimit : "Unlimited"}
                        </span>
                      </p>

                      <p>
                        Starts:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(bundle.startsAt)}
                        </span>
                      </p>

                      <p>
                        Ends:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(bundle.endsAt)}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 rounded-2xl bg-darb-cream/70 p-4 text-sm text-darb-muted">
                      <p>
                        Specific items:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.specificItems?.length > 0
                            ? bundle.specificItems
                                .map((item) => {
                                  const productName =
                                    item.product?.name ||
                                    item.product?.slug ||
                                    "Product";

                                  return `${productName} × ${item.quantity || 1}`;
                                })
                                .join(", ")
                            : "Not required"}
                        </span>
                      </p>

                      <p className="mt-2">
                        Allowed categories:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.allowedCategories?.length > 0
                            ? bundle.allowedCategories
                                .map((category) => category.name || category.slug)
                                .join(", ")
                            : bundle.categories?.length > 0
                              ? bundle.categories
                                  .map((category) => category.name || category.slug)
                                  .join(", ")
                              : "All / not limited"}
                        </span>
                      </p>

                      <p className="mt-2">
                        Allowed products:{" "}
                        <span className="font-semibold text-darb-black">
                          {bundle.allowedProducts?.length > 0
                            ? bundle.allowedProducts
                                .map((product) => product.name || product.slug)
                                .join(", ")
                            : "All / not limited"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openEditForm(bundle)}
                        className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                      >
                        <Edit size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeactivate(bundle)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
    </section>
  );
}

export default AdminBundles;
