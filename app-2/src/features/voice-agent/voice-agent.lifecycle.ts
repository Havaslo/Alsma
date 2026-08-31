import type { MangoProviderEvent } from "./voice-agent.mango.js";
import type { VoiceAgentRepository } from "./voice-agent.repository.js";

type CompleteCall = (
  id: string,
  outcome?: string,
  recordingUrl?: string,
  recordingObjectId?: string,
) => Promise<unknown>;
type MangoCallEvent = Extract<MangoProviderEvent, { kind: "call" }>["event"];
type MangoSummaryEvent = Extract<
  MangoProviderEvent,
  { kind: "summary" }
>["event"];
type MangoRecordingEvent = Extract<
  MangoProviderEvent,
  { kind: "recording" }
>["event"];
type MangoRecordingAddedEvent = Extract<
  MangoProviderEvent,
  { kind: "recording_added" }
>["event"];

export const createMangoEventHandler = ({
  completeCall,
  repository,
}: {
  readonly completeCall: CompleteCall;
  readonly repository: VoiceAgentRepository;
}) => {
  const handleNormalized = async (
    event: Extract<MangoProviderEvent, { kind: "normalized" }>["event"],
  ) => {
    const existing = await repository.findByProviderCallId(event.callId);
    const call =
      existing ??
      (await repository.createCall({
        providerCallId: event.callId,
        callerPhone: event.callerPhone,
      }));
    if (event.transcript) {
      for (const segment of event.transcript)
        await repository.appendTranscript(call.id, segment);
    }
    if (
      ["completed", "hangup", "ended", "failed"].includes(
        event.event.toLowerCase(),
      )
    ) {
      const completed = await completeCall(
        call.id,
        event.status ?? event.event,
        event.recordingUrl,
      );
      if (!existing || existing.status !== "completed")
        await repository.createRequestForCall(
          call.id,
          event.extracted ?? {},
          event.transcript ?? [],
        );
      return completed;
    }
    return call;
  };

  const callForEvent = async (event: {
    callId: string;
    callerPhone?: string;
    entryId?: string;
    sipCallId?: string;
  }) => {
    const existing =
      (event.sipCallId
        ? await repository.findBySipCallId(event.sipCallId)
        : null) ??
      (await repository.findByMangoCallId(event.callId)) ??
      (event.entryId
        ? await repository.findByProviderEntryId(event.entryId)
        : null) ??
      (await repository.findByProviderCallId(event.callId));
    return (
      existing ??
      (await repository.ensureCall({
        callerPhone: event.callerPhone,
        provider: "mango",
        providerCallId: event.callId,
        providerEntryId: event.entryId,
        sipCallId: event.sipCallId,
      }))
    );
  };

  const handleCall = async (event: MangoCallEvent) => {
    const linkedOpenAiCall = event.sip_call_id
      ? await repository.findByProviderCallId(`openai:${event.sip_call_id}`)
      : null;
    const call =
      linkedOpenAiCall ??
      (await callForEvent({
        callId: event.call_id,
        callerPhone: event.from?.number,
        entryId: event.entry_id,
        sipCallId: event.sip_call_id,
      }));
    if (
      event.seq !== undefined &&
      call.providerSequence !== null &&
      call.providerSequence !== undefined &&
      event.seq < call.providerSequence
    )
      return call;
    const state = event.call_state.toLowerCase();
    const disconnected = state === "disconnected";
    return repository.updateCall(call.id, {
      callerPhone: event.from?.number,
      sipCallId: event.sip_call_id,
      mangoCallId: event.call_id,
      mangoTransferInitiator: event.from?.number
        ? "from.number"
        : event.to?.number
          ? "to.number"
          : undefined,
      endedAt: disconnected ? new Date(event.timestamp * 1_000) : undefined,
      providerEntryId: event.entry_id,
      providerSequence: event.seq,
      startedAt: new Date(event.timestamp * 1_000),
      status: disconnected
        ? "completed"
        : state === "onhold"
          ? "on_hold"
          : "active",
      ...(event.disconnect_reason === undefined
        ? {}
        : { outcome: `disconnect_reason:${String(event.disconnect_reason)}` }),
    });
  };

  const handleSummary = async (event: MangoSummaryEvent) => {
    const call =
      (event.sip_call_id
        ? await repository.findBySipCallId(event.sip_call_id)
        : null) ?? (await repository.findByProviderEntryId(event.entry_id));
    const target =
      call ??
      (await repository.ensureCall({
        callerPhone: event.from?.number,
        provider: "mango",
        providerCallId: `mango:entry:${event.entry_id}`,
        providerEntryId: event.entry_id,
      }));
    await repository.updateCall(target.id, {
      callerPhone: event.from?.number,
      durationSec: Math.max(0, event.end_time - event.create_time),
      endedAt: new Date(event.end_time * 1_000),
      outcome: event.entry_result === 1 ? "completed" : "missed",
      providerEntryId: event.entry_id,
      startedAt: new Date(event.create_time * 1_000),
      status: "completed",
    });
    return completeCall(target.id, "summary");
  };

  const handleRecording = async (event: MangoRecordingEvent) => {
    const call = await callForEvent({
      callId: event.call_id,
      entryId: event.entry_id,
    });
    return repository.updateCall(call.id, {
      providerEntryId: event.entry_id,
      providerRecordingId: event.recording_id,
      recordingStatus: "pending",
    });
  };

  const handleRecordingAdded = async (event: MangoRecordingAddedEvent) => {
    const call =
      (await repository.findByProviderEntryId(event.entry_id)) ??
      (await repository.ensureCall({
        provider: "mango",
        providerCallId: `mango:entry:${event.entry_id}`,
        providerEntryId: event.entry_id,
      }));
    return repository.updateCall(call.id, {
      providerRecordingId: event.recording_id,
      recordingStatus: "pending",
    });
  };

  const handle = async (providerEvent: MangoProviderEvent) => {
    if (providerEvent.kind === "normalized")
      return handleNormalized(providerEvent.event);
    if (providerEvent.kind === "call") return handleCall(providerEvent.event);
    if (providerEvent.kind === "summary")
      return handleSummary(providerEvent.event);
    if (providerEvent.kind === "recording")
      return handleRecording(providerEvent.event);
    return handleRecordingAdded(providerEvent.event);
  };

  return { handle };
};
