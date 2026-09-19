// ESLint flat config: TypeScript + React hooks. Correctness rules are errors; style is left to Prettier.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'data/**',
      'playwright-report/**',
      'test-results/**',
      'scripts/**',
      'debug-*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.es2022 } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'off',
      // The codebase is intentionally loosely typed at the API boundary; tighten incrementally.
      '@typescript-eslint/no-explicit-any': 'off',
      // `npm run lint` runs with --max-warnings=0, so every rule below is effectively enforced. Keep
      // it that way: a warning that is tolerated once becomes 300 that nobody reads.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_?(e|err|error)?$' },
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/immutability': 'error',
      'react-hooks/purity': 'error',
      // React Compiler adoption rules. They flag patterns (setState inside effects that mirror
      // props/URL into state, refs assigned during render) that are deliberate in this codebase and
      // only matter once the compiler is enabled. Re-enable when adopting the compiler.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-useless-assignment': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',
      'prefer-const': 'error',
    },
  },
  {
    files: ['server/**/*.ts', 'tests/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, ...globals.browser } },
  }
);
