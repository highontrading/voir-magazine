// Type-aware checks that guard the async data layer (missing / misplaced awaits).
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['.next/**', '.next-*/**', 'node_modules/**', 'scripts/**', 'eslint.config.mjs', 'next.config.ts', 'next-env.d.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.base],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/require-array-sort-compare': 'off',
    },
  },
);
