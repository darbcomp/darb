const { normalizeEgyptPhone } = require("../utils/normalizePhone");

const getCustomerIdentityKey = ({ phone = "", userId = "" } = {}) => {
  const normalizedPhone = normalizeEgyptPhone(phone);
  if (normalizedPhone) return `phone:${normalizedPhone}`;
  return userId ? `user:${String(userId)}` : "";
};

const aggregateCustomerRecords = (records = []) => {
  const customers = new Map();

  records.forEach((record) => {
    const key = getCustomerIdentityKey(record);
    if (!key) return;
    const current = customers.get(key) || { key, registered: false, orders: [] };
    if (record.kind === "user") {
      current.registered = true;
      current.user = record;
    } else if (record.kind === "order") {
      current.orders.push(record);
    }
    customers.set(key, current);
  });

  return [...customers.values()];
};

module.exports = { aggregateCustomerRecords, getCustomerIdentityKey };
