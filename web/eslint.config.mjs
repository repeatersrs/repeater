import { FlatCompat } from '@eslint/eslintrc';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier/recommended';
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
    prettier,
    {
        plugins: {
            perfectionist,
            'better-tailwindcss': betterTailwindcss,
        },
        settings: {
            'better-tailwindcss': {
                entryPoint: 'src/styles/globals.css',
            },
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
];

export default eslintConfig;
