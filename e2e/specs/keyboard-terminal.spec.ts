import { test, expect } from "@playwright/test";
import { waitAppReady, selectRow, expectRowVisible, fileGrid } from "../fixtures/app";

test.describe("keyboard navigation and terminal", () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test("arrow keys move row selection", async ({ page }) => {
    const grid = fileGrid(page, "left");
    await grid.click();
    await selectRow(page, "left", "docs");
    await expect(page.getByTestId("status-selected")).toContainText("Selected: 1");

    await grid.press("ArrowDown");
    // selection should still be 1 row
    await expect(page.getByTestId("status-selected")).toContainText("Selected: 1");
  });

  test("Enter on directory navigates into it", async ({ page }) => {
    await selectRow(page, "left", "docs");
    await fileGrid(page, "left").press("Enter");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "left", "readme.md");
  });

  test("pane header toggles terminal for that pane", async ({ page }) => {
    await page.getByTestId("pane-left").click();
    await expect(page.getByTestId("terminal-left")).toHaveCount(0);

    await page.getByTestId("btn-terminal-toggle-left").click();
    await expect(page.getByTestId("terminal-left")).toBeVisible();

    await page.getByTestId("btn-terminal-toggle-left").click();
    await expect(page.getByTestId("terminal-left")).toHaveCount(0);
  });

  test("Ctrl+Backquote toggles terminal", async ({ page }) => {
    await page.getByTestId("pane-right").click();
    await page.keyboard.press("Control+`");
    await expect(page.getByTestId("terminal-right")).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Control+`");
    await expect(page.getByTestId("terminal-right")).toHaveCount(0);
  });

  test("double-click folder navigates and clears text selection", async ({ page }) => {
    const grid = fileGrid(page, "left");
    const row = grid.locator(".MuiDataGrid-row").filter({ hasText: "docs" }).first();
    await row.dblclick();
    await expect(page.getByTestId("status-path")).toContainText("docs");
    const selected = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    expect(selected.length).toBe(0);
  });

  test("keeps arrow navigation after Enter into folder", async ({ page }) => {
    const grid = fileGrid(page, "left");
    await grid.click();
    await selectRow(page, "left", "docs");
    await grid.press("Enter");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "left", "readme.md");

    // Grid (or a descendant) should own focus after navigation
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const el = document.querySelector('[data-testid="file-grid-left"]');
          const a = document.activeElement;
          return Boolean(el && (el === a || el.contains(a)));
        }),
      )
      .toBe(true);

    // Arrow keys move focus (multi-select may be empty after navigate)
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press(" ");
    await expect(page.getByTestId("status-selected")).toContainText("Selected: 1");
  });

  test("terminal resize handle is present when open", async ({ page }) => {
    await page.getByTestId("btn-terminal-toggle-left").click();
    await expect(page.getByTestId("terminal-left")).toBeVisible();
    await expect(page.getByTestId("terminal-resize-left")).toBeVisible();
  });
});
