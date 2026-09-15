import {
  type AmaziWebhookEvent,
  amaziProviderCallId,
} from "./voice-agent.amazi.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";

export const createAmaziLifecycle = (repository: VoiceAgentRepository) => {
  const ensureAmaziCall = async (input: {
    readonly callerPhone?: string;
    readonly occurredAt?: Date;
    readonly sessionId: string;
  }) => {
    const providerCallId = amaziProviderCallId(input.sessionId);
    const existing = await repository.findByProviderCallId(providerCallId);
    const correlated =
      !existing && input.callerPhone
        ? await repository.findActiveAmaziCallByCallerPhone(
            input.callerPhone,
            input.occurredAt,
          )
        : null;
    const call =
      correlated ??
      (await repository.ensureCall({
        callerPhone: input.callerPhone,
        provider: "amazi",
        providerCallId,
      }));
    if (correlated)
      return repository.updateCall(call.id, {
        callerPhone: input.callerPhone,
        provider: "amazi",
        providerCallId,
      });
    if (
      input.callerPhone ||
      input.occurredAt ||
      call.provider !== "amazi" ||
      call.providerCallId !== providerCallId
    )
      return repository.updateCall(call.id, {
        ...(input.callerPhone ? { callerPhone: input.callerPhone } : {}),
        ...(input.occurredAt ? { startedAt: input.occurredAt } : {}),
        provider: "amazi",
        providerCallId,
      });
    return call;
  };

  const claimAmaziWebhook = (event: AmaziWebhookEvent) =>
    repository.claimWebhookEvent({
      callId: event.sessionId,
      eventKey: event.eventKey,
      provider: "amazi",
    });

  const handleAmaziWebhook = async (event: AmaziWebhookEvent) => {
    const providerCallId = amaziProviderCallId(event.sessionId);
    const existing = await repository.findByProviderCallId(providerCallId);
    const correlated =
      !existing && event.callerPhone
        ? await repository.findActiveAmaziCallByCallerPhone(
            event.callerPhone,
            event.occurredAt,
          )
        : null;
    const call =
      existing ??
      (correlated
        ? await repository.updateCall(correlated.id, {
            callerPhone: event.callerPhone,
            provider: "amazi",
            providerCallId,
          })
        : await repository.ensureCall({
            callerPhone: event.callerPhone,
            provider: "amazi",
            providerCallId,
          }));
    if (
      event.eventType === "voice.call.started" ||
      event.eventType === "voice.call.connected"
    ) {
      if (!["completed", "failed"].includes(call.status))
        return repository.updateCall(call.id, {
          ...(event.callerPhone ? { callerPhone: event.callerPhone } : {}),
          ...(event.occurredAt ? { startedAt: event.occurredAt } : {}),
          status: "active",
        });
      return call;
    }
    return repository.updateCall(call.id, {
      endedAt: event.occurredAt ?? new Date(),
      outcome:
        event.eventType === "voice.call.failed"
          ? "amazi_failed"
          : "amazi_completed",
      status: event.eventType === "voice.call.failed" ? "failed" : "completed",
    });
  };

  return {
    claimAmaziWebhook,
    ensureAmaziCall,
    handleAmaziWebhook,
    releaseAmaziWebhook: (eventKey: string) =>
      repository.releaseWebhookEvent(eventKey),
  };
};
