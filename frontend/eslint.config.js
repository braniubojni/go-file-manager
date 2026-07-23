// @ts-check

import { defineConfig, globalIgnores } from 'eslint/config';
import oxlint from 'eslint-plugin-oxlint';
import pluginA11y from 'eslint-plugin-jsx-a11y';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactRefresh from 'eslint-plugin-react-refresh';
import pluginQuery from '@tanstack/eslint-plugin-query';

export default defineConfig([
  reactRefresh.configs.vite,
  pluginJs.configs.recommended,
  globalIgnores([
    'node_modules/*',
    'build/*',
    'build/assets/*',
    'lint-staged.config.mjs',
    'coverage/*',
    'src/**/*.test.ts',
    'src/**/*.test.tsx',
    'jscpd-report/*',
    'mockServiceWorker.js',
    'public/mockServiceWorker.js',
    '.claude/*',
  ]),
  { files: ['**/*.{mjs,cjs,ts}'] },
  { files: ['**/*.ts'], languageOptions: { sourceType: 'commonjs' } },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        process: 'readonly',
      },
    },
    settings: { react: { version: 'detect' } },
    ignores: ['node_modules/', 'build/'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        // @ts-expect-error
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  oxlint.configs['flat/all'],
  // Flat presets register their own plugins — do not reference rules without these.
  pluginReact.configs.flat.recommended,
  pluginA11y.flatConfigs.recommended,
  pluginReactHooks.configs.flat.recommended,
  ...pluginQuery.configs['flat/recommended'],
  {
    settings: { react: { version: 'detect' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/display-name': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'error',
      '@typescript-eslint/ban-ts-ignore': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-useless-escape': 'off',
      '@typescript-eslint/no-unused-expressions': 'error',
      'no-empty': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      'react-refresh/only-export-components': ['warn'],
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/rules-of-hooks': 'warn',
      '@tanstack/query/exhaustive-deps': 'warn',
      'jsx-a11y/no-autofocus': 'off',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      // TODO: Uncomment this after we change all the imports
      // 'no-restricted-imports': [
      //   'error',
      //   {
      //     patterns: [{ regex: '^@mui/[^/]+$' }],
      //   },
      // ],
    },
  },
]);
