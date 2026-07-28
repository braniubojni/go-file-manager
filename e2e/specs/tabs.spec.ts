import { test, expect } from "@playwright/test";
import { waitAppReady, doubleClickRow, expectRowVisible, LEFT_DIR } from "../fixtures/app";

test.describe("tabs", () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test("adds, switches, and closes tabs independently per pane", async ({ page }) => {
    const tabs = page.getByTestId("pane-left-tabs");
    await expect(tabs.getByRole("tab")).toHaveCount(1);

    // New tab duplicates the current directory; navigating it must not move tab 1.
    await page.getByTestId("pane-left-tab-add").click();
    await expect(tabs.getByRole("tab")).toHaveCount(2);

    await doubleClickRow(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText("docs");

    const [firstTab, secondTab] = await tabs.getByRole("tab").all();
    await firstTab.click();
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
    await expectRowVisible(page, "left", "docs");

    await secondTab.click();
    await expect(page.getByTestId("status-path")).toContainText("docs");

    // Close the active (second) tab; only the first remains and its path is restored.
    await secondTab.locator('[data-testid^="pane-left-tab-close-"]').click();
    await expect(tabs.getByRole("tab")).toHaveCount(1);
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
  });

  test("right pane tabs are independent of left pane tabs", async ({ page }) => {
    await page.getByTestId("pane-left-tab-add").click();
    await expect(page.getByTestId("pane-left-tabs").getByRole("tab")).toHaveCount(2);
    await expect(page.getByTestId("pane-right-tabs").getByRole("tab")).toHaveCount(1);
  });
});
