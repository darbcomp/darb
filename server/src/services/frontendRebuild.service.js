const DEPLOY_HOOK_ENV_NAME = "CLOUDFLARE_FRONTEND_DEPLOY_HOOK_URL";
const DEFAULT_TIMEOUT_MS = 3000;

const normalizeReason = (reason) => {
  const normalized = String(reason || "content-updated").trim().toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(normalized) ? normalized : "content-updated";
};

const warn = (logger, message) => {
  try {
    logger?.warn?.(message);
  } catch {
    // Logging must never affect the originating admin operation.
  }
};

const triggerFrontendRebuild = async (
  reason,
  {
    env = process.env,
    fetchImpl = global.fetch,
    logger = console,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = {}
) => {
  const logicalReason = normalizeReason(reason);
  const hookUrl = String(env?.[DEPLOY_HOOK_ENV_NAME] || "").trim();

  if (!hookUrl) {
    return { triggered: false, outcome: "not-configured" };
  }

  if (typeof fetchImpl !== "function") {
    warn(logger, `[frontend-rebuild] ${logicalReason}: request unavailable; rebuild was not triggered.`);
    return { triggered: false, outcome: "request-unavailable" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  timeout.unref?.();

  try {
    const response = await fetchImpl(hookUrl, {
      method: "POST",
      signal: controller.signal,
    });

    if (!response?.ok) {
      const status = Number.isInteger(response?.status) ? ` (HTTP ${response.status})` : "";
      warn(logger, `[frontend-rebuild] ${logicalReason}: deploy hook rejected the request${status}.`);
      return { triggered: false, outcome: "non-success-response" };
    }

    return { triggered: true, outcome: "accepted" };
  } catch (error) {
    const outcome = error?.name === "AbortError" ? "timed out" : "request failed";
    warn(
      logger,
      `[frontend-rebuild] ${logicalReason}: deploy hook ${outcome}; admin change remains successful.`
    );
    return { triggered: false, outcome: "request-error" };
  } finally {
    clearTimeout(timeout);
  }
};

const scheduleFrontendRebuild = (reason, options) => {
  setImmediate(() => {
    void triggerFrontendRebuild(reason, options).catch(() => {
      // Defensive containment: triggerFrontendRebuild is already failure-safe.
    });
  });
};

module.exports = {
  DEPLOY_HOOK_ENV_NAME,
  triggerFrontendRebuild,
  scheduleFrontendRebuild,
};
