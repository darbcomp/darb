import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../../api/categoryApi";
import { getProducts } from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard";

function Shop() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const productParams = useMemo(() => {
    const params = { limit: 24 };

    if (category) params.category = category;
    if (search.trim()) params.search = search.trim();

    return params;
  }, [category, search]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const productsQuery = useQuery({
    queryKey: ["products", productParams],
    queryFn: () => getProducts(productParams),
  });

  const categories = categoriesQuery.data?.data || [];
  const products = productsQuery.data?.data || [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Darb Collection
        </p>
        <h1 className="mt-2 font-display text-5xl text-darb-green">Shop Darb</h1>
        <p className="mt-4 max-w-2xl leading-7 text-darb-muted">
          Explore scents made for different paths, moods, memories, and moments.
        </p>
      </div>

      <div className="mb-8 grid gap-4 rounded-[1.5rem] border border-darb-gold/20 bg-white p-4 shadow-soft md:grid-cols-[1fr_auto]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by scent, name, or mood..."
          className="rounded-full border border-darb-gold/25 px-5 py-3 outline-none transition focus:border-darb-green"
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-full border border-darb-gold/25 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      {productsQuery.isLoading ? (
        <p className="text-darb-muted">Loading products...</p>
      ) : products.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product._id || product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-darb-gold/25 bg-white p-8 shadow-soft">
          <h2 className="font-display text-3xl text-darb-green">No products yet</h2>
          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            This is correct for now. After MongoDB is connected and the placeholder
            products are seeded or real products are added, they will appear here.
          </p>
        </div>
      )}
    </section>
  );
}

export default Shop;