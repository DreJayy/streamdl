const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function formatSpeed(bytesPerSec) {
  return `${formatBytes(bytesPerSec)}/s`;
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    console.log(`\nDownloading: ${url}`);
    console.log(`Saving to:   ${outputPath}\n`);

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`↩️  Redirecting to: ${redirectUrl}`);
        return downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Server responded with status: ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
      let downloadedBytes = 0;
      let startTime = Date.now();
      let lastUpdate = Date.now();

      const fileStream = fs.createWriteStream(outputPath);

      // Pipe the response stream into the file stream
      response.pipe(fileStream);

      // Track download progress
      response.on("data", (chunk) => {
        downloadedBytes += chunk.length;
        const now = Date.now();

        // Update progress every 200ms
        if (now - lastUpdate >= 200) {
          const elapsed = (now - startTime) / 1000;
          const speed = downloadedBytes / elapsed;

          if (totalBytes > 0) {
            const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
            const bar = progressBar(downloadedBytes / totalBytes, 30);
            process.stdout.write(
              `\r${bar} ${percent}% | ${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)} | ${formatSpeed(speed)}   `
            );
          } else {
            process.stdout.write(
              `\r⬇  Downloaded: ${formatBytes(downloadedBytes)} | Speed: ${formatSpeed(speed)}   `
            );
          }

          lastUpdate = now;
        }
      });

      fileStream.on("finish", () => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const avgSpeed = downloadedBytes / (elapsed || 1);
        process.stdout.write("\n");
        console.log(`\n✅ Done! ${formatBytes(downloadedBytes)} in ${elapsed}s (avg ${formatSpeed(avgSpeed)})`);
        resolve(outputPath);
      });

      fileStream.on("error", (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });

      response.on("error", (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    });

    request.on("error", reject);
  });
}

function progressBar(fraction, width) {
  const filled = Math.round(fraction * width);
  const empty = width - filled;
  return `[${"#".repeat(filled)}${"=".repeat(empty)}]`;
}

function getFilenameFromUrl(url) {
  try {
    const pathname = new URL(url).pathname;
    const name = path.basename(pathname);
    return name || "downloaded_file";
  } catch {
    return "downloaded_file";
  }
}

const [, , url, outputArg] = process.argv;

if (!url) {
  console.error("Usage: node downloader.js <url> [output-filename]");
  console.error("Example: node downloader.js https://example.com/file.zip");
  process.exit(1);
}

const outputPath = outputArg || getFilenameFromUrl(url);

downloadFile(url, outputPath).catch((err) => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
