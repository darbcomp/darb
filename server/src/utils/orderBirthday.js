const getCairoIsoDate = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  const byType = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${byType.year}-${byType.month}-${byType.day}`;
};

const parseOrderBirthday = (value, now = new Date()) => {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const text = String(value).trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error("Enter a valid birthday.");
  }

  const birthday = new Date(`${text}T00:00:00.000Z`);

  if (
    Number.isNaN(birthday.getTime()) ||
    birthday.toISOString().slice(0, 10) !== text
  ) {
    throw new Error("Enter a valid birthday.");
  }

  if (text > getCairoIsoDate(now)) {
    throw new Error("Enter a valid birthday that is not in the future.");
  }

  return birthday;
};

module.exports = { getCairoIsoDate, parseOrderBirthday };
