import path from "node:path";
import { test, expect } from "@playwright/test";
import { waitAppReady, doubleClickRow, expectRowVisible, LEFT_DIR } from "../fixtures/app";

test.describe("ui polish", () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test("path breadcrumbs navigate to parent segment", async ({ page }) => {
    await doubleClickRow(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "left", "readme.md");

    const crumbs = page.getByTestId("path-crumbs-left");
    await expect(crumbs).toBeVisible();
    const expand = crumbs.getByLabel("Show path");
    if ((await expand.count()) > 0) {
      await expand.click();
    }

    const parentIdx = path.join(LEFT_DIR, "docs").split(/[/\\]/).filter(Boolean).length - 1;
    await crumbs.getByTestId(`path-crumb-left-${parentIdx}`).click();

    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
    await expectRowVisible(page, "left", "docs");
  });
});
