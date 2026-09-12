export const formatCurrency = (amount = 0) => {
  const value = Math.round((Number(amount) || 0) * 100) / 100;
  const hasFraction = !Number.isInteger(value);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(value);
};
