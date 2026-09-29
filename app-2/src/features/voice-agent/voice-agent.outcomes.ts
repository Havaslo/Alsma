export const preserveTransferDiagnostic = (
  call: {
    readonly outcome?: string | null;
    readonly transferState?: string | null;
  },
  fallback?: string,
) =>
  call.transferState === "failed" &&
  typeof call.outcome === "string" &&
  call.outcome.startsWith("mango_transfer_")
    ? call.outcome
    : fallback;
