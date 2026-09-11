const normalizeEgyptPhone = (value = "") => {
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (/^01[0125]\d{8}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^201[0125]\d{8}$/.test(digits)) return digits;
  return "";
};

const isValidEgyptPhone = (value = "") => Boolean(normalizeEgyptPhone(value));

const getEgyptPhoneIdentityVariants = (value = "") => {
  const canonical = normalizeEgyptPhone(value);
  if (!canonical) return [];
  return [canonical, `0${canonical.slice(2)}`];
};

const formatEgyptPhoneForDisplay = (value = "") => {
  const canonical = normalizeEgyptPhone(value);
  return canonical ? `0${canonical.slice(2)}` : String(value || "").trim();
};

module.exports = {
  normalizeEgyptPhone,
  isValidEgyptPhone,
  getEgyptPhoneIdentityVariants,
  formatEgyptPhoneForDisplay,
};
