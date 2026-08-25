import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await adminLogin(formData);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || "Admin login failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-darb-green px-4">
      <div className="w-full max-w-md rounded-3xl bg-darb-cream p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Darb Control Panel
        </p>
        <h1 className="mt-2 font-display text-4xl text-darb-green">
          Admin Login
        </h1>
        <p className="mt-3 text-sm text-darb-muted">
          Access products, orders, offers, bundles, coupons, analytics, and waitlist.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              Email or Phone
            </label>
            <input
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="Admin email or phone"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              Password
            </label>
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              type="password"
              className="w-full rounded-full border border-darb-gold/30 bg-white px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="Admin password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Logging in..." : "Login to Admin"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default AdminLogin;