import {
  ArrowRight,
  Check,
  Copy,
  LogOut,
  Mail,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";

import {
  Link,
  Navigate,
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  useAuth,
} from "../../context/AuthContext";
import { getMyRewards } from "../../api/rewardApi";
import SpinWheel from "../../components/rewards/SpinWheel";
import { useFeedback } from "../../context/FeedbackContext";
import { useLanguage } from "../../context/LanguageContext";
import { LocalizedPublicContent } from "../../components/common/InfoPageShell";
import { formatCurrency } from "../../utils/formatCurrency";
import { copyRewardCode, getRewardDisplayStatus, getRewardUsageText } from "../../utils/rewardPresentation";

function Account() {
  const { confirm, notify } = useFeedback();
  const { language, t } = useLanguage();
  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    isLoggingOut,
    setIsLoggingOut,
  ] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [copiedRewardId, setCopiedRewardId] = useState("");
  const rewardsQuery = useQuery({ queryKey: ["my-rewards"], queryFn: getMyRewards });
  const rewards = rewardsQuery.data?.data;

  const handleCopyRewardCode = async (reward) => {
    const code = String(reward?.code || "").trim();
    if (!code) return;
    try {
      if (!await copyRewardCode(code)) throw new Error("copy_failed");
      setCopiedRewardId(String(reward._id));
      notify({ type: "success", title: t("Copied") });
    } catch {
      notify({ type: "error", title: t("Could not copy code") });
    }
  };

  /* =========================
     ADMIN SAFETY
  ========================== */

  if (
    user?.role === "admin"
  ) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  /* =========================
     PROFILE DATA
  ========================== */

  const firstLetter =
    user?.name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() ||
    "D";

  const joinedDate =
    user?.createdAt
      ? new Date(
          user.createdAt
        ).toLocaleDateString(
          "en-EG",
          {
            month: "long",
            year: "numeric",
          }
        )
      : "";

  const addresses =
    Array.isArray(
      user?.addresses
    )
      ? user.addresses
      : [];

  /* =========================
     LOGOUT
  ========================== */

  const handleLogout =
    async () => {
      if (isLoggingOut) {
        return;
      }

      const confirmed = await confirm({ title: t("Log out?"), body: t("You’ll need to sign in again to view your Darb account."), confirmLabel: t("Log out"), variant: "destructive" });
      if (!confirmed) return;

      setIsLoggingOut(true);

      try {
        await logout();

        navigate("/", {
          replace: true,
        });
      } finally {
        setIsLoggingOut(
          false
        );
      }
    };

  return (
    <LocalizedPublicContent><main className="min-h-[70vh] bg-darb-cream">
      {/* =========================
          ACCOUNT HEADER
      ========================== */}

      <section className="bg-darb-green text-darb-beige">
        <div
          className="
            mx-auto
            max-w-7xl
            px-5
            py-12

            sm:px-6
            sm:py-14

            lg:px-8
            lg:py-16
          "
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-darb-gold sm:text-xs">
            Your Darb
          </p>

          <div
            className="
              mt-4
              flex
              flex-col
              gap-6

              md:flex-row
              md:items-end
              md:justify-between
            "
          >
            <div>
              <h1
                className="
                  font-display
                  text-5xl
                  leading-[1.02]

                  sm:text-6xl
                "
              >
                My Account
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-darb-beige/60 sm:text-base">
                Your details,
                orders and Darb
                journey in one
                place.
              </p>
            </div>

            {joinedDate && (
              <p className="text-xs uppercase tracking-[0.16em] text-darb-beige/40">
                With Darb since{" "}
                {joinedDate}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* =========================
          CONTENT
      ========================== */}

      <section
        className="
          mx-auto
          max-w-7xl
          px-5
          py-10

          sm:px-6
          sm:py-14

          lg:px-8
          lg:py-16
        "
      >
        <div
          className="
            grid
            gap-6

            lg:grid-cols-[1.15fr_0.85fr]
          "
        >
          {/* =========================
              LEFT
          ========================== */}

          <div className="space-y-6">
            {/* Profile Card */}

            <section
              className="
                rounded-[2rem]
                border
                border-darb-gold/20
                bg-white
                p-6
                shadow-soft

                sm:p-8
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-5

                  sm:flex-row
                  sm:items-center
                "
              >
                <div
                  className="
                    flex
                    h-20
                    w-20
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-darb-green
                    font-display
                    text-4xl
                    text-darb-gold
                  "
                >
                  {firstLetter}
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                    Darb Customer
                  </p>

                  <h2 className="mt-2 font-display text-3xl text-darb-green sm:text-4xl">
                    {user?.name ||
                      "Darb Customer"}
                  </h2>
                </div>
              </div>

              {/* Details */}

              <div
                className="
                  mt-8
                  grid
                  gap-3
                  border-t
                  border-darb-gold/20
                  pt-7

                  sm:grid-cols-2
                "
              >
                {/* Email */}

                <div className="rounded-[1.35rem] bg-darb-cream p-5">
                  <div className="flex items-center gap-2 text-darb-gold">
                    <Mail
                      size={16}
                      strokeWidth={
                        1.7
                      }
                    />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                      Email
                    </p>
                  </div>

                  <p className="mt-3 break-all text-sm font-semibold text-darb-green">
                    {user?.email ||
                      "Not added"}
                  </p>
                </div>

                {/* Phone */}

                <div className="rounded-[1.35rem] bg-darb-cream p-5">
                  <div className="flex items-center gap-2 text-darb-gold">
                    <Phone
                      size={16}
                      strokeWidth={
                        1.7
                      }
                    />

                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                      Phone
                    </p>
                  </div>

                  <p className="mt-3 text-sm font-semibold text-darb-green">
                    {user?.phone ||
                      "Not added"}
                  </p>
                </div>
              </div>
            </section>

            {/* =========================
                SAVED ADDRESSES
            ========================== */}

            {addresses.length >
              0 && (
              <section
                className="
                  rounded-[2rem]
                  border
                  border-darb-gold/20
                  bg-white
                  p-6
                  shadow-soft

                  sm:p-8
                "
              >
                <div
                  className="
                    flex
                    flex-col
                    gap-2

                    sm:flex-row
                    sm:items-end
                    sm:justify-between
                  "
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                      Saved Details
                    </p>

                    <h2 className="mt-2 font-display text-3xl text-darb-green">
                      Delivery
                      addresses
                    </h2>
                  </div>

                  <p className="text-xs text-darb-muted">
                    {
                      addresses.length
                    }{" "}
                    saved{" "}
                    {addresses.length ===
                    1
                      ? "address"
                      : "addresses"}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {addresses.map(
                    (
                      address,
                      index
                    ) => (
                      <article
                        key={
                          address._id ||
                          index
                        }
                        className="rounded-[1.4rem] border border-darb-gold/20 bg-darb-cream/40 p-5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-darb-green">
                            {address.label ||
                              `Address ${
                                index +
                                1
                              }`}
                          </p>

                          {address.isDefault && (
                            <span className="rounded-full bg-darb-gold/15 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-darb-green">
                              Default
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs leading-6 text-darb-muted">
                          {[
                            address.street,
                            address.city,
                            address.governorate,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ", "
                            ) ||
                            "Address details"}
                        </p>
                      </article>
                    )
                  )}
                </div>
              </section>
            )}
          </div>

          {/* =========================
              RIGHT
          ========================== */}

          <div className="space-y-5">
            <section className="rounded-[2rem] border border-darb-gold/25 bg-darb-beige p-6 shadow-soft sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">{t("Rewards")}</p>
              <h2 className="mt-2 font-display text-3xl text-darb-green">{t("Your available paths")}</h2>
              {rewards?.spinAvailable && <button type="button" onClick={() => setWheelOpen(true)} className="mt-5 rounded-full bg-darb-green px-5 py-3 text-sm font-semibold text-darb-beige">{t("Reveal your signup reward")}</button>}
              <div className="mt-4 space-y-3">
                {(rewards?.available || []).map((reward) => <article key={reward._id} className="rounded-2xl border border-darb-gold/15 bg-white/70 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-base text-darb-green">{t(reward.label)}</strong><span className="rounded-full bg-darb-green/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-darb-green">{t(reward.locked ? "Unlocks after your next order" : "Available")}</span></div>
                  {reward.expiresAt && <p className="mt-2 text-xs text-darb-muted">{t("Expires")} {new Date(reward.expiresAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-EG")}</p>}
                  {Number(reward.minSubtotal) > 0 && <p className="mt-1 text-xs text-darb-muted">{t("Minimum")} {formatCurrency(reward.minSubtotal)}</p>}
                  {reward.code ? <div className="mt-4 rounded-xl bg-darb-green px-4 py-3 text-darb-beige"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-darb-gold">{t("Code")}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><code className="break-all text-base font-bold tracking-wider" dir="ltr">{reward.code}</code><button type="button" onClick={() => handleCopyRewardCode(reward)} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-darb-beige px-4 py-2 text-xs font-bold text-darb-green"><span aria-live="polite">{copiedRewardId === String(reward._id) ? t("Copied") : t("Copy code")}</span>{copiedRewardId === String(reward._id) ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}</button></div></div> : <p className="mt-3 font-semibold text-darb-green">{t("Saved to your account")}</p>}
                  <p className="mt-3 text-xs leading-5 text-darb-muted">{getRewardUsageText(reward, t)}</p>
                </article>)}
                {!rewardsQuery.isLoading && !rewards?.spinAvailable && !rewards?.available?.length && <p className="text-sm text-darb-muted">{t("No unused rewards right now.")}</p>}
                {(rewards?.history || []).filter((reward) => getRewardDisplayStatus(reward) !== "Available").slice(0, 5).map((reward) => <div key={reward._id} className="rounded-2xl border border-darb-gold/15 px-4 py-3 text-sm opacity-75"><div className="flex flex-wrap items-start justify-between gap-2"><strong className="text-darb-green">{t(reward.label)}</strong><span className="text-[10px] font-bold uppercase tracking-wide text-darb-muted">{t(getRewardDisplayStatus(reward))}</span></div>{reward.code && <p className="mt-2 break-all font-mono text-xs text-darb-muted" dir="ltr">{reward.code}</p>}{reward.expiresAt && <p className="mt-1 text-xs text-darb-muted">{t("Expires")} {new Date(reward.expiresAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-EG")}</p>}</div>)}
              </div>
            </section>
            {/* My Orders */}

            <Link
              to="/account/orders"
              className="
                group
                block
                rounded-[2rem]
                bg-darb-green
                p-6
                text-darb-beige
                shadow-soft
                transition
                duration-300

                hover:-translate-y-1

                sm:p-8
              "
            >
              <div className="flex items-start justify-between gap-5">
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-darb-gold
                    text-darb-green
                  "
                >
                  <ShoppingBag
                    size={20}
                    strokeWidth={
                      1.7
                    }
                  />
                </div>

                <ArrowRight
                  size={20}
                  className="text-darb-gold transition-transform duration-300 group-hover:translate-x-1"
                />
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                Orders
              </p>

              <h2 className="mt-2 font-display text-3xl">
                {t("My Orders")}
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-7 text-darb-beige/60">
                View current and
                previous orders and
                follow each Darb
                journey.
              </p>
            </Link>

            {/* Continue Shopping */}

            <Link
              to="/shop"
              className="
                group
                block
                rounded-[2rem]
                border
                border-darb-gold/20
                bg-white
                p-6
                shadow-soft
                transition
                duration-300

                hover:-translate-y-1
                hover:border-darb-gold/45

                sm:p-8
              "
            >
              <div className="flex items-start justify-between gap-5">
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-full
                    bg-darb-cream
                    text-darb-green
                  "
                >
                  <User
                    size={20}
                    strokeWidth={
                      1.7
                    }
                  />
                </div>

                <ArrowRight
                  size={20}
                  className="text-darb-gold transition-transform duration-300 group-hover:translate-x-1"
                />
              </div>

              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                Collection
              </p>

              <h2 className="mt-2 font-display text-3xl text-darb-green">
                Continue your path.
              </h2>

              <p className="mt-3 max-w-sm text-sm leading-7 text-darb-muted">
                Return to the Darb
                collection and
                discover another
                fragrance.
              </p>
            </Link>

            {/* =========================
                LOGOUT
            ========================== */}

            <section
              className="
                rounded-[2rem]
                border
                border-darb-gold/20
                bg-white
                p-6
                shadow-soft
              "
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-darb-gold">
                Session
              </p>

              <h2 className="mt-2 font-display text-2xl text-darb-green">
                Leaving for now?
              </h2>

              <p className="mt-2 text-xs leading-6 text-darb-muted">
                You can sign back
                in whenever the
                path brings you
                back.
              </p>

              <button
                type="button"
                onClick={
                  handleLogout
                }
                disabled={
                  isLoggingOut
                }
                className="
                  mt-6
                  inline-flex
                  min-h-[46px]
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  border
                  border-red-200
                  px-5
                  text-sm
                  font-semibold
                  text-red-600
                  transition

                  hover:border-red-300
                  hover:bg-red-50
                  hover:text-red-700

                  focus-visible:border-red-300
                  focus-visible:bg-red-50
                  focus-visible:text-red-700
                  focus-visible:outline
                  focus-visible:outline-2
                  focus-visible:outline-offset-2
                  focus-visible:outline-red-600

                  disabled:cursor-not-allowed
                  disabled:opacity-60

                  sm:w-auto
                "
              >
                <LogOut
                  size={16}
                />

                {isLoggingOut
                  ? "Signing Out..."
                  : "Sign Out"}
              </button>
            </section>
          </div>
        </div>
      </section>
      {wheelOpen && <SpinWheel onClose={() => setWheelOpen(false)} />}
    </main></LocalizedPublicContent>
  );
}

export default Account;
