/**
 * Options used when converting PCM to MP3.
 */
export interface ConvertOptions {
  /** Sample rate in Hz. Default: 48000 */
  sampleRate?: number;

  /** Number of audio channels. Default: 2 */
  channels?: number;

  /** Target bitrate in kbps. Default: 192 */
  bitrate?: number;
}

export type ConvertResult = { output: string };
