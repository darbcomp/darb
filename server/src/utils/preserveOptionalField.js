const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const preserveOptionalString = (body, key, existingValue = "", createDefault = "") => {
  if (!hasOwn(body, key)) {
    return existingValue ?? createDefault;
  }

  return String(body[key] ?? "").trim();
};

const preserveOptionalBoolean = (body, key, existingValue = false, parseBoolean) => {
  if (!hasOwn(body, key)) return Boolean(existingValue);
  return parseBoolean(body[key], Boolean(existingValue));
};

module.exports = {
  preserveOptionalBoolean,
  preserveOptionalString,
};
