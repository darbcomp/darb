import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Edit,
  ImagePlus,
  Package,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminCategories,
  getAdminProducts,
  updateAdminProduct,
} from "../../api/adminApi";

import { formatCurrency } from "../../utils/formatCurrency";

const MAX_IMAGES = 3;

const emptyForm = {
  name: "",
  slug: "",
  sku: "",
  category: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  sizeLabel: "50 ML",
  sizeMl: "50",
  concentration: "Eau de Parfum",
  scentFamily: "",
  topNotes: "",
  middleNotes: "",
  baseNotes: "",
  stock: "",
  lowStockThreshold: "3",
  tags: "",
  isActive: false,
  isPlaceholder: false,
  isFeatured: false,
  isBestSeller: false,
  isNewArrival: true,
  metaTitle: "",
  metaDescription: "",
};

const fallbackCategories = [
  { name: "Men", slug: "men", _id: "men" },
  { name: "Women", slug: "women", _id: "women" },
  { name: "Unisex", slug: "unisex", _id: "unisex" },
  { name: "Musk", slug: "musk", _id: "musk" },
];

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const yesNoOptions = [
  { label: "All", value: "" },
  { label: "Yes", value: "true" },
  { label: "No", value: "false" },
];

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const splitCommaText = (value = "") =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const productToForm = (product) => ({
  name: product.name || "",
  slug: product.slug || "",
  sku: product.sku || "",
  category: product.category?.slug || product.categorySnapshot?.slug || "",
  shortDescription: product.shortDescription || "",
  description: product.description || "",
  price: product.price || "",
  compareAtPrice: product.compareAtPrice || "",
  costPrice: product.costPrice || "",
  sizeLabel: product.sizeLabel || "50 ML",
  sizeMl: product.sizeMl || "50",
  concentration: product.concentration || "Eau de Parfum",
  scentFamily: product.scentFamily || "",
  topNotes: product.scentNotes?.top?.join(", ") || "",
  middleNotes: product.scentNotes?.middle?.join(", ") || "",
  baseNotes: product.scentNotes?.base?.join(", ") || "",
  stock: product.stock ?? "",
  lowStockThreshold: product.lowStockThreshold ?? "3",
  tags: product.tags?.join(", ") || "",
  isActive: Boolean(product.isActive),
  isPlaceholder: Boolean(product.isPlaceholder),
  isFeatured: Boolean(product.isFeatured),
  isBestSeller: Boolean(product.isBestSeller),
  isNewArrival: Boolean(product.isNewArrival),
  metaTitle: product.metaTitle || "",
  metaDescription: product.metaDescription || "",
});

const normalizeExistingImages = (images = []) => {
  const clean = images.slice(0, MAX_IMAGES).map((image) => ({
    url: image.url,
    publicId: image.publicId || "",
    alt: image.alt || "",
    isMain: Boolean(image.isMain),
  }));

  if (clean.length && !clean.some((image) => image.isMain)) {
    clean[0].isMain = true;
  }

  if (clean.filter((image) => image.isMain).length > 1) {
    let mainFound = false;

    clean.forEach((image) => {
      if (image.isMain && !mainFound) {
        mainFound = true;
      } else {
        image.isMain = false;
      }
    });
  }

  return clean;
};

