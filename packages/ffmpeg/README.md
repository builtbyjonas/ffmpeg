# @byjonas/ffmpeg

A lightweight, dependency-light TypeScript wrapper for running FFmpeg from Node.js.

Highlights

- Automatically prefers a system `ffmpeg` if available.
- Falls back to an optional `@byjonas/ffmpeg-binaries` package that ships prebuilt platform binaries.
- Minimal runtime surface: resolves a binary path and runs `ffmpeg` with arguments.

Installation

This package declares `@byjonas/ffmpeg-binaries` as a peer dependency. To ensure the binaries are available at runtime, install both packages in your application:

```powershell
pnpm add @byjonas/ffmpeg @byjonas/ffmpeg-binaries
```

If you already have `ffmpeg` installed on the host system, installing `@byjonas/ffmpeg-binaries` is optional.

Quick usage

```ts
import ffmpeg from "@byjonas/ffmpeg";

async function convert() {
  const path = await ffmpeg.resolveFFmpegBinary();
  console.log("Using ffmpeg at", path);
  await ffmpeg.runFFmpeg(["-i", "in.mp4", "out.mp4"]);
}
```

API
API

The package exposes a small, focused runtime surface: a set of convenience converters and a couple of low-level helpers for locating and running an ffmpeg binary.

Top-level exports (from package root)

- `resolveFFmpegBinary(): Promise<string>` — Resolve a usable ffmpeg binary. Returns the system `ffmpeg` command if available, otherwise attempts to load `@byjonas/ffmpeg-binaries` and return its `ffmpegPath` export. Throws when no binary is found.
- `runFFmpeg(args: string[], options?: { cwd?: string }): Promise<string>` — Run ffmpeg with the given arguments. Resolves with the collected stderr output when ffmpeg exits with code 0, rejects with an Error otherwise.

Converters

All converters are re-exported from the package root and also available under the default export object. Each converter returns a Promise that resolves to a `ConvertResult` ({ output: string }) for single-file outputs, or a string path/pattern when appropriate (for example `extractFrames` returns the frame pattern).

Implemented converters

| Converter export | Signature | Description | Status |
| `pcmToMp3` | `pcmToMp3(input: string, output: string, opts?: ConvertOptions): Promise<ConvertResult>` | Convert raw PCM (s16le) to MP3. Options: sampleRate, channels, bitrate. | Implemented |
| `audioToWav` | `audioToWav(input: string, output: string, opts?: ConvertOptions): Promise<ConvertResult>` | Convert any audio to WAV (PCM16). Options: sampleRate, channels. | Implemented |
| `audioToFlac` | `audioToFlac(input: string, output: string, opts?: ConvertOptions): Promise<ConvertResult>` | Convert audio to FLAC. Optional bitrate. | Implemented |
| `audioToAac` | `audioToAac(input: string, output: string, opts?: ConvertOptions): Promise<ConvertResult>` | Convert audio to AAC in an MP4/M4A-friendly container. Options: bitrate, sampleRate, channels. | Implemented |
| `audioToOgg` | `audioToOgg(input: string, output: string, opts?: ConvertOptions): Promise<ConvertResult>` | Convert audio to Ogg Vorbis. Options: bitrate, sampleRate, channels. | Implemented |
| `videoToH264Mp4` | `videoToH264Mp4(input: string, output: string, opts?: { bitrate?: number; width?: number; height?: number; fps?: number }): Promise<ConvertResult>` | Transcode video to H.264 in MP4. Options for bitrate, scale and framerate. | Implemented |
| `videoToVp9Webm` | `videoToVp9Webm(input: string, output: string, opts?: { bitrate?: number; width?: number; height?: number }): Promise<ConvertResult>` | Transcode video to VP9 in WebM. | Implemented |
| `extractAudioToMp3` | `extractAudioToMp3(input: string, output: string, bitrate?: number): Promise<ConvertResult>` | Extract the audio track from a video and save as MP3. | Implemented |
| `extractFrames` | `extractFrames(input: string, framePattern: string, opts?: { fps?: number }): Promise<string>` | Extract frames to disk using a filename pattern (e.g. `frame-%04d.jpg`). Returns the pattern string on success. | Implemented |
| `remux` | `remux(input: string, output: string): Promise<ConvertResult>` | Remux the streams into a different container without re-encoding (`-c copy`). | Implemented |
| `toMp4` | `toMp4(input: string, output: string, opts?: { crf?: number; preset?: string }): Promise<ConvertResult>` | Convert arbitrary input to MP4 using libx264 with sane defaults for web delivery. | Implemented |

Planned / not yet implemented converters

| Converter      | Notes                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| `gifFromVideo` | Planned: exported helper to create optimized GIFs from video (not implemented yet).                      |
| `thumbnail`    | Planned: create a single thumbnail image at a given timestamp (not implemented yet).                     |
| `concatVideos` | Planned: helper to concatenate multiple video files (complexities around codecs and intermediate files). |

Types

- `ConvertOptions` — exported type describing commonly used options for audio converters (sampleRate, channels, bitrate). See the source `src/types.ts` for the full definition.
- `ConvertResult` — `{ output: string }` for single-file outputs.

Notes

- The `@byjonas/ffmpeg-binaries` package is declared as an optional peer dependency so consumers can decide whether to include it. When using pnpm workspaces, the workspace reference will ensure local linking.
- TypeScript users: local declaration files improve DX when importing the binaries package dynamically.
