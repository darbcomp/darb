import { useParams } from "react-router-dom";

function CategoryPage() {
  const { slug } = useParams();

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="font-display text-4xl capitalize text-darb-green">
        {slug}
      </h1>
      <p className="mt-3 text-darb-muted">
        Category products will appear here soon.
      </p>
    </section>
  );
}

export default CategoryPage;