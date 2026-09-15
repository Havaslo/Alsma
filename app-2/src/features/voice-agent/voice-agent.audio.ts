export const createVoiceTestAudioTurn =
  ({
    apiKey,
    baseUrl,
    complete,
    getKnowledgeContext,
  }: {
    readonly apiKey?: string;
    readonly baseUrl?: string;
    readonly complete: (prompt: string) => Promise<string>;
    readonly getKnowledgeContext: () => Promise<string>;
  }) =>
  async (audioBase64: string, mimeType: string) => {
    if (!apiKey || !baseUrl)
      throw new Error("OpenAI AI Gateway is not configured");
    const audio = Buffer.from(audioBase64, "base64");
    const form = new FormData();
    form.append("file", new Blob([audio], { type: mimeType }), "turn.webm");
    form.append("model", "gpt-4o-mini-transcribe");
    const transcriptionResponse = await fetch(
      `${baseUrl.replace(/\/$/u, "")}/audio/transcriptions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!transcriptionResponse.ok)
      throw new Error(
        `Audio transcription failed with status ${transcriptionResponse.status}`,
      );
    const transcription = (await transcriptionResponse.json()) as {
      text?: string;
    };
    const text = transcription.text?.trim();
    if (!text) throw new Error("The audio did not contain recognizable speech");
    const knowledge = await getKnowledgeContext();
    const answer = await complete(
      `Вопрос гостя: ${text}\n\nБаза знаний и правила:\n${knowledge}`,
    );
    const speechResponse = await fetch(
      `${baseUrl.replace(/\/$/u, "")}/audio/speech`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: answer,
          model: "gpt-4o-mini-tts",
          response_format: "mp3",
          voice: "marin",
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!speechResponse.ok)
      throw new Error(
        `Audio speech failed with status ${speechResponse.status}`,
      );
    return {
      answer,
      audioBase64: Buffer.from(await speechResponse.arrayBuffer()).toString(
        "base64",
      ),
      audioMimeType: "audio/mpeg",
      transcript: text,
    };
  };
