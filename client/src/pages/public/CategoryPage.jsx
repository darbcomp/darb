import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCategoryBySlug } from "../../api/categoryApi";
import { getProducts } from "../../api/productApi";
import ProductCard from "../../components/product/ProductCard";

const fallbackCategoryNames = {
  men: "Men",
  women: "Women",
  unisex: "Unisex",
  musk: "Musk",
};

function CategoryPage() {
  const { slug } = useParams();

  const categoryQuery = useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategoryBySlug(slug),
    retry: 1,
  });

  const productsQuery = useQuery({
    queryKey: ["products", "category", slug],
    queryFn: () => getProducts({ category: slug, limit: 24 }),
  });

  const category = categoryQuery.data?.data;
  const products = productsQuery.data?.data || [];

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <div className="mb-10 rounded-[2rem] bg-darb-green p-8 text-darb-beige shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Darb Category
        </p>
        <h1 className="mt-2 font-display text-5xl capitalize">
          {category?.name || fallbackCategoryNames[slug] || slug}
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-darb-beige/75">
          {category?.description ||
            "Products for this path will appear here once the store data is connected."}
        </p>
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
          <h2 className="font-display text-3xl text-darb-green">
            No products in this category yet
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-darb-muted">
            This page is ready. Products will appear once MongoDB is connected and
            Darb’s product data is added.
          </p>
        </div>
      )}
    </section>
  );
}

export default CategoryPage;