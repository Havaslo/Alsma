import { connect } from "node:tls";

type MailConfig = { readonly email: string; readonly password: string };

type SmtpSocket = ReturnType<typeof connect>;

const readResponse = (socket: SmtpSocket): Promise<string> =>
  new Promise((resolve, reject) => {
    let text = "";
    const onData = (chunk: Buffer) => {
      text += chunk.toString();
      if (/(?:^|\r?\n)\d{3} /.test(text)) {
        cleanup();
        resolve(text);
      }
    };
    const onError = () => {
      cleanup();
      reject(new Error("SMTP connection failed."));
    };
    const onClose = () => {
      cleanup();
      reject(new Error("SMTP connection closed unexpectedly."));
    };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    socket.on("data", onData);
    socket.once("error", onError);
    socket.once("close", onClose);
  });

const responseCode = (response: string): number | null => {
  const matches = [...response.matchAll(/(?:^|\r?\n)(\d{3}) /g)];
  const lastMatch = matches.at(-1);
  return lastMatch ? Number(lastMatch[1]) : null;
};

const expectResponse = (response: string, expectedCodes: readonly number[]) => {
  const code = responseCode(response);
  if (code === null || !expectedCodes.includes(code))
    throw new Error("SMTP command failed.");
};

const command = async (
  socket: SmtpSocket,
  value: string,
  expectedCodes: readonly number[],
) => {
  socket.write(`${value}\r\n`);
  const response = await readResponse(socket);
  expectResponse(response, expectedCodes);
};

export const sendVerificationEmail = async (
  config: MailConfig,
  recipient: string,
  code: string,
  messageId: string,
): Promise<void> => {
  const socket = connect({
    host: "smtp.mail.ru",
    port: 465,
    servername: "smtp.mail.ru",
  });
  socket.setTimeout(15_000, () => socket.destroy(new Error("SMTP timeout.")));
  try {
    expectResponse(await readResponse(socket), [220]);
    await command(socket, "EHLO alsma.ru", [250]);
    await command(socket, "AUTH LOGIN", [334]);
    await command(socket, Buffer.from(config.email).toString("base64"), [334]);
    await command(
      socket,
      Buffer.from(config.password).toString("base64"),
      [235],
    );
    await command(socket, `MAIL FROM:<${config.email}>`, [250]);
    await command(socket, `RCPT TO:<${recipient}>`, [250, 251]);
    await command(socket, "DATA", [354]);
    const subject = "Код подтверждения входа — АЛСМА";
    const body = [
      `From: ${config.email}`,
      `To: ${recipient}`,
      `Message-ID: <${messageId}@alsma.ru>`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      `Ваш код подтверждения: ${code}`,
      "Код действителен 10 минут. Если вы не запрашивали вход, просто проигнорируйте это письмо.",
      ".",
    ].join("\r\n");
    await command(socket, body, [250]);
    await command(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }
};
