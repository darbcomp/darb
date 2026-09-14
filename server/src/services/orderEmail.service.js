const StoreSettings = require("../models/StoreSettings");

const {
  sendEmail,
} = require("../config/mailer");

const DEFAULT_BRAND = {
  darkGreen: "#0F3D2E",
  beige: "#E7DCC9",
  softGold: "#C8A97E",
  black: "#1C1C1C",
  cream: "#F7F1E6",
};

const PAYMENT_METHOD_LABELS = {
  cash_on_delivery: "Cash on Delivery",
  instapay: "InstaPay",
  vodafone_cash: "Vodafone Cash",
  paymob_card: "Card Payment",
};

const ORDER_STATUS_CONTENT = {
  confirmed: {
    subject: "Your Darb order is confirmed",
    title: "Your order is confirmed.",
    message:
      "Your order has been confirmed and is now continuing along its path.",
  },

  processing: {
    subject: "Your Darb order is being prepared",
    title: "Your order is being prepared.",
    message:
      "Your Darb order is now being prepared with care.",
  },

  shipped: {
    subject: "Your Darb order is on its way",
    title: "Your order is on its way.",
    message:
      "Your Darb order has left us and is now making its way to you.",
  },

  delivered: {
    subject: "Your Darb order has arrived",
    title: "Your journey has arrived.",
    message:
      "Your Darb order has been delivered. We hope this scent becomes part of a path worth remembering.",
  },

  cancelled: {
    subject: "Your Darb order was cancelled",
    title: "Your order has been cancelled.",
    message:
      "Your Darb order has been cancelled. If you need any help, you can contact us and we’ll be happy to assist.",
  },
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatMoney = (
  value,
  currency = "EGP"
) => {
  const number =
    Number(value) || 0;

  return `${number.toLocaleString("en-EG", {
    minimumFractionDigits:
      Number.isInteger(number)
        ? 0
        : 2,

    maximumFractionDigits: 2,
  })} ${currency}`;
};

const getSettings = async () => {
  const settings =
    await StoreSettings.findOne({
      singletonKey: "main",
    }).lean();

  return {
    storeName:
      settings?.storeName ||
      "Darb",

    arabicName:
      settings?.arabicName ||
      "درب",

    tagline:
      settings?.tagline ||
      "A scent for every path.",

    currency:
      settings?.currency ||
      "EGP",

    contact:
      settings?.contact ||
      {},

    delivery:
      settings?.delivery ||
      {},

    paymentMethods:
      settings?.paymentMethods ||
      {},

    brand: {
      ...DEFAULT_BRAND,
      ...(settings?.brand || {}),
    },
  };
};

const getMainPaymentLabel = (
  order,
  settings
) => {
  const paymentMethod =
    order.paymentMethod ||
    "cash_on_delivery";

  const settingsKeyMap = {
    cash_on_delivery:
      "cashOnDelivery",

    instapay:
      "instapay",

    vodafone_cash:
      "vodafoneCash",

    paymob_card:
      "paymobCard",
  };

  const settingsKey =
    settingsKeyMap[
      paymentMethod
    ];

  return (
    settings.paymentMethods?.[
      settingsKey
    ]?.label ||
    PAYMENT_METHOD_LABELS[
      paymentMethod
    ] ||
    paymentMethod
  );
};

const getPaymentInstructions = (
  order,
  settings
) => {
  const settingsKeyMap = {
    cash_on_delivery:
      "cashOnDelivery",

    instapay:
      "instapay",

    vodafone_cash:
      "vodafoneCash",

    paymob_card:
      "paymobCard",
  };

  const settingsKey =
    settingsKeyMap[
      order.paymentMethod
    ];

  return (
    settings.paymentMethods?.[
      settingsKey
    ]?.instructions ||
    ""
  );
};

const renderOrderItems = (
  order,
  settings
) => {
  return (order.items || [])
    .map((item) => {
      const product =
        item.productSnapshot ||
        {};

      const image =
        product.image
          ? `
            <td
              width="72"
              valign="top"
              style="padding-right:16px;"
            >
              <img
                src="${escapeHtml(
                  product.image
                )}"
                alt="${escapeHtml(
                  product.name
                )}"
                width="72"
                height="72"
                style="
                  display:block;
                  width:72px;
                  height:72px;
                  object-fit:cover;
                  border-radius:14px;
                "
              />
            </td>
          `
          : "";

      const size =
        product.sizeLabel ||
        (product.sizeMl
          ? `${product.sizeMl} ML`
          : "50 ML");

      return `
        <tr>
          ${image}

          <td
            valign="top"
            style="
              padding:0 0 20px 0;
            "
          >
            <div
              style="
                font-size:18px;
                font-weight:700;
                color:${
                  settings.brand.darkGreen
                };
                line-height:1.4;
              "
            >
              ${escapeHtml(
                product.name ||
                  "Darb Perfume"
              )}
            </div>

            <div
              style="
                margin-top:5px;
                font-size:13px;
                color:#7A7065;
                line-height:1.5;
              "
            >
              ${escapeHtml(size)}
              &nbsp;·&nbsp;
              Qty ${Number(
                item.quantity
              ) || 1}
            </div>

            <div
              style="
                margin-top:7px;
                font-size:14px;
                font-weight:600;
                color:${
                  settings.brand.black
                };
              "
            >
              ${formatMoney(
                item.lineTotal,
                settings.currency
              )}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
};

const renderDiscounts = (
  order,
  settings
) => {
  if (
    !Array.isArray(
      order.discounts
    ) ||
    !order.discounts.length
  ) {
    return "";
  }

  return order.discounts
    .filter(
      (discount) =>
        Number(
          discount.amount
        ) > 0
    )
    .map(
      (discount) => `
        <tr>
          <td
            style="
              padding:7px 0;
              font-size:14px;
              color:#7A7065;
            "
          >
            ${escapeHtml(
              discount.title ||
                discount.name ||
                discount.code ||
                "Discount"
            )}
          </td>

          <td
            align="right"
            style="
              padding:7px 0;
              font-size:14px;
              color:${
                settings.brand.darkGreen
              };
              font-weight:600;
            "
          >
            -${formatMoney(
              discount.amount,
              settings.currency
            )}
          </td>
        </tr>
      `
    )
    .join("");
};

const renderAddress = (
  order
) => {
  const address =
    order.shippingAddress ||
    {};

  const parts = [
    address.street,
    address.building
      ? `Building ${address.building}`
      : "",
    address.floor
      ? `Floor ${address.floor}`
      : "",
    address.apartment
      ? `Apartment ${address.apartment}`
      : "",
    address.city,
    address.governorate,
  ].filter(Boolean);

  return parts
    .map(escapeHtml)
    .join("<br />");
};

const renderEmailLayout = ({
  settings,
  title,
  intro,
  order,
  footerMessage,
}) => {
  const paymentLabel =
    getMainPaymentLabel(
      order,
      settings
    );

  const paymentInstructions =
    getPaymentInstructions(
      order,
      settings
    );

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
  </head>

  <body
    style="
      margin:0;
      padding:0;
      background:${
        settings.brand.cream
      };
      font-family:Arial, Helvetica, sans-serif;
      color:${
        settings.brand.black
      };
    "
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      border="0"
      style="
        background:${
          settings.brand.cream
        };
        padding:30px 14px;
      "
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
              max-width:620px;
              background:#FFFFFF;
              border-radius:24px;
              overflow:hidden;
            "
          >
            <tr>
              <td
                align="center"
                style="
                  background:${
                    settings.brand.darkGreen
                  };
                  padding:34px 24px;
                "
              >
                <div
                  style="
                    color:${
                      settings.brand.softGold
                    };
                    font-size:34px;
                    font-family:Georgia, 'Times New Roman', serif;
                    font-weight:700;
                    letter-spacing:5px;
                  "
                >
                  DARB
                </div>

                <div
                  style="
                    margin-top:7px;
                    color:${
                      settings.brand.beige
                    };
                    font-size:12px;
                    letter-spacing:2px;
                  "
                >
                  ${escapeHtml(
                    settings.tagline
                  )}
                </div>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:36px 30px 18px;
                "
              >
                <div
                  style="
                    font-family:Georgia, 'Times New Roman', serif;
                    font-size:30px;
                    line-height:1.25;
                    color:${
                      settings.brand.darkGreen
                    };
                  "
                >
                  ${escapeHtml(
                    title
                  )}
                </div>

                <div
                  style="
                    margin-top:15px;
                    font-size:15px;
                    line-height:1.8;
                    color:#756C62;
                  "
                >
                  ${escapeHtml(
                    intro
                  )}
                </div>

                <div
                  style="
                    margin-top:24px;
                    padding:16px 18px;
                    background:${
                      settings.brand.beige
                    };
                    border-radius:14px;
                  "
                >
                  <span
                    style="
                      font-size:12px;
                      letter-spacing:1.5px;
                      text-transform:uppercase;
                      color:#756C62;
                    "
                  >
                    Order
                  </span>

                  <div
                    style="
                      margin-top:4px;
                      font-size:22px;
                      font-weight:700;
                      color:${
                        settings.brand.darkGreen
                      };
                    "
                  >
                    ${escapeHtml(
                      order.orderNumber
                    )}
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:12px 30px;
                "
              >
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  ${renderOrderItems(
                    order,
                    settings
                  )}
                </table>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:8px 30px 25px;
                "
              >
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    border-top:1px solid #E8E1D8;
                    padding-top:12px;
                  "
                >
                  <tr>
                    <td
                      style="
                        padding:7px 0;
                        font-size:14px;
                        color:#7A7065;
                      "
                    >
                      Subtotal
                    </td>

                    <td
                      align="right"
                      style="
                        padding:7px 0;
                        font-size:14px;
                        color:${
                          settings.brand.black
                        };
                        font-weight:600;
                      "
                    >
                      ${formatMoney(
                        order.subtotal,
                        settings.currency
                      )}
                    </td>
                  </tr>

                  ${renderDiscounts(
                    order,
                    settings
                  )}

                  <tr>
                    <td
                      style="
                        padding:7px 0;
                        font-size:14px;
                        color:#7A7065;
                      "
                    >
                      Delivery
                    </td>

                    <td
                      align="right"
                      style="
                        padding:7px 0;
                        font-size:14px;
                        color:${
                          settings.brand.black
                        };
                        font-weight:600;
                      "
                    >
                      ${
                        Number(
                          order.deliveryFee
                        ) > 0
                          ? formatMoney(
                              order.deliveryFee,
                              settings.currency
                            )
                          : "Free"
                      }
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:15px 0 5px;
                        border-top:1px solid #E8E1D8;
                        font-size:17px;
                        font-weight:700;
                        color:${
                          settings.brand.darkGreen
                        };
                      "
                    >
                      Total
                    </td>

                    <td
                      align="right"
                      style="
                        padding:15px 0 5px;
                        border-top:1px solid #E8E1D8;
                        font-size:18px;
                        font-weight:700;
                        color:${
                          settings.brand.darkGreen
                        };
                      "
                    >
                      ${formatMoney(
                        order.total,
                        settings.currency
                      )}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                style="
                  padding:0 30px 30px;
                "
              >
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                >
                  <tr>
                    <td
                      valign="top"
                      width="50%"
                      style="
                        padding:18px;
                        background:#FAF8F4;
                        border-radius:16px;
                      "
                    >
                      <div
                        style="
                          font-size:11px;
                          letter-spacing:1.4px;
                          text-transform:uppercase;
                          color:${
                            settings.brand.softGold
                          };
                          font-weight:700;
                        "
                      >
                        Delivery To
                      </div>

                      <div
                        style="
                          margin-top:9px;
                          font-size:14px;
                          line-height:1.7;
                          color:#665E55;
                        "
                      >
                        ${renderAddress(
                          order
                        )}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        height:12px;
                      "
                    ></td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:18px;
                        background:#FAF8F4;
                        border-radius:16px;
                      "
                    >
                      <div
                        style="
                          font-size:11px;
                          letter-spacing:1.4px;
                          text-transform:uppercase;
                          color:${
                            settings.brand.softGold
                          };
                          font-weight:700;
                        "
                      >
                        Payment
                      </div>

                      <div
                        style="
                          margin-top:9px;
                          font-size:14px;
                          font-weight:700;
                          color:${
                            settings.brand.darkGreen
                          };
                        "
                      >
                        ${escapeHtml(
                          paymentLabel
                        )}
                      </div>

                      ${
                        paymentInstructions
                          ? `
                            <div
                              style="
                                margin-top:6px;
                                font-size:13px;
                                line-height:1.6;
                                color:#756C62;
                              "
                            >
                              ${escapeHtml(
                                paymentInstructions
                              )}
                            </div>
                          `
                          : ""
                      }
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td
                align="center"
                style="
                  padding:28px 30px;
                  background:${
                    settings.brand.darkGreen
                  };
                "
              >
                <div
                  style="
                    font-family:Georgia, 'Times New Roman', serif;
                    color:${
                      settings.brand.beige
                    };
                    font-size:18px;
                    line-height:1.6;
                  "
                >
                  ${escapeHtml(
                    footerMessage
                  )}
                </div>

                ${
                  settings.contact
                    ?.email
                    ? `
                      <div
                        style="
                          margin-top:12px;
                          color:${
                            settings.brand.softGold
                          };
                          font-size:12px;
                        "
                      >
                        ${escapeHtml(
                          settings.contact.email
                        )}
                      </div>
                    `
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
};

const buildPlainText = ({
  order,
  settings,
  intro,
}) => {
  const items = (
    order.items || []
  )
    .map(
      (item) =>
        `${
          item.productSnapshot
            ?.name ||
          "Darb Perfume"
        } x${item.quantity} - ${formatMoney(
          item.lineTotal,
          settings.currency
        )}`
    )
    .join("\n");

  return `
DARB

${intro}

Order ${order.orderNumber}

${items}

Subtotal: ${formatMoney(
    order.subtotal,
    settings.currency
  )}

Discount: ${formatMoney(
    order.discountTotal,
    settings.currency
  )}

Delivery: ${formatMoney(
    order.deliveryFee,
    settings.currency
  )}

Total: ${formatMoney(
    order.total,
    settings.currency
  )}

Payment: ${getMainPaymentLabel(
    order,
    settings
  )}
  `.trim();
};

const sendCustomerOrderPlacedEmail =
  async (
    order,
    settings
  ) => {
    const email =
      order.customerSnapshot
        ?.email
        ?.trim();

    if (!email) {
      return {
        sent: false,
        reason:
          "customer_email_missing",
      };
    }

    const title =
      "Thank you for beginning this journey with us.";

    const intro =
      "We’ve received your Darb order. We’ll keep you updated as it moves along its path.";

    return sendEmail({
      to: email,

      subject: `Darb order ${order.orderNumber} received`,

      replyTo:
        settings.contact
          ?.email ||
        undefined,

      text: buildPlainText({
        order,
        settings,
        intro,
      }),

      html: renderEmailLayout({
        settings,
        title,
        intro,
        order,

        footerMessage:
          "A memory in every step.",
      }),
    });
  };

const sendAdminNewOrderEmail =
  async (
    order,
    settings
  ) => {
    const adminEmail =
      process.env
        .ADMIN_NOTIFICATION_EMAIL
        ?.trim() ||
      settings.contact?.email ||
      process.env.GMAIL_USER;

    if (!adminEmail) {
      return {
        sent: false,
        reason:
          "admin_email_missing",
      };
    }

    const customerName =
      order.customerSnapshot
        ?.name ||
      "Customer";

    const title =
      "A new Darb order has arrived.";

    const intro =
      `${customerName} placed order ${order.orderNumber}. Review it in the Darb admin dashboard.`;

    return sendEmail({
      to: adminEmail,

      subject: `New Darb order ${order.orderNumber}`,

      text: buildPlainText({
        order,
        settings,
        intro,
      }),

      html: renderEmailLayout({
        settings,
        title,
        intro,
        order,

        footerMessage:
          "New order received.",
      }),
    });
  };

const sendOrderPlacedEmails =
  async (orderDocument) => {
    if (!orderDocument) return;

    const order =
      typeof orderDocument.toObject ===
      "function"
        ? orderDocument.toObject()
        : orderDocument;

    const settings =
      await getSettings();

    const results =
      await Promise.allSettled([
        sendCustomerOrderPlacedEmail(
          order,
          settings
        ),

        sendAdminNewOrderEmail(
          order,
          settings
        ),
      ]);

    results.forEach(
      (result) => {
        if (
          result.status ===
          "rejected"
        ) {
          console.error(
            "Darb order email failed:",
            result.reason?.message ||
              result.reason
          );
        }
      }
    );

    return results;
  };

const sendOrderStatusEmail =
  async (
    orderDocument
  ) => {
    if (!orderDocument) return;

    const order =
      typeof orderDocument.toObject ===
      "function"
        ? orderDocument.toObject()
        : orderDocument;

    const email =
      order.customerSnapshot
        ?.email
        ?.trim();

    if (!email) {
      return {
        sent: false,
        reason:
          "customer_email_missing",
      };
    }

    const content =
      ORDER_STATUS_CONTENT[
        order.orderStatus
      ];

    if (!content) {
      return {
        sent: false,
        reason:
          "status_email_not_required",
      };
    }

    const settings =
      await getSettings();

    return sendEmail({
      to: email,

      subject:
        `${content.subject} — ${order.orderNumber}`,

      replyTo:
        settings.contact
          ?.email ||
        undefined,

      text: buildPlainText({
        order,
        settings,

        intro:
          content.message,
      }),

      html: renderEmailLayout({
        settings,

        title:
          content.title,

        intro:
          content.message,

        order,

        footerMessage:
          order.orderStatus ===
          "cancelled"
            ? "We hope another path brings you back to Darb."
            : "We’ll keep you updated as your order continues its path.",
      }),
    });
  };

module.exports = {
  sendOrderPlacedEmails,
  sendOrderStatusEmail,
};
