import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, Minus, Plus, ShoppingBag } from "lucide-react";

import { getProductBySlug, getProducts } from "../../api/productApi";
import { createWaitlistRequest } from "../../api/waitlistApi";
import ProductCard from "../../components/product/ProductCard";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/useCart";
import { useLanguage } from "../../context/LanguageContext";
import { useFeedback } from "../../context/FeedbackContext";
import { flyProductImageToCart } from "../../utils/flyToCart";
import { formatCurrency } from "../../utils/formatCurrency";
import { getActiveProductVariants, getStockLabel } from "../../utils/productVariants";
import { localizeProduct } from "../../utils/localizedContent";
import SEO from "../../components/common/SEO";
import { breadcrumbJsonLd, productJsonLd } from "../../seo/seoConfig";
import { getRuntimeSiteUrl } from "../../seo/runtimeSeo";
import { normalizeEcommercePayload, trackMarketingEventOnce } from "../../utils/marketingEvents";

const initialWaitlistForm = { name: "", phone: "", email: "", note: "" };
const uniqueText = (values = []) => [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];

function ProductDetailsView({ slug }) {
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { language, t } = useLanguage();
  const { notify } = useFeedback();
  const mobileGalleryRef = useRef(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [waitlistForm, setWaitlistForm] = useState(initialWaitlistForm);
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [waitlistError, setWaitlistError] = useState("");

  const productQuery = useQuery({ queryKey: ["product", slug], queryFn: () => getProductBySlug(slug), retry: 1, staleTime: 60_000 });
  const sourceProduct = productQuery.data?.data;
  const product = useMemo(
    () => localizeProduct(sourceProduct, language),
    [sourceProduct, language]
  );
  const images = useMemo(() => [...(product?.images || [])].sort((a, b) => Number(Boolean(b.isMain)) - Number(Boolean(a.isMain))), [product]);
  const safeImageIndex = Math.min(selectedImageIndex, Math.max(images.length - 1, 0));
  const selectedImage = images[safeImageIndex] || images[0];
  const activeVariants = useMemo(() => getActiveProductVariants(product), [product]);
  const selectedVariant = activeVariants.find((variant) => String(variant.variantId || "") === String(selectedVariantId || "")) || activeVariants[0];
  const displayPrice = Number(selectedVariant?.price) || 0;
  const displayCompareAtPrice = Number(selectedVariant?.compareAtPrice) || 0;
  const selectedStock = Number(selectedVariant?.stock) || 0;

  const categoryName = product?.category?.name || product?.categorySnapshot?.name || "Darb";
  const categorySlug = product?.category?.slug || product?.categorySnapshot?.slug || "";
  const assignedCategories = useMemo(() => {
    const values = [product?.category, ...(product?.categories || [])].filter(Boolean);
    return values.filter((category, index) => values.findIndex((item) => String(item._id || item.slug || item) === String(category._id || category.slug || category)) === index);
  }, [product]);
  const relatedProductsQuery = useQuery({
    queryKey: ["products", "related", categorySlug, product?._id],
    queryFn: () => getProducts({ category: categorySlug, limit: 5, sort: "featured" }),
    enabled: Boolean(categorySlug && product?._id), retry: 1, staleTime: 60_000,
  });
  const relatedProducts = (relatedProductsQuery.data?.data || []).filter((item) => item._id !== product?._id).slice(0, 4);

  const canPurchase = Boolean(product && product.isActive && !product.isPlaceholder && displayPrice > 0 && selectedStock > 0);
  const lowStock = canPurchase && selectedStock <= Number(product.lowStockThreshold ?? 3);
  const sizeLabel = selectedVariant?.label || product?.sizeLabel || "";
  const scentFamilies = uniqueText(product?.scentFamilies?.length ? product.scentFamilies : product?.scentFamily ? String(product.scentFamily).split(/[,•]/) : []);
  const bestFor = uniqueText(product?.bestFor || []);
  const keyNotes = uniqueText(product?.keyNotes || []);
  const noteRows = [["Top", uniqueText(product?.scentNotes?.top || [])], ["Middle", uniqueText(product?.scentNotes?.middle || [])], ["Base", uniqueText(product?.scentNotes?.base || [])]].filter(([, notes]) => notes.length);
  const unavailableReason = useMemo(() => {
    if (!product) return "";
    if (!product.isActive || product.isPlaceholder) return t("This fragrance is currently unavailable.");
    if (displayPrice <= 0) return t("This fragrance is not available to purchase yet.");
    if (selectedStock <= 0) return t("This size is currently out of stock.");
    return "";
  }, [product, displayPrice, selectedStock, t]);

  const seoTitle = language === "ar" && sourceProduct?.arabicName
    ? `${sourceProduct.arabicName} | درب للعطور`
    : sourceProduct?.metaTitle || (sourceProduct?.name ? `${sourceProduct.name} | Darb Perfumes` : "Perfume | Darb Perfumes");
  const seoDescription = language === "ar"
    ? sourceProduct?.arabicShortDescription || sourceProduct?.arabicDescription || sourceProduct?.metaDescription || sourceProduct?.shortDescription || sourceProduct?.description || "A scent for every path."
    : sourceProduct?.metaDescription || sourceProduct?.shortDescription || sourceProduct?.description || "A scent for every path.";
  const seoPath = `/product/${slug}`;
  const seoImage = images[0]?.url || "";
  const seoPricedVariants = activeVariants.filter((variant) => Number(variant.price) > 0);
  const seoPrice = seoPricedVariants.length
    ? Math.min(...seoPricedVariants.map((variant) => Number(variant.price)))
    : displayPrice;
  const seoInStock = Boolean(
    product?.isActive &&
    !product?.isPlaceholder &&
    seoPrice > 0 &&
    (seoPricedVariants.length
      ? seoPricedVariants.some((variant) => Number(variant.stock) > 0)
      : selectedStock > 0)
  );
  const siteUrl = getRuntimeSiteUrl();
  const seoJsonLd = product ? [
    productJsonLd({
      product: sourceProduct,
      title: product.name,
      description: seoDescription,
      path: seoPath,
      image: seoImage,
      price: seoPrice,
      inStock: seoInStock,
    }, siteUrl),
    breadcrumbJsonLd([
      { name: t("Home"), path: "/" },
      { name: t("Shop"), path: "/shop" },
      ...(categorySlug ? [{ name: categoryName, path: `/category/${categorySlug}` }] : []),
      { name: product.name, path: seoPath },
    ], siteUrl),
  ] : [];

  useEffect(() => {
    if (!sourceProduct?._id || !product || productQuery.isLoading || productQuery.isError) return;
    trackMarketingEventOnce(
      `view-content:${location.key}:${sourceProduct._id}`,
      "ViewContent",
      normalizeEcommercePayload({
        items: [{ productId: sourceProduct._id, quantity: 1, price: seoPrice }],
        value: seoPrice,
        contentName: sourceProduct.name,
      })
    );
  }, [location.key, product, productQuery.isError, productQuery.isLoading, seoPrice, sourceProduct]);

  const waitlistMutation = useMutation({
    mutationFn: createWaitlistRequest,
    onSuccess: (response) => {
      setWaitlistError("");
      setWaitlistMessage(t(response?.message || "You are on the waitlist. Darb will contact you when this fragrance is available."));
      notify({ type: "success", title: t("You are on the waitlist"), message: response?.message });
      setWaitlistForm((current) => ({ ...current, note: "" }));
    },
    onError: (error) => {
      setWaitlistMessage("");
      setWaitlistError(t(error.friendlyMessage || "We could not add you to the waitlist. Please try again."));
      notify({ type: "error", title: t("Could not join the waitlist"), message: error.friendlyMessage || t("Please try again.") });
    },
  });

  const selectImage = (index) => {
    setSelectedImageIndex(index);
    const track = mobileGalleryRef.current;
    if (track && window.innerWidth < 1024) track.scrollTo({ left: index * track.clientWidth, behavior: "smooth" });
  };
  const handleMobileGalleryScroll = () => {
    const track = mobileGalleryRef.current;
    if (track?.clientWidth) setSelectedImageIndex(Math.round(track.scrollLeft / track.clientWidth));
  };
  const handleAddToCart = (event) => {
    if (!canPurchase) return;
    const count = Math.min(quantity, selectedStock);
    addToCart(sourceProduct, count, selectedVariant?.isLegacy ? null : selectedVariant);
    flyProductImageToCart({ imageUrl: selectedImage?.url, origin: event.currentTarget });
    notify({ type: "success", title: t("Added to Cart"), message: t(`${count} ${count === 1 ? "bottle" : "bottles"} added to your cart.`) });
  };
  const handleWaitlistSubmit = (event) => {
    event.preventDefault();
    if (!waitlistForm.name.trim()) return setWaitlistError(t("Name is required."));
    if (!waitlistForm.phone.trim() && !waitlistForm.email.trim()) return setWaitlistError(t("Phone or email is required."));
    setWaitlistError("");
    waitlistMutation.mutate({ product: product._id, productId: product._id, slug: product.slug, productSlug: product.slug, productName: product.name, name: waitlistForm.name.trim(), phone: waitlistForm.phone.trim(), email: waitlistForm.email.trim(), source: "product_page", note: [sizeLabel ? `Requested size: ${sizeLabel}` : "", waitlistForm.note.trim()].filter(Boolean).join(" — ") });
  };

  if (productQuery.isLoading) return <><SEO title={seoTitle} description={seoDescription} path={seoPath} /><ProductSkeleton /></>;
  if (productQuery.isError || !product) return <ProductNotFound message={productQuery.error?.friendlyMessage} />;

  return (
    <main className="min-h-[70vh] bg-darb-cream">
      <SEO title={seoTitle} description={seoDescription} path={seoPath} image={seoImage} type="product" jsonLd={seoJsonLd} />
      <nav className="border-b border-darb-gold/15" aria-label={t("Breadcrumb")}>
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-4 text-xs text-darb-muted sm:px-6 lg:px-8">
          <Link to="/shop" className="inline-flex items-center gap-2 transition hover:text-darb-green"><ArrowLeft size={14} className={language === "ar" ? "rotate-180" : ""} />{t("Shop")}</Link><span aria-hidden="true">/</span>
          {categorySlug ? <Link to={`/category/${categorySlug}`} className="hover:text-darb-green">{categoryName}</Link> : <span>{categoryName}</span>}<span aria-hidden="true">/</span><span className="truncate text-darb-green">{product.name}</span>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14">
          <div className="min-w-0">
            <div className="hidden overflow-hidden rounded-[2rem] bg-darb-surface shadow-soft lg:block"><div className="aspect-square">{selectedImage?.url ? <img src={selectedImage.url} alt={selectedImage.alt || product.name} fetchPriority="high" decoding="async" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center bg-darb-green font-display text-6xl text-darb-gold">Darb</div>}</div></div>
            <div ref={mobileGalleryRef} onScroll={handleMobileGalleryScroll} className="darb-horizontal-scroll flex snap-x snap-mandatory overflow-x-auto rounded-[1.75rem] bg-darb-surface shadow-soft lg:hidden">
              {images.length ? images.map((image, index) => <div key={image.storageKey || image.publicId || image.url || index} className="aspect-square min-w-full snap-center"><img src={image.url} alt={image.alt || t(product.name + ", view " + (index + 1))} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} decoding="async" className="h-full w-full object-cover" /></div>) : <div className="grid aspect-square min-w-full place-items-center bg-darb-green font-display text-5xl text-darb-gold">Darb</div>}
            </div>
            {images.length > 1 && <div className="darb-horizontal-scroll mt-4 flex snap-x gap-3 overflow-x-auto pb-2" aria-label={t("Product image thumbnails")}>{images.map((image, index) => <button key={image.storageKey || image.publicId || image.url || index} type="button" onClick={() => selectImage(index)} aria-current={safeImageIndex === index ? "true" : undefined} aria-label={t("View " + product.name + " image " + (index + 1))} className={`relative aspect-square w-20 shrink-0 snap-start overflow-hidden rounded-2xl border-2 transition sm:w-24 ${safeImageIndex === index ? "border-darb-green" : "border-transparent hover:border-darb-gold"}`}><img src={image.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" /><span className="absolute bottom-1 end-1 rounded-full bg-darb-green/85 px-2 py-0.5 text-[10px] text-darb-beige">{index + 1}</span></button>)}</div>}
          </div>

          <div className="lg:sticky lg:top-[125px] lg:self-start">
            <div className="flex flex-wrap gap-3">{assignedCategories.map((category) => <Link key={category._id || category.slug || category} to={`/category/${category.slug || category}`} className="text-[10px] font-semibold uppercase tracking-[0.22em] text-darb-gold hover:text-darb-green">{category.name || category.slug || category}</Link>)}</div>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] text-darb-green sm:text-6xl">{product.name}</h1>
            {product.inspiredBy && <p className="mt-5 text-sm text-darb-muted"><span className="font-semibold text-darb-green">{t("Inspired by")}</span> {product.inspiredBy}</p>}
            {product.shortDescription && <p className="mt-5 max-w-xl text-sm leading-7 text-darb-muted sm:text-base">{product.shortDescription}</p>}

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-y border-darb-gold/20 py-5"><div className="flex items-end gap-3">{displayPrice > 0 && <p className="font-display text-4xl text-darb-green">{formatCurrency(displayPrice)}</p>}{displayCompareAtPrice > displayPrice && displayPrice > 0 && <p className="pb-1 text-sm text-darb-muted line-through">{formatCurrency(displayCompareAtPrice)}</p>}</div></div>

            {activeVariants.length > 0 && <fieldset className="mt-6"><legend className="text-xs font-semibold text-darb-green">{t("Size")}</legend><div className="mt-3 flex flex-wrap gap-2">{activeVariants.map((variant) => <button key={variant.variantId} type="button" onClick={() => { setSelectedVariantId(variant.variantId); setQuantity(1); }} aria-pressed={String(selectedVariant?.variantId) === String(variant.variantId)} className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition ${String(selectedVariant?.variantId) === String(variant.variantId) ? "border-darb-green bg-darb-green text-darb-beige" : "border-darb-gold/30 bg-darb-surface text-darb-green hover:border-darb-green"}`}>{variant.label || (variant.sizeMl ? `${variant.sizeMl} ML` : variant.sku)}</button>)}</div></fieldset>}
            <div className="mt-6 flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${canPurchase ? "bg-darb-green" : "bg-darb-muted/50"}`} aria-hidden="true" /><span className={lowStock ? "font-semibold text-darb-gold" : "text-darb-green"}>{canPurchase ? t(lowStock ? `Only ${selectedStock} left` : getStockLabel(selectedStock)) : unavailableReason}</span></div>

            {canPurchase ? <div className="mt-6"><p className="text-xs font-semibold text-darb-green">{t("Quantity")}</p><div className="mt-2 inline-flex items-center rounded-full border border-darb-gold/30 bg-darb-surface"><button type="button" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={quantity <= 1} className="grid h-12 w-12 place-items-center disabled:opacity-30" aria-label={t("Decrease quantity")}><Minus size={17} /></button><span className="min-w-10 text-center font-semibold text-darb-green" aria-live="polite">{quantity}</span><button type="button" onClick={() => setQuantity((current) => Math.min(selectedStock, current + 1))} disabled={quantity >= selectedStock} className="grid h-12 w-12 place-items-center disabled:opacity-30" aria-label={t("Increase quantity")}><Plus size={17} /></button></div><button type="button" onClick={handleAddToCart} className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-darb-green px-8 text-sm font-bold uppercase tracking-[0.12em] text-darb-beige transition hover:bg-darb-black active:scale-[0.99]"><ShoppingBag size={18} />{t("Add to Cart")}</button></div> : <WaitlistPanel user={user} form={waitlistForm} setForm={setWaitlistForm} error={waitlistError} message={waitlistMessage} isPending={waitlistMutation.isPending} reason={unavailableReason} onSubmit={handleWaitlistSubmit} />}

            <div className="mt-8 space-y-7 border-t border-darb-gold/20 pt-8">
              {scentFamilies.length > 0 && <ProfileBlock title="Scent families" values={scentFamilies} />}
              {bestFor.length > 0 && <ProfileBlock title="Best for" values={bestFor} />}
              {keyNotes.length > 0 ? <ProfileBlock title="Key notes" values={keyNotes} /> : noteRows.length > 0 && <div><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-darb-gold">{t("Scent notes")}</h2><dl className="mt-4 space-y-3">{noteRows.map(([label, notes]) => <div key={label} className="grid grid-cols-[5rem_1fr] gap-3 border-b border-darb-gold/15 pb-3"><dt className="font-semibold text-darb-green">{t(label)}</dt><dd className="text-sm leading-6 text-darb-muted">{notes.join(", ")}</dd></div>)}</dl></div>}
              {product.description && <div><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-darb-gold">{t("Description")}</h2><p className="mt-4 whitespace-pre-line text-sm leading-8 text-darb-muted sm:text-base">{product.description}</p></div>}
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && <section className="border-t border-darb-gold/20 py-12 sm:py-16"><div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8"><div className="flex items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-darb-gold">{t("Continue the journey")}</p><h2 className="mt-2 font-display text-4xl text-darb-green sm:text-5xl">{t("You may also like.")}</h2></div>{categorySlug && <Link to={`/category/${categorySlug}`} className="hidden text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4 sm:block">{t("View " + categoryName)}</Link>}</div><div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{relatedProducts.map((relatedProduct) => <ProductCard key={relatedProduct._id || relatedProduct.slug} product={relatedProduct} />)}</div></div></section>}
    </main>
  );
}

function ProfileBlock({ title, values }) {
  const { t } = useLanguage();
  return <div><h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-darb-gold">{t(title)}</h2><div className="mt-3 flex flex-wrap gap-2">{values.map((value) => <span key={value} className="rounded-full bg-darb-surface px-4 py-2 text-sm text-darb-green">{value}</span>)}</div></div>;
}

function WaitlistPanel({ user, form, setForm, error, message, isPending, reason, onSubmit }) {
  const { t } = useLanguage();
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const prefill = () => setForm((current) => ({ ...current, name: current.name || user?.name || "", phone: current.phone || user?.phone || "", email: current.email || user?.email || "" }));
  return <div className="mt-7 rounded-[1.5rem] border border-darb-gold/20 bg-darb-surface p-5 sm:p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-darb-green text-darb-beige"><Bell size={17} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-darb-gold">{t("Availability")}</p><h2 className="font-display text-2xl text-darb-green">{t("Join the waitlist")}</h2></div></div><p className="mt-4 text-sm leading-6 text-darb-muted">{reason}</p>{user && <button type="button" onClick={prefill} className="mt-4 text-sm font-semibold text-darb-green underline decoration-darb-gold underline-offset-4">{t("Use my account details")}</button>}<form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2"><WaitlistField label={t("Name")} name="name" value={form.name} onChange={change} required /><WaitlistField label={t("Phone")} name="phone" value={form.phone} onChange={change} inputMode="tel" /><div className="sm:col-span-2"><WaitlistField label={t("Email")} name="email" value={form.email} onChange={change} type="email" /></div><label className="sm:col-span-2"><span className="mb-2 block text-xs font-semibold text-darb-green">{t("Note")}</span><textarea name="note" value={form.note} onChange={change} rows="3" className="w-full rounded-2xl border border-darb-gold/30 bg-darb-cream px-4 py-3 outline-none" /></label><div className="sm:col-span-2" aria-live="polite">{error && <p className="text-sm text-red-700">{error}</p>}{message && <p className="text-sm text-darb-green">{message}</p>}</div><button type="submit" disabled={isPending} className="min-h-12 rounded-full bg-darb-green px-6 text-sm font-semibold text-darb-beige disabled:opacity-50 sm:col-span-2">{t(isPending ? "Joining…" : "Join waitlist")}</button></form></div>;
}

function WaitlistField({ label, name, value, onChange, type = "text", inputMode, required = false }) {
  const id = `waitlist-${name}`;
  return <label htmlFor={id}><span className="mb-2 block text-xs font-semibold text-darb-green">{label}{required ? " *" : ""}</span><input id={id} name={name} value={value} onChange={onChange} type={type} inputMode={inputMode} required={required} className="w-full rounded-full border border-darb-gold/30 bg-darb-cream px-4 py-3 outline-none" /></label>;
}

function ProductSkeleton() {
  return <main className="min-h-[70vh] bg-darb-cream"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-2"><div className="aspect-square animate-pulse rounded-[2rem] bg-darb-surface" /><div className="space-y-5 pt-4"><div className="h-4 w-28 animate-pulse rounded bg-darb-surface" /><div className="h-16 w-2/3 animate-pulse rounded bg-darb-surface" /><div className="h-28 animate-pulse rounded bg-darb-surface" /></div></div></main>;
}

function ProductNotFound({ message }) {
  const { t } = useLanguage();
  return <main className="min-h-[70vh] bg-darb-cream"><SEO title={t("Scent not found | Darb Perfumes")} description={t("This fragrance is unavailable right now.")} robots="noindex, nofollow" /><section className="mx-auto max-w-7xl px-5 py-16"><div className="rounded-[2rem] bg-darb-green px-6 py-14 text-center text-darb-beige"><p className="text-xs uppercase tracking-[0.3em] text-darb-gold">Darb</p><h1 className="mt-3 font-display text-5xl">{t("Scent not found.")}</h1><p className="mx-auto mt-4 max-w-xl text-sm text-darb-beige/70">{t(message || "This fragrance is unavailable right now.")}</p><Link to="/shop" className="mt-8 inline-flex rounded-full bg-darb-gold px-7 py-3 text-sm font-semibold text-darb-green">{t("Back to Shop")}</Link></div></section></main>;
}

function ProductDetails() {
  const { slug } = useParams();
  return <ProductDetailsView key={slug} slug={slug} />;
}

export default ProductDetails;
