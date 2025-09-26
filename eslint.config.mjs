// eslint.config.ts
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config([{
        ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
    },
    {
        rules: {
            // ✅ 關掉空格/空行相關的報錯
            'no-trailing-spaces': 'off',
            'no-multiple-empty-lines': 'off',
            'padded-blocks': 'off',
        },
    },
]);