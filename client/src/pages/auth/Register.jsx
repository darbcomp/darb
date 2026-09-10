import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import SpinWheel from "../../components/rewards/SpinWheel";

function Register() {
  const { customerRegister } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    marketingConsent: false,
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [showWheel, setShowWheel] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await customerRegister(formData);
      setShowWheel(true);
    } catch (err) {
      setError(err.friendlyMessage || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-14">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          Start your path
        </p>
        <h1 className="mt-2 font-display text-4xl text-darb-green">
          Create Account
        </h1>
        <p className="mt-3 text-darb-muted">
          Save your details and track your Darb orders.
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              Full Name
            </label>
            <input
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="Your name"
              required
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl bg-darb-cream/70 p-4 text-sm leading-6 text-darb-muted">
            <input type="checkbox" name="marketingConsent" checked={formData.marketingConsent} onChange={handleChange} className="mt-1" />
            Send me occasional Darb news, launches, and offers.
          </label>

          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              Email
            </label>
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              type="email"
              className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="example@email.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              Phone
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="01xxxxxxxxx"
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
              className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="At least 6 characters"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-darb-muted">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-darb-green">
            Login
          </Link>
        </p>
      </div>
      {showWheel && <SpinWheel onClose={() => navigate("/account", { replace: true })} />}
    </section>
  );
}

export default Register;
