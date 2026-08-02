import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  waitAppReady,
  selectRow,
  expectRowVisible,
  confirmMkdir,
  confirmRename,
  confirmDelete,
  contextAction,
  fileAction,
  refresh,
  LEFT_DIR,
  RIGHT_DIR,
} from "../fixtures/app";

test.describe("file operations", () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page);
    // Ensure left is active
    await page.getByTestId("pane-left").click();
  });

  test("creates a folder with mkdir", async ({ page }) => {
    const name = `folder-${Date.now()}`;
    await confirmMkdir(page, name);
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    await expectRowVisible(page, "left", name);
    expect(fs.existsSync(path.join(LEFT_DIR, name))).toBeTruthy();
  });

  test("renames a file", async ({ page }) => {
    const src = `rename-src-${Date.now()}.txt`;
    const dest = `rename-dst-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, src), "x");
    await refresh(page);
    await expectRowVisible(page, "left", src);

    await selectRow(page, "left", src);
    await confirmRename(page, dest);
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    await expectRowVisible(page, "left", dest);
    await expectRowVisible(page, "left", src, false);
  });

  test("copies file from left to right", async ({ page }) => {
    const name = `copy-me-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "copy");
    await refresh(page);
    await selectRow(page, "left", name);
    await fileAction(page, "btn-copy");
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    await expectRowVisible(page, "right", name);
    expect(fs.existsSync(path.join(RIGHT_DIR, name))).toBeTruthy();
    // source remains
    await expectRowVisible(page, "left", name);
  });

  test("moves file from left to right", async ({ page }) => {
    const name = `move-me-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "move");
    await refresh(page);
    await selectRow(page, "left", name);
    await fileAction(page, "btn-move");
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    await expectRowVisible(page, "right", name);
    await expectRowVisible(page, "left", name, false);
  });

  test("deletes a file with confirmation", async ({ page }) => {
    const name = `delete-me-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "bye");
    await refresh(page);
    await selectRow(page, "left", name);
    await confirmDelete(page);
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    await expectRowVisible(page, "left", name, false);
    expect(fs.existsSync(path.join(LEFT_DIR, name))).toBeFalsy();
  });

  test("undo restores a deleted file", async ({ page }) => {
    const name = `undo-me-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "back");
    await refresh(page);
    await selectRow(page, "left", name);
    await confirmDelete(page);
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    expect(fs.existsSync(path.join(LEFT_DIR, name))).toBeFalsy();

    await page.getByTestId("btn-undo-delete").click();
    await expect(page.getByTestId("snackbar")).toContainText("Delete undone", { timeout: 10_000 });
    await expectRowVisible(page, "left", name);
    expect(fs.readFileSync(path.join(LEFT_DIR, name), "utf8")).toBe("back");
  });

  test("right-click menu renames via the dialog", async ({ page }) => {
    const src = `ctx-src-${Date.now()}.txt`;
    const dest = `ctx-dst-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, src), "x");
    await refresh(page);
    await expectRowVisible(page, "left", src);

    await contextAction(page, "left", src, "ctx-rename");
    await expect(page.getByTestId("dialog-rename")).toBeVisible();
    await page.getByTestId("input-rename-name").locator("input").fill(dest);
    await page.getByTestId("btn-rename-confirm").click();
    await expectRowVisible(page, "left", dest);
  });

  test("permission column reports an unreadable folder", async ({ page }) => {
    const name = `locked-${Date.now()}`;
    const full = path.join(LEFT_DIR, name);
    fs.mkdirSync(full);
    fs.chmodSync(full, 0o000);
    try {
      await refresh(page);
      const row = page.getByTestId("file-grid-left").locator(`.MuiDataGrid-row[data-id="${full}"]`);
      await expect(row).toContainText("No access");
    } finally {
      fs.chmodSync(full, 0o755);
    }
  });

  test("refresh picks up external file", async ({ page }) => {
    const name = `external-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "disk");
    await refresh(page);
    await expectRowVisible(page, "left", name);
  });

  test("delete confirms with Enter when Delete is focused", async ({ page }) => {
    const name = `del-enter-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "bye");
    await refresh(page);
    await selectRow(page, "left", name);
    await fileAction(page, "btn-delete");
    await expect(page.getByTestId("dialog-delete")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("dialog-delete")).toBeHidden({ timeout: 10_000 });
    await expect(page.getByTestId("snackbar")).toContainText("completed", { timeout: 10_000 });
    await expectRowVisible(page, "left", name, false);
  });

  test("archives selection to zip via dialog", async ({ page }) => {
    const name = `to-zip-${Date.now()}.txt`;
    fs.writeFileSync(path.join(LEFT_DIR, name), "zipme");
    await refresh(page);
    await selectRow(page, "left", name);
    await page.getByTestId("btn-archive").click();
    await expect(page.getByTestId("dialog-archive")).toBeVisible();
    await page.getByTestId("input-archive-name").locator("input").fill(`bundle-${Date.now()}`);
    await page.getByTestId("btn-archive-confirm").click();
    await expect(page.getByTestId("snackbar")).toContainText("Archive created", {
      timeout: 15_000,
    });
    await expect(page.getByTestId("dialog-archive")).toBeHidden();
  });
});
