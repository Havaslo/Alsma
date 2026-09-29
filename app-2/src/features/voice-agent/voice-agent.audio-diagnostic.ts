const wavHeaderBytes = 44;

export const voiceAgentPcmBytesPerMillisecond = 48;
export const voiceAgentDiagnosticMaxBytes =
  voiceAgentPcmBytesPerMillisecond * 60 * 1_000 * 10;

export const pcm16Mono24kToWav = (pcm: Uint8Array): Uint8Array => {
  const output = Buffer.alloc(wavHeaderBytes + pcm.byteLength);
  output.write("RIFF", 0, "ascii");
  output.writeUInt32LE(output.byteLength - 8, 4);
  output.write("WAVE", 8, "ascii");
  output.write("fmt ", 12, "ascii");
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(1, 22);
  output.writeUInt32LE(24_000, 24);
  output.writeUInt32LE(48_000, 28);
  output.writeUInt16LE(2, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36, "ascii");
  output.writeUInt32LE(pcm.byteLength, 40);
  Buffer.from(pcm).copy(output, wavHeaderBytes);
  return output;
};
