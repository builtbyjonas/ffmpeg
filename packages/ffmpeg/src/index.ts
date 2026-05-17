/**
 * Public entry points for the package.
 *
 * This module re-exports the main functions/types from smaller modules so
 * consumers can import from the package root.
 */
import converters from "./converters.js";
import {
  resolveFFmpegBinary as _resolveFFmpegBinary,
  runFFmpeg as _runFFmpeg,
} from "./ffmpeg.js";

const ffmpeg = {
  ...converters,
  runFFmpeg: _runFFmpeg,
  resolveFFmpegBinary: _resolveFFmpegBinary,
};

export default ffmpeg;
export type { ConvertOptions, ConvertResult } from "./types.js";
export * from "./converters.js";
export { resolveFFmpegBinary, runFFmpeg } from "./ffmpeg.js";
