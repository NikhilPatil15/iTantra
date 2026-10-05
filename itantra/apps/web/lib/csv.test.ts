import { describe, expect, it } from "vitest";

import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("parses a simple table into row objects", () => {
    const rows = parseCsv("lang,wer\nhi,0.18\nen,0.12\n");
    expect(rows).toEqual([
      { lang: "hi", wer: "0.18" },
      { lang: "en", wer: "0.12" },
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    const rows = parseCsv('id,corpus\nhi-001,"seed, v1"\n');
    expect(rows[0]).toEqual({ id: "hi-001", corpus: "seed, v1" });
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('a,b\n"say ""hi""",2\n');
    expect(rows[0]).toEqual({ a: 'say "hi"', b: "2" });
  });

  it("drops blank rows and returns [] for an empty string", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("a,b\n\n")).toEqual([]);
  });
});
