import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../../api/axiosInstance";

function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["api-health"],
    queryFn: async () => {
      const response = await api.get("/health");
      return response.data;
    },
    retry: 1,
  });

  return (
    <section className="min-h-[80vh] bg-darb-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-2">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-darb-gold/40 bg-white/50 px-4 py-2 text-xs font-semibold text-darb-green">
            {isLoading && "Checking API..."}
            {isError && "API offline"}
            {data?.success && "API connected"}
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

          <div className="mt-8 flex gap-4">
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
            <p className="text-center font-display text-4xl text-darb-gold">
              Product visuals coming soon
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Home;