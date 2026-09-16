// ESLint flat config: TypeScript + React hooks. Correctness rules are errors; style is left to Prettier.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'data/**', 'playwright-report/**', 'test-results/**', 'scripts/**', 'debug-*.mjs'] },
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
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_?(e|err|error)?$' }],
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler-oriented rules: advisory until the codebase adopts the compiler.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-useless-assignment': 'warn',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-console': 'off',
      'prefer-const': 'warn',
    },
  },
  {
    files: ['server/**/*.ts', 'tests/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  }
);
