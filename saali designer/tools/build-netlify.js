const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const dist = path.join(root, "dist");
const entries = ["index.html", "catalog.html", "manifest.webmanifest", "assets"];

fs.mkdirSync(dist, { recursive: true });
for (const entry of fs.readdirSync(dist)) {
  fs.rmSync(path.join(dist, entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

for (const entry of entries) {
  const source = path.join(root, entry);
  const target = path.join(dist, entry);
  fs.cpSync(source, target, { recursive: true });
}

console.log("Netlify static files copied to dist");
