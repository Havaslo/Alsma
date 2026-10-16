export const LEGAL_DOCUMENT_VERSION = "2026-10-15";

export const createLegalAcceptance = (input: {
  readonly action: string;
  readonly pageUrl: string;
  readonly purpose: string;
  readonly type: string;
}) => ({
  ...input,
  acceptedAt: new Date().toISOString(),
  version: LEGAL_DOCUMENT_VERSION,
});
