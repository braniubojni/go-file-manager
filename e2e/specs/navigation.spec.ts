import { test, expect } from "@playwright/test";
import {
  waitAppReady,
  doubleClickRow,
  expectRowVisible,
  selectRow,
  LEFT_DIR,
  RIGHT_DIR,
} from "../fixtures/app";

test.describe("navigation", () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
  });

  test("boots dual panes with seeded left files", async ({ page }) => {
    await expectRowVisible(page, "left", "note.txt");
    await expectRowVisible(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
  });

  test("enters folder on double-click and goes parent", async ({ page }) => {
    await doubleClickRow(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "left", "readme.md");

    await page.getByTestId("btn-parent-left").click();
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
    await expectRowVisible(page, "left", "docs");
  });

  test("switches active pane via click", async ({ page }) => {
    await page.getByTestId("pane-right").click();
    await expect(page.getByTestId("status-active-pane")).toContainText("right");
    await page.getByTestId("pane-left").click();
    await expect(page.getByTestId("status-active-pane")).toContainText("left");
  });

  test("path bar navigate by typing Enter", async ({ page }) => {
    const input = page.getByTestId("path-input-left").locator("input");
    await input.fill(LEFT_DIR + "/docs");
    await input.press("Enter");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "left", "readme.md");
  });

  test("selects a file and updates status bar", async ({ page }) => {
    await selectRow(page, "left", "note.txt");
    await expect(page.getByTestId("status-selected")).toContainText("Selected: 1");
  });

  test("opens text in the built-in editor and skips the editor for pdf", async ({ page }) => {
    await doubleClickRow(page, "left", "note.txt");
    await expect(page.getByTestId("editor-workspace")).toBeVisible();
    await page.getByTestId("btn-editor-close").click();
    await expect(page.getByTestId("editor-workspace")).toHaveCount(0);

    await doubleClickRow(page, "left", "report.pdf");
    await expect(page.getByTestId("editor-workspace")).toHaveCount(0);
  });

  test("history back/forward toolbar and Backspace", async ({ page }) => {
    await expect(page.getByTestId("btn-back")).toBeDisabled();
    await expect(page.getByTestId("btn-forward")).toBeDisabled();

    await doubleClickRow(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expect(page.getByTestId("btn-back")).toBeEnabled();

    await page.getByTestId("btn-back").click();
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
    await expectRowVisible(page, "left", "docs");
    await expect(page.getByTestId("btn-forward")).toBeEnabled();

    await page.getByTestId("btn-forward").click();
    await expect(page.getByTestId("status-path")).toContainText("docs");

    // Backspace goes back when focus is not in an input
    await page.getByTestId("file-grid-left").click();
    await page.keyboard.press("Backspace");
    await expect(page.getByTestId("status-path")).toContainText(LEFT_DIR);
  });

  test("path autocomplete Enter selects option not partial draft", async ({ page }) => {
    const input = page.getByTestId("path-input-left").locator("input");
    // Type a prefix of "docs" so completions include the full docs path
    await input.click();
    await input.fill(LEFT_DIR + "/do");
    // Wait until a completion option appears (or network settles)
    await expect(page.getByRole("option").first()).toBeVisible({ timeout: 10_000 });
    // Enter should take the best completion, not the partial "…/do"
    await input.press("Enter");
    await expect(page.getByTestId("status-path")).toContainText("docs", { timeout: 10_000 });
    await expectRowVisible(page, "left", "readme.md");
    // No error toast about path not found
    await expect(page.getByText(/Path not found/i)).toHaveCount(0);
  });

  test("same-dir button opens the active folder in the other pane", async ({ page }) => {
    await doubleClickRow(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await page.getByTestId("btn-same-dir").click();

    await page.getByTestId("pane-right").click();
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "right", "readme.md");
    await expect(page.getByTestId("status-path")).not.toContainText(RIGHT_DIR);
  });

  test("Ctrl+ArrowRight copies the left pane directory to the right pane", async ({ page }) => {
    await doubleClickRow(page, "left", "docs");
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await page.getByTestId("file-grid-left").click();
    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "ArrowRight",
          code: "ArrowRight",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await page.getByTestId("pane-right").click();
    await expect(page.getByTestId("status-path")).toContainText("docs");
    await expectRowVisible(page, "right", "readme.md");
  });
});
