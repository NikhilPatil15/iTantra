import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SHOTS = process.env.SHOT_DIR ?? "../../docs/shots";

async function setTheme(page: import("@playwright/test").Page, theme: "day" | "night") {
  await page.evaluate((value) => {
    window.localStorage.setItem("itantra-theme", value);
    document.documentElement.setAttribute("data-theme", value);
  }, theme);
}

test("@shots walks Setup -> Talk -> Read-back -> Thread in day and night", async ({ page }) => {
  await page.goto("/setup/");
  await setTheme(page, "day");
  await page.getByRole("button", { name: "Grant permissions" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start the engine" }).click();
  await page.screenshot({ path: `${SHOTS}/390-setup-day.png`, fullPage: true });

  await setTheme(page, "night");
  await page.screenshot({ path: `${SHOTS}/390-setup-night.png`, fullPage: true });

  await page.goto("/talk/");
  await setTheme(page, "day");
  await page.screenshot({ path: `${SHOTS}/390-talk-day.png`, fullPage: true });
  await setTheme(page, "night");
  await page.screenshot({ path: `${SHOTS}/390-talk-night.png`, fullPage: true });

  // Start an utterance and wait for the scripted read-back (mock takes ~1.7 s).
  const talkButton = page.getByRole("button", { name: "Hold to talk" });
  await talkButton.hover();
  await page.mouse.down();
  await page.waitForTimeout(200);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible({ timeout: 5000 });
  await setTheme(page, "day");
  await page.screenshot({ path: `${SHOTS}/390-readback-day.png`, fullPage: true });
  await setTheme(page, "night");
  await page.screenshot({ path: `${SHOTS}/390-readback-night.png`, fullPage: true });

  await page.getByRole("button", { name: "Send" }).click();
  await page.goto("/thread/");
  await setTheme(page, "day");
  await page.screenshot({ path: `${SHOTS}/390-thread-day.png`, fullPage: true });
});

test("@shots landing page in day, night and phone width", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await setTheme(page, "day");
  await page.screenshot({ path: `${SHOTS}/desktop-landing-day.png`, fullPage: true });
  await setTheme(page, "night");
  await page.screenshot({ path: `${SHOTS}/desktop-landing-night.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await setTheme(page, "day");
  await page.screenshot({ path: `${SHOTS}/390-landing-day.png`, fullPage: true });
});

test("@shots shows the alert takeover", async ({ page }) => {
  await page.goto("/alerts/");
  await setTheme(page, "day");
  await page.screenshot({ path: `${SHOTS}/390-alerts-day.png`, fullPage: true });
  await page.getByRole("button", { name: "Simulate an incoming alert" }).click();
  await expect(page.getByRole("button", { name: "I've seen this" })).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/390-alert-takeover.png`, fullPage: false });
});

test("@shots Lab size and link pages render the measured numbers", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/lab/size/");
  await expect(page.getByText("Bytes per sentence")).toBeVisible();
  await expect(page.getByText("tools/bench/results/size.csv")).toBeVisible();
  await expect(page.getByText("sample data").first()).toBeVisible();
  await expect(page.getByText("script-aware").first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/desktop-lab-size.png`, fullPage: true });

  await page.goto("/lab/link/");
  await expect(page.getByText("Delivery rate against loss")).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/desktop-lab-link.png`, fullPage: true });
});

test("has no serious accessibility violations on Talk", async ({ page }) => {
  await page.goto("/talk/");
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
