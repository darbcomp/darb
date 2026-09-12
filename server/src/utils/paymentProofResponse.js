const sanitizePaymentProofForClient = (paymentProof, { includeSenderName = false } = {}) => {
  if (!paymentProof) return { status: "not_required" };

  return {
    status: paymentProof.status || "not_required",
    originalName: paymentProof.originalName || "",
    bytes: Number(paymentProof.bytes) || 0,
    width: Number(paymentProof.width) || 0,
    height: Number(paymentProof.height) || 0,
    uploadedAt: paymentProof.uploadedAt || null,
    reviewedAt: paymentProof.reviewedAt || null,
    rejectionReason: paymentProof.rejectionReason || "",
    ...(includeSenderName ? { senderName: paymentProof.senderName || "" } : {}),
  };
};

module.exports = { sanitizePaymentProofForClient };
