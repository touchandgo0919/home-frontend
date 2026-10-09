import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const outDir = "dist";
const copyItems = ["index.html", "admin", "assets", "help", "privacy", "support"];

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

// The public server caches /assets/ for an hour. Give each referenced script
// and stylesheet a URL tied to its contents so browsers fetch changed files.
const htmlPath = path.join(outDir, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
fs.writeFileSync(htmlPath, html.replace(/(["'])\/(assets\/(?:css|js)\/[^"'?]+)\1/g, (match, quote, asset) => {
  const content = fs.readFileSync(path.join(outDir, asset));
  const version = createHash("sha256").update(content).digest("hex").slice(0, 12);
  return `${quote}/${asset}?v=${version}${quote}`;
}));

if (process.env.HOME_API_BASE_URL) {
  const fallbackApiBaseUrl = process.env.HOME_API_BASE_URL;
  fs.writeFileSync(
    path.join(outDir, "config.js"),
    `(() => {
  const hostname = window.location.hostname;
  const apiBaseUrl = hostname.startsWith("home.")
    ? \`${"${window.location.protocol}"}//home-api.${"${hostname.slice(\"home.\".length)}"}\`
    : ${JSON.stringify(fallbackApiBaseUrl)};
  window.HOME_CONFIG = { API_BASE_URL: apiBaseUrl };
})();\n`
  );
} else {
  const configSource = fs.existsSync("config.js") ? "config.js" : "config.example.js";
  if (fs.existsSync(configSource)) {
    fs.copyFileSync(configSource, path.join(outDir, "config.js"));
  }
}

console.log(`Built static site into ${outDir}/`);
