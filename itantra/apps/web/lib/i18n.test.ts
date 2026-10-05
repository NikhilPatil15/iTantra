import { describe, expect, it } from "vitest";

import { translate } from "./i18n";

describe("translate", () => {
  it("returns English strings by default", () => {
    expect(translate("talk.holdToTalk")).toBe("Hold to talk");
    expect(translate("alert.iveSeenThis")).toBe("I've seen this");
  });

  it("falls back to English for an unknown locale", () => {
    expect(translate("nav.packs", "xx")).toBe("Packs");
  });

  it("uses the copy rules: sentence case, no apology", () => {
    expect(translate("peer.codesMatch")).toBe("Codes match");
    expect(translate("pack.nonCommercial")).toContain("non-commercial");
  });
});
