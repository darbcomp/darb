const getGovernorateDeliveryFee = (governorate, fees = {}) => {
  const value = String(governorate || "").trim().toLowerCase()
    .replace(/\s+governorate$/, "")
    .replace(/^محافظة\s+/, "");
  if (["cairo", "القاهرة"].includes(value)) return Number(fees.cairo) || 100;
  if (["giza", "الجيزة"].includes(value)) return Number(fees.giza) || 100;
  if (["alexandria", "alex", "الإسكندرية", "الاسكندرية"].includes(value)) return Number(fees.alexandria) || 100;
  return Number(fees.other) || 100;
};

module.exports = { getGovernorateDeliveryFee };
