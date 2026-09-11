import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

// Node 18 compatible (import.meta.dirname requires Node >= 20.11)
const configDir = path.dirname(fileURLToPath(import.meta.url))

// Type-checked rules require the linted file to be covered by one of the
// tsconfigs listed in `project` below (src/** → tsconfig.json,
// config/**/*.ts → tsconfig.node.json).
const TS_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']

// In typescript-eslint v7 the preset values are ARRAYS of flat config
// entries. Spreading such an array into an object literal (or passing it
// through the legacy `extends` key) produces objects with numeric keys and
// crashes ESLint's flat config validator ("Unexpected key 0").
// Spread each preset's entries at the TOP level of tseslint.config() instead,
// and scope every entry to TS files so plain JS (.js/.mjs) files in
// config/ and scripts/ are never parsed by the TS parser.
const scopedToTs = (preset) =>
  preset.map((entry) => ({
    ...entry,
    files: entry.files ? [...new Set([...entry.files, ...TS_FILES])] : TS_FILES
  }))

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'coverage', '**/*.d.ts', 'scripts/tmp-*.mjs']
  },
  // Basic JS rules for .js/.mjs files (this config file, dev scripts).
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }]
    }
  },
  // TypeScript: recommended (type-checked) + stylistic (type-checked)
  ...scopedToTs(tseslint.configs.recommendedTypeChecked),
  ...scopedToTs(tseslint.configs.stylisticTypeChecked),
  {
    files: TS_FILES,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        projectService: true,
        // This file lives in <repo>/config/, so the tsconfigs live one level up
        tsconfigRootDir: path.resolve(configDir, '..'),
        project: ['./tsconfig.json', './tsconfig.node.json']
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          'prefer': 'type-imports',
          'fixStyle': 'inline-type-imports'
        }
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          'checksVoidReturn': false
        }
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  }
)
