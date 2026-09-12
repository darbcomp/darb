const SELECTED_IMAGE_MIME_TYPES = new Map([
  ["image/jpeg", "image/jpeg"],
  ["image/jpg", "image/jpeg"],
  ["image/png", "image/png"],
  ["image/webp", "image/webp"],
]);

const SELECTED_IMAGE_EXTENSION_TYPES = new Map([
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["png", "image/png"],
  ["webp", "image/webp"],
]);

const readWithFileReader = (file) => new Promise((resolve, reject) => {
  if (typeof FileReader === "undefined") {
    reject(new Error("Selected file reading is unavailable."));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Selected file could not be read."));
  reader.onabort = () => reject(new Error("Selected file reading was cancelled."));
  reader.readAsArrayBuffer(file);
});

export function getSelectedImageMimeType(file) {
  const reportedType = String(file?.type || "").trim().toLowerCase();
  const normalizedReportedType = SELECTED_IMAGE_MIME_TYPES.get(reportedType);
  if (normalizedReportedType) return normalizedReportedType;
  if (reportedType && reportedType !== "application/octet-stream") return "";

  const extension = String(file?.name || "").trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  return SELECTED_IMAGE_EXTENSION_TYPES.get(extension) || "";
}

export async function readSelectedFileBytes(file) {
  if (!file) throw new Error("Selected file is required.");
  if (typeof file.arrayBuffer === "function") {
    try {
      return await file.arrayBuffer();
    } catch {
      // Some Android content providers fail through one reader but allow the other.
    }
  }
  return readWithFileReader(file);
}

export async function snapshotSelectedImageFile(file) {
  const type = getSelectedImageMimeType(file);
  if (!type) throw new Error("Unsupported selected image type.");

  const bytes = await readSelectedFileBytes(file);
  const name = String(file.name || "payment-proof").trim() || "payment-proof";
  const lastModified = Number(file.lastModified) || Date.now();
  let blob;

  if (typeof File === "function") {
    try {
      blob = new File([bytes], name, { type, lastModified });
    } catch {
      blob = null;
    }
  }
  if (!blob) blob = new Blob([bytes], { type });

  return { blob, name, type, size: blob.size, lastModified };
}

export async function snapshotSelectedImageBeforeReset(file, resetPicker) {
  try {
    return await snapshotSelectedImageFile(file);
  } finally {
    try {
      resetPicker?.();
    } catch {
      // A detached/unmounted input must not invalidate an already-copied snapshot.
    }
  }
}

export function createObjectUrlManager(urlApi = URL) {
  let currentUrl = "";
  const clear = () => {
    if (!currentUrl) return;
    urlApi.revokeObjectURL(currentUrl);
    currentUrl = "";
  };
  return {
    clear,
    replace(blob) {
      clear();
      currentUrl = urlApi.createObjectURL(blob);
      return currentUrl;
    },
  };
}
