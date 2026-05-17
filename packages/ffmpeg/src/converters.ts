import fs from "node:fs";
import { runFFmpeg } from "./ffmpeg.js";
import { ConvertOptions, ConvertResult } from "./types.js";

/**
 * Ensure input file exists, helper for many converters.
 */
function ensureInput(input: string) {
  if (!fs.existsSync(input)) throw new Error(`Input file not found: ${input}`);
}

/**
 * Generic wrapper that runs ffmpeg with given args and returns output path on success.
 */
async function runAndReturn(
  outputPath: string,
  args: string[],
): Promise<ConvertResult> {
  await runFFmpeg(args);
  if (!fs.existsSync(outputPath))
    throw new Error(`Output not produced: ${outputPath}`);
  return { output: outputPath };
}

/**
 * Convert raw PCM (s16le) to MP3.
 */
export async function pcmToMp3(
  input: string,
  output: string,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const { sampleRate = 48000, channels = 2, bitrate = 192 } = opts;
  const args = [
    "-f",
    "s16le",
    "-ar",
    String(sampleRate),
    "-ac",
    String(channels),
    "-i",
    input,
    "-acodec",
    "libmp3lame",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-ab",
    `${bitrate}k`,
    output,
    "-y",
  ];
  return runAndReturn(output, args);
}

/**
 * Convert audio to WAV (PCM 16).
 */
export async function audioToWav(
  input: string,
  output: string,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const { sampleRate = 44100, channels = 2 } = opts;
  const args = [
    "-i",
    input,
    "-ar",
    String(sampleRate),
    "-ac",
    String(channels),
    "-f",
    "wav",
    output,
    "-y",
  ];
  return runAndReturn(output, args);
}

/**
 * Convert audio to FLAC.
 */
export async function audioToFlac(
  input: string,
  output: string,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const { sampleRate = 44100, channels = 2, bitrate } = opts;
  const args = [
    "-i",
    input,
    "-ar",
    String(sampleRate),
    "-ac",
    String(channels),
  ];
  if (bitrate) args.push("-b:a", `${bitrate}k`);
  args.push(output, "-y");
  return runAndReturn(output, args);
}

/**
 * Convert audio to AAC (in an MP4 container by default).
 */
export async function audioToAac(
  input: string,
  output: string,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const { bitrate = 128, sampleRate = 44100, channels = 2 } = opts;
  const args = [
    "-i",
    input,
    "-c:a",
    "aac",
    "-b:a",
    `${bitrate}k`,
    "-ar",
    String(sampleRate),
    "-ac",
    String(channels),
    output,
    "-y",
  ];
  return runAndReturn(output, args);
}

/**
 * Convert audio to Ogg Vorbis.
 */
export async function audioToOgg(
  input: string,
  output: string,
  opts: ConvertOptions = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const { bitrate = 128, sampleRate = 44100, channels = 2 } = opts;
  const args = [
    "-i",
    input,
    "-c:a",
    "libvorbis",
    "-b:a",
    `${bitrate}k`,
    "-ar",
    String(sampleRate),
    "-ac",
    String(channels),
    output,
    "-y",
  ];
  return runAndReturn(output, args);
}

/**
 * Transcode video to H.264 MP4.
 */
export async function videoToH264Mp4(
  input: string,
  output: string,
  opts: {
    bitrate?: number;
    width?: number;
    height?: number;
    fps?: number;
  } = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const args = ["-i", input, "-c:v", "libx264", "-preset", "fast"];
  if (opts.bitrate) args.push("-b:v", `${opts.bitrate}k`);
  if (opts.width && opts.height)
    args.push("-vf", `scale=${opts.width}:${opts.height}`);
  if (opts.fps) args.push("-r", String(opts.fps));
  args.push("-c:a", "aac", output, "-y");
  return runAndReturn(output, args);
}

/**
 * Transcode video to VP9 WebM.
 */
export async function videoToVp9Webm(
  input: string,
  output: string,
  opts: { bitrate?: number; width?: number; height?: number } = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const args = ["-i", input, "-c:v", "libvpx-vp9"];
  if (opts.bitrate) args.push("-b:v", `${opts.bitrate}k`);
  if (opts.width && opts.height)
    args.push("-vf", `scale=${opts.width}:${opts.height}`);
  args.push("-c:a", "libopus", output, "-y");
  return runAndReturn(output, args);
}

/**
 * Extract audio track from a video to MP3.
 */
export async function extractAudioToMp3(
  input: string,
  output: string,
  bitrate = 192,
): Promise<ConvertResult> {
  ensureInput(input);
  const args = [
    "-i",
    input,
    "-q:a",
    "0",
    "-map",
    "a",
    "-ab",
    `${bitrate}k`,
    output,
    "-y",
  ];
  return runAndReturn(output, args);
}

/**
 * Extract frames as images (JPEG). framePattern should contain %d or %04d, etc.
 */
export async function extractFrames(
  input: string,
  framePattern: string,
  opts: { fps?: number } = {},
): Promise<string> {
  ensureInput(input);
  const args = ["-i", input];
  if (opts.fps) args.push("-r", String(opts.fps));
  args.push(framePattern, "-y");
  await runFFmpeg(args);
  return framePattern;
}

/**
 * Remux input into a different container without re-encoding.
 */
export async function remux(
  input: string,
  output: string,
): Promise<ConvertResult> {
  ensureInput(input);
  const args = ["-i", input, "-c", "copy", output, "-y"];
  return runAndReturn(output, args);
}

/**
 * Convert arbitrary input to MP4 using default sane presets for web delivery.
 */
export async function toMp4(
  input: string,
  output: string,
  opts: { crf?: number; preset?: string } = {},
): Promise<ConvertResult> {
  ensureInput(input);
  const { crf = 23, preset = "medium" } = opts;
  const args = [
    "-i",
    input,
    "-c:v",
    "libx264",
    "-crf",
    String(crf),
    "-preset",
    preset,
    "-c:a",
    "aac",
    output,
    "-y",
  ];
  return runAndReturn(output, args);
}

export default {
  pcmToMp3,
  audioToWav,
  audioToFlac,
  audioToAac,
  audioToOgg,
  videoToH264Mp4,
  videoToVp9Webm,
  extractAudioToMp3,
  extractFrames,
  remux,
  toMp4,
};
