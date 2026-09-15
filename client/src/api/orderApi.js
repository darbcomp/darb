import api from "./axiosInstance";

const buildPaymentProofFormData = ({
  file,
  orderNumber,
  phone,
  senderName,
} = {}) => {
  const formData =
    new FormData();

  if (file) {
    const upload = file.blob || file;
    formData.append("paymentProof", upload, file.name || "payment-proof");
  }

  if (orderNumber) {
    formData.append(
      "orderNumber",
      orderNumber
    );
  }

  if (phone) {
    formData.append(
      "phone",
      phone
    );
  }

  if (senderName) {
    formData.append(
      "senderName",
      senderName
    );
  }

  return formData;
};

/* =========================
   CHECKOUT
========================= */

export const previewOrder =
  async (payload) => {
    const { data } =
      await api.post(
        "/orders/preview",
        payload
      );

    return data;
  };

export const createOrder =
  async (payload, { uploadDiagnosticId = "", requestId = "" } = {}) => {
    const { data } =
      await api.post(
        "/orders",
        payload,
        uploadDiagnosticId ? {
          headers: {
            "X-Darb-Upload-Diagnostic-Id": uploadDiagnosticId,
            ...(requestId ? { "X-Darb-Order-Request-Id": requestId } : {}),
          },
        } : undefined
      );

    return data;
  };

/* =========================
   PUBLIC TRACKING
========================= */

export const trackOrder =
  async (payload) => {
    const { data } =
      await api.post(
        "/orders/track",
        payload
      );

    return data;
  };

export const getGuestPaymentProofStatus =
  async (payload) => {
    const { data } =
      await api.post(
        "/orders/track/payment-proof/status",
        payload
      );

    return data;
  };

export const resubmitGuestPaymentProof =
  async ({
    orderNumber,
    phone,
    file,
    senderName,
  }) => {
    const payload =
      buildPaymentProofFormData(
        {
          file,
          orderNumber,
          phone,
          senderName,
        }
      );

    const { data } =
      await api.post(
        "/orders/track/payment-proof",
        payload,
        file?.diagnosticId ? { headers: { "X-Darb-Upload-Diagnostic-Id": file.diagnosticId } } : undefined
      );

    return data;
  };

/* =========================
   CUSTOMER ACCOUNT
========================= */

export const getMyOrders =
  async () => {
    const { data } =
      await api.get(
        "/orders/mine"
      );

    return data;
  };

export const getMyOrderById =
  async (orderId) => {
    const { data } =
      await api.get(
        `/orders/mine/${orderId}`
      );

    return data;
  };

export const resubmitMyPaymentProof =
  async ({
    orderId,
    file,
    senderName,
  }) => {
    const payload =
      buildPaymentProofFormData(
        {
          file,
          senderName,
        }
      );

    const { data } =
      await api.post(
        `/orders/mine/${orderId}/payment-proof`,
        payload,
        file?.diagnosticId ? { headers: { "X-Darb-Upload-Diagnostic-Id": file.diagnosticId } } : undefined
      );

    return data;
  };
