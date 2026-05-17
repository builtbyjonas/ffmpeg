# @byjonas/ffmpeg-binaries

Prebuilt FFmpeg binaries packaged for Node.js consumption.

Purpose

This package bundles prebuilt FFmpeg executables for major platforms and exposes the resolved binary path via `ffmpegPath`:

```js
import { ffmpegPath } from "@byjonas/ffmpeg-binaries";
console.log(ffmpegPath);
```

Behavior

- On installation the package's `postinstall` script extracts platform-specific binaries into `./bin/`.
- At runtime the package exports `ffmpegPath` which points to the platform binary if present, otherwise falls back to the string `ffmpeg` so a system installation can be used.

Installation

Install as a dependency in projects that want the bundled binary available at runtime:

```powershell
pnpm add @byjonas/ffmpeg-binaries
```

Licensing

Binaries included in this package are redistributed under their respective licenses (see the `bin/` tree). Ensure your use complies with those licenses.
