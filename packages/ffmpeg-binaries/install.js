import { spawn } from "node:child_process";
import {
  chmodSync,
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import https from "node:https";
import { arch, platform, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import { fileURLToPath } from "node:url";
import * as tar from "tar";
import unzipper from "unzipper";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN_DIR = join(__dirname, "bin");
const USER_AGENT = "@byjonas/ffmpeg-binaries-installer";
const key = `${platform()}-${arch()}`;

const DOWNLOADS = {
  "win32-x64": {
    fallback:
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl-shared.zip",
    match: (name) =>
      name === "ffmpeg-master-latest-win64-gpl-shared.zip" ||
      /win64.*gpl.*shared.*\.zip$/i.test(name),
  },
  "win32-arm64": {
    fallback:
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-winarm64-gpl-shared.zip",
    match: (name) =>
      name === "ffmpeg-master-latest-winarm64-gpl-shared.zip" ||
      /winarm64.*gpl.*shared.*\.zip$/i.test(name),
  },
  "linux-x64": {
    fallback:
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl-shared.tar.xz",
    match: (name) =>
      name === "ffmpeg-master-latest-linux64-gpl-shared.tar.xz" ||
      /linux64.*gpl.*shared.*\.tar\.xz$/i.test(name),
  },
  "linux-arm64": {
    fallback:
      "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl-shared.tar.xz",
    match: (name) =>
      name === "ffmpeg-master-latest-linuxarm64-gpl-shared.tar.xz" ||
      /linuxarm64.*gpl.*shared.*\.tar\.xz$/i.test(name),
  },
  "darwin-x64": {
    fallback: "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip",
    match: null,
  },
};

const download = DOWNLOADS[key];

if (!download) {
  console.warn(`[ffmpeg-binaries] No prebuilt FFmpeg available for ${key}.`);
  process.exit(0);
}

console.log(`[ffmpeg-binaries] Resolving latest FFmpeg download for ${key}.`);

installLatest()
  .then((ffmpegPath) => {
    makeExecutable(ffmpegPath);
    console.log(`[ffmpeg-binaries] FFmpeg ready at ${ffmpegPath}`);
  })
  .catch((err) => {
    console.error("[ffmpeg-binaries] Failed to download FFmpeg:", err);
    process.exit(1);
  });

async function installLatest() {
  const url = await findDownloadUrl();
  const workDir = mkdtempSync(join(tmpdir(), "ffmpeg-binaries-"));
  const archivePath = join(workDir, archiveNameFromUrl(url));
  const extractDir = join(workDir, "extract");

  mkdirSync(extractDir, { recursive: true });

  try {
    console.log(`[ffmpeg-binaries] Downloading FFmpeg for ${key} from ${url}.`);
    await downloadFile(url, archivePath);

    console.log("[ffmpeg-binaries] Extracting FFmpeg archive.");
    await extractArchive(archivePath, extractDir);

    const releaseRoot = getReleaseRoot(extractDir);
    resetDirectory(BIN_DIR);
    moveDirectoryContents(releaseRoot, BIN_DIR);

    const ffmpegPath = findExecutable(BIN_DIR, executableName("ffmpeg"));
    if (!ffmpegPath) {
      throw new Error("FFmpeg executable was not found after extraction.");
    }

    return ffmpegPath;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

async function findDownloadUrl() {
  if (!download.match) return download.fallback;

  const apiUrl =
    "https://api.github.com/repos/BtbN/FFmpeg-Builds/releases/tags/latest";

  try {
    const { res } = await requestWithRedirect(apiUrl, {
      Accept: "application/vnd.github+json",
    });

    if (res.statusCode !== 200) {
      res.resume();
      return download.fallback;
    }

    let body = "";
    for await (const chunk of res) body += chunk;

    const release = JSON.parse(body);
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const asset = assets.find(
      (item) =>
        typeof item.name === "string" &&
        download.match(item.name.toLowerCase()) &&
        typeof item.browser_download_url === "string",
    );

    return asset?.browser_download_url ?? download.fallback;
  } catch {
    return download.fallback;
  }
}

function requestWithRedirect(srcUrl, headers = {}, maxRedirects = 5) {
  const requestHeaders = {
    "User-Agent": USER_AGENT,
    ...headers,
  };

  return new Promise((resolve, reject) => {
    const makeRequest = (currentUrl, redirectsLeft) => {
      const req = https.get(currentUrl, { headers: requestHeaders }, (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          if (redirectsLeft === 0) {
            reject(new Error(`Too many redirects for ${srcUrl}`));
            return;
          }

          const nextUrl = new URL(res.headers.location, currentUrl).toString();
          res.resume();
          makeRequest(nextUrl, redirectsLeft - 1);
          return;
        }

        resolve({ res, finalUrl: currentUrl });
      });

      req.on("error", reject);
    };

    makeRequest(srcUrl, maxRedirects);
  });
}

async function downloadFile(url, filePath) {
  const { res, finalUrl } = await requestWithRedirect(url);

  if (res.statusCode !== 200) {
    res.resume();
    throw new Error(`HTTP ${res.statusCode}: ${finalUrl}`);
  }

  await pipeline(res, createWriteStream(filePath));
}

async function extractArchive(archivePath, dest) {
  const lower = archivePath.toLowerCase();

  if (lower.endsWith(".zip")) {
    await unzipper.Open.file(archivePath).then((archive) =>
      archive.extract({ path: dest }),
    );
    return;
  }

  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) {
    await pipeline(
      createReadStream(archivePath),
      createGunzip(),
      tar.x({ cwd: dest }),
    );
    return;
  }

  if (lower.endsWith(".tar.xz") || lower.endsWith(".txz")) {
    await extractTarXz(archivePath, dest);
    return;
  }

  throw new Error(`Unsupported archive format: ${archivePath}`);
}

function extractTarXz(archivePath, dest) {
  return new Promise((resolve, reject) => {
    const child = spawn("tar", ["-xJf", archivePath, "-C", dest], {
      stdio: "ignore",
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Unable to extract .tar.xz archive. Install a tar command with xz support and try again. ${err.message}`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `Unable to extract .tar.xz archive. The tar command exited with code ${code}.`,
        ),
      );
    });
  });
}

function getReleaseRoot(extractDir) {
  const entries = readdirSync(extractDir);

  if (entries.length === 1) {
    const onlyEntry = join(extractDir, entries[0]);
    if (statSync(onlyEntry).isDirectory()) return onlyEntry;
  }

  return extractDir;
}

function resetDirectory(dir) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

function moveDirectoryContents(fromDir, toDir) {
  for (const entry of readdirSync(fromDir)) {
    const source = join(fromDir, entry);
    const target = join(toDir, entry);

    try {
      renameSync(source, target);
    } catch {
      cpSync(source, target, { recursive: true });
      rmSync(source, { recursive: true, force: true });
    }
  }
}

function findExecutable(dir, name) {
  if (!existsSync(dir)) return null;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isFile() && entry.name.toLowerCase() === name) return path;
    if (entry.isDirectory()) {
      const found = findExecutable(path, name);
      if (found) return found;
    }
  }

  return null;
}

function makeExecutable(path) {
  if (!path) return;

  try {
    chmodSync(path, 0o755);
  } catch {
    // chmod can be unavailable or irrelevant on some Windows setups.
  }
}

function executableName(name) {
  return platform() === "win32" ? `${name}.exe` : name;
}

function archiveNameFromUrl(url) {
  const pathname = new URL(url).pathname;
  const name = basename(pathname);
  if (name && name.includes(".")) return name;

  return platform() === "win32" || platform() === "darwin"
    ? "ffmpeg.zip"
    : "ffmpeg.tar.xz";
}
