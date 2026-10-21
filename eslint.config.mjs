import nx from '@nx/eslint-plugin';
import boundaries from './tools/module-boundaries.json' with { type: 'json' };

const layerImportBan = (message, groups) => [
  'error',
  {
    patterns: groups.map((group) => ({ group: [group], message })),
  },
];

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  {
    ignores: ['**/dist', '**/cdk.out', '**/node_modules', '**/.nx'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: [],
          depConstraints: boundaries.depConstraints,
        },
      ],
    },
  },
  {
    files: ['apps/*/src/functions/**/*.ts'],
    rules: {
      'no-restricted-imports': layerImportBan(
        'functions import packages only, never AWS or other app layers.',
        [
          '**/lambdas',
          '**/lambdas/**',
          '**/constructs',
          '**/constructs/**',
          '**/stacks',
          '**/stacks/**',
          'aws-cdk-lib',
          'aws-cdk-lib/**',
          'aws-lambda',
          '@aws-sdk/**',
        ],
      ),
    },
  },
  {
    files: ['apps/*/src/lambdas/**/*.ts'],
    rules: {
      'no-restricted-imports': layerImportBan('lambdas call functions. They do not import CDK.', [
        '**/constructs',
        '**/constructs/**',
        '**/stacks',
        '**/stacks/**',
        'aws-cdk-lib',
        'aws-cdk-lib/**',
      ]),
    },
  },
  {
    files: ['apps/*/src/constructs/**/*.ts'],
    rules: {
      'no-restricted-imports': layerImportBan('constructs do not import stacks.', [
        '**/stacks',
        '**/stacks/**',
      ]),
    },
  },
  {
    files: ['apps/*/src/stacks/**/*.ts'],
    rules: {
      'no-restricted-imports': layerImportBan(
        'stacks compose constructs. They do not import functions or lambdas.',
        ['**/functions', '**/functions/**', '**/lambdas', '**/lambdas/**'],
      ),
    },
  },
];
