import { spawn } from "node:child_process";

/**
 * Resolve a usable ffmpeg binary path.
 *
 * The function first tries to call the system `ffmpeg` command. If that fails
 * it will attempt to dynamically import the bundled `@byjonas/ffmpeg-binaries`
 * package and return its `ffmpegPath` export.
 *
 * @throws {Error} If no usable ffmpeg binary is found.
 */
export async function resolveFFmpegBinary(): Promise<string> {
  try {
    await new Promise((res, rej) => {
      const test = spawn("ffmpeg", ["-version"]);
      test.on("error", rej);
      test.on("close", res);
    });
    return "ffmpeg";
  } catch {
    try {
      const pkg = await import("@byjonas/ffmpeg-binaries");
      const ffmpegPath = (pkg &&
        (pkg.ffmpegPath ?? pkg.default?.ffmpegPath)) as string | undefined;
      if (ffmpegPath) return ffmpegPath;
    } catch {
      // ignore and throw below
    }

    throw new Error(
      "FFmpeg not found. Please install ffmpeg or include @byjonas/ffmpeg-binaries.",
    );
  }
}

/**
 * Run ffmpeg with the provided arguments and collect stderr output.
 * Resolves when process exits with code 0, rejects otherwise.
 * Returns the buffered stderr for diagnostic use.
 */
export async function runFFmpeg(
  args: string[],
  options?: { cwd?: string },
): Promise<string> {
  const ffmpegPath = await resolveFFmpegBinary();

  return await new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: options?.cwd,
    });
    let stderr = "";

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => reject(err));

    proc.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg failed (code ${code}): ${stderr}`));
    });
  });
}
