const {
  previewPromotionEmail,
  sendPromotionEmail,
  sendPromotionTestEmail,
} = require("../services/promotionEmail.service");
const { unsubscribeMarketingToken } = require("../services/marketingUnsubscribe.service");

const respondError = (res, error) => res.status(error.statusCode || 500).json({
  success: false,
  message: error.statusCode ? error.message : "Unable to process the promotional email request.",
});

const preview = async (req, res) => {
  try {
    const data = await previewPromotionEmail(req.body || {});
    return res.json({ success: true, data });
  } catch (error) { return respondError(res, error); }
};

const sendTest = async (req, res) => {
  try {
    const data = await sendPromotionTestEmail(req.body || {});
    return res.json({ success: true, data, message: data.sent ? "Test email accepted for delivery." : "Test email could not be sent because mail is not configured." });
  } catch (error) { return respondError(res, error); }
};

const sendLive = async (req, res) => {
  try {
    const data = await sendPromotionEmail({ ...(req.body || {}), adminUserId: req.user._id });
    return res.json({ success: true, data, message: `Sent or accepted for delivery to ${data.sentCount} opted-in customers.` });
  } catch (error) { return respondError(res, error); }
};

const unsubscribe = async (req, res) => {
  try {
    await unsubscribeMarketingToken(req.body?.token);
    return res.json({ success: true, message: "You have been unsubscribed from Darb promotional emails." });
  } catch {
    return res.status(400).json({ success: false, message: "This unsubscribe link is invalid or has expired." });
  }
};

module.exports = { preview, sendLive, sendTest, unsubscribe };
