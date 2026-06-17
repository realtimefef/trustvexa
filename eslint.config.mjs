// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.tsbuildinfo',
      // Database migrations are CommonJS files executed by node-pg-migrate's
      // runner, not part of the TypeScript/ESM source graph.
      'packages/db/migrations/**',
      // Database utility scripts (proxy, connectivity test) are plain Node.js
      // CommonJS scripts, not application source.
      'packages/db/*.js',
      // Next.js PWA build emits service-worker artifacts into apps/web/public.
      // These are generated and must not be linted.
      'apps/web/public/sw.js',
      'apps/web/public/workbox-*.js',
      'apps/web/public/worker-*.js',
      'apps/web/public/fallback-*.js',
      // Next.js auto-generates this file; it must not be linted.
      'apps/web/next-env.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    // ESM Node config files (next.config.mjs, postcss.config.mjs, etc.) run in a
    // Node.js runtime and reference Node globals like `process`. Scope Node
    // globals to these files rather than disabling no-undef globally.
    files: ['**/*.mjs', '**/*.config.{js,cjs,mjs,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // API/worker server source runs under Node.js as well.
    files: ['apps/api/**/*.ts', 'apps/worker/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
  {
    // Test and spec files use `any` extensively for mocks and dynamic
    // assertions. Allowing it here is intentional and does not affect
    // production type-safety.
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts', '**/e2e/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
