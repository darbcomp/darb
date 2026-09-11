import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  FolderTree,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from "../../api/adminApi";
import AdminPagination from "../../components/admin/AdminPagination";
import useAdminEditorReveal from "../../components/admin/useAdminEditorReveal";
import { useFeedback } from "../../context/FeedbackContext";

const emptyForm = {
  name: "",
  arabicName: "",
  slug: "",
  description: "",
  arabicDescription: "",
  sortOrder: "0",
  isActive: true,
  seoTitle: "",
  seoDescription: "",
  arabicSeoTitle: "",
  arabicSeoDescription: "",
  imageUrl: "",
  imageAlt: "",
};

const fallbackCategories = [
  {
    _id: "men",
    name: "Men",
    slug: "men",
    description: "Bold and refined scents crafted for presence and confidence.",
    sortOrder: 1,
    isActive: true,
    productStats: {
      totalProducts: 0,
      activeProducts: 0,
      placeholderProducts: 0,
    },
  },
  {
    _id: "women",
    name: "Women",
    slug: "women",
    description: "Soft, graceful, and memorable scents designed to leave a beautiful trail.",
    sortOrder: 2,
    isActive: true,
    productStats: {
      totalProducts: 0,
      activeProducts: 0,
      placeholderProducts: 0,
    },
  },
  {
    _id: "unisex",
    name: "Unisex",
    slug: "unisex",
    description: "Balanced scents for every path and every personal expression.",
    sortOrder: 3,
    isActive: true,
    productStats: {
      totalProducts: 0,
      activeProducts: 0,
      placeholderProducts: 0,
    },
  },
  {
    _id: "musk",
    name: "Musk",
    slug: "musk",
    description: "Clean, intimate, and lasting musk scents with a soft premium character.",
    sortOrder: 4,
    isActive: true,
    productStats: {
      totalProducts: 0,
      activeProducts: 0,
      placeholderProducts: 0,
    },
  },
];

const categoryToForm = (category) => ({
  name: category.name || "",
  arabicName: category.arabicName || "",
  slug: category.slug || "",
  description: category.description || "",
  arabicDescription: category.arabicDescription || "",
  sortOrder: category.sortOrder || "0",
  isActive: Boolean(category.isActive),
  seoTitle: category.seoTitle || "",
  seoDescription: category.seoDescription || "",
  arabicSeoTitle: category.arabicSeoTitle || "",
  arabicSeoDescription: category.arabicSeoDescription || "",
  imageUrl: category.image?.url || "",
  imageAlt: category.image?.alt || "",
});

