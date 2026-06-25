import { useParams } from "react-router-dom";

function ProductDetails() {
  const { slug } = useParams();

  return (
    <section className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="font-display text-4xl text-darb-green">Product Details</h1>
      <p className="mt-3 text-darb-muted">Product slug: {slug}</p>
    </section>
  );
}

export default ProductDetails;