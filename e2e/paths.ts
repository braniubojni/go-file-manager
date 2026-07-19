import os from 'node:os'
import path from 'node:path'

/** Shared workspace for the e2e server process and Playwright specs. */
export const E2E_ROOT = path.join(os.tmpdir(), 'gfm-e2e-workspace')
export const CONFIG_DIR = path.join(E2E_ROOT, 'config')
export const HOME_DIR = path.join(E2E_ROOT, 'home')
export const SANDBOX = path.join(E2E_ROOT, 'sandbox')
export const LEFT_DIR = path.join(SANDBOX, 'left')
export const RIGHT_DIR = path.join(SANDBOX, 'right')
export const SERVER_PORT = 18080
export const BASE_URL = `http://127.0.0.1:${SERVER_PORT}`
export const REPO_ROOT = path.resolve(__dirname, '..')
export const SERVER_BIN = path.join(REPO_ROOT, 'bin', 'gfm-e2e')
