/**
 * Small CLI around the protocol core, used by `tools/bench` and for spot checks.
 * Usage:
 *   tsx src/cli/main.ts encode --lang hi --text "नदी"
 *   tsx src/cli/main.ts decode --lang hi --hex e4...
 *   tsx src/cli/main.ts size   --input sentences.jsonl
 *   tsx src/cli/main.ts size   --lang hi --text "नदी"
 */

import { readFileSync } from "node:fs";

import { decodeText, encodeText, normalizeText } from "../script.js";

interface Args {
  command: string;
  flags: Map<string, string>;
}

const parseArgs = (argv: string[]): Args => {
  const [command = "", ...rest] = argv;
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (key?.startsWith("--") && value !== undefined) flags.set(key.slice(2), value);
  }
  return { command, flags };
};

const utf8 = (s: string): number => new TextEncoder().encode(s).length;

const sizeFor = (id: string, lang: string, text: string) => {
  const normalised = normalizeText(text);
  const coded = encodeText(text, lang);
  return {
    id,
    lang,
    chars: [...normalised].length,
    utf8Bytes: utf8(normalised),
    codedBytes: coded.length,
  };
};

const main = (): void => {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === "encode") {
    const lang = flags.get("lang") ?? "hi";
    const hex = Buffer.from(encodeText(flags.get("text") ?? "", lang)).toString("hex");
    process.stdout.write(`${hex}\n`);
    return;
  }
  if (command === "decode") {
    const lang = flags.get("lang") ?? "hi";
    const bytes = Buffer.from(flags.get("hex") ?? "", "hex");
    process.stdout.write(`${decodeText(bytes, lang)}\n`);
    return;
  }
  if (command === "size") {
    const input = flags.get("input");
    if (input) {
      const lines = readFileSync(input, "utf8").split("\n").filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const row = JSON.parse(line) as { id: string; lang: string; text: string };
        process.stdout.write(`${JSON.stringify(sizeFor(row.id, row.lang, row.text))}\n`);
      }
      return;
    }
    const lang = flags.get("lang") ?? "hi";
    process.stdout.write(`${JSON.stringify(sizeFor("inline", lang, flags.get("text") ?? ""))}\n`);
    return;
  }
  process.stderr.write("usage: main.ts <encode|decode|size> [--lang L] [--text T] [--hex H] [--input F]\n");
  process.exitCode = 2;
};

main();
