import { test, expect } from '@playwright/test'
import {
  waitAppReady,
  openViewMenu,
  openFileMenu,
  expectRowVisible,
  dismissMenus,
} from '../fixtures/app'

test.describe('view and settings', () => {
  test.beforeEach(async ({ page }) => {
    await waitAppReady(page)
  })

  test('hides hidden files by default and shows after toggle', async ({ page }) => {
    await expectRowVisible(page, 'left', '.secret', false)

    await openViewMenu(page)
    await page.getByTestId('menu-view-hidden').click()
    await dismissMenus(page)
    await expectRowVisible(page, 'left', '.secret', true)

    // restore default (hidden off)
    await openViewMenu(page)
    await page.getByTestId('menu-view-hidden').click()
    await dismissMenus(page)
    await expectRowVisible(page, 'left', '.secret', false)
  })

  test('toggles file extensions in name column', async ({ page }) => {
    await expectRowVisible(page, 'left', 'note.txt')

    await openViewMenu(page)
    await page.getByTestId('menu-view-extensions').click()
    await dismissMenus(page)

    const grid = page.getByTestId('file-grid-left')
    // Name column shows basename only; Type column may still say "txt"
    await expect(grid.locator('[data-field="displayName"]').getByText('note', { exact: true })).toBeVisible()
    await expect(
      grid.locator('[data-field="displayName"]').getByText('note.txt', { exact: true }),
    ).toHaveCount(0)

    // restore extensions on
    await openViewMenu(page)
    await page.getByTestId('menu-view-extensions').click()
    await dismissMenus(page)
    await expectRowVisible(page, 'left', 'note.txt')
  })

  test('opens settings dialog and saves theme', async ({ page }) => {
    await page.getByTestId('btn-settings').click()
    await expect(page.getByTestId('dialog-settings')).toBeVisible()

    await page.getByTestId('settings-theme').click()
    await page.getByRole('option', { name: 'Light' }).click()
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('dialog-settings')).toBeHidden()
    await expect(page.getByTestId('snackbar')).toContainText('Settings saved')
  })

  test('opens shortcuts dialog listing actions', async ({ page }) => {
    await openFileMenu(page)
    await page.getByTestId('menu-file-shortcuts').click()
    await expect(page.getByTestId('dialog-shortcuts')).toBeVisible()
    const dialog = page.getByTestId('dialog-shortcuts')
    await expect(dialog.getByRole('cell', { name: 'Refresh', exact: true }).first()).toBeVisible()
    await expect(dialog.getByRole('cell', { name: 'Copy', exact: true }).first()).toBeVisible()
    await expect(dialog.getByRole('cell', { name: 'Delete', exact: true }).first()).toBeVisible()
  })

  test('theme cycle button works without error', async ({ page }) => {
    await page.getByTestId('btn-theme').click()
    await expect(page.getByTestId('app-ready')).toBeVisible()
  })
})
