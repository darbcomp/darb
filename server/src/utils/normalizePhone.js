const normalizeEgyptPhone = (value = "") => {
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (/^01\d{9}$/.test(digits)) return `20${digits.slice(1)}`;
  if (/^20(1\d{9})$/.test(digits)) return digits;
  return digits;
};

module.exports = { normalizeEgyptPhone };
