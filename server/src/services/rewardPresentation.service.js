const { normalizeTransactionalEmail } = require("./transactionalEmailEvents.service");

const formatRewardMoney = (value) => `EGP ${Number(value || 0).toLocaleString("en-EG", {
  minimumFractionDigits: Number(value) % 1 ? 2 : 0,
  maximumFractionDigits: 2,
})}`;

const getRewardUsageDescription = (entitlement, { isGuest = false } = {}) => {
  const hasCode = Boolean(String(entitlement?.code || "").trim());
  let condition = "at an eligible checkout";
  if (entitlement?.type === "category_percentage" && entitlement.categorySlug) {
    const category = entitlement.categorySlug === "musk"
      ? "Musk items"
      : `${entitlement.categorySlug} items`;
    condition = `when eligible ${category} are in your cart`;
  } else if (entitlement?.type === "free_shipping" && Number(entitlement.minSubtotal) > 0) {
    condition = `when your order reaches ${formatRewardMoney(entitlement.minSubtotal)}`;
  } else if (entitlement?.type === "free_tester") {
    condition = "at an eligible checkout";
  }

  if (isGuest || hasCode) return `Enter this code ${condition}. Keep it for checkout.`;
  if (entitlement?.type === "category_percentage" && entitlement.categorySlug) {
    return `This reward is saved to your Darb account. Choose it at checkout ${condition}.`;
  }
  if (entitlement?.type === "free_shipping" && Number(entitlement.minSubtotal) > 0) {
    return `This reward is saved to your Darb account. Choose it at checkout ${condition}.`;
  }
  if (entitlement?.type === "free_tester") {
    return "This reward is saved to your Darb account. Choose it at an eligible checkout.";
  }
  return "This reward is saved to your Darb account. Choose it at checkout when eligible.";
};

const getPersistedGuestRewardEmail = (sourceOrder) =>
  normalizeTransactionalEmail(sourceOrder?.customerSnapshot?.email || "");

module.exports = {
  formatRewardMoney,
  getPersistedGuestRewardEmail,
  getRewardUsageDescription,
};