const createCategoryFormData = (form, imageFile) => {
  const formData = new FormData();

  formData.append("name", form.name);
  formData.append("arabicName", form.arabicName);
  formData.append("slug", form.slug);
  formData.append("description", form.description);
  formData.append("arabicDescription", form.arabicDescription);
  formData.append("sortOrder", form.sortOrder);
  formData.append("isActive", String(form.isActive));
  formData.append("seoTitle", form.seoTitle);
  formData.append("seoDescription", form.seoDescription);
  formData.append("arabicSeoTitle", form.arabicSeoTitle);
  formData.append("arabicSeoDescription", form.arabicSeoDescription);
  formData.append("imageUrl", form.imageUrl);
  formData.append("imageAlt", form.imageAlt);

  if (imageFile) {
    formData.append("image", imageFile);
  }

  return formData;
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-EG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

function AdminCategories() {
  const queryClient = useQueryClient();
  const { confirm, notify } = useFeedback();
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [formError, setFormError] = useState("");
  const editorRef = useAdminEditorReveal(isFormOpen, editingCategory?._id || "new");

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategories,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      closeForm();
      notify({ type: "success", title: "Category created" });
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to create category.");
      notify({ type: "error", title: "Category was not created", message: error.friendlyMessage || "Please try again." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      closeForm();
      notify({ type: "success", title: "Category updated" });
    },
    onError: (error) => {
      setFormError(error.friendlyMessage || "Failed to update category.");
      notify({ type: "error", title: "Category was not updated", message: error.friendlyMessage || "Please try again." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      notify({ type: "success", title: "Category deactivated" });
    },
    onError: (error) => notify({ type: "error", title: "Could not deactivate category", message: error.friendlyMessage || "Please try again." }),
  });

  const backendCategories = categoriesQuery.data?.data || [];
  const categories = backendCategories.length > 0 ? backendCategories : fallbackCategories;

  const filteredCategories = categories.filter((category) => {
    const searchText = `${category.name} ${category.slug} ${category.description}`.toLowerCase();
    return searchText.includes(search.trim().toLowerCase());
  });
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / 10));
  const boundedPage = Math.max(1, Math.min(page, totalPages));
  const visibleCategories = filteredCategories.slice((boundedPage - 1) * 10, boundedPage * 10);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const openCreateForm = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setImageFile(null);
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (category) => {
    if (String(category._id).length < 12 && backendCategories.length === 0) {
      setFormError("Connect MongoDB and seed categories before editing fallback categories.");
      return;
    }

    setEditingCategory(category);
    setForm(categoryToForm(category));
    setImageFile(null);
    setFormError("");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    setForm(emptyForm);
    setImageFile(null);
    setFormError("");
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (event) => {
    setImageFile(event.target.files?.[0] || null);
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Category name is required.";
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

    const payload = createCategoryFormData(form, imageFile);

    if (editingCategory) {
      updateMutation.mutate({
        categoryId: editingCategory._id,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  const handleDeactivate = async (category) => {
    const confirmed = await confirm({
      title: "Deactivate category?",
      body: `“${category.name}” will be hidden publicly. Its products and saved data will remain intact.`,
      confirmLabel: "Deactivate",
      variant: "destructive",
    });

    if (!confirmed) return;

    deleteMutation.mutate(category._id);
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Categories
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Manage Darb product paths like Men, Women, Unisex, Musk, and any
            future scent collection.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {formError && !isFormOpen && (
        <div className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          {formError}
        </div>
      )}

      <div className="mb-8 rounded-[1.5rem] border border-darb-gold/20 bg-white p-5 shadow-soft">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-darb-muted"
          />

          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            placeholder="Search category name, slug, or description..."
            className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
          />
        </div>
      </div>

      {isFormOpen && (
        <div ref={editorRef} className="mb-8 scroll-mt-32 rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
                {editingCategory ? "Edit Category" : "New Category"}
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingCategory ? editingCategory.name : "Create Category"}
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Category Name *
                </label>

                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Example: Men"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Arabic Name
                </label>
                <input
                  name="arabicName"
                  value={form.arabicName}
                  onChange={handleChange}
                  dir="rtl"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="اسم القسم بالعربية"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Slug
                </label>

                <input
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="auto if empty"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Sort Order
                </label>

                <input
                  name="sortOrder"
                  value={form.sortOrder}
                  onChange={handleChange}
                  type="number"
                  min="0"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="1"
                />
              </div>

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3">
                <span className="text-sm font-semibold text-darb-green">
                  Active
                </span>

                <input
                  type="checkbox"
                  name="isActive"
                  checked={form.isActive}
                  onChange={handleChange}
                  className="h-5 w-5 accent-darb-green"
                />
              </label>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Category story or short intro"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Description — Arabic
                </label>
                <textarea
                  name="arabicDescription"
                  value={form.arabicDescription}
                  onChange={handleChange}
                  rows={4}
                  dir="rtl"
                  className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="وصف القسم بالعربية"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Category Image
                </label>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-darb-gold/50 bg-darb-cream/60 px-5 py-8 text-center transition hover:bg-darb-gold/10">
                  <ImagePlus size={30} className="text-darb-green" />
                  <span className="mt-3 font-semibold text-darb-green">
                    Upload category image
                  </span>
                  <span className="mt-1 text-sm text-darb-muted">
                    JPG, PNG, WEBP
                  </span>

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>

                {imageFile && (
                  <div className="mt-3 rounded-2xl bg-darb-cream/70 p-4 text-sm text-darb-muted">
                    Selected image: {imageFile.name}
                  </div>
                )}

                {editingCategory?.image?.url && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-darb-gold/20 bg-darb-green">
                    <img
                      src={editingCategory.image.url}
                      alt={editingCategory.image.alt || editingCategory.name}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Image URL
                </label>

                <input
                  name="imageUrl"
                  value={form.imageUrl}
                  onChange={handleChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Optional external image URL"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  Image Alt Text
                </label>

                <input
                  name="imageAlt"
                  value={form.imageAlt}
                  onChange={handleChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="Describe the image"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  SEO Title
                </label>

                <input
                  name="seoTitle"
                  value={form.seoTitle}
                  onChange={handleChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="SEO title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  SEO Title — Arabic
                </label>
                <input
                  name="arabicSeoTitle"
                  value={form.arabicSeoTitle}
                  onChange={handleChange}
                  dir="rtl"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="عنوان SEO بالعربية"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  SEO Description
                </label>

                <input
                  name="seoDescription"
                  value={form.seoDescription}
                  onChange={handleChange}
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="SEO description"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-darb-green">
                  SEO Description — Arabic
                </label>
                <input
                  name="arabicSeoDescription"
                  value={form.arabicSeoDescription}
                  onChange={handleChange}
                  dir="rtl"
                  className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                  placeholder="وصف SEO بالعربية"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingCategory
                    ? "Save Changes"
                    : "Create Category"}
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

      {categoriesQuery.isLoading && (
        <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
          <p className="text-darb-muted">Loading categories...</p>
        </div>
      )}

      {categoriesQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load categories
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {categoriesQuery.error?.friendlyMessage ||
              "Admin categories are unavailable right now."}
          </p>
        </div>
      )}

      {!categoriesQuery.isLoading && !categoriesQuery.isError && (
        <div className="admin-record-list border-y border-darb-gold/25">
          {visibleCategories.map((category) => {
            const stats = category.productStats || {
              totalProducts: 0,
              activeProducts: 0,
              placeholderProducts: 0,
            };

            return (
              <article
                key={category._id || category.slug}
                className="admin-record-row border-b border-darb-gold/15 last:border-0"
              >
                <div className="grid gap-4 py-4 sm:grid-cols-[84px_1fr] sm:items-start">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-darb-green">
                    {category.image?.url ? (
                      <img
                        src={category.image.url}
                        alt={category.image.alt || category.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <FolderTree size={34} className="mx-auto text-darb-gold" />
                        <p className="mt-2 text-xs uppercase tracking-[0.25em] text-darb-beige/70">
                          Category
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold text-darb-green">
                        /{category.slug}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          category.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </span>

                      <span className="rounded-full bg-darb-gold/20 px-3 py-1 text-xs font-semibold text-darb-green">
                        Sort: {category.sortOrder || 0}
                      </span>
                    </div>

                    <h2 className="mt-2 font-display text-2xl text-darb-green">
                      {category.name}
                    </h2>

                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-darb-muted">
                      {category.description || "No category description yet."}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-darb-muted lg:grid-cols-4">
                      <p>
                        Total products:{" "}
                        <span className="font-semibold text-darb-black">
                          {stats.totalProducts}
                        </span>
                      </p>

                      <p>
                        Active products:{" "}
                        <span className="font-semibold text-darb-black">
                          {stats.activeProducts}
                        </span>
                      </p>

                      <p>
                        Placeholders:{" "}
                        <span className="font-semibold text-darb-black">
                          {stats.placeholderProducts}
                        </span>
                      </p>

                      <p>
                        Created:{" "}
                        <span className="font-semibold text-darb-black">
                          {formatDate(category.createdAt)}
                        </span>
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(category)}
                        className="inline-flex items-center gap-2 rounded-full bg-darb-green px-4 py-2 text-xs font-semibold text-darb-beige transition hover:bg-darb-black"
                      >
                        <Edit size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeactivate(category)}
                        disabled={deleteMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-60"
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
      )}
      <AdminPagination page={page} pages={totalPages} onPageChange={setPage} />
    </section>
  );
}

export default AdminCategories;
