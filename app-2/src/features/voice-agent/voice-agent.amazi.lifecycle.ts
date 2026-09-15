import {
  type AmaziWebhookEvent,
  amaziProviderCallId,
} from "./voice-agent.amazi.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";

type VoiceCall = NonNullable<
  Awaited<ReturnType<VoiceAgentRepository["findCall"]>>
>;

export const createAmaziLifecycle = (repository: VoiceAgentRepository) => {
  const findAmaziCorrelation = async (input: {
    readonly allowMangoTimeFallback: boolean;
    readonly callerPhone?: string;
    readonly occurredAt?: Date;
    readonly providerCallId: string;
  }) => {
    const existing = await repository.findByProviderCallId(
      input.providerCallId,
    );
    if (existing) return existing;

    const byPhone = input.callerPhone
      ? await repository.findActiveAmaziCallByCallerPhone(
          input.callerPhone,
          input.occurredAt,
        )
      : null;
    if (byPhone) return byPhone;

    return input.allowMangoTimeFallback && input.occurredAt
      ? repository.findUniqueMangoCallNear(input.occurredAt)
      : null;
  };

  const updateAmaziIdentity = async (
    call: VoiceCall,
    input: {
      readonly callerPhone?: string;
      readonly occurredAt?: Date;
      readonly providerCallId: string;
    },
  ) => {
    return repository.updateCall(call.id, {
      ...(input.callerPhone ? { callerPhone: input.callerPhone } : {}),
      ...(input.occurredAt ? { startedAt: input.occurredAt } : {}),
      ...(call.mangoCallId ? { mangoCallId: call.mangoCallId } : {}),
      ...(call.mangoTransferInitiator
        ? { mangoTransferInitiator: call.mangoTransferInitiator }
        : {}),
      provider: "amazi",
      providerCallId: input.providerCallId,
    });
  };

  const ensureAmaziCall = async (input: {
    readonly callerPhone?: string;
    readonly occurredAt?: Date;
    readonly sessionId: string;
  }) => {
    const providerCallId = amaziProviderCallId(input.sessionId);
    const correlated = await findAmaziCorrelation({
      allowMangoTimeFallback: true,
      callerPhone: input.callerPhone,
      occurredAt: input.occurredAt,
      providerCallId,
    });
    const call =
      correlated ??
      (await repository.ensureCall({
        callerPhone: input.callerPhone,
        provider: "amazi",
        providerCallId,
      }));
    if (correlated)
      return updateAmaziIdentity(call, { ...input, providerCallId });
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
    const allowMangoTimeFallback =
      event.eventType === "voice.call.started" ||
      event.eventType === "voice.call.connected";
    const correlated = await findAmaziCorrelation({
      allowMangoTimeFallback,
      callerPhone: event.callerPhone,
      occurredAt: event.occurredAt,
      providerCallId,
    });
    const call =
      correlated ??
      (await repository.ensureCall({
        callerPhone: event.callerPhone,
        provider: "amazi",
        providerCallId,
      }));
    const identifiedCall = correlated
      ? await updateAmaziIdentity(call, {
          callerPhone: event.callerPhone,
          occurredAt: event.occurredAt,
          providerCallId,
        })
      : call;
    if (
      event.eventType === "voice.call.started" ||
      event.eventType === "voice.call.connected"
    ) {
      if (!["completed", "failed"].includes(identifiedCall.status))
        return repository.updateCall(identifiedCall.id, {
          ...(event.callerPhone ? { callerPhone: event.callerPhone } : {}),
          ...(event.occurredAt ? { startedAt: event.occurredAt } : {}),
          status: "active",
        });
      return identifiedCall;
    }
    return repository.updateCall(identifiedCall.id, {
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
