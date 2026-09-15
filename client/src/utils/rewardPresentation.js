export const getRewardDisplayStatus = (reward) => {
  if (reward?.status === "used") return "Used";
  if (reward?.status === "expired") return "Expired";
  if (reward?.expiresAt && new Date(reward.expiresAt).getTime() <= Date.now()) return "Expired";
  return "Available";
};

export const copyRewardCode = async (value) => {
  const code = String(value || "").trim();
  if (!code) return false;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(code);
    return true;
  }
  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return document.execCommand("copy");
  } finally {
    textarea.remove();
  }
};

export const getRewardUsageText = (reward, t) => {
  if (reward?.key === "spin-next-10") {
    return t("Place one order first. Your 10% reward unlocks for the following order.");
  }
  const hasCode = Boolean(String(reward?.code || "").trim());
  if (hasCode) {
    if (reward?.type === "category_percentage" && reward.categorySlug === "musk") {
      return t("Use this code when eligible Musk items are in your cart.");
    }
    if (reward?.type === "free_shipping" && Number(reward.minSubtotal) > 0) {
      return t("Use this code when your order reaches the reward minimum.");
    }
    return t("Use this code at an eligible checkout.");
  }
  if (reward?.type === "category_percentage" && reward.categorySlug === "musk") {
    return t("Choose this reward at checkout when eligible Musk items are in your cart.");
  }
  if (reward?.type === "free_shipping" && Number(reward.minSubtotal) > 0) {
    return t("Choose this reward at checkout when your order meets the reward conditions.");
  }
  if (reward?.type === "free_tester") {
    return t("Choose this reward at an eligible checkout.");
  }
  return t("Choose this reward at checkout when eligible.");
};
