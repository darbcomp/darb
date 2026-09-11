import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useLanguage } from "../../context/LanguageContext";

function Login() {
  const { customerLogin } = useAuth();
  const { notify } = useFeedback();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/account/orders";

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
      await customerLogin(formData);
      notify({ type: "success", title: t("Welcome back") });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.friendlyMessage || "Login failed.");
      notify({ type: "error", title: t("Login failed"), message: err.friendlyMessage || t("Please try again.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-14">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-darb-gold">
          {t("Welcome back")}
        </p>
        <h1 className="mt-2 font-display text-4xl text-darb-green">{t("Login")}</h1>
        <p className="mt-3 text-darb-muted">
          {t("Access your Darb account and follow your scent journey.")}
        </p>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              {t("Email or Phone")}
            </label>
            <input
              name="identifier"
              value={formData.identifier}
              onChange={handleChange}
              className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="example@email.com or phone"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-darb-green">
              {t("Password")}
            </label>
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              type="password"
              className="w-full rounded-full border border-darb-gold/30 px-5 py-3 outline-none transition focus:border-darb-green"
              placeholder="Your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-darb-green px-6 py-3 text-sm font-semibold text-darb-beige transition hover:bg-darb-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t(isSubmitting ? "Logging in..." : "Login")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-darb-muted">
          {t("No account yet?")}{" "}
          <Link to="/register" className="font-semibold text-darb-green">
            {t("Create one")}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
