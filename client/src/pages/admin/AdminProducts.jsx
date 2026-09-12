import { useEffect, useMemo, useRef, useState } from "react";
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
import AdminPagination from "../../components/admin/AdminPagination";
import { useFeedback } from "../../context/FeedbackContext";

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const emptyForm = {
  name: "",
  arabicName: "",
  inspiredBy: "",
  arabicInspiredBy: "",
  productType: "perfume",
  slug: "",
  sku: "",
  category: "",
  categories: [],
  variants: [],
  multipleVariants: false,
  shortDescription: "",
  arabicShortDescription: "",
  description: "",
  arabicDescription: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  sizeLabel: "50 ML",
  sizeMl: "50",
  scentFamily: "",
  scentFamilies: "",
  arabicScentFamilies: "",
  bestFor: "",
  arabicBestFor: "",
  keyNotes: "",
  arabicKeyNotes: "",
  topNotes: "",
  middleNotes: "",
  baseNotes: "",
  arabicTopNotes: "",
  arabicMiddleNotes: "",
  arabicBaseNotes: "",
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
  arabicName: product.arabicName || "",
  inspiredBy: product.inspiredBy || "",
  arabicInspiredBy: product.arabicInspiredBy || "",
  productType: product.productType || "perfume",
  slug: product.slug || "",
  sku: product.sku || "",
  category: product.category?.slug || product.categorySnapshot?.slug || "",
  categories: (product.categories?.length ? product.categories : [product.category])
    .filter(Boolean)
    .map((category) => category.slug || category._id || category),
  variants: (product.variants || []).map((variant) => ({
    _id: variant._id,
    label: variant.label || "",
    sizeMl: variant.sizeMl || "",
    sku: variant.sku || "",
    price: variant.price ?? "",
    compareAtPrice: variant.compareAtPrice ?? "",
    stock: variant.stock ?? "",
    isActive: variant.isActive !== false,
  })),
  multipleVariants: (product.variants || []).length > 1,
  shortDescription: product.shortDescription || "",
  arabicShortDescription: product.arabicShortDescription || "",
  description: product.description || "",
  arabicDescription: product.arabicDescription || "",
  price: product.price || "",
  compareAtPrice: product.compareAtPrice || "",
  costPrice: product.costPrice || "",
  sizeLabel: product.sizeLabel || "",
  sizeMl: product.sizeMl || "",
  scentFamily: product.scentFamily || "",
  scentFamilies: (product.scentFamilies || []).join(", "),
  arabicScentFamilies: (product.arabicScentFamilies || []).join(", "),
  bestFor: (product.bestFor || []).join(", "),
  arabicBestFor: (product.arabicBestFor || []).join(", "),
  keyNotes: (product.keyNotes || []).join(", "),
  arabicKeyNotes: (product.arabicKeyNotes || []).join(", "),
  topNotes: product.scentNotes?.top?.join(", ") || "",
  middleNotes: product.scentNotes?.middle?.join(", ") || "",
  baseNotes: product.scentNotes?.base?.join(", ") || "",
  arabicTopNotes: product.arabicScentNotes?.top?.join(", ") || "",
  arabicMiddleNotes: product.arabicScentNotes?.middle?.join(", ") || "",
  arabicBaseNotes: product.arabicScentNotes?.base?.join(", ") || "",
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
  const notes = (product.keyNotes?.length || 0) +
    (product.scentNotes?.top?.length || 0) +
    (product.scentNotes?.middle?.length || 0) +
    (product.scentNotes?.base?.length || 0);

  const missing = [];

  if (!product.price || product.price <= 0) {
    missing.push("price");
  }

  if (!product.images?.length) {
    missing.push("image");
  }


  if (!product.shortDescription && !product.description) {
    missing.push("description");
  }

  if (!product.scentFamilies?.length && !product.scentFamily) {
    missing.push("scent family");
  }

  if (!notes) {
    missing.push("scent notes");
  }

  return missing;
};

