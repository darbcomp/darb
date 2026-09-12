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

const safeErrorCategory = (error) => {
  const name = String(error?.name || "").toLowerCase();
  if (name === "notreadableerror") return "not_readable";
  if (name === "aborterror") return "aborted";
  if (name === "securityerror") return "security";
  return "unknown";
};

const emitPhase = (onPhase, phase, details = {}) => {
  try {
    onPhase?.(phase, details);
  } catch {
    // Observability must never affect file selection.
  }
};

const readWithFileReader = (file) => new Promise((resolve, reject) => {
  if (typeof FileReader === "undefined") {
    reject(new Error("Selected file reading is unavailable."));
    return;
  }
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error("Selected file could not be read."));
  reader.onabort = () => {
    const error = new Error("Selected file reading was cancelled.");
    error.name = "AbortError";
    reject(error);
  };
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

export async function readSelectedFileBytes(file, { onPhase } = {}) {
  if (!file) throw new Error("Selected file is required.");
  const startedAt = Date.now();
  emitPhase(onPhase, "byte_read_started");
  if (typeof file.arrayBuffer === "function") {
    try {
      const bytes = await file.arrayBuffer();
      emitPhase(onPhase, "byte_read_success", { durationMs: Date.now() - startedAt });
      return bytes;
    } catch (error) {
      emitPhase(onPhase, "byte_read_arraybuffer_failed", { errorCategory: safeErrorCategory(error) });
      // Some Android content providers fail through one reader but allow the other.
    }
  }
  emitPhase(onPhase, "byte_read_filereader_started");
  try {
    const bytes = await readWithFileReader(file);
    emitPhase(onPhase, "byte_read_success", { durationMs: Date.now() - startedAt });
    return bytes;
  } catch (error) {
    emitPhase(onPhase, "byte_read_failed", { errorCategory: safeErrorCategory(error) });
    throw error;
  }
}

export async function snapshotSelectedImageFile(file, { onPhase } = {}) {
  const type = getSelectedImageMimeType(file);
  if (!type) throw new Error("Unsupported selected image type.");

  const bytes = await readSelectedFileBytes(file, { onPhase });
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

  emitPhase(onPhase, "snapshot_success");
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

export function prepareImagePickerInput(input) {
  if (input) input.value = "";
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
