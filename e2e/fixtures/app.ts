import fs from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { LEFT_DIR, RIGHT_DIR } from "../paths";

export type Pane = "left" | "right";

const SEED_LEFT = new Set(["docs", "note.txt", "report.pdf", ".secret"]);
const SEED_RIGHT = new Set([".keep"]);

/** Reset sandbox to a small known set so DataGrid virtualization always shows seeds. */
function ensureSandboxSeeds() {
  fs.mkdirSync(LEFT_DIR, { recursive: true });
  fs.mkdirSync(RIGHT_DIR, { recursive: true });

  for (const name of fs.readdirSync(LEFT_DIR)) {
    if (!SEED_LEFT.has(name)) {
      fs.rmSync(path.join(LEFT_DIR, name), { recursive: true, force: true });
    }
  }
  for (const name of fs.readdirSync(RIGHT_DIR)) {
    if (!SEED_RIGHT.has(name)) {
      fs.rmSync(path.join(RIGHT_DIR, name), { recursive: true, force: true });
    }
  }

  fs.mkdirSync(path.join(LEFT_DIR, "docs"), { recursive: true });
  fs.writeFileSync(path.join(LEFT_DIR, "note.txt"), "hello from e2e\n");
  fs.writeFileSync(path.join(LEFT_DIR, "report.pdf"), "pdf-bytes");
  fs.writeFileSync(path.join(LEFT_DIR, ".secret"), "hidden");
  fs.writeFileSync(path.join(LEFT_DIR, "docs", "readme.md"), "# docs\n");
  fs.writeFileSync(path.join(RIGHT_DIR, ".keep"), "");
}

export async function waitAppReady(page: Page) {
  ensureSandboxSeeds();
  await page.goto("/");
  await expect(page.getByTestId("app-ready")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("pane-left")).toBeVisible();
  await expect(page.getByTestId("pane-right")).toBeVisible();

  // Reset both panes to known sandbox roots (prior tests may have navigated + saved paths).
  await navigatePaneTo(page, "left", LEFT_DIR);
  await navigatePaneTo(page, "right", RIGHT_DIR);
  await page.getByTestId("pane-left").click();
  await refresh(page);

  await ensureExtensionsVisible(page);
  await ensureHiddenOff(page);
}

async function navigatePaneTo(page: Page, id: Pane, dir: string) {
  await page.getByTestId(`pane-${id}`).click();
  const input = page.getByTestId(`path-input-${id}`).locator("input");
  await input.fill(dir);
  await input.press("Enter");
  // Status path reflects active pane only
  await expect(page.getByTestId("status-path")).toContainText(dir, { timeout: 10_000 });
}

export function pane(page: Page, id: Pane): Locator {
  return page.getByTestId(`pane-${id}`);
}

export function fileGrid(page: Page, id: Pane): Locator {
  return page.getByTestId(`file-grid-${id}`);
}

/** Match row by full name or basename (extensions may be hidden). */
function rowFilter(name: string): RegExp {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (name.startsWith(".") || !name.includes(".")) {
    return new RegExp(esc);
  }
  const base = name.slice(0, name.lastIndexOf(".")).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(${esc}|\\b${base}\\b)`);
}

export async function selectRow(page: Page, id: Pane, name: string) {
  const grid = fileGrid(page, id);
  await grid.click();
  const row = grid
    .locator(".MuiDataGrid-row")
    .filter({ hasText: rowFilter(name) })
    .first();
  await expect(row).toBeVisible();
  await row.click();
  return row;
}

export async function doubleClickRow(page: Page, id: Pane, name: string) {
  const grid = fileGrid(page, id);
  await grid.click();
  const row = grid
    .locator(".MuiDataGrid-row")
    .filter({ hasText: rowFilter(name) })
    .first();
  await expect(row).toBeVisible();
  await row.dblclick();
}

export async function expectRowVisible(page: Page, id: Pane, name: string, visible = true) {
  const grid = fileGrid(page, id);
  const row = grid.locator(".MuiDataGrid-row").filter({ hasText: rowFilter(name) });
  if (visible) {
    await expect(row.first()).toBeVisible();
  } else {
    await expect(row).toHaveCount(0);
  }
}

export async function dismissMenus(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(80);
}

export async function openViewMenu(page: Page) {
  await dismissMenus(page);
  await page.getByTestId("menu-view").click();
}

export async function openFileMenu(page: Page) {
  await dismissMenus(page);
  await page.getByTestId("menu-file").click();
}

/** If note.txt is shown as "note" only, toggle extensions back on. */
async function ensureExtensionsVisible(page: Page) {
  const grid = fileGrid(page, "left");
  await expect(grid.locator(".MuiDataGrid-row").first()).toBeVisible({ timeout: 15_000 });
  const hasFull = await grid.locator(".MuiDataGrid-row").filter({ hasText: "note.txt" }).count();
  if (hasFull > 0) return;
  const hasBase = await grid
    .locator(".MuiDataGrid-row")
    .filter({ hasText: rowFilter("note.txt") })
    .count();
  if (hasBase === 0) return;
  await openViewMenu(page);
  await page.getByTestId("menu-view-extensions").click();
  await dismissMenus(page);
  await expect(
    grid.locator(".MuiDataGrid-row").filter({ hasText: "note.txt" }).first(),
  ).toBeVisible();
}

async function ensureHiddenOff(page: Page) {
  const grid = fileGrid(page, "left");
  const hiddenVisible =
    (await grid.locator(".MuiDataGrid-row").filter({ hasText: ".secret" }).count()) > 0;
  if (!hiddenVisible) return;
  await openViewMenu(page);
  await page.getByTestId("menu-view-hidden").click();
  await dismissMenus(page);
  await expect(grid.locator(".MuiDataGrid-row").filter({ hasText: ".secret" })).toHaveCount(0);
}

export async function confirmMkdir(page: Page, name: string) {
  await page.getByTestId("btn-mkdir").click();
  await expect(page.getByTestId("dialog-mkdir")).toBeVisible();
  await page.getByTestId("input-mkdir-name").locator("input").fill(name);
  await page.getByTestId("btn-mkdir-confirm").click();
  await expect(page.getByTestId("dialog-mkdir")).toBeHidden();
}

export async function confirmRename(page: Page, newName: string) {
  await page.getByTestId("btn-rename").click();
  await expect(page.getByTestId("dialog-rename")).toBeVisible();
  await page.getByTestId("input-rename-name").locator("input").fill(newName);
  await page.getByTestId("btn-rename-confirm").click();
  await expect(page.getByTestId("dialog-rename")).toBeHidden();
}

export async function confirmDelete(page: Page) {
  await page.getByTestId("btn-delete").click();
  await expect(page.getByTestId("dialog-delete")).toBeVisible();
  await page.getByTestId("btn-delete-confirm").click();
  await expect(page.getByTestId("dialog-delete")).toBeHidden();
}

export async function refresh(page: Page) {
  await page.getByTestId("btn-refresh").click();
}

export { LEFT_DIR, RIGHT_DIR };