const getReadiness = (product) => {
  const notes =
    (product.scentNotes?.top?.length || 0) +
    (product.scentNotes?.middle?.length || 0) +
    (product.scentNotes?.base?.length || 0);

  const missing = [];

  if (!product.price || product.price <= 0) missing.push("price");
  if (!product.images?.length) missing.push("image");
  if ((product.images?.length || 0) < MAX_IMAGES) {
    missing.push(`${MAX_IMAGES - (product.images?.length || 0)} more image`);
  }
  if (!product.shortDescription && !product.description) missing.push("description");
  if (!product.scentFamily) missing.push("scent family");
  if (!notes) missing.push("scent notes");
  if (!product.concentration) missing.push("concentration");

  return missing;
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

function AdminProducts() {
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState({
    search: "",
    category: "",
    status: "",
    placeholder: "",
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [existingImages, setExistingImages] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [newMainIndex, setNewMainIndex] = useState(null);
  const [formError, setFormError] = useState("");

  const newImagePreviews = useMemo(
    () =>
      imageFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [imageFiles]
  );

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newImagePreviews]);

  const queryParams = useMemo(() => {
    const params = { limit: 40 };

    if (filters.search.trim()) params.search = filters.search.trim();
    if (filters.category) params.category = filters.category;
    if (filters.status) params.status = filters.status;
    if (filters.placeholder) params.placeholder = filters.placeholder;

    return params;
  }, [filters]);

  const productsQuery = useQuery({
    queryKey: ["admin-products", queryParams],
    queryFn: () => getAdminProducts(queryParams),
    retry: 1,
  });

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategories,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createAdminProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["featured-products"] });
      closeForm();
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to create product.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["featured-products"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      closeForm();
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to update product.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const products = productsQuery.data?.data || [];
  const pagination = productsQuery.data?.pagination;

  const categories =
    categoriesQuery.data?.data?.length > 0
      ? categoriesQuery.data.data
      : fallbackCategories;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const totalImageCount = existingImages.length + imageFiles.length;
  const remainingImageSlots = Math.max(MAX_IMAGES - totalImageCount, 0);

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setExistingImages([]);
    setImageFiles([]);
    setNewMainIndex(null);
    setFormError("");
  };

  const openCreateForm = () => {
    setEditingProduct(null);
    setForm({
      ...emptyForm,
      category: categories[0]?.slug || "",
    });
    setExistingImages([]);
    setImageFiles([]);
    setNewMainIndex(null);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (product) => {
    setEditingProduct(product);
    setForm(productToForm(product));
    setExistingImages(normalizeExistingImages(product.images || []));
    setImageFiles([]);
    setNewMainIndex(null);
    setFormError("");
    setIsFormOpen(true);
  };

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
      category: "",
      status: "",
      placeholder: "",
    });
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (event) => {
    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    if (selected.some((file) => file.type !== "image/webp")) {
      setFormError("Darb product images must be WEBP files.");
      event.target.value = "";
      return;
    }

    if (totalImageCount + selected.length > MAX_IMAGES) {
      setFormError(
        `Maximum ${MAX_IMAGES} images total. You currently have ${totalImageCount}/3.`
      );
      event.target.value = "";
      return;
    }

    setFormError("");

    setImageFiles((current) => {
      const next = [...current, ...selected];

      if (!existingImages.length && newMainIndex === null && next.length) {
        setNewMainIndex(0);
      }

      return next;
    });

    event.target.value = "";
  };

  const removeExistingImage = (index) => {
    setExistingImages((current) => {
      const wasMain = current[index]?.isMain;
      const next = current.filter((_, imageIndex) => imageIndex !== index);

      if (wasMain && next.length) {
        next[0] = { ...next[0], isMain: true };
      }

      if (wasMain && !next.length && imageFiles.length) {
        setNewMainIndex(0);
      }

      return next;
    });
  };

  const makeExistingImageMain = (index) => {
    setExistingImages((current) =>
      current.map((image, imageIndex) => ({
        ...image,
        isMain: imageIndex === index,
      }))
    );

    setNewMainIndex(null);
  };

  const removeNewImage = (index) => {
    setImageFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));

    setNewMainIndex((currentMain) => {
      if (currentMain === null) return null;

      if (currentMain === index) {
        if (existingImages.length) return null;
        return imageFiles.length > 1 ? 0 : null;
      }

      return currentMain > index ? currentMain - 1 : currentMain;
    });
  };

  const makeNewImageMain = (index) => {
    setExistingImages((current) =>
      current.map((image) => ({
        ...image,
        isMain: false,
      }))
    );

    setNewMainIndex(index);
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.category) return "Category is required.";

    if (form.isActive && !form.isPlaceholder) {
      if (!form.price || Number(form.price) <= 0) {
        return "Active real products need a valid price.";
      }

      if (totalImageCount === 0) {
        return "Active products need at least one product image.";
      }
    }

    if (totalImageCount > MAX_IMAGES) {
      return `A product can have a maximum of ${MAX_IMAGES} images.`;
    }

    return "";
  };

  const createFormData = () => {
    const formData = new FormData();

    const fields = {
      ...form,
      sizeLabel: "50 ML",
      sizeMl: "50",
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        formData.append(key, String(value));
      } else {
        formData.append(key, value ?? "");
      }
    });

    formData.append("tags", JSON.stringify(splitCommaText(form.tags)));

    formData.append(
      "scentNotes",
      JSON.stringify({
        top: splitCommaText(form.topNotes),
        middle: splitCommaText(form.middleNotes),
        base: splitCommaText(form.baseNotes),
      })
    );

    formData.append(
      "images",
      JSON.stringify(
        existingImages.map((image) => ({
          url: image.url,
          publicId: image.publicId || "",
          alt: image.alt || form.name,
          isMain: Boolean(image.isMain),
        }))
      )
    );

    formData.append("keepExistingImages", "false");

    if (newMainIndex !== null) {
      formData.append("mainImageFileIndex", String(newMainIndex));
    }

    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    return formData;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError("");

    const payload = createFormData();

    if (editingProduct) {
      updateMutation.mutate({
        productId: editingProduct._id,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDeactivate = (product) => {
    const confirmed = window.confirm(
      `Deactivate "${product.name}"? It will be hidden from the public store.`
    );

    if (!confirmed) return;

    deleteMutation.mutate(product._id);
  };

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>
          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Products
          </h1>
          <p className="mt-3 max-w-2xl text-darb-muted">
            Manage Darb perfumes, their stock, scent details, and the final
            three-image product gallery.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus size={18} />
          Add Product
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
              placeholder="Search product, SKU, scent..."
              className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
            />
          </div>

          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id || category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>

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
            name="placeholder"
            value={filters.placeholder}
            onChange={handleFilterChange}
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            {yesNoOptions.map((option) => (
              <option key={option.label} value={option.value}>
                Placeholder: {option.label}
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
                {editingProduct ? "Edit Product" : "New Product"}
              </p>
              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingProduct ? editingProduct.name : "Create Darb Product"}
              </h2>
              <p className="mt-2 text-sm text-darb-muted">
                Darb perfumes use a fixed 50 ML size and a maximum of three WEBP
                images.
              </p>
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

          <form onSubmit={handleSubmit} className="space-y-7">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field
                label="Product Name *"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Example: Haibah"
              />

              <Field
                label="Slug"
                name="slug"
                value={form.slug}
                onChange={handleFormChange}
                placeholder="auto if empty"
              />

              <Field
                label="SKU"
                name="sku"
                value={form.sku}
                onChange={handleFormChange}
                placeholder="DARB-001"
              />

              <label>
                <span className="mb-2 block text-sm font-semibold text-darb-green">
                  Category *
                </span>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleFormChange}
                  className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option
                      key={category._id || category.slug}
                      value={category.slug}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <Field
                label="Price"
                name="price"
                value={form.price}
                onChange={handleFormChange}
                type="number"
                min="0"
                placeholder="0"
              />

              <Field
                label="Compare At Price"
                name="compareAtPrice"
                value={form.compareAtPrice}
                onChange={handleFormChange}
                type="number"
                min="0"
                placeholder="Old price"
              />

              <Field
                label="Cost Price"
                name="costPrice"
                value={form.costPrice}
                onChange={handleFormChange}
                type="number"
                min="0"
                placeholder="Internal only"
              />

              <Field
                label="Stock"
                name="stock"
                value={form.stock}
                onChange={handleFormChange}
                type="number"
                min="0"
                placeholder="0"
              />

              <Field
                label="Low Stock Threshold"
                name="lowStockThreshold"
                value={form.lowStockThreshold}
                onChange={handleFormChange}
                type="number"
                min="0"
                placeholder="3"
              />

              <Field
                label="Size"
                name="sizeLabel"
                value="50 ML"
                readOnly
              />

              <Field
                label="Size ML"
                name="sizeMl"
                value="50"
                readOnly
              />

              <Field
                label="Concentration"
                name="concentration"
                value={form.concentration}
                onChange={handleFormChange}
                placeholder="Eau de Parfum"
              />

              <Field
                label="Scent Family"
                name="scentFamily"
                value={form.scentFamily}
                onChange={handleFormChange}
                placeholder="Woody, Musk, Amber..."
              />

              <Field
                label="Top Notes"
                name="topNotes"
                value={form.topNotes}
                onChange={handleFormChange}
                placeholder="Bergamot, Lemon"
              />

              <Field
                label="Middle Notes"
                name="middleNotes"
                value={form.middleNotes}
                onChange={handleFormChange}
                placeholder="Rose, Jasmine"
              />

              <Field
                label="Base Notes"
                name="baseNotes"
                value={form.baseNotes}
                onChange={handleFormChange}
                placeholder="Musk, Amber, Oud"
              />

              <div className="md:col-span-2 xl:col-span-3">
                <Field
                  label="Short Description"
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleFormChange}
                  placeholder="One-line product summary"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-darb-green">
                    Description
                  </span>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows={4}
                    className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                    placeholder="Full product story and details"
                  />
                </label>
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <Field
                  label="Tags"
                  name="tags"
                  value={form.tags}
                  onChange={handleFormChange}
                  placeholder="musk, fresh, gift"
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-darb-gold/20 bg-darb-cream/40 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-darb-green">
                    Product Images
                  </h3>
                  <p className="mt-1 text-sm text-darb-muted">
                    {totalImageCount}/3 images ready · {remainingImageSlots} slot
                    {remainingImageSlots === 1 ? "" : "s"} remaining
                  </p>
                </div>

                {remainingImageSlots > 0 && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black">
                    <ImagePlus size={17} />
                    Add WEBP
                    <input
                      type="file"
                      multiple
                      accept="image/webp,.webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {existingImages.map((image, index) => (
                  <ImageEditorCard
                    key={image.publicId || image.url}
                    src={image.url}
                    alt={image.alt || form.name}
                    label={`Saved image ${index + 1}`}
                    isMain={Boolean(image.isMain) && newMainIndex === null}
                    onMakeMain={() => makeExistingImageMain(index)}
                    onRemove={() => removeExistingImage(index)}
                  />
                ))}

                {newImagePreviews.map((preview, index) => (
                  <ImageEditorCard
                    key={`${preview.file.name}-${preview.file.lastModified}`}
                    src={preview.url}
                    alt={preview.file.name}
                    label={`New image ${index + 1}`}
                    isMain={newMainIndex === index}
                    onMakeMain={() => makeNewImageMain(index)}
                    onRemove={() => removeNewImage(index)}
                  />
                ))}

                {totalImageCount === 0 && (
                  <div className="sm:col-span-2 lg:col-span-3 rounded-3xl border border-dashed border-darb-gold/40 bg-white px-6 py-10 text-center">
                    <ImagePlus size={30} className="mx-auto text-darb-green" />
                    <p className="mt-3 font-semibold text-darb-green">
                      No product images yet
                    </p>
                    <p className="mt-1 text-sm text-darb-muted">
                      Add the first WEBP image. The gallery will support exactly
                      three images per product.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <ToggleField
                label="Active"
                name="isActive"
                checked={form.isActive}
                onChange={handleFormChange}
              />
              <ToggleField
                label="Placeholder"
                name="isPlaceholder"
                checked={form.isPlaceholder}
                onChange={handleFormChange}
              />
              <ToggleField
                label="Featured"
                name="isFeatured"
                checked={form.isFeatured}
                onChange={handleFormChange}
              />
              <ToggleField
                label="Best Seller"
                name="isBestSeller"
                checked={form.isBestSeller}
                onChange={handleFormChange}
              />
              <ToggleField
                label="New Arrival"
                name="isNewArrival"
                checked={form.isNewArrival}
                onChange={handleFormChange}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Meta Title"
                name="metaTitle"
                value={form.metaTitle}
                onChange={handleFormChange}
                placeholder="SEO title"
              />

              <label>
                <span className="mb-2 block text-sm font-semibold text-darb-green">
                  Meta Description
                </span>
                <textarea
                  name="metaDescription"
                  value={form.metaDescription}
                  onChange={handleFormChange}
                  rows={3}
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="SEO description"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingProduct
                    ? "Save Changes"
                    : "Create Product"}
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

      {productsQuery.isLoading && (
        <Panel>
          <p className="text-darb-muted">Loading products...</p>
        </Panel>
      )}

      {productsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load products
          </h2>
          <p className="mt-3 leading-7 text-red-700">
            {productsQuery.error?.friendlyMessage ||
              "Admin products are unavailable right now."}
          </p>
        </div>
      )}

      {!productsQuery.isLoading &&
        !productsQuery.isError &&
        products.length === 0 && (
          <Panel>
            <PackageBadge />
            <h2 className="mt-6 font-display text-3xl text-darb-green">
              No products found
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
              No products match the current filters.
            </p>
          </Panel>
        )}

      {!productsQuery.isLoading &&
        !productsQuery.isError &&
        products.length > 0 && (
          <div>
            <div className="mb-4 flex justify-end text-sm text-darb-muted">
              Showing {products.length} of {pagination?.total || products.length}
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {products.map((product) => {
                const mainImage =
                  product.images?.find((image) => image.isMain) ||
                  product.images?.[0];

                const missing = getReadiness(product);

                return (
                  <article
                    key={product._id}
                    className="overflow-hidden rounded-[1.5rem] border border-darb-gold/20 bg-white shadow-soft"
                  >
                    <div className="grid gap-5 p-5 sm:grid-cols-[150px_1fr]">
                      <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-darb-green">
                        {mainImage?.url ? (
                          <img
                            src={mainImage.url}
                            alt={mainImage.alt || product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-center">
                            <p className="font-display text-3xl text-darb-gold">
                              Darb
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-darb-beige/70">
                              Visual soon
                            </p>
                          </div>
                        )}

                        <span className="absolute bottom-3 right-3 rounded-full bg-darb-black/75 px-2.5 py-1 text-xs font-semibold text-white">
                          {product.images?.length || 0}/3
                        </span>
                      </div>

                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold text-darb-green">
                            {product.category?.name ||
                              product.categorySnapshot?.name ||
                              "Darb"}
                          </span>

                          {product.isPlaceholder && (
                            <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                              Placeholder
                            </span>
                          )}

                          {!product.isActive && (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                              Inactive
                            </span>
                          )}

                          {product.isFeatured && (
                            <span className="rounded-full bg-darb-gold/20 px-3 py-1 text-xs font-semibold text-darb-green">
                              Featured
                            </span>
                          )}

                          {missing.length === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                              <Check size={12} />
                              Complete
                            </span>
                          ) : (
                            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                              Needs {missing.length} item
                              {missing.length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-3 font-display text-3xl text-darb-green">
                          {product.name}
                        </h2>

                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-darb-muted">
                          {product.shortDescription ||
                            product.description ||
                            "No description yet."}
                        </p>

                        <div className="mt-4 grid gap-3 text-sm text-darb-muted sm:grid-cols-2">
                          <p>
                            Price:{" "}
                            <span className="font-semibold text-darb-black">
                              {product.price > 0
                                ? formatCurrency(product.price)
                                : "Not set"}
                            </span>
                          </p>
                          <p>
                            Stock:{" "}
                            <span className="font-semibold text-darb-black">
                              {product.stock}
                            </span>
                          </p>
                          <p>
                            Size:{" "}
                            <span className="font-semibold text-darb-black">
                              {product.sizeLabel ||
                                (product.sizeMl
                                  ? `${product.sizeMl} ML`
                                  : "50 ML")}
                            </span>
                          </p>
                          <p>
                            Created:{" "}
                            <span className="font-semibold text-darb-black">
                              {formatDate(product.createdAt)}
                            </span>
                          </p>
                        </div>

                        {missing.length > 0 && (
                          <p className="mt-3 text-xs leading-5 text-orange-700">
                            Missing: {missing.slice(0, 4).join(", ")}
                            {missing.length > 4 ? "..." : ""}
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
                            className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
                          >
                            <Edit size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeactivate(product)}
                            disabled={deleteMutation.isPending || !product.isActive}
                            className="inline-flex items-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={16} />
                            Deactivate
                          </button>
                        </div>
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

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  min,
  placeholder,
  readOnly = false,
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-darb-green">
        {label}
      </span>
      <input
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        min={min}
        readOnly={readOnly}
        className={`w-full rounded-full border px-5 py-3 outline-none transition ${
          readOnly
            ? "cursor-not-allowed border-darb-gold/20 bg-darb-cream/80 text-darb-muted"
            : "border-darb-gold/30 bg-white focus:border-darb-green"
        }`}
        placeholder={placeholder}
      />
    </label>
  );
}

function ImageEditorCard({
  src,
  alt,
  label,
  isMain,
  onMakeMain,
  onRemove,
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border bg-white ${
        isMain ? "border-darb-green" : "border-darb-gold/20"
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-darb-green">
        <img src={src} alt={alt} className="h-full w-full object-cover" />

        {isMain && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-darb-gold px-3 py-1 text-xs font-semibold text-darb-green">
            <Star size={12} fill="currentColor" />
            Main
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="truncate text-xs font-semibold text-darb-muted">{label}</p>

        <div className="mt-3 flex gap-2">
          {!isMain && (
            <button
              type="button"
              onClick={onMakeMain}
              className="flex-1 rounded-full border border-darb-gold/40 px-3 py-2 text-xs font-semibold text-darb-green transition hover:bg-darb-gold/15"
            >
              Make main
            </button>
          )}

          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }) {
  return (
    <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
      {children}
    </div>
  );
}

function PackageBadge() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
      <Package size={24} />
    </div>
  );
}

export default AdminProducts;
