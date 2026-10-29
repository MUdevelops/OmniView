import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import hooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'server', 'scripts', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': hooks },
    rules: { ...hooks.configs.recommended.rules, '@typescript-eslint/no-explicit-any': 'off' },
  },
  { files: ['tests/e2e/**', 'tests/unit/deployConfig.test.ts', 'config/**'], languageOptions: { globals: { ...globals.node } } },
  { files: ['tests/e2e/**'], rules: { 'react-hooks/rules-of-hooks': 'off' } }, // Playwright's fixture callback is named `use`
)
