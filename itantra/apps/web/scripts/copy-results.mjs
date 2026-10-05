// Copies bench result files into public/ so the static Lab can load them without a server.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const source = join(webRoot, "..", "..", "tools", "bench", "results");
const target = join(webRoot, "public", "results");

mkdirSync(target, { recursive: true });

if (!existsSync(source)) {
  console.warn("[copy-results] no results directory yet:", source);
} else {
  let copied = 0;
  for (const name of readdirSync(source)) {
    if (name.endsWith(".csv") || name.endsWith(".json")) {
      cpSync(join(source, name), join(target, name));
      copied += 1;
    }
  }
  console.log(`[copy-results] copied ${copied} file(s) to public/results`);
}

// Also place the generated licences JSON where the app can import it statically.
const licences = join(webRoot, "..", "..", "tools", "packs", "licenses.json");
if (existsSync(licences)) {
  mkdirSync(join(webRoot, "public", "generated"), { recursive: true });
  cpSync(licences, join(webRoot, "public", "generated", "licenses.json"));
  console.log("[copy-results] copied licenses.json");
}
