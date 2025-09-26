// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Minimal, non-type-aware config to reduce noise
export default tseslint.config({
        ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettierRecommended, {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
    }, {
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);