export const LEGAL_DOCUMENT_VERSION = "2026-10-15";

export const currentPageUrl = () =>
  `${window.location.origin}${window.location.pathname}`;

export const leadConsentPayload = (
  marketingChannels: readonly string[] = [],
) => ({
  marketingChannels: [...marketingChannels],
  pageUrl: currentPageUrl(),
  personalDataAccepted: true as const,
});
