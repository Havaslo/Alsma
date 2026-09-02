import { connect } from "node:tls";

type MailConfig = { readonly email: string; readonly password: string };

const readResponse = (socket: ReturnType<typeof connect>): Promise<string> =>
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

const command = async (socket: ReturnType<typeof connect>, value: string) => {
  socket.write(`${value}\r\n`);
  const response = await readResponse(socket);
  if (!response.startsWith("2") && !response.startsWith("3"))
    throw new Error("SMTP command failed.");
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
    await readResponse(socket);
    await command(socket, "EHLO alsma.ru");
    await command(socket, `AUTH LOGIN`);
    await command(socket, Buffer.from(config.email).toString("base64"));
    await command(socket, Buffer.from(config.password).toString("base64"));
    await command(socket, `MAIL FROM:<${config.email}>`);
    await command(socket, `RCPT TO:<${recipient}>`);
    await command(socket, "DATA");
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
    await command(socket, body);
    await command(socket, "QUIT");
  } finally {
    socket.end();
  }
};
