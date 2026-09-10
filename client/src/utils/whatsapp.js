export const buildOrderWhatsAppUrl = (orderNumber, action = "order support", number = "+20 10 99589674") => {
  const digits = String(number).replace(/\D/g, "").replace(/^0/, "20");
  const message = `Hello Darb, I need ${action}${orderNumber ? ` for order ${orderNumber}` : ""}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
};
