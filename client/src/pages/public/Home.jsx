import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";
import { getCategories } from "../../api/categoryApi";
import { getFeaturedProducts } from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard";

function Home() {
  const healthQuery = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const response = await api.get("/health");
      return response.data;
    },
    retry: 1,
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  const featuredQuery = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => getFeaturedProducts({ limit: 8 }),
  });

  const categories = categoriesQuery.data?.data || [];
  const featuredProducts = featuredQuery.data?.data || [];

  const fallbackCategories = [
    { name: "Men", slug: "men", description: "Bold, refined, and memorable." },
    { name: "Women", slug: "women", description: "Soft, graceful, and elegant." },
    { name: "Unisex", slug: "unisex", description: "Balanced scents for every path." },
    { name: "Musk", slug: "musk", description: "Clean, intimate, and lasting." },
  ];

  const displayCategories = categories.length > 0 ? categories : fallbackCategories;

  return (
    <div className="bg-darb-cream">
      <section className="min-h-[80vh]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-darb-gold/40 bg-white/50 px-4 py-2 text-xs font-semibold text-darb-green">
              {healthQuery.isLoading && "Checking API..."}
              {healthQuery.isError && "API offline"}
              {healthQuery.data?.success && "API connected"}
            </div>

            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-darb-gold">
              Darb Perfumes
            </p>

            <h1 className="font-display text-5xl font-semibold leading-tight text-darb-green md:text-7xl">
              A scent for every path.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-darb-muted">
              Darb is more than perfume — a journey, a memory, and a scent that
              walks with you.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/shop"
                className="rounded-full bg-darb-green px-7 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black"
              >
                Shop Now
              </Link>

              <Link
                to="/category/unisex"
                className="rounded-full border border-darb-gold px-7 py-3 text-sm font-semibold text-darb-green transition hover:bg-darb-gold/20"
              >
                Explore Unisex
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
            <div className="flex min-h-[420px] items-center justify-center rounded-[1.5rem] border border-darb-gold/30 bg-darb-beige/10">
              <div className="text-center">
                <p className="font-display text-5xl text-darb-gold">Darb</p>
                <p className="mt-4 max-w-sm text-sm leading-7 text-darb-beige/75">
                  Product visuals will be added once the client sends the final
                  perfume photos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
              Categories
            </p>
            <h2 className="mt-2 font-display text-4xl text-darb-green">
              Choose your path
            </h2>
          </div>

          <Link to="/shop" className="hidden text-sm font-semibold text-darb-green md:block">
            View all products
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {displayCategories.map((category) => (
            <Link
              key={category.slug}
              to={`/category/${category.slug}`}
              className="rounded-[1.5rem] border border-darb-gold/25 bg-white p-6 shadow-soft transition hover:-translate-y-1 hover:border-darb-gold"
            >
              <p className="font-display text-3xl text-darb-green">{category.name}</p>
              <p className="mt-3 text-sm leading-6 text-darb-muted">
                {category.description || "A Darb fragrance category."}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-darb-green py-20 text-darb-beige">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
                Featured
              </p>
              <h2 className="mt-2 font-display text-4xl">Scents in focus</h2>
            </div>
          </div>

          {featuredQuery.isLoading ? (
            <p className="text-darb-beige/70">Loading featured products...</p>
          ) : featuredProducts.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product._id || product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-darb-gold/25 bg-darb-beige/10 p-8">
              <p className="font-display text-3xl text-darb-gold">Products coming soon</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-darb-beige/75">
                Once MongoDB is connected and products are seeded, Darb’s featured
                fragrances will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Home;