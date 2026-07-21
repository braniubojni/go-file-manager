import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wails from '@wailsio/runtime/plugins/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development' || process.env.DEV === 'true'

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '127.0.0.1',
      port: Number(process.env.WAILS_VITE_PORT) || 9245,
      strictPort: true,
      sourcemapIgnoreList: false,
    },
    build: {
      sourcemap: isDev ? true : 'hidden',
      minify: isDev ? false : 'esbuild',
    },
    optimizeDeps: {
      include: [
        '@uiw/react-codemirror',
        '@codemirror/view',
        '@codemirror/state',
        '@codemirror/lang-javascript',
        '@codemirror/lang-go',
      ],
    },
    plugins: [react(), wails('./bindings')],
  }
})