function ToggleField({
  label,
  name,
  checked,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3">
      <span className="text-sm font-semibold text-darb-green">
        {label}
      </span>

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
  const { confirm, notify } = useFeedback();
  const formHeadingRef = useRef(null);
  const firstFieldRef = useRef(null);
  const [page, setPage] = useState(1);

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
  const [isDraggingImages, setIsDraggingImages] = useState(false);

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
      newImagePreviews.forEach((preview) => {
        URL.revokeObjectURL(preview.url);
      });
    };
  }, [newImagePreviews]);

  const queryParams = useMemo(() => {
    const params = {
      page,
      limit: 10,
    };

    if (filters.search.trim()) {
      params.search = filters.search.trim();
    }

    if (filters.category) {
      params.category = filters.category;
    }

    if (filters.status) {
      params.status = filters.status;
    }

    if (filters.placeholder) {
      params.placeholder = filters.placeholder;
    }

    return params;
  }, [filters, page]);

  const productsQuery = useQuery({
    queryKey: [
      "admin-products",
      queryParams,
    ],
    queryFn: () =>
      getAdminProducts(queryParams),
    retry: 1,
  });

  const categoriesQuery = useQuery({
    queryKey: [
      "admin-categories",
    ],
    queryFn: getAdminCategories,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: createAdminProduct,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin-products",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "products",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "featured-products",
        ],
      });

      closeForm();
      notify({ type: "success", title: "Product created" });
    },

    onError: (error) => {
      setFormError(
        error.friendlyMessage ||
          "Failed to create product."
      );
      notify({ type: "error", title: "Product was not created", message: error.friendlyMessage || "Please review the form and try again." });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminProduct,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin-products",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "products",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "featured-products",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "product",
        ],
      });

      closeForm();
      notify({ type: "success", title: "Product updated" });
    },

    onError: (error) => {
      setFormError(
        error.friendlyMessage ||
          "Failed to update product."
      );
      notify({ type: "error", title: "Product was not updated", message: error.friendlyMessage || "Please try again." });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminProduct,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          "admin-products",
        ],
      });

      queryClient.invalidateQueries({
        queryKey: [
          "products",
        ],
      });
      notify({ type: "success", title: "Product deactivated" });
    },
    onError: (error) => notify({ type: "error", title: "Could not deactivate product", message: error.friendlyMessage || "Please try again." }),
  });

  const products =
    productsQuery.data?.data || [];

  const pagination =
    productsQuery.data?.pagination;

  const categories =
    categoriesQuery.data?.data?.length > 0
      ? categoriesQuery.data.data
      : fallbackCategories;

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending;

  const totalImageCount =
    existingImages.length +
    imageFiles.length;

  const remainingImageSlots =
    Math.max(
      MAX_IMAGES -
        totalImageCount,
      0
    );

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

      category:
        categories[0]?.slug ||
        "",
      categories: categories[0]?.slug ? [categories[0].slug] : [],
    });

    setExistingImages([]);
    setImageFiles([]);
    setNewMainIndex(null);

    setFormError("");

    setIsFormOpen(true);
  };

  const openEditForm = (
    product
  ) => {
    setEditingProduct(
      product
    );

    setForm(
      productToForm(product)
    );

    setExistingImages(
      normalizeExistingImages(
        product.images || []
      )
    );

    setImageFiles([]);
    setNewMainIndex(null);

    setFormError("");

    setIsFormOpen(true);
  };

  useEffect(() => {
    if (!isFormOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      formHeadingRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      window.setTimeout(() => firstFieldRef.current?.focus(), reduced ? 0 : 250);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isFormOpen, editingProduct]);

  const handleFilterChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFilters(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      status: "",
      placeholder: "",
    });
    setPage(1);
  };

  const handleFormChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    const nextValue = type === "checkbox" ? checked : value;
    const variantField = {
      sku: "sku",
      sizeLabel: "label",
      sizeMl: "sizeMl",
    }[name];

    setForm((current) => ({
      ...current,
      [name]: nextValue,
      variants: variantField && !current.multipleVariants && current.variants.length === 1
        ? current.variants.map((variant) => ({ ...variant, [variantField]: nextValue }))
        : current.variants,
    }));
  };

  const handleSimplePricingChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      variants: !current.multipleVariants && current.variants.length === 1
        ? current.variants.map((variant) => ({ ...variant, [name]: value }))
        : current.variants,
    }));
  };

  const toggleMultipleVariants = (event) => {
    const enabled = event.target.checked;
    if (!enabled && form.variants.length > 1) {
      setFormError("Remove extra variant rows before switching to a single-size product.");
      return;
    }
    setFormError("");
    setForm((current) => {
      const remainingVariant = current.variants.length === 1 ? current.variants[0] : null;
      const visibleFields = !enabled && remainingVariant
        ? {
            price: remainingVariant.price ?? current.price,
            compareAtPrice: remainingVariant.compareAtPrice ?? current.compareAtPrice,
            stock: remainingVariant.stock ?? current.stock,
            sku: remainingVariant.sku || current.sku,
            sizeLabel: remainingVariant.label || current.sizeLabel,
            sizeMl: remainingVariant.sizeMl === "" || remainingVariant.sizeMl == null
              ? current.sizeMl
              : remainingVariant.sizeMl,
          }
        : {};

      return {
        ...current,
        ...visibleFields,
        multipleVariants: enabled,
        variants: enabled && current.variants.length === 0
          ? [{ label: current.sizeLabel || "", sizeMl: current.sizeMl || "", sku: current.sku || "", price: current.price || "", compareAtPrice: current.compareAtPrice || "", stock: current.stock || "", isActive: true }]
          : current.variants,
      };
    });
  };

  const handlePrimaryCategoryChange = (event) => {
    const primary = event.target.value;
    setForm((current) => ({ ...current, category: primary, categories: [...new Set([primary, ...current.categories])].filter(Boolean) }));
  };

  const handleProductTypeChange = (event) => {
    const productType = event.target.value;
    setForm((current) => {
      const hasUntouchedDefault = !editingProduct && current.variants.length === 1 && ["50 ML", "6 ML"].includes(current.variants[0].label) && Number(current.variants[0].price) === 1000 && !current.variants[0].sku && !current.variants[0].stock;
      if (!hasUntouchedDefault) return { ...current, productType };
      const sizeMl = productType === "musk" ? "6" : "50";
      return { ...current, productType, sizeLabel: `${sizeMl} ML`, sizeMl, variants: [{ ...current.variants[0], label: `${sizeMl} ML`, sizeMl }] };
    });
  };

  const toggleCategory = (slug) => {
    setForm((current) => {
      const selected = current.categories.includes(slug)
        ? current.categories.filter((item) => item !== slug)
        : [...current.categories, slug];
      return { ...current, categories: selected, category: selected.includes(current.category) ? current.category : selected[0] || "" };
    });
  };

  const addVariant = () => setForm((current) => ({
    ...current,
    variants: [...current.variants, { label: "", sizeMl: "", sku: "", price: "", compareAtPrice: "", stock: "", isActive: true }],
  }));

  const updateVariant = (index, key, value) => setForm((current) => ({
    ...current,
    variants: current.variants.map((variant, variantIndex) =>
      variantIndex === index ? { ...variant, [key]: value } : variant
    ),
  }));

  const removeVariant = (index) => setForm((current) => ({
    ...current,
    variants: current.variants.filter((_, variantIndex) => variantIndex !== index),
  }));

  const handleImageChange = (
    event
  ) => {
    const selected =
      Array.from(
        event.target.files ||
          []
      ).filter((file) => !imageFiles.some((existing) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified));

    if (!selected.length) {
      return;
    }

    const invalidType =
      selected.find(
        (file) =>
          !ALLOWED_IMAGE_TYPES.includes(
            file.type
          )
      );

    if (invalidType) {
      setFormError(
        "Product images must be JPG, JPEG, PNG, or WEBP files."
      );

      event.target.value =
        "";

      return;
    }

    const oversizedFile =
      selected.find(
        (file) =>
          file.size >
          MAX_IMAGE_SIZE
      );

    if (oversizedFile) {
      setFormError(
        `"${oversizedFile.name}" is larger than 5 MB. Please choose a smaller image.`
      );

      event.target.value =
        "";

      return;
    }

    if (
      totalImageCount +
        selected.length >
      MAX_IMAGES
    ) {
      setFormError(
        `Maximum ${MAX_IMAGES} images total. You currently have ${totalImageCount}/${MAX_IMAGES}.`
      );

      event.target.value =
        "";

      return;
    }

    setFormError("");

    setImageFiles(
      (current) => {
        const next = [
          ...current,
          ...selected,
        ];

        if (
          !existingImages.length &&
          newMainIndex ===
            null &&
          next.length
        ) {
          setNewMainIndex(
            0
          );
        }

        return next;
      }
    );

    event.target.value =
      "";
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    setIsDraggingImages(false);
    handleImageChange({ target: { files: event.dataTransfer.files, value: "" } });
  };

  const removeExistingImage = (
    index
  ) => {
    setExistingImages(
      (current) => {
        const wasMain =
          current[index]
            ?.isMain;

        const next =
          current.filter(
            (
              _,
              imageIndex
            ) =>
              imageIndex !==
              index
          );

        if (
          wasMain &&
          next.length
        ) {
          next[0] = {
            ...next[0],
            isMain: true,
          };
        }

        if (
          wasMain &&
          !next.length &&
          imageFiles.length
        ) {
          setNewMainIndex(
            0
          );
        }

        return next;
      }
    );
  };

  const makeExistingImageMain =
    (index) => {
      setExistingImages(
        (current) =>
          current.map(
            (
              image,
              imageIndex
            ) => ({
              ...image,

              isMain:
                imageIndex ===
                index,
            })
          )
      );

      setNewMainIndex(null);
    };

  const removeNewImage = (
    index
  ) => {
    setImageFiles(
      (current) =>
        current.filter(
          (
            _,
            fileIndex
          ) =>
            fileIndex !==
            index
        )
    );

    setNewMainIndex(
      (currentMain) => {
        if (
          currentMain ===
          null
        ) {
          return null;
        }

        if (
          currentMain ===
          index
        ) {
          if (
            existingImages.length
          ) {
            return null;
          }

          return imageFiles.length >
            1
            ? 0
            : null;
        }

        return currentMain >
          index
          ? currentMain -
              1
          : currentMain;
      }
    );
  };

  const makeNewImageMain = (
    index
  ) => {
    setExistingImages(
      (current) =>
        current.map(
          (image) => ({
            ...image,
            isMain: false,
          })
        )
    );

    setNewMainIndex(
      index
    );
  };

  const validateForm = () => {
    if (
      !form.name.trim()
    ) {
      return "Product name is required.";
    }

    if (
      !form.categories.length
    ) {
      return "Category is required.";
    }

    if (
      form.isActive &&
      !form.isPlaceholder
    ) {
      if (
        (!form.variants.some((variant) => variant.isActive && Number(variant.price) > 0) &&
          (!form.price || Number(form.price) <= 0))
      ) {
        return "Active real products need a valid price.";
      }

      if (
        totalImageCount ===
        0
      ) {
        return "Active products need at least one product image.";
      }
    }

    if (
      totalImageCount >
      MAX_IMAGES
    ) {
      return `A product can have a maximum of ${MAX_IMAGES} images.`;
    }

    return "";
  };

  const createFormData =
    () => {
      const formData =
        new FormData();

      const fields = { ...form };
      delete fields.metaTitle;
      delete fields.metaDescription;
      delete fields.isPlaceholder;
      delete fields.multipleVariants;

      Object.entries(
        fields
      ).forEach(
        ([
          key,
          value,
        ]) => {
          if (
            typeof value ===
            "boolean"
          ) {
            formData.append(
              key,
              String(
                value
              )
            );
          } else {
            formData.append(
              key,
              value ??
                ""
            );
          }
        }
      );

      formData.append(
        "tags",
        JSON.stringify(
          splitCommaText(
            form.tags
          )
        )
      );

      formData.set("categories", JSON.stringify(form.categories));
      formData.set("variants", JSON.stringify(form.multipleVariants ? form.variants : form.variants.slice(0, 1)));
      formData.set("scentFamilies", JSON.stringify(splitCommaText(form.scentFamilies)));
      formData.set("bestFor", JSON.stringify(splitCommaText(form.bestFor)));
      formData.set("keyNotes", JSON.stringify(splitCommaText(form.keyNotes)));
      formData.set("arabicScentFamilies", JSON.stringify(splitCommaText(form.arabicScentFamilies)));
      formData.set("arabicBestFor", JSON.stringify(splitCommaText(form.arabicBestFor)));
      formData.set("arabicKeyNotes", JSON.stringify(splitCommaText(form.arabicKeyNotes)));

      formData.append(
        "scentNotes",

        JSON.stringify({
          top:
            splitCommaText(
              form.topNotes
            ),

          middle:
            splitCommaText(
              form.middleNotes
            ),

          base:
            splitCommaText(
              form.baseNotes
            ),
        })
      );

      formData.append(
        "arabicScentNotes",
        JSON.stringify({
          top: splitCommaText(form.arabicTopNotes),
          middle: splitCommaText(form.arabicMiddleNotes),
          base: splitCommaText(form.arabicBaseNotes),
        })
      );

      formData.append(
        "images",

        JSON.stringify(
          existingImages.map(
            (image) => ({
              url:
                image.url,

              publicId:
                image.publicId ||
                "",

              alt:
                image.alt ||
                form.name,

              isMain:
                Boolean(
                  image.isMain
                ),
            })
          )
        )
      );

      formData.append(
        "keepExistingImages",
        "false"
      );

      if (
        newMainIndex !==
        null
      ) {
        formData.append(
          "mainImageFileIndex",
          String(
            newMainIndex
          )
        );
      }

      imageFiles.forEach(
        (file) => {
          formData.append(
            "images",
            file
          );
        }
      );

      return formData;
    };

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    const validationError =
      validateForm();

    if (
      validationError
    ) {
      setFormError(
        validationError
      );
      const sectionName = validationError.toLowerCase().includes("image") ? "images" : "price-stock";
      const section = document.querySelector(`[data-editor-section="${sectionName}"]`);
      if (section) {
        section.open = true;
        section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }

      return;
    }

    setFormError("");

    const payload =
      createFormData();

    if (
      editingProduct
    ) {
      updateMutation.mutate({
        productId:
          editingProduct._id,

        payload,
      });

      return;
    }

    createMutation.mutate(
      payload
    );
  };

  const handleDeactivate = async (
    product
  ) => {
    const confirmed = await confirm({
      title: "Deactivate product?",
      body: `“${product.name}” will be hidden from the public store. Its data will remain saved.`,
      confirmLabel: "Deactivate",
      variant: "destructive",
    });

    if (
      !confirmed
    ) {
      return;
    }

    deleteMutation.mutate(
      product._id
    );
  };

  return (
    <section className="admin-page">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
            Admin
          </p>

          <h1 className="mt-2 font-display text-4xl text-darb-green">
            Products
          </h1>

          <p className="mt-3 max-w-2xl text-darb-muted">
            Manage Darb perfumes,
            their collections, purchasable sizes, scent profiles, and media.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openCreateForm
          }
          className="inline-flex items-center gap-2 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
        >
          <Plus
            size={18}
          />

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
              value={
                filters.search
              }
              onChange={
                handleFilterChange
              }
              placeholder="Search product, SKU, scent..."
              className="w-full rounded-full border border-darb-gold/30 py-3 pl-11 pr-5 outline-none transition focus:border-darb-green"
            />
          </div>

          <select
            name="category"
            value={
              filters.category
            }
            onChange={
              handleFilterChange
            }
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            <option value="">
              All categories
            </option>

            {categories.map(
              (category) => (
                <option
                  key={
                    category._id ||
                    category.slug
                  }
                  value={
                    category.slug
                  }
                >
                  {
                    category.name
                  }
                </option>
              )
            )}
          </select>

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
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>

          <select
            name="placeholder"
            value={
              filters.placeholder
            }
            onChange={
              handleFilterChange
            }
            className="rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
          >
            {yesNoOptions.map(
              (option) => (
                <option
                  key={
                    option.label
                  }
                  value={
                    option.value
                  }
                >
                  Placeholder:{" "}
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="rounded-full border border-darb-gold/40 px-5 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/15"
          >
            Reset
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div ref={formHeadingRef} tabIndex={-1} className="mb-8 scroll-mt-28 rounded-[1.5rem] border border-darb-gold/20 bg-white p-6 shadow-soft outline-none">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
                {editingProduct
                  ? "Edit Product"
                  : "New Product"}
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                {editingProduct
                  ? editingProduct.name
                  : "Create Darb Product"}
              </h2>

              <p className="mt-2 text-sm text-darb-muted">
                 Create a complete product while keeping media on Darb's optimized upload pipeline.
              </p>
            </div>

            <button
              type="button"
              onClick={
                closeForm
              }
              className="rounded-full border border-darb-gold/40 p-3 text-darb-green transition hover:bg-darb-gold/15"
              aria-label="Close form"
            >
              <X
                size={18}
              />
            </button>
          </div>

          {formError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          <form
            onSubmit={
              handleSubmit
            }
            className="space-y-7"
          >
            <EditorSection title="Basic Information" description="The product identity customers see first." defaultOpen>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field
                label="English Name *"
                inputRef={firstFieldRef}
                name="name"
                value={
                  form.name
                }
                onChange={
                  handleFormChange
                }
                placeholder="Example: Haibah"
              />

              <Field label="Arabic Name" name="arabicName" value={form.arabicName} onChange={handleFormChange} placeholder="Arabic product name" dir="rtl" />
              <Field label="Inspired By" name="inspiredBy" value={form.inspiredBy} onChange={handleFormChange} placeholder="Optional fragrance inspiration" />
              <Field label="Inspired By — Arabic" name="arabicInspiredBy" value={form.arabicInspiredBy} onChange={handleFormChange} placeholder="اسم العطر المستوحى منه بالعربية" dir="rtl" />

              <label><span className="mb-2 block text-sm font-semibold text-darb-green">Product Type</span><select name="productType" value={form.productType} onChange={handleProductTypeChange} className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none focus:border-darb-green"><option value="perfume">Perfume</option><option value="musk">Musk</option></select></label>

              <label>
                <span className="mb-2 block text-sm font-semibold text-darb-green">Primary Category *</span>
                <select value={form.category} onChange={handlePrimaryCategoryChange} className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none focus:border-darb-green">{categories.map((category) => <option key={category._id || category.slug} value={category.slug}>{category.name}</option>)}</select>
              </label>
            </div>
            </EditorSection>

            <EditorSection title="Price & Stock" description="Use the simple fields for one-size products. Turn on variants only when customers have a real choice." defaultOpen>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {!form.multipleVariants && <>
              <Field
                label="Price"
                name="price"
                value={
                  form.price
                }
                onChange={
                  handleSimplePricingChange
                }
                type="number"
                min="0"
                placeholder="0"
              />

              <Field
                label="Compare At Price"
                name="compareAtPrice"
                value={
                  form.compareAtPrice
                }
                onChange={
                  handleSimplePricingChange
                }
                type="number"
                min="0"
                placeholder="Old price"
              />

              <Field
                label="Stock"
                name="stock"
                value={
                  form.stock
                }
                onChange={
                  handleSimplePricingChange
                }
                type="number"
                min="0"
                placeholder="0"
              />
              </>}

              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-darb-gold/20 bg-darb-cream/60 px-4 py-3">
                <span><span className="block text-sm font-semibold text-darb-green">Multiple sizes / variants</span><span className="mt-1 block text-xs text-darb-muted">Enable only when customers choose between options.</span></span>
                <input type="checkbox" checked={form.multipleVariants} onChange={toggleMultipleVariants} className="h-5 w-5 accent-darb-green" />
              </label>
            </div>
            {form.multipleVariants && <div className="mt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-darb-muted">Each row is a purchasable option with its own price and stock.</p><button type="button" onClick={addVariant} className="inline-flex items-center gap-2 rounded-full bg-darb-green px-4 py-2 text-sm font-semibold text-darb-beige"><Plus size={16} /> Add variant</button></div>
              {form.variants.map((variant, index) => (
                <div key={variant._id || index} className="grid gap-3 rounded-2xl border border-darb-gold/20 bg-white p-4 md:grid-cols-4 xl:grid-cols-8">
                  <Field label="Label" value={variant.label} onChange={(event) => updateVariant(index, "label", event.target.value)} placeholder="50 ML" />
                  <Field label="Size ML" type="number" min="0" value={variant.sizeMl} onChange={(event) => updateVariant(index, "sizeMl", event.target.value)} />
                  <Field label="SKU" value={variant.sku} onChange={(event) => updateVariant(index, "sku", event.target.value)} />
                  <Field label="Price" type="number" min="0" value={variant.price} onChange={(event) => updateVariant(index, "price", event.target.value)} />
                  <Field label="Compare at" type="number" min="0" value={variant.compareAtPrice} onChange={(event) => updateVariant(index, "compareAtPrice", event.target.value)} />
                  <Field label="Stock" type="number" min="0" value={variant.stock} onChange={(event) => updateVariant(index, "stock", event.target.value)} />
                  <label className="flex items-center gap-2 pt-7 text-sm font-semibold text-darb-green"><input type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(index, "isActive", event.target.checked)} /> Active</label>
                  <button type="button" onClick={() => removeVariant(index)} className="mt-6 inline-flex h-10 items-center justify-center rounded-full border border-red-200 text-red-700" aria-label={`Remove ${variant.label || `variant ${index + 1}`}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>}
            </EditorSection>

            <EditorSection title="Product Details" description="Storefront scent details, use occasions, and notes in English and Arabic.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

              <Field
                label="Scent Families"
                name="scentFamilies"
                value={
                  form.scentFamilies
                }
                onChange={
                  handleFormChange
                }
                placeholder="Woody, Musk, Amber..."
              />

              <Field label="Best For" name="bestFor" value={form.bestFor} onChange={handleFormChange} placeholder="Evening, gifting, daily wear" />
              <Field label="Key Notes" name="keyNotes" value={form.keyNotes} onChange={handleFormChange} placeholder="Use instead of a note pyramid when appropriate" />
              <Field label="Scent Families — Arabic" name="arabicScentFamilies" value={form.arabicScentFamilies} onChange={handleFormChange} placeholder="خشبي، مسك، عنبر" dir="rtl" />
              <Field label="Best For — Arabic" name="arabicBestFor" value={form.arabicBestFor} onChange={handleFormChange} placeholder="مساء، هدايا، استخدام يومي" dir="rtl" />
              <Field label="Key Notes — Arabic" name="arabicKeyNotes" value={form.arabicKeyNotes} onChange={handleFormChange} placeholder="النوتات الرئيسية بالعربية" dir="rtl" />

              <Field
                label="Top Notes"
                name="topNotes"
                value={
                  form.topNotes
                }
                onChange={
                  handleFormChange
                }
                placeholder="Bergamot, Lemon"
              />

              <Field
                label="Middle Notes"
                name="middleNotes"
                value={
                  form.middleNotes
                }
                onChange={
                  handleFormChange
                }
                placeholder="Rose, Jasmine"
              />

              <Field
                label="Base Notes"
                name="baseNotes"
                value={
                  form.baseNotes
                }
                onChange={
                  handleFormChange
                }
                placeholder="Musk, Amber, Oud"
              />

              <Field label="Top Notes — Arabic" name="arabicTopNotes" value={form.arabicTopNotes} onChange={handleFormChange} placeholder="برغموت، ليمون" dir="rtl" />
              <Field label="Middle Notes — Arabic" name="arabicMiddleNotes" value={form.arabicMiddleNotes} onChange={handleFormChange} placeholder="ورد، ياسمين" dir="rtl" />
              <Field label="Base Notes — Arabic" name="arabicBaseNotes" value={form.arabicBaseNotes} onChange={handleFormChange} placeholder="مسك، عنبر، عود" dir="rtl" />

            </div>
            </EditorSection>

            <EditorSection title="Story" description="Storefront summary and full fragrance description, paired with Arabic where supplied.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="md:col-span-2 xl:col-span-3">
                <Field
                  label="Short Description"
                  name="shortDescription"
                  value={
                    form.shortDescription
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder="One-line product summary"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <Field
                  label="Short Description — Arabic"
                  name="arabicShortDescription"
                  value={form.arabicShortDescription}
                  onChange={handleFormChange}
                  placeholder="ملخص قصير للمنتج بالعربية"
                  dir="rtl"
                />
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-darb-green">
                    Description
                  </span>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={
                      handleFormChange
                    }
                    rows={4}
                    className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                    placeholder="Full product story and details"
                  />
                </label>
              </div>

              <div className="md:col-span-2 xl:col-span-3">
                <label>
                  <span className="mb-2 block text-sm font-semibold text-darb-green">
                    Description — Arabic
                  </span>
                  <textarea
                    name="arabicDescription"
                    value={form.arabicDescription}
                    onChange={handleFormChange}
                    rows={4}
                    dir="rtl"
                    className="w-full rounded-3xl border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
                    placeholder="الوصف الكامل للعطر بالعربية"
                  />
                </label>
              </div>

            </div>
            </EditorSection>

            <EditorSection title="Images" description="Product artwork, up to 10 images.">
            <div className="p-1">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-darb-green">
                    Product
                    Images
                  </h3>

                  <p className="mt-1 text-sm text-darb-muted">
                    {
                      totalImageCount
                    }
                    /{MAX_IMAGES} images
                    ready ·{" "}
                    {
                      remainingImageSlots
                    }{" "}
                    slot
                    {remainingImageSlots ===
                    1
                      ? ""
                      : "s"}{" "}
                    remaining
                  </p>
                </div>

              </div>

              {remainingImageSlots > 0 && <label onDragEnter={(event) => { event.preventDefault(); setIsDraggingImages(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setIsDraggingImages(false)} onDrop={handleImageDrop} className={`mt-5 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-5 text-center transition ${isDraggingImages ? "border-darb-green bg-darb-green/5" : "border-darb-gold/45 bg-darb-cream hover:border-darb-green"}`}>
                <ImagePlus size={30} className="text-darb-green" />
                <span className="mt-3 font-display text-2xl text-darb-green">Drop product images here</span>
                <span className="mt-1 text-sm text-darb-muted">or <span className="font-semibold text-darb-green underline decoration-darb-gold underline-offset-4">Browse files</span></span>
                <span className="mt-3 text-xs text-darb-muted">JPG / PNG / WEBP · 5 MB per file · up to {MAX_IMAGES}</span>
                <input type="file" multiple accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={handleImageChange} className="sr-only" />
              </label>}

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {existingImages.map(
                  (
                    image,
                    index
                  ) => (
                    <ImageEditorCard
                      key={
                        image.publicId ||
                        image.url
                      }
                      src={
                        image.url
                      }
                      alt={
                        image.alt ||
                        form.name
                      }
                      label={`Saved image ${
                        index +
                        1
                      }`}
                      isMain={
                        Boolean(
                          image.isMain
                        ) &&
                        newMainIndex ===
                          null
                      }
                      onMakeMain={() =>
                        makeExistingImageMain(
                          index
                        )
                      }
                      onRemove={() =>
                        removeExistingImage(
                          index
                        )
                      }
                    />
                  )
                )}

                {newImagePreviews.map(
                  (
                    preview,
                    index
                  ) => (
                    <ImageEditorCard
                      key={`${preview.file.name}-${preview.file.lastModified}`}
                      src={
                        preview.url
                      }
                      alt={
                        preview.file
                          .name
                      }
                      label={`New image ${
                        index +
                        1
                      }`}
                      isMain={
                        newMainIndex ===
                        index
                      }
                      onMakeMain={() =>
                        makeNewImageMain(
                          index
                        )
                      }
                      onRemove={() =>
                        removeNewImage(
                          index
                        )
                      }
                    />
                  )
                )}

                {totalImageCount ===
                  0 && (
                  <div className="rounded-3xl border border-dashed border-darb-gold/40 bg-white px-6 py-10 text-center sm:col-span-2 lg:col-span-3">
                    <ImagePlus
                      size={30}
                      className="mx-auto text-darb-green"
                    />

                    <p className="mt-3 font-semibold text-darb-green">
                      No product
                      images yet
                    </p>

                    <p className="mt-1 text-sm text-darb-muted">
                      Add the first
                      product image.
                      JPG, JPEG,
                      PNG, and WEBP
                      are accepted,
                      with up to
                      ten images
                      per product.
                    </p>
                  </div>
                )}
              </div>
            </div>
            </EditorSection>

            <EditorSection title="Storefront" description="Choose where this product appears in the store.">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <ToggleField
                label="Active"
                name="isActive"
                checked={
                  form.isActive
                }
                onChange={
                  handleFormChange
                }
              />

              <ToggleField
                label="Featured"
                name="isFeatured"
                checked={
                  form.isFeatured
                }
                onChange={
                  handleFormChange
                }
              />

              <ToggleField
                label="Best Seller"
                name="isBestSeller"
                checked={
                  form.isBestSeller
                }
                onChange={
                  handleFormChange
                }
              />

              <ToggleField
                label="New Arrival"
                name="isNewArrival"
                checked={
                  form.isNewArrival
                }
                onChange={
                  handleFormChange
                }
              />
            </div>
            </EditorSection>

            <EditorSection title="Advanced" description="Optional inventory and catalog controls.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Slug" name="slug" value={form.slug} onChange={handleFormChange} placeholder="Generated automatically if empty" />
              <Field label="SKU" name="sku" value={form.sku} onChange={handleFormChange} placeholder="DARB-001" />
              <Field label="Cost Price" name="costPrice" value={form.costPrice} onChange={handleFormChange} type="number" min="0" placeholder="Internal only" />
              <Field label="Low Stock Threshold" name="lowStockThreshold" value={form.lowStockThreshold} onChange={handleFormChange} type="number" min="0" placeholder="3" />
              <Field label="Size Label" name="sizeLabel" value={form.sizeLabel} onChange={handleFormChange} placeholder="50 ML" />
              <Field label="Size ML" name="sizeMl" value={form.sizeMl} onChange={handleFormChange} type="number" min="0" />
              <div className="md:col-span-2 xl:col-span-3">
                <span className="mb-2 block text-sm font-semibold text-darb-green">Secondary categories</span>
                <div className="flex min-h-[50px] flex-wrap gap-2 rounded-2xl border border-darb-gold/30 bg-white p-2">
                  {categories.filter((category) => category.slug !== form.category).map((category) => (
                    <label key={category._id || category.slug} className="inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm text-darb-green"><input type="checkbox" checked={form.categories.includes(category.slug)} onChange={() => toggleCategory(category.slug)} />{category.name}</label>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 xl:col-span-3"><Field label="Tags" name="tags" value={form.tags} onChange={handleFormChange} placeholder="musk, fresh, gift" /></div>
            </div>
            </EditorSection>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={
                  isSubmitting
                }
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
                onClick={
                  closeForm
                }
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
          <p className="text-darb-muted">
            Loading
            products...
          </p>
        </Panel>
      )}

      {productsQuery.isError && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-8 shadow-soft">
          <h2 className="font-display text-3xl text-red-700">
            Could not load
            products
          </h2>

          <p className="mt-3 leading-7 text-red-700">
            {productsQuery
              .error
              ?.friendlyMessage ||
              "Admin products are unavailable right now."}
          </p>
        </div>
      )}

      {!productsQuery.isLoading &&
        !productsQuery.isError &&
        products.length ===
          0 && (
          <Panel>
            <PackageBadge />

            <h2 className="mt-6 font-display text-3xl text-darb-green">
              No products
              found
            </h2>

            <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
              No products
              match the current
              filters.
            </p>
          </Panel>
        )}

      {!productsQuery.isLoading &&
        !productsQuery.isError &&
        products.length >
          0 && (
          <div>
            <div className="mb-4 flex justify-end text-sm text-darb-muted">
              Showing{" "}
              {
                products.length
              }{" "}
              of{" "}
              {pagination?.total ||
                products.length}
            </div>

            <div className="admin-record-list border-y border-darb-gold/25">
              {products.map(
                (
                  product
                ) => {
                  const mainImage =
                    product.images?.find(
                      (
                        image
                      ) =>
                        image.isMain
                    ) ||
                    product
                      .images?.[0];

                  const missing =
                    getReadiness(
                      product
                    );

                  return (
                    <article
                      key={
                        product._id
                      }
                      className="admin-record-row border-b border-darb-gold/15 last:border-0"
                    >
                      <div className="grid gap-4 py-4 sm:grid-cols-[84px_1fr] sm:items-start">
                        <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-darb-green">
                          {mainImage?.url ? (
                            <img
                              src={
                                mainImage.url
                              }
                              alt={
                                mainImage.alt ||
                                product.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="text-center">
                              <p className="font-display text-3xl text-darb-gold">
                                Darb
                              </p>

                            </div>
                          )}

                          <span className="absolute bottom-1 right-1 rounded bg-darb-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {product
                              .images
                              ?.length ||
                              0}
                            /{MAX_IMAGES}
                          </span>
                        </div>

                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-darb-green/10 px-3 py-1 text-xs font-semibold text-darb-green">
                              {product
                                .category
                                ?.name ||
                                product
                                  .categorySnapshot
                                  ?.name ||
                                "Darb"}
                            </span>

                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${product.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                              {product.isActive ? "Active" : "Inactive"}
                            </span>

                            {product.isPlaceholder && (
                              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                                Placeholder
                              </span>
                            )}

                            {product.isFeatured && (
                              <span className="rounded-full bg-darb-gold/20 px-3 py-1 text-xs font-semibold text-darb-green">
                                Featured
                              </span>
                            )}

                            {product.isBestSeller && (
                              <span className="rounded-full bg-darb-gold/20 px-3 py-1 text-xs font-semibold text-darb-green">Best Seller</span>
                            )}

                            {product.isNewArrival && (
                              <span className="rounded-full bg-darb-green px-3 py-1 text-xs font-semibold text-darb-beige">New</span>
                            )}

                            {missing.length ===
                            0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                                <Check
                                  size={
                                    12
                                  }
                                />

                                Complete
                              </span>
                            ) : (
                              <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                                Needs{" "}
                                {
                                  missing.length
                                }{" "}
                                item
                                {missing.length ===
                                1
                                  ? ""
                                  : "s"}
                              </span>
                            )}
                          </div>

                          <h2 className="mt-2 font-display text-2xl text-darb-green">
                            {
                              product.name
                            }
                          </h2>

                          {(product.arabicName || product.inspiredBy) && <p className="mt-1 text-xs text-darb-muted">{product.arabicName || `Inspired by ${product.inspiredBy}`}</p>}

                          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 text-xs text-darb-muted lg:grid-cols-4">
                            <p>
                              Price:{" "}
                              <span className="font-semibold text-darb-black">
                                {product.price >
                                0
                                  ? formatCurrency(
                                      product.price
                                    )
                                  : "Not set"}
                              </span>
                            </p>

                            <p>
                              Stock:{" "}
                              <span className="font-semibold text-darb-black">
                                {
                                  product.stock
                                }
                              </span>
                            </p>

                            <p>
                              Size:{" "}
                              <span className="font-semibold text-darb-black">
                                {product.sizeLabel ||
                                  (product.sizeMl
                                    ? `${product.sizeMl} ML`
                                    : "Not set")}
                              </span>
                            </p>

                            <p>
                              Created:{" "}
                              <span className="font-semibold text-darb-black">
                                {formatDate(
                                  product.createdAt
                                )}
                              </span>
                            </p>
                          </div>

                          {missing.length >
                            0 && (
                            <p className="mt-3 text-xs leading-5 text-orange-700">
                              Missing:{" "}
                              {missing
                                .slice(
                                  0,
                                  4
                                )
                                .join(
                                  ", "
                                )}

                              {missing.length >
                              4
                                ? "..."
                                : ""}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  product
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-full bg-darb-green px-4 py-2 text-xs font-semibold text-darb-beige transition hover:bg-darb-black"
                            >
                              <Edit
                                size={
                                  16
                                }
                              />

                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeactivate(
                                  product
                                )
                              }
                              disabled={
                                deleteMutation.isPending ||
                                !product.isActive
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:border-red-300 focus-visible:bg-red-50 focus-visible:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />

                              Deactivate
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
            <AdminPagination page={pagination?.page || page} pages={pagination?.pages || 1} onPageChange={setPage} />
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
  dir,
  inputRef,
}) {
  return (
    <label>
      <span className="mb-2 block text-sm font-semibold text-darb-green">
        {label}
      </span>

      <input
        ref={inputRef}
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        min={min}
        readOnly={readOnly}
        dir={dir}
        className={`w-full rounded-full border px-5 py-3 outline-none transition ${
          readOnly
            ? "cursor-not-allowed border-darb-gold/20 bg-darb-cream/80 text-darb-muted"
            : "border-darb-gold/30 bg-white focus:border-darb-green"
        }`}
        placeholder={
          placeholder
        }
      />
    </label>
  );
}

function EditorSection({ title, description, defaultOpen = false, children }) {
  const sectionName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return <details data-editor-section={sectionName} defaultOpen={defaultOpen} className="group border-y border-darb-gold/20 py-1">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-darb-gold">
      <span><span className="block text-xs font-semibold uppercase tracking-[0.25em] text-darb-gold">{title}</span>{description && <span className="mt-1 block text-sm text-darb-muted">{description}</span>}</span>
      <span aria-hidden="true" className="text-xl text-darb-green transition-transform group-open:rotate-45">+</span>
    </summary>
    <div className="pb-5">{children}</div>
  </details>;
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
        isMain
          ? "border-darb-green"
          : "border-darb-gold/20"
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-darb-green">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />

        {isMain && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-darb-gold px-3 py-1 text-xs font-semibold text-darb-green">
            <Star
              size={12}
              fill="currentColor"
            />

            Main
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="truncate text-xs font-semibold text-darb-muted">
          {label}
        </p>

        <div className="mt-3 flex gap-2">
          {!isMain && (
            <button
              type="button"
              onClick={
                onMakeMain
              }
              className="flex-1 rounded-full border border-darb-gold/40 px-3 py-2 text-xs font-semibold text-darb-green transition hover:bg-darb-gold/15"
            >
              Make main
            </button>
          )}

          <button
            type="button"
            onClick={
              onRemove
            }
            className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({
  children,
}) {
  return (
    <div className="rounded-[1.5rem] border border-darb-gold/20 bg-white p-8 shadow-soft">
      {children}
    </div>
  );
}

function PackageBadge() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-darb-green text-darb-beige">
      <Package
        size={24}
      />
    </div>
  );
}

export default AdminProducts;
