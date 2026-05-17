import fs from "node:fs";
import { platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN_DIR = join(__dirname, "bin");

const ffmpegBinary = executableName("ffmpeg");
const ffprobeBinary = executableName("ffprobe");
const ffplayBinary = executableName("ffplay");

export const ffmpegPath = findExecutable(BIN_DIR, ffmpegBinary) ?? "ffmpeg";
export const ffprobePath = findExecutable(BIN_DIR, ffprobeBinary) ?? "ffprobe";
export const ffplayPath = findExecutable(BIN_DIR, ffplayBinary) ?? "ffplay";

export default { ffmpegPath, ffprobePath, ffplayPath };

function executableName(name) {
  return platform() === "win32" ? `${name}.exe` : name;
}

function findExecutable(dir, name) {
  if (!fs.existsSync(dir)) return null;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isFile() && entry.name.toLowerCase() === name) return path;
    if (entry.isDirectory()) {
      const found = findExecutable(path, name);
      if (found) return found;
    }
  }

  return null;
}
