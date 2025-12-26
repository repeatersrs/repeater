import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import { dirname } from 'path';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    {
        ignores: ['src/gen/**/*', 'dist/**/*'],
    },
    ...tseslint.configs.recommended,
    ...compat.extends('plugin:@tanstack/eslint-plugin-query/recommended'),
    ...compat.extends('plugin:react-hooks/recommended'),
    {
        plugins: {
            perfectionist,
        },
        rules: {
            'perfectionist/sort-imports': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
    prettierConfig,
];

export default eslintConfig;
