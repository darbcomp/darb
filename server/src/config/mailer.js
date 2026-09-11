const nodemailer = require("nodemailer");

const isMailerConfigured = () =>
  Boolean(
    process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD
  );

let transporter = null;

const getTransporter = () => {
  if (!isMailerConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",

      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  return transporter;
};

const sendEmail = async ({
  to,
  subject,
  html,
  text,
  replyTo,
}) => {
  if (!to) {
    return {
      sent: false,
      reason: "missing_recipient",
    };
  }

  const mailer = getTransporter();

  if (!mailer) {
    console.warn(
      "Email skipped because Gmail credentials are not configured."
    );

    return {
      sent: false,
      reason: "mailer_not_configured",
    };
  }

  const fromName =
    process.env.EMAIL_FROM_NAME?.trim() ||
    "Darb";

  const result = await mailer.sendMail({
    from: {
      name: fromName,
      address: process.env.GMAIL_USER,
    },

    to,

    subject,

    text,

    html,

    replyTo:
      replyTo ||
      process.env.GMAIL_USER,
  });

  return {
    sent: true,
    messageId: result.messageId,
  };
};

module.exports = {
  isMailerConfigured,
  sendEmail,
};
