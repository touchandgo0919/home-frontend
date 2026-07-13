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

console.log(`Built static site into ${outDir}/`);
