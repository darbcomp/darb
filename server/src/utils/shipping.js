const getGovernorateDeliveryFee = (governorate, fees) => {
  const value = String(governorate || "").trim().toLowerCase()
    .replace(/\s+governorate$/, "")
    .replace(/^محافظة\s+/, "");
  if (["cairo", "القاهرة"].includes(value)) return Number(fees.cairo) || 80;
  if (["giza", "الجيزة"].includes(value)) return Number(fees.giza) || 80;
  if (["alexandria", "alex", "الإسكندرية", "الاسكندرية"].includes(value)) return Number(fees.alexandria) || 125;
  return Number(fees.other) || 135;
};

module.exports = { getGovernorateDeliveryFee };
