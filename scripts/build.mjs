import fs from "node:fs";
import path from "node:path";

const outDir = "dist";
const copyItems = ["index.html", "admin", "assets"];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const item of copyItems) {
  const source = path.resolve(item);
  const target = path.resolve(outDir, item);

  if (!fs.existsSync(source)) {
    continue;
  }

  fs.cpSync(source, target, { recursive: true });
}

if (process.env.HOME_API_BASE_URL) {
  fs.writeFileSync(
    path.join(outDir, "config.js"),
    `window.HOME_CONFIG = ${JSON.stringify({ API_BASE_URL: process.env.HOME_API_BASE_URL }, null, 2)};\n`
  );
} else {
  const configSource = fs.existsSync("config.js") ? "config.js" : "config.example.js";
  if (fs.existsSync(configSource)) {
    fs.copyFileSync(configSource, path.join(outDir, "config.js"));
  }
}

console.log(`Built static site into ${outDir}/`);
