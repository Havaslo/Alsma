import { createHash, randomUUID } from "node:crypto";

export class MangoTransferError extends Error {
  readonly diagnostic: string;

  constructor(diagnostic: string) {
    super(diagnostic);
    this.name = "MangoTransferError";
    this.diagnostic = diagnostic;
  }
}

const defaultTransferSleep = (delay: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, delay));

const mangoResultCode = (value: unknown): string | undefined => {
  if (typeof value === "number" && Number.isInteger(value))
    return String(value);
  if (typeof value === "string" && /^\d{1,6}$/u.test(value.trim()))
    return value.trim();
  return undefined;
};

const mangoHttpStatus = (status: number): string =>
  Number.isInteger(status) && status >= 100 && status <= 599
    ? String(status)
    : "unknown";

export const isTimeoutError = (error: unknown) =>
  error instanceof Error &&
  (error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    /timed?\s*out|timeout/iu.test(error.message));

export const selectMangoTransferInitiator = (call: {
  readonly mangoTransferInitiator?: string | null;
}) => {
  const initiator = call.mangoTransferInitiator?.trim();
  if (!initiator || initiator === "from.number" || initiator === "to.number")
    return undefined;
  return initiator;
};

export const buildMangoTransferPayload = ({
  callId,
  destination,
  initiator,
  commandId = `alsma-transfer-${randomUUID()}`,
}: {
  readonly callId: string;
  readonly destination: string;
  readonly initiator: string;
  readonly commandId?: string;
}) => ({
  command_id: commandId,
  call_id: callId,
  method: "blind",
  to_number: destination,
  initiator,
});

export const transferMangoCall = async ({
  apiKey,
  callId,
  destination,
  initiator,
  salt,
  commandId,
  sleep = defaultTransferSleep,
  readResult,
}: {
  readonly apiKey: string;
  readonly callId: string;
  readonly destination: string;
  readonly initiator: string;
  readonly salt: string;
  readonly commandId: string;
  readonly sleep?: (delay: number) => Promise<void>;
  readonly readResult: () => Promise<{
    transferState: string | null;
    outcome: string | null;
  } | null>;
}) => {
  const payload = buildMangoTransferPayload({
    callId,
    commandId,
    destination,
    initiator,
  });
  const json = JSON.stringify(payload);
  const sign = createHash("sha256")
    .update(`${apiKey}${json}${salt}`)
    .digest("hex");
  let response: Response;
  try {
    response = await fetch(
      "https://app.mango-office.ru/vpbx/commands/transfer",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ vpbx_api_key: apiKey, sign, json }),
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (error) {
    if (isTimeoutError(error))
      throw new MangoTransferError("mango_transfer_timeout");
    throw new MangoTransferError("mango_transfer_command_error");
  }
  if (!response.ok)
    throw new MangoTransferError(
      `mango_transfer_command_http_${mangoHttpStatus(response.status)}`,
    );
  let accepted: { result?: number | string };
  try {
    accepted = (await response.json()) as { result?: number | string };
  } catch {
    throw new MangoTransferError("mango_transfer_command_result_unknown");
  }
  const commandResult = mangoResultCode(accepted.result);
  if (commandResult !== "0")
    throw new MangoTransferError(
      commandResult
        ? `mango_transfer_command_result_${commandResult}`
        : "mango_transfer_command_result_unknown",
    );
  // /result/transfer is a signed callback FROM Mango, not a polling API.
  // Read the persisted callback so preview/production replicas share results.
  for (const delay of [0, 250, 500, 1_000, 2_000, 4_000]) {
    if (delay) await sleep(delay);
    const result = await readResult();
    if (result?.transferState === "accepted")
      return { commandId, state: "accepted" as const };
    if (result?.transferState === "failed")
      throw new MangoTransferError(
        result.outcome ?? "mango_transfer_result_unknown",
      );
  }
  // The PBX accepted the command. A delayed callback must not trigger a
  // second transfer or a false failure announcement to the caller.
  return { commandId, state: "requested" as const };
};
