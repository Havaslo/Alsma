import { inflateSync } from "node:zlib";

const imageMarker = Buffer.from("/Image");
const streamMarker = Buffer.from("stream");
const endStreamMarker = Buffer.from("endstream");
const jpegStartMarker = Buffer.from([0xff, 0xd8]);
const jpegEndMarker = Buffer.from([0xff, 0xd9]);
const flateMarker = Buffer.from("/FlateDecode");

export const extractFirstPdfImage = (
  content: Uint8Array,
): Uint8Array | undefined => {
  const source = Buffer.from(content);
  const imagePosition = source.indexOf(imageMarker);
  if (imagePosition < 0) return undefined;

  const dictionaryEnd = source.indexOf(streamMarker, imagePosition);
  if (dictionaryEnd < 0) return undefined;
  const streamStart = source.indexOf(0x0a, dictionaryEnd);
  const streamEnd = source.indexOf(endStreamMarker, streamStart);
  if (streamStart < 0 || streamEnd < 0) return undefined;

  let stream = source.subarray(streamStart + 1, streamEnd);
  const dictionaryStart = Math.max(0, imagePosition - 256);
  if (source.subarray(dictionaryStart, dictionaryEnd).includes(flateMarker)) {
    try {
      stream = inflateSync(stream);
    } catch {
      return undefined;
    }
  }

  const jpegStart = stream.indexOf(jpegStartMarker);
  const jpegEnd = stream.indexOf(jpegEndMarker, jpegStart + 2);
  if (jpegStart < 0 || jpegEnd < 0) return undefined;
  return Uint8Array.from(stream.subarray(jpegStart, jpegEnd + 2));
};
