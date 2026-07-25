import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { waitAppReady, LEFT_DIR } from "../fixtures/app";

test.describe("bookmarks", () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test("bookmarks current path and can jump to it", async ({ page }) => {
    // Unique folder so UNIQUE(path) never collides across runs
    const folder = `bm-${Date.now()}`;
    const full = path.join(LEFT_DIR, folder);
    fs.mkdirSync(full, { recursive: true });
    fs.writeFileSync(path.join(full, "marker.txt"), "x");

    await page.getByTestId("btn-refresh").click();
    await page.getByTestId("pane-left").click();
    const input = page.getByTestId("path-input-left").locator("input");
    await input.fill(full);
    await input.press("Enter");
    await expect(page.getByTestId("status-path")).toContainText(folder);

    await page.getByTestId("btn-bookmark").click();
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });

    // Navigate back to left root
    await input.fill(LEFT_DIR);
    await input.press("Enter");
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);

    await page.getByTestId("select-bookmarks").click();
    await page
      .getByRole("option", { name: new RegExp(folder) })
      .first()
      .click();
    await expect(page.getByTestId("status-path")).toContainText(folder);
  });
});
