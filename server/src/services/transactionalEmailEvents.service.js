const normalizeTransactionalEmail = (value = "") => {
  const email = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
};

const sanitizeEmailReason = (value = "") =>
  String(value || "").trim().replace(/\s+/g, " ").slice(0, 500);

const getRegistrationEmailPlan = ({ email = "" } = {}) => {
  const customerEmail = normalizeTransactionalEmail(email);
  return [
    ...(customerEmail
      ? [{ type: "customer_welcome", audience: "customer", to: customerEmail }]
      : []),
    { type: "admin_signup", audience: "admin" },
  ];
};

const getPaymentProofSubmissionPlan = ({ email = "", isResubmission = false } = {}) => {
  const customerEmail = normalizeTransactionalEmail(email);
  const suffix = isResubmission ? "resubmitted" : "submitted";
  return [
    ...(customerEmail
      ? [{ type: `customer_proof_${suffix}`, audience: "customer", to: customerEmail }]
      : []),
    { type: `admin_proof_${suffix}`, audience: "admin" },
  ];
};

const getPaymentProofDecisionPlan = ({
  action,
  email = "",
  autoConfirmed = false,
  previousProofStatus = "",
  reason = "",
} = {}) => {
  const customerEmail = normalizeTransactionalEmail(email);
  if (!customerEmail) return [];
  if (
    (action === "approve" && previousProofStatus === "approved") ||
    (action === "reject" && previousProofStatus === "rejected")
  ) {
    return [];
  }
  if (action === "approve") {
    return [{
      type: autoConfirmed ? "customer_proof_approved_confirmed" : "customer_proof_approved",
      audience: "customer",
      to: customerEmail,
    }];
  }
  if (action === "reject") {
    return [{
      type: "customer_proof_rejected",
      audience: "customer",
      to: customerEmail,
      reason: sanitizeEmailReason(reason),
    }];
  }
  return [];
};

const getReviewSubmissionPlan = ({ source, email = "" } = {}) => {
  if (source !== "customer") return [];
  const customerEmail = normalizeTransactionalEmail(email);
  return [
    ...(customerEmail
      ? [{ type: "customer_review_received", audience: "customer", to: customerEmail }]
      : []),
    { type: "admin_review_pending", audience: "admin" },
  ];
};

const getReviewApprovalPlan = ({ source, email = "", previousStatus, nextStatus } = {}) => {
  const customerEmail = normalizeTransactionalEmail(email);
  if (
    source !== "customer" ||
    !customerEmail ||
    previousStatus === "approved" ||
    nextStatus !== "approved"
  ) {
    return [];
  }
  return [{ type: "customer_review_approved", audience: "customer", to: customerEmail }];
};

module.exports = {
  getPaymentProofDecisionPlan,
  getPaymentProofSubmissionPlan,
  getRegistrationEmailPlan,
  getReviewApprovalPlan,
  getReviewSubmissionPlan,
  normalizeTransactionalEmail,
  sanitizeEmailReason,
};
